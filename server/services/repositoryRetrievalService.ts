import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface RetrievedWorkspace {
  workspaceId: string;
  owner: string;
  repo: string;
  ref: string;
  defaultBranch: string;
  sourcePath: string; // Server-side path where unexecuted code resides (ready for Step 4 & Step 5)
  workspacePath: string;
  fileCount: number;
  totalSizeBytes: number;
  topLevelEntries: string[];
  retrievedAt: number;
}

export interface RetrieveRepositoryOptions {
  owner: string;
  repo: string;
  ref?: string;
  accessToken: string;
}

// In-memory registry of active workspaces (Step 3 to Step 5 lifecycle)
const activeWorkspaces = new Map<string, RetrievedWorkspace>();

const WORKSPACE_BASE_DIR = path.join(os.tmpdir(), 'rungit-workspaces');

// Clean up workspaces older than 2 hours to avoid disk bloat
const WORKSPACE_TTL_MS = 2 * 60 * 60 * 1000;

export function cleanupOldWorkspaces(): void {
  const now = Date.now();
  for (const [id, ws] of activeWorkspaces.entries()) {
    if (now - ws.retrievedAt > WORKSPACE_TTL_MS) {
      cleanupWorkspace(id);
    }
  }
}

// Run periodic cleanup check every 15 minutes
setInterval(cleanupOldWorkspaces, 15 * 60 * 1000);

/**
 * Remove an isolated temporary workspace from disk and in-memory registry
 */
export function cleanupWorkspace(workspaceId: string): boolean {
  const ws = activeWorkspaces.get(workspaceId);
  if (ws) {
    activeWorkspaces.delete(workspaceId);
    if (fs.existsSync(ws.workspacePath)) {
      try {
        fs.rmSync(ws.workspacePath, { recursive: true, force: true });
        return true;
      } catch (err) {
        console.error(`[RunGit] Error cleaning up workspace ${workspaceId}:`, err);
        return false;
      }
    }
    return true;
  } else {
    // Check on disk directly
    const wsDiskPath = path.join(WORKSPACE_BASE_DIR, workspaceId);
    if (fs.existsSync(wsDiskPath)) {
      try {
        fs.rmSync(wsDiskPath, { recursive: true, force: true });
        return true;
      } catch {
        return false;
      }
    }
  }
  return false;
}

/**
 * Retrieve workspace by ID
 */
export function getWorkspace(workspaceId: string): RetrievedWorkspace | undefined {
  const existing = activeWorkspaces.get(workspaceId);
  if (existing) return existing;

  // Check on-disk backup in WORKSPACE_BASE_DIR
  try {
    const metaPath = path.join(WORKSPACE_BASE_DIR, workspaceId, 'workspace-meta.json');
    if (fs.existsSync(metaPath)) {
      const data = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as RetrievedWorkspace;
      if (fs.existsSync(data.sourcePath)) {
        activeWorkspaces.set(workspaceId, data);
        return data;
      }
    }
  } catch {
    // Ignore read errors
  }
  return undefined;
}

/**
 * Validates repository identifier to avoid path traversal or command injection
 */
function validateRepoIdentifier(value: string, field: string): void {
  if (!value || typeof value !== 'string') {
    throw new Error(`Repository ${field} is required.`);
  }
  const sanitized = value.trim();
  if (!/^[a-zA-Z0-9_.-]+$/.test(sanitized)) {
    throw new Error(`Invalid repository ${field}: must only contain alphanumeric characters, hyphens, periods, or underscores.`);
  }
}

/**
 * Recursively computes file count and total size within directory
 */
async function inspectDirectory(dirPath: string): Promise<{ fileCount: number; totalSizeBytes: number }> {
  let fileCount = 0;
  let totalSizeBytes = 0;

  async function walk(current: string) {
    const entries = await fs.promises.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        fileCount++;
        const stat = await fs.promises.stat(full);
        totalSizeBytes += stat.size;
      }
    }
  }

  await walk(dirPath);
  return { fileCount, totalSizeBytes };
}

/**
 * Core Step 3 Service: Retrieves a selected GitHub repository archive,
 * extracts it into a temporary isolated workspace, and prepares it for subsequent steps.
 */
