import React from 'react';
import { Repository } from '../types/repository';
import { RepositoryCard } from './RepositoryCard';
import { FolderGit2, Loader2, RefreshCw, Github, AlertTriangle } from 'lucide-react';

interface RepositoryListProps {
  repositories: Repository[];
  onRun: (repo: Repository) => void;
  runningRepoId?: string | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  isAuthenticated?: boolean;
  onConnectGitHub?: () => void;
  hasSearchFilter?: boolean;
  hasRepoScope?: boolean;
}

export const RepositoryList: React.FC<RepositoryListProps> = ({
  repositories,
  onRun,
  runningRepoId,
  isLoading = false,
  error = null,
  onRetry,
  isAuthenticated = false,
  onConnectGitHub,
  hasSearchFilter = false,
  hasRepoScope = true,
}) => {
  // Loading state
  if (isLoading) {
    return (
      <div
        id="loading-repositories-state"
        className="flex flex-col items-center justify-center p-16 text-center rounded-lg border border-zinc-800 bg-zinc-900/30 font-mono"
      >
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
        <p className="text-sm text-zinc-200 font-medium mb-1">
          Loading repositories...
        </p>
        <p className="text-xs text-zinc-400">
          Fetching repository metadata from GitHub API
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        id="error-repositories-state"
        className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-red-900/40 bg-red-950/20 font-mono"
      >
        <AlertTriangle className="w-8 h-8 text-red-400 mb-3" />
        <p className="text-sm text-red-200 font-semibold mb-1">
          Unable to load repositories from GitHub.
        </p>
        <p className="text-xs text-red-300/80 mb-4 max-w-md">
          {error}
        </p>
        {onRetry && (
          <button
            id="btn-retry-fetch-repos"
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-mono font-medium transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>RETRY</span>
          </button>
        )}
      </div>
    );
  }

  // Not connected state (when not authenticated and no repositories loaded)
  if (!isAuthenticated && repositories.length === 0) {
    return (
      <div
        id="disconnected-repositories-state"
        className="flex flex-col items-center justify-center p-16 text-center rounded-lg border border-dashed border-zinc-800 bg-zinc-900/20 font-mono"
      >
        <div className="p-3.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 mb-4">
          <Github className="w-8 h-8" />
        </div>
        <p className="text-base text-zinc-200 font-semibold mb-1">
          Connect your GitHub account
        </p>
        <p className="text-xs text-zinc-400 max-w-md mb-5 leading-relaxed">
          Connect GitHub to fetch and run your personal and organization repositories instantly with RunGit.
        </p>
        {onConnectGitHub && (
          <button
            id="btn-connect-github-empty"
            type="button"
            onClick={onConnectGitHub}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono font-bold text-xs rounded transition-colors shadow-sm cursor-pointer"
          >
            <Github className="w-4 h-4 fill-current" />
            <span>CONNECT GITHUB</span>
          </button>
        )}
      </div>
    );
  }

  // Empty state when search produces no results
  if (repositories.length === 0 && hasSearchFilter) {
    return (
      <div
        id="empty-repositories-state"
        className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 font-mono"
      >
        <FolderGit2 className="w-10 h-10 text-zinc-600 mb-3" />
        <p className="text-sm text-zinc-300 font-medium mb-1">
          No repositories found.
        </p>
        <p className="text-xs text-zinc-400">
          Try adjusting your search query to find matching repositories.
        </p>
      </div>
    );
  }

  // Empty state when authenticated account has 0 repositories
  if (repositories.length === 0) {
    return (
      <div
        id="empty-user-repositories-state"
        className="flex flex-col items-center justify-center p-10 text-center rounded-lg border border-zinc-800 bg-zinc-900/30 font-mono"
      >
        <FolderGit2 className="w-10 h-10 text-zinc-500 mb-3" />
        <p className="text-sm text-zinc-200 font-semibold mb-1">
          0 Repositories Found
        </p>
        {!hasRepoScope ? (
          <div className="max-w-md my-3 p-3 bg-amber-950/30 border border-amber-900/50 rounded text-left">
            <p className="text-xs text-amber-300 font-semibold mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              Missing 'repo' Permission Scope
            </p>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              Your current GitHub session was authorized without the <code className="text-amber-300 font-mono">repo</code> scope. Because GitHub enforces privacy boundaries, private repositories (e.g. HiveAI, ResAI, InterviewAI) are hidden from tokens without this scope.
            </p>
          </div>
        ) : (
          <p className="text-xs text-zinc-400 max-w-md mb-4">
            GitHub returned 0 accessible repositories for this account.
          </p>
        )}

        <div className="flex items-center gap-2.5 mt-2">
          {onConnectGitHub && (
            <button
              type="button"
              onClick={onConnectGitHub}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold font-mono transition-colors cursor-pointer shadow-sm"
            >
              <Github className="w-3.5 h-3.5 fill-current" />
              <span>RECONNECT WITH REPO SCOPE</span>
            </button>
          )}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>RETRY FETCH</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      id="repository-list-grid"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {repositories.map((repo) => (
        <RepositoryCard
          key={repo.id}
          repository={repo}
          onRun={onRun}
          isRunning={runningRepoId === repo.id}
        />
      ))}
    </div>
  );
};
