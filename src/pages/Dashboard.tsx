import React from 'react';
import { Repository, GitHubUser, RepoDebugInfo } from '../types/repository';
import { SearchBar } from '../components/SearchBar';
import { RepositoryList } from '../components/RepositoryList';
import { Github, CheckCircle2, LogOut, Loader2, Info, X, RefreshCw, Layers, Terminal, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  repositories: Repository[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRunRepository: (repo: Repository) => void;
  runningRepoId?: string | null;
  // Step 2 GitHub Auth & State Props
  isAuthenticated: boolean;
  user: GitHubUser | null;
  isConnecting: boolean;
  isLoadingRepos: boolean;
  authError: string | null;
  repoError: string | null;
  debugInfo: RepoDebugInfo;
  onConnectGitHub: () => void;
  onDisconnect: () => void;
  onRetryFetchRepos: () => void;
  noticeMessage: string | null;
  onDismissNotice: () => void;
  isShowingMockData: boolean;
  onToggleMockData: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  repositories,
  searchQuery,
  onSearchChange,
  onRunRepository,
  runningRepoId,
  isAuthenticated,
  user,
  isConnecting,
  isLoadingRepos,
  authError,
  repoError,
  debugInfo,
  onConnectGitHub,
  onDisconnect,
  onRetryFetchRepos,
  noticeMessage,
  onDismissNotice,
  isShowingMockData,
  onToggleMockData,
}) => {
  const filteredRepositories = repositories.filter((repo) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      repo.name.toLowerCase().includes(q) ||
      repo.description.toLowerCase().includes(q) ||
      repo.framework.toLowerCase().includes(q) ||
      repo.language.toLowerCase().includes(q) ||
      repo.owner.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Notice Banner (for Step 2 Run Button message & Auth warnings) */}
      {noticeMessage && (
        <div
          id="phase-notice-banner"
          className="p-3.5 bg-zinc-900 border border-emerald-500/30 rounded-lg flex items-start justify-between gap-3 text-xs font-mono text-zinc-200 shadow-lg"
        >
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-400">Step 2 Status Notice</p>
              <p className="text-zinc-300 mt-0.5 leading-relaxed">{noticeMessage}</p>
            </div>
          </div>
          <button
            id="btn-dismiss-notice"
            type="button"
            onClick={onDismissNotice}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 transition-colors"
            title="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header / Brand & GitHub Connection Controls */}
      <header className="border-b border-zinc-800 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/image.png"
                alt="RunGit Logo"
                className="h-9 w-auto object-contain rounded shrink-0"
                referrerPolicy="no-referrer"
              />
              <div>
                <h1 className="text-2xl font-black font-mono tracking-tight text-zinc-100">
                  RunGit
                </h1>
                <p className="text-xs font-mono text-zinc-400">
                  GitHub Repository Runner
                </p>
              </div>
            </div>
          </div>

          {/* GitHub Connection State & Controls */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            {isAuthenticated && user ? (
              <div
                id="authenticated-user-panel"
                className="flex items-center gap-3 p-1.5 pr-2.5 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-xs"
              >
                {/* User avatar & handle */}
                <div className="flex items-center gap-2 pl-1">
                  <img
                    src={user.avatar_url}
                    alt={user.login}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full border border-zinc-700 bg-zinc-800"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-zinc-200 leading-tight">
                      @{user.login}
                    </span>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      Connected
                    </span>
                  </div>
                </div>

                {/* Refresh Repositories */}
                <button
                  id="btn-refresh-repos"
                  type="button"
                  onClick={onRetryFetchRepos}
                  disabled={isLoadingRepos}
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
                  title="Refresh Repositories"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRepos ? 'animate-spin' : ''}`} />
                </button>

                {/* Disconnect GitHub */}
                <button
                  id="btn-disconnect-github"
                  type="button"
                  onClick={onDisconnect}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-zinc-400 hover:text-red-400 hover:bg-red-950/20 rounded border border-transparent hover:border-red-900/40 transition-colors"
                  title="Disconnect GitHub Account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">DISCONNECT</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="btn-connect-github-header"
                  type="button"
                  onClick={onConnectGitHub}
                  disabled={isConnecting}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono font-bold text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Connecting to GitHub...</span>
                    </>
                  ) : (
                    <>
                      <Github className="w-3.5 h-3.5 fill-current" />
                      <span>CONNECT GITHUB</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Development Debug Information Panel */}
      <div
        id="rungit-debug-panel"
        className="p-4 bg-zinc-900/90 border border-zinc-700/80 rounded-lg font-mono text-xs text-zinc-300 shadow-md space-y-3"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-zinc-100 uppercase tracking-wider text-[11px]">
              Development Debug Status
            </span>
          </div>
          {debugInfo.timestamp && (
            <span className="text-[10px] text-zinc-500">Updated: {debugInfo.timestamp}</span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
          <div className="p-2 bg-zinc-950/60 rounded border border-zinc-800/60">
            <span className="text-zinc-500 block text-[10px] uppercase font-bold">GitHub Connected</span>
            <span className={`font-bold text-sm ${debugInfo.githubConnected ? 'text-emerald-400' : 'text-zinc-400'}`}>
              {debugInfo.githubConnected ? 'YES' : 'NO'}
            </span>
          </div>

          <div className="p-2 bg-zinc-950/60 rounded border border-zinc-800/60">
            <span className="text-zinc-500 block text-[10px] uppercase font-bold">Authenticated User</span>
            <span className="font-bold text-sm text-zinc-200 truncate block">
              {debugInfo.authenticatedUser || '(none)'}
            </span>
          </div>

          <div className="p-2 bg-zinc-950/60 rounded border border-zinc-800/60">
            <span className="text-zinc-500 block text-[10px] uppercase font-bold">Repository API Status</span>
            <span className={`font-bold text-sm ${debugInfo.apiStatus.includes('200') || debugInfo.apiStatus === 'OK' ? 'text-emerald-400' : (debugInfo.apiStatus === 'idle' ? 'text-zinc-400' : 'text-amber-400')}`}>
              {debugInfo.apiStatus}
            </span>
          </div>

          <div className="p-2 bg-zinc-950/60 rounded border border-zinc-800/60">
            <span className="text-zinc-500 block text-[10px] uppercase font-bold">Repositories Received</span>
            <span className="font-bold text-sm text-emerald-400">
              {debugInfo.repositoriesReceived}
            </span>
          </div>
        </div>

        {/* Extra diagnostic information */}
        <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-zinc-400">
          <div className="truncate">
            <span className="text-zinc-500">API Endpoint: </span>
            <span className="text-zinc-300 font-mono text-[10px]">{debugInfo.endpoint}</span>
          </div>
          <div>
            <span className="text-zinc-500">Granted Scopes: </span>
            <span className={`font-semibold ${debugInfo.hasRepoScope ? 'text-emerald-400' : 'text-amber-400'}`}>
              [{debugInfo.grantedScopes || 'none'}]
            </span>
          </div>
        </div>

        {/* Warning if authenticated user has 0 repositories and missing repo scope */}
        {debugInfo.githubConnected && !debugInfo.hasRepoScope && (
          <div className="p-2.5 bg-amber-950/30 border border-amber-800/50 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Scope Notice:</strong> Current session does not have the <code>repo</code> scope. Private repositories (e.g. HiveAI, ResAI, InterviewAI) require the <code>repo</code> scope.
              </span>
            </div>
            <button
              type="button"
              onClick={onConnectGitHub}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded text-[10px] uppercase shrink-0 transition-colors cursor-pointer"
            >
              Reconnect with Repo Scope
            </button>
          </div>
        )}

        {debugInfo.errorMessage && (
          <div className="p-2.5 bg-red-950/40 border border-red-900/50 rounded text-[11px] text-red-300">
            <strong>API Error:</strong> {debugInfo.errorMessage}
          </div>
        )}
      </div>

      {/* Main Section: Search, Mode indicator, & Repositories list */}
      <section className="space-y-5">
        {/* Source distinction banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isAuthenticated && !isShowingMockData ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-zinc-300 font-medium">
              Data Source:{' '}
              <span className={isAuthenticated && !isShowingMockData ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {isAuthenticated && !isShowingMockData
                  ? `Real GitHub Repositories (@${user?.login || 'user'})`
                  : 'Mock Repository Data (Preview Mode)'}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <button
                id="btn-toggle-mock-data"
                type="button"
                onClick={onToggleMockData}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 underline underline-offset-2 flex items-center gap-1 cursor-pointer"
              >
                <Layers className="w-3 h-3" />
                <span>
                  {isShowingMockData ? 'Switch to Real GitHub Repos' : 'Inspect Mock Repos (Step 1)'}
                </span>
              </button>
            ) : (
              <span className="text-[11px] text-zinc-400">
                Connect GitHub above to load real repositories
              </span>
            )}
          </div>
        </div>

        {/* Search header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold font-mono text-zinc-100">
              Repositories
            </h2>
            <span
              id="repo-count-badge"
              className="px-2 py-0.5 rounded text-xs font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/60"
            >
              {filteredRepositories.length}
            </span>
          </div>

          <div className="w-full sm:w-72">
            <SearchBar
              value={searchQuery}
              onChange={onSearchChange}
              placeholder="Search repositories..."
            />
          </div>
        </div>

        {/* Repository Grid / States */}
        <RepositoryList
          repositories={filteredRepositories}
          onRun={onRunRepository}
          runningRepoId={runningRepoId}
          isLoading={isLoadingRepos}
          error={repoError || authError}
          onRetry={onRetryFetchRepos}
          isAuthenticated={isAuthenticated}
          onConnectGitHub={onConnectGitHub}
          hasSearchFilter={Boolean(searchQuery.trim())}
          hasRepoScope={debugInfo.hasRepoScope}
        />
      </section>
    </div>
  );
};