export async function retrieveRepository(options: RetrieveRepositoryOptions): Promise<RetrievedWorkspace> {
  const { owner: rawOwner, repo: rawRepo, ref: rawRef, accessToken } = options;

  validateRepoIdentifier(rawOwner, 'owner');
  validateRepoIdentifier(rawRepo, 'repository name');

  const owner = rawOwner.trim();
  const repo = rawRepo.trim();

  if (!accessToken || typeof accessToken !== 'string') {
    throw new Error('Authentication required: valid GitHub session token missing.');
  }

  // 1. Verify access to repository and inspect metadata via GitHub API
  let defaultBranch = 'main';
  try {
    const repoInfoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'RunGit-Repository-Retriever',
      },
    });

    if (repoInfoRes.status === 404) {
      throw new Error(`Repository '${owner}/${repo}' not found. Verify the repository exists and your GitHub account has access.`);
    }

    if (repoInfoRes.status === 401) {
      throw new Error('GitHub authentication session has expired. Please reconnect your GitHub account.');
    }

    if (repoInfoRes.status === 403) {
      throw new Error(`Access denied to repository '${owner}/${repo}'. Ensure your authorized GitHub token has the required 'repo' scope for private repositories.`);
    }

    if (!repoInfoRes.ok) {
      let message = `HTTP ${repoInfoRes.status}`;
      try {
        const errJson = await repoInfoRes.json();
        if (errJson.message) message = errJson.message;
      } catch {
        // Ignore
      }
      throw new Error(`GitHub API error verifying repository '${owner}/${repo}': ${message}`);
    }

    const repoMetadata = await repoInfoRes.json();
    if (repoMetadata.default_branch) {
      defaultBranch = repoMetadata.default_branch;
    }
  } catch (err: unknown) {
    if (err instanceof Error) throw err;
    throw new Error(`Unable to verify repository '${owner}/${repo}': ${String(err)}`);
  }

  const targetRef = rawRef && rawRef.trim() ? rawRef.trim() : defaultBranch;

  // 2. Prepare isolated temporary workspace on the server filesystem
  const workspaceId = crypto.randomUUID();
  const baseTmpDir = path.join(os.tmpdir(), 'rungit-workspaces');
  const workspacePath = path.join(baseTmpDir, workspaceId);
  const sourcePath = path.join(workspacePath, 'source');
  const archivePath = path.join(workspacePath, 'archive.tar.gz');

  await fs.promises.mkdir(sourcePath, { recursive: true });

  try {
    // 3. Download repository archive from GitHub API
    const archiveUrl = `https://api.github.com/repos/${owner}/${repo}/tarball/${encodeURIComponent(targetRef)}`;
    const archiveRes = await fetch(archiveUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'RunGit-Repository-Retriever',
      },
      redirect: 'follow',
    });

    if (archiveRes.status === 404) {
      throw new Error(`Archive for repository '${owner}/${repo}' (ref: '${targetRef}') was not found. The branch or repository may be empty.`);
    }

    if (archiveRes.status === 403) {
      throw new Error(`Access denied downloading repository archive for '${owner}/${repo}'. Verify the 'repo' scope is granted.`);
    }

    if (!archiveRes.ok) {
      let errMsg = `HTTP ${archiveRes.status}`;
      try {
        const errJson = await archiveRes.json();
        if (errJson.message) errMsg = errJson.message;
      } catch {
        // Ignore
      }
      throw new Error(`Failed to download repository archive from GitHub: ${errMsg}`);
    }

    const arrayBuf = await archiveRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    if (buffer.length === 0) {
      throw new Error(`Downloaded archive for repository '${owner}/${repo}' was 0 bytes.`);
    }

    await fs.promises.writeFile(archivePath, buffer);

    // 4. Extract repository archive safely into sourcePath
    // GitHub tarballs nest contents inside a root directory (e.g. owner-repo-hash).
    // --strip-components=1 unpacks files directly into sourcePath.
    try {
      await execFileAsync('tar', ['-xzf', archivePath, '--strip-components=1', '-C', sourcePath]);
    } catch (extractErr: unknown) {
      const msg = extractErr instanceof Error ? extractErr.message : String(extractErr);
      throw new Error(`Failed to extract repository archive: ${msg}`);
    } finally {
      // Promptly clean up the archive file to conserve disk
      await fs.promises.unlink(archivePath).catch(() => {});
    }

    // 5. Verify extracted repository contents
    const topLevelEntries = await fs.promises.readdir(sourcePath);
    if (topLevelEntries.length === 0) {
      throw new Error(`The extracted repository '${owner}/${repo}' is empty (0 files found).`);
    }

    const { fileCount, totalSizeBytes } = await inspectDirectory(sourcePath);

    const workspace: RetrievedWorkspace = {
      workspaceId,
      owner,
      repo,
      ref: targetRef,
      defaultBranch,
      sourcePath,
      workspacePath,
      fileCount,
      totalSizeBytes,
      topLevelEntries,
      retrievedAt: Date.now(),
    };

    activeWorkspaces.set(workspaceId, workspace);
    // Write metadata file to disk so workspaces survive server restarts
    await fs.promises.writeFile(
      path.join(workspacePath, 'workspace-meta.json'),
      JSON.stringify(workspace, null, 2)
    ).catch(() => {});

    return workspace;
  } catch (err) {
    // If any step fails during retrieval or extraction, clean up all temporary files immediately
    try {
      if (fs.existsSync(workspacePath)) {
        fs.rmSync(workspacePath, { recursive: true, force: true });
      }
    } catch (cleanupErr) {
      console.error(`[RunGit] Failed cleaning up aborted workspace at ${workspacePath}:`, cleanupErr);
    }
    throw err;
  }
}
