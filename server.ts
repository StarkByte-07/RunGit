import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { retrieveRepository, getWorkspace, cleanupWorkspace } from './server/services/repositoryRetrievalService';
import { detectProject } from './server/services/projectDetectionService';

dotenv.config();

// Helper to reliably read environment variables from process.env, .env, or /app/.dev.env.json
export function getEnv(key: string): string {
  const val = process.env[key];
  if (val && typeof val === 'string' && val.trim() !== '') {
    return val.trim();
  }
  try {
    const parentDevEnv = '/app/.dev.env.json';
    if (fs.existsSync(parentDevEnv)) {
      const raw = fs.readFileSync(parentDevEnv, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed[key] && typeof parsed[key] === 'string' && parsed[key].trim() !== '') {
        return parsed[key].trim();
      }
    }
  } catch {
    // Ignore fallback loading errors
  }
  return '';
}

// Populate process.env with any missing values from /app/.dev.env.json or .env at startup
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
  const parentDevEnv = '/app/.dev.env.json';
  if (fs.existsSync(parentDevEnv)) {
    const raw = fs.readFileSync(parentDevEnv, 'utf8');
    const parsed = JSON.parse(raw);
    for (const [key, value] of Object.entries(parsed)) {
      if (!process.env[key] && typeof value === 'string' && value.trim() !== '') {
        process.env[key] = value.trim();
      }
    }
  }
} catch {
  // Ignore fallback loading errors
}

interface SessionData {
  accessToken: string;
  user: any;
  scopes?: string;
  createdAt: number;
}

const sessions = new Map<string, SessionData>();

// Clean up sessions older than 7 days
setInterval(() => {
  const now = Date.now();
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > maxAge) {
      sessions.delete(id);
    }
  }
}, 60 * 60 * 1000);

function getSessionToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.substring(7).trim();
    if (sessions.has(bearerToken)) {
      return sessions.get(bearerToken)!.accessToken;
    }
  }
  const cookieSessionId = req.cookies?.rungit_session;
  if (cookieSessionId && sessions.has(cookieSessionId)) {
    return sessions.get(cookieSessionId)!.accessToken;
  }
  return null;
}

function getSession(req: express.Request): { sessionId: string; session: SessionData } | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.substring(7).trim();
    if (sessions.has(bearerToken)) {
      return { sessionId: bearerToken, session: sessions.get(bearerToken)! };
    }
  }
  const cookieSessionId = req.cookies?.rungit_session;
  if (cookieSessionId && sessions.has(cookieSessionId)) {
    return { sessionId: cookieSessionId, session: sessions.get(cookieSessionId)! };
  }
  return null;
}

function getCallbackUrl(req: express.Request, port: number): string {
  const appUrl = process.env.APP_URL;
  if (appUrl) {
    return `${appUrl.replace(/\/+$/, '')}/auth/callback`;
  }
  return `http://localhost:${port}/auth/callback`;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Recently';
  }
}

