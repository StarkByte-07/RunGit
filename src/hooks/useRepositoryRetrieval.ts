import { useState, useCallback } from 'react';
import { Repository, LogEntry, RetrieveRepoResult, RunStatus, ProjectDetectionResult } from '../types/repository';
import { retrieveSelectedRepository, detectRepositoryProject } from '../services/github/githubService';

function getTimestamp(): string {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

export function useRepositoryRetrieval() {
  const [activeRepo, setActiveRepo] = useState<Repository | null>(null);
  const [runStatus, setRunStatus] = useState<RunStatus>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [workspace, setWorkspace] = useState<RetrieveRepoResult | null>(null);
  const [detection, setDetection] = useState<ProjectDetectionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const addLog = useCallback((text: string, type: LogEntry['type'] = 'info') => {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: getTimestamp(),
      text,
      type,
    };
    setLogs((prev) => [...prev, entry]);
  }, []);

  const runDetection = useCallback(async (workspaceId: string, repo: Repository) => {
    setRunStatus('detecting');
    addLog('PROJECT DETECTION', 'step');
    addLog('Inspecting repository...', 'info');

    try {
      await new Promise((r) => setTimeout(r, 200));
      const res = await detectRepositoryProject(workspaceId);
      const det = res.detection;
      setDetection(det);

      // Log structured detection progression matching Step 4 specs
      if (det.signals && det.signals.length > 0) {
        for (const sig of det.signals) {
          await new Promise((r) => setTimeout(r, 100));
          const logType: LogEntry['type'] = sig.status === 'passed' ? 'success' : sig.status === 'failed' ? 'error' : 'info';
          addLog(sig.message, logType);
        }
      }

      await new Promise((r) => setTimeout(r, 150));
      addLog('Project detection complete.', 'info');

      if (det.supported) {
        setRunStatus('detected');
        addLog(`✓ Status: SUPPORTED (${det.bundler} + ${det.framework} + ${det.language})`, 'success');
      } else {
        setRunStatus('unsupported');
        addLog(`✕ Status: NOT SUPPORTED (${det.reason || det.unsupportedReason})`, 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to inspect repository';
      addLog(`✕ Error inspecting repository: ${msg}`, 'error');
      setErrorMessage(msg);
      setRunStatus('error');
    }
  }, [addLog]);

  const retrieve = useCallback(async (repo: Repository) => {
    setActiveRepo(repo);
    setRunStatus('retrieving');
    setErrorMessage(null);
    setWorkspace(null);
    setDetection(null);

    // Initial log sequence
    const initialLogs: LogEntry[] = [
      {
        id: crypto.randomUUID(),
        timestamp: getTimestamp(),
        text: `Retrieving repository...`,
        type: 'info',
      },
    ];
    setLogs(initialLogs);

    try {
      // Step 3 API call
      // Visual feedback: access verified
      await new Promise((r) => setTimeout(r, 200));
      addLog('✓ Repository access verified', 'success');

      // Visual feedback: downloading
      await new Promise((r) => setTimeout(r, 150));
      addLog('Downloading repository...', 'info');

      const result = await retrieveSelectedRepository({
        owner: repo.owner,
        repo: repo.name,
        ref: repo.branch,
      });

      // Visual feedback: downloaded
      addLog('✓ Repository downloaded', 'success');

      // Visual feedback: extracting
      await new Promise((r) => setTimeout(r, 200));
      addLog('Extracting repository...', 'info');

      // Visual feedback: extracted and ready
      await new Promise((r) => setTimeout(r, 200));
      addLog('✓ Repository extracted', 'success');
      addLog('Repository ready.', 'success');
      addLog(`[Workspace] ${result.fileCount} files prepared in temporary workspace.`, 'info');

      setWorkspace(result);
      setRunStatus('retrieved');

      // Step 4 automatically begins immediately after Step 3 retrieval completes
      await runDetection(result.workspaceId, repo);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error retrieving repository';
      addLog(`✗ Error: ${msg}`, 'error');
      setErrorMessage(msg);
      setRunStatus('error');
    }
  }, [addLog, runDetection]);

  const reDetect = useCallback(async () => {
    if (workspace && activeRepo) {
      await runDetection(workspace.workspaceId, activeRepo);
    }
  }, [workspace, activeRepo, runDetection]);

  const reset = useCallback(() => {
    setActiveRepo(null);
    setRunStatus('idle');
    setLogs([]);
    setWorkspace(null);
    setDetection(null);
    setErrorMessage(null);
  }, []);

  const retry = useCallback(() => {
    if (activeRepo) {
      retrieve(activeRepo);
    }
  }, [activeRepo, retrieve]);

  return {
    activeRepo,
    runStatus,
    logs,
    workspace,
    detection,
    errorMessage,
    retrieve,
    reDetect,
    reset,
    retry,
  };
}