function detectFramework(language?: string, name?: string, topics?: string[]): string {
  const str = `${language || ''} ${name || ''} ${(topics || []).join(' ')}`.toLowerCase();
  if (str.includes('react') && str.includes('vite')) return 'React + TypeScript + Vite';
  if (str.includes('react')) return 'React';
  if (str.includes('next')) return 'Next.js';
  if (str.includes('vue')) return 'Vue.js';
  if (str.includes('svelte')) return 'Svelte';
  if (str.includes('node') || str.includes('express')) return 'Node.js / Express';
  if (str.includes('python') || str.includes('django') || str.includes('flask')) return 'Python';
  if (language) return `${language} Project`;
  return 'Web Application';
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Check current authentication status
  app.get('/api/auth/status', (req, res) => {
    const currentSession = getSession(req);
    const callbackUrl = getCallbackUrl(req, PORT);
    const clientId = getEnv('GITHUB_CLIENT_ID');
    const clientSecret = getEnv('GITHUB_CLIENT_SECRET');
    const oauthConfigured = Boolean(clientId && clientSecret);

    res.json({
      authenticated: Boolean(currentSession?.session?.user),
      user: currentSession?.session?.user || null,
      oauthConfigured,
      callbackUrl,
    });
  });

  // Construct GitHub OAuth authorization URL
  app.get('/api/auth/github/url', (req, res) => {
    const callbackUrl = getCallbackUrl(req, PORT);
    const clientId = getEnv('GITHUB_CLIENT_ID');
    const clientSecret = getEnv('GITHUB_CLIENT_SECRET');
    const isConfigured = Boolean(clientId && clientSecret);

    // Explicitly request scope=repo per specification to grant access to private repositories
    const params = new URLSearchParams({
      client_id: clientId || '',
      redirect_uri: callbackUrl,
      scope: 'repo',
      prompt: 'consent',
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

    res.json({
      url: authUrl,
      isConfigured,
      callbackUrl,
      clientIdMasked: clientId ? `${clientId.slice(0, 4)}...${clientId.slice(-3)}` : null,
    });
  });

  // OAuth Callback Route with trailing slash support
  app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
    const { code, error, error_description } = req.query;

    if (error || !code) {
      const errorMsg = (error_description as string) || (error as string) || 'Authentication failed or was denied.';
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>GitHub Authentication Failed</title></head>
          <body style="font-family: monospace; background: #09090b; color: #ef4444; padding: 24px; text-align: center;">
            <p>Authentication error: ${errorMsg}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(errorMsg)} }, '*');
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      return;
    }

    try {
      const callbackUrl = getCallbackUrl(req, PORT);
      const clientId = getEnv('GITHUB_CLIENT_ID');
      const clientSecret = getEnv('GITHUB_CLIENT_SECRET');

      if (!clientId || !clientSecret) {
        throw new Error('GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is missing on the server.');
      }

      // Exchange code for access token with GitHub
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'RunGit-OAuth-Agent',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: callbackUrl,
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error || !tokenData.access_token) {
        throw new Error(tokenData.error_description || tokenData.error || 'Failed to obtain access token from GitHub.');
      }

      const accessToken = tokenData.access_token;

      // Fetch user profile from GitHub
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'RunGit-Developer-Tool',
        },
      });

      if (!userRes.ok) {
        throw new Error('Failed to fetch user profile from GitHub with obtained token.');
      }

      const userData = await userRes.json();
      const grantedScopes = userRes.headers.get('x-oauth-scopes') || '';

      const user = {
        login: userData.login,
        id: userData.id,
        avatar_url: userData.avatar_url,
        html_url: userData.html_url,
        name: userData.name || userData.login,
        bio: userData.bio,
        public_repos: userData.public_repos,
        total_private_repos: userData.total_private_repos,
      };

      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, {
        accessToken,
        user,
        scopes: grantedScopes,
        createdAt: Date.now(),
      });

      // Set secure cookie for iframe compatibility
      res.cookie('rungit_session', sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Authentication Successful</title></head>
          <body style="font-family: monospace; background: #09090b; color: #34d399; padding: 24px; text-align: center;">
            <p>✓ GitHub Connected successfully. Closing popup...</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', sessionId: '${sessionId}' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);
    } catch (err: any) {
      const msg = err?.message || 'OAuth exchange failed.';
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <head><title>GitHub Authentication Error</title></head>
          <body style="font-family: monospace; background: #09090b; color: #ef4444; padding: 24px; text-align: center;">
            <p>Authentication error: ${msg}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(msg)} }, '*');
                window.close();
              }
            </script>
          </body>
        </html>
      `);
    }
  });

  // Token-based connection endpoint (supports Personal Access Tokens)
  app.post('/api/auth/github/token', async (req, res) => {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'GitHub token is required.' });
      return;
    }

    try {
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token.trim()}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'RunGit-Developer-Tool',
        },
      });

      if (!userRes.ok) {
        const errorData = await userRes.json().catch(() => ({ message: userRes.statusText }));
        res.status(401).json({
          error: `GitHub authentication failed (${userRes.status}): ${errorData.message || 'Invalid token'}`,
        });
        return;
      }

      const grantedScopes = userRes.headers.get('x-oauth-scopes') || '';
      const userData = await userRes.json();
      const user = {
        login: userData.login,
        id: userData.id,
        avatar_url: userData.avatar_url,
        html_url: userData.html_url,
        name: userData.name || userData.login,
        bio: userData.bio,
        public_repos: userData.public_repos,
        total_private_repos: userData.total_private_repos,
      };

      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, {
        accessToken: token.trim(),
        user,
        scopes: grantedScopes,
        createdAt: Date.now(),
      });

      res.cookie('rungit_session', sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      res.json({
        success: true,
        sessionId,
        user,
        scopes: grantedScopes,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Unable to connect to GitHub.' });
    }
  });

  // Fetch current user profile
  app.get('/api/github/user', async (req, res) => {
    const current = getSession(req);
    if (!current) {
      res.status(401).json({ error: 'Not authenticated. Please connect your GitHub account.' });
      return;
    }

    try {
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${current.session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'RunGit-Developer-Tool',
        },
      });

      if (!userRes.ok) {
        res.status(userRes.status).json({ error: 'Failed to fetch GitHub user details.' });
        return;
      }

      const userData = await userRes.json();
      const updatedUser = {
        login: userData.login,
        id: userData.id,
        avatar_url: userData.avatar_url,
        html_url: userData.html_url,
        name: userData.name || userData.login,
        bio: userData.bio,
        public_repos: userData.public_repos,
        total_private_repos: userData.total_private_repos,
      };

      current.session.user = updatedUser;
      res.json(updatedUser);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Error communicating with GitHub API.' });
    }
  });

  // Fetch repositories belonging to the authenticated GitHub user
  app.get('/api/github/repos', async (req, res) => {
    const current = getSession(req);
    const accessToken = current?.session?.accessToken;
    if (!accessToken) {
      res.status(401).json({
        error: 'Not authenticated. Please connect your GitHub account.',
        apiStatus: '401 Unauthorized',
        repositories: [],
        totalCount: 0,
        scopes: '',
        hasRepoScope: false,
      });
      return;
    }

    const username = current?.session?.user?.login;

    try {
      console.log(`[RunGit] Fetching repositories from GitHub for user: ${username || 'authenticated'}`);

      // GitHub REST API: GET /user/repos
      // Query parameters:
      // - affiliation: owner,collaborator,organization_member (ensure org and collab repos are included)
      // - visibility: all (ensure both private and public repos are requested)
      // - sort: updated
      // - per_page: 100
      let allItems: any[] = [];
      let nextUrl: string | null = 'https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member&visibility=all';
      let lastStatus = 200;
      let lastStatusText = 'OK';
      let scopesHeader = current.session.scopes || '';
      let pageCount = 0;
      const MAX_PAGES = 5; // Support up to 500 repositories

      while (nextUrl && pageCount < MAX_PAGES) {
        pageCount++;
        const currentUrl: string = nextUrl;
        const ghRes: Response = await fetch(currentUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'RunGit-Developer-Tool',
          },
        });

        lastStatus = ghRes.status;
        lastStatusText = ghRes.statusText;
        const respScopes = ghRes.headers.get('x-oauth-scopes');
        if (respScopes) {
          scopesHeader = respScopes;
          current.session.scopes = respScopes;
        }

        if (!ghRes.ok) {
          const errData = await ghRes.json().catch(() => ({ message: ghRes.statusText }));
          console.error(`[RunGit] GitHub API /user/repos returned error ${ghRes.status}:`, errData.message);
          res.status(ghRes.status).json({
            error: `GitHub API error (${ghRes.status} ${ghRes.statusText}): ${errData.message || 'Failed to fetch repositories'}`,
            apiStatus: `${ghRes.status} ${ghRes.statusText}`,
            scopes: scopesHeader,
            repositories: [],
            totalCount: 0,
            hasRepoScope: scopesHeader.toLowerCase().includes('repo'),
            username: username || 'unknown',
          });
          return;
        }

        const items = await ghRes.json();
        if (Array.isArray(items)) {
          allItems = allItems.concat(items);
        }

        // Check Link header for pagination
        const linkHeader: string | null = ghRes.headers.get('link');
        if (linkHeader && linkHeader.includes('rel="next"')) {
          const match: RegExpMatchArray | null = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
          nextUrl = match ? match[1] : null;
        } else {
          nextUrl = null;
        }
      }

      // If user/repos returned 0, try secondary fallback to GET /users/{username}/repos in case of token permission nuances
      if (allItems.length === 0 && username) {
        try {
          const fallbackRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'RunGit-Developer-Tool',
            },
          });
          if (fallbackRes.ok) {
            const fallbackItems = await fallbackRes.json();
            if (Array.isArray(fallbackItems) && fallbackItems.length > 0) {
              allItems = allItems.concat(fallbackItems);
            }
          }
        } catch (fallbackErr) {
          console.warn('[RunGit] Fallback fetch for user repos error:', fallbackErr);
        }
      }

      // Deduplicate repositories by ID
      const seen = new Set<string>();
      const uniqueItems = allItems.filter((item: any) => {
        if (!item || !item.id) return false;
        const idStr = String(item.id);
        if (seen.has(idStr)) return false;
        seen.add(idStr);
        return true;
      });

      const repositories = uniqueItems.map((item: any) => ({
        id: String(item.id),
        name: item.name,
        description: item.description || 'No description provided.',
        owner: item.owner?.login || username || 'unknown',
        visibility: item.private ? 'private' : 'public',
        language: item.language || 'Plain Text',
        framework: detectFramework(item.language, item.name, item.topics),
        lastUpdated: formatRelativeTime(item.updated_at),
        stars: item.stargazers_count,
        branch: item.default_branch || 'main',
        defaultPort: 5173,
        htmlUrl: item.html_url,
        isRealGitHub: true,
        forksCount: item.forks_count,
        openIssuesCount: item.open_issues_count,
        archived: item.archived,
      }));

      const scopeList = scopesHeader.split(',').map((s: string) => s.trim().toLowerCase());
      const hasRepoScope = scopeList.includes('repo');

      console.log(`[RunGit] Repositories API: Received ${repositories.length} repos for @${username}. Scopes: [${scopesHeader}]. hasRepoScope: ${hasRepoScope}`);

      res.json({
        repositories,
        totalCount: repositories.length,
        apiStatus: `${lastStatus} ${lastStatusText}`,
        scopes: scopesHeader || 'none',
        hasRepoScope,
        username: username || 'unknown',
      });
    } catch (err: any) {
      console.error('[RunGit] Error processing /api/github/repos:', err);
      res.status(500).json({
        error: err?.message || 'Unable to load repositories from GitHub.',
        apiStatus: '500 Internal Server Error',
        repositories: [],
        totalCount: 0,
        scopes: '',
        hasRepoScope: false,
        username: username || 'unknown',
      });
    }
  });

  // Disconnect GitHub endpoint
  app.post('/api/github/disconnect', (req, res) => {
    const current = getSession(req);
    if (current) {
      sessions.delete(current.sessionId);
    }
    res.clearCookie('rungit_session', { path: '/' });
    res.json({ success: true, message: 'Disconnected from GitHub.' });
  });

  // Step 3: Retrieve selected repository archive and extract into isolated workspace
  app.post('/api/repositories/retrieve', async (req, res) => {
    const { owner, repo, ref } = req.body || {};

    if (!owner || !repo) {
      res.status(400).json({
        success: false,
        error: "Missing required parameters: 'owner' and 'repo' are required.",
      });
      return;
    }

    const current = getSession(req);
    const accessToken = current?.session?.accessToken;

    if (!accessToken) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated. Please connect your GitHub account with repository permissions.',
      });
      return;
    }

    try {
      const workspace = await retrieveRepository({
        owner: String(owner),
        repo: String(repo),
        ref: ref ? String(ref) : undefined,
        accessToken,
      });

      // Respond with retrieval success - NEVER expose tokens, secrets, or internal server paths
      res.json({
        success: true,
        repository: workspace.repo,
        owner: workspace.owner,
        ref: workspace.ref,
        status: 'retrieved',
        workspaceId: workspace.workspaceId,
        fileCount: workspace.fileCount,
        topLevelEntries: workspace.topLevelEntries,
        retrievedAt: new Date(workspace.retrievedAt).toISOString(),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve repository.';
      console.error(`[RunGit] Error retrieving repository ${owner}/${repo}:`, message);

      let statusCode = 500;
      if (message.includes('not found')) statusCode = 404;
      else if (message.includes('Access denied') || message.includes('repo scope')) statusCode = 403;
      else if (message.includes('Authentication') || message.includes('expired')) statusCode = 401;
      else if (message.includes('Invalid repository') || message.includes('empty')) statusCode = 400;

      res.status(statusCode).json({
        success: false,
        error: message,
      });
    }
  });

  // Step 3: Status check endpoint for a retrieved workspace
  app.get('/api/repositories/workspace/:workspaceId', (req, res) => {
    const { workspaceId } = req.params;
    const ws = getWorkspace(workspaceId);
    if (!ws) {
      res.status(404).json({ success: false, error: 'Workspace not found or expired.' });
      return;
    }
    res.json({
      success: true,
      repository: ws.repo,
      owner: ws.owner,
      ref: ws.ref,
      status: 'retrieved',
      workspaceId: ws.workspaceId,
      fileCount: ws.fileCount,
      topLevelEntries: ws.topLevelEntries,
      retrievedAt: new Date(ws.retrievedAt).toISOString(),
    });
  });

  // Step 4: Project Detection endpoint (POST with workspaceId)
  app.post('/api/repositories/detect', async (req, res) => {
    const { workspaceId } = req.body;
    if (!workspaceId || typeof workspaceId !== 'string') {
      res.status(400).json({ success: false, error: 'workspaceId is required.' });
      return;
    }

    const ws = getWorkspace(workspaceId);
    if (!ws) {
      res.status(404).json({ success: false, error: 'Workspace not found or expired.' });
      return;
    }

    try {
      console.log(`[RunGit] Step 4: Detecting project for workspace ${workspaceId} (${ws.owner}/${ws.repo})...`);
      const detection = await detectProject(ws.sourcePath);
      console.log(`[RunGit] Step 4: Detection finished for ${ws.owner}/${ws.repo}: supported=${detection.supported}, type=${detection.projectType}`);

      res.json({
        success: true,
        workspaceId: ws.workspaceId,
        repository: ws.repo,
        owner: ws.owner,
        detection,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Project detection failed.';
      console.error(`[RunGit] Error during project detection:`, message);
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  });

  // Step 4: Project Detection endpoint (GET with param)
  app.get('/api/repositories/detect/:workspaceId', async (req, res) => {
    const { workspaceId } = req.params;
    const ws = getWorkspace(workspaceId);
    if (!ws) {
      res.status(404).json({ success: false, error: 'Workspace not found or expired.' });
      return;
    }

    try {
      const detection = await detectProject(ws.sourcePath);
      res.json({
        success: true,
        workspaceId: ws.workspaceId,
        repository: ws.repo,
        owner: ws.owner,
        detection,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Project detection failed.';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  });

  // Vite middleware for development / Static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RunGit server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
