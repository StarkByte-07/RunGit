/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Repository } from './types/repository';
import { MOCK_REPOSITORIES } from './data/mockRepositories';
import { Dashboard } from './pages/Dashboard';
import { RunningProject } from './pages/RunningProject';
import { ConnectGitHubModal } from './components/ConnectGitHubModal';
import { useGitHub } from './hooks/useGitHub';
import { useRepositoryRetrieval } from './hooks/useRepositoryRetrieval';

export default function App() {
  const {
    isAuthenticated,
    user,
    repositories: gitHubRepositories,
    isConnecting,
    isLoadingRepos,
    authError,
    repoError,
    oauthConfigured,
    callbackUrl,
    debugInfo,
    connectWithOAuth,
    connectWithToken,
    disconnect,
    refreshRepositories,
  } = useGitHub();

  const {
    activeRepo,
    runStatus,
    logs: retrievalLogs,
    workspace,
    detection,
    retrieve,
    reDetect,
    reset: resetRetrieval,
    retry: retryRetrieval,
  } = useRepositoryRetrieval();

  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isShowingMockData, setIsShowingMockData] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Active displayed repositories: Real GitHub when authenticated (unless explicitly previewing mock), otherwise Mock data
  const displayedRepositories = isAuthenticated && !isShowingMockData
    ? gitHubRepositories
    : (isAuthenticated ? MOCK_REPOSITORIES : (isShowingMockData ? MOCK_REPOSITORIES : []));

  const handleRunRepository = (repo: Repository) => {
    // Step 3: Trigger server-side repository retrieval (no code execution)
    if (!isAuthenticated) {
      setNoticeMessage('Please connect your GitHub account with repository permissions first to retrieve source code.');
      setIsConnectModalOpen(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    retrieve(repo);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleMockData = () => {
    setIsShowingMockData((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {activeRepo ? (
          <RunningProject
            repository={activeRepo}
            runStatus={runStatus}
            logs={retrievalLogs}
            workspace={workspace}
            detection={detection}
            isSimulating={runStatus === 'retrieving' || runStatus === 'detecting'}
            onStop={resetRetrieval}
            onRestart={retryRetrieval}
            onReDetect={reDetect}
            onBackToRepositories={resetRetrieval}
          />
        ) : (
          <Dashboard
            repositories={displayedRepositories}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRunRepository={handleRunRepository}
            runningRepoId={null}
            isAuthenticated={isAuthenticated}
            user={user}
            isConnecting={isConnecting}
            isLoadingRepos={isLoadingRepos}
            authError={authError}
            repoError={repoError}
            debugInfo={debugInfo}
            onConnectGitHub={() => setIsConnectModalOpen(true)}
            onDisconnect={disconnect}
            onRetryFetchRepos={refreshRepositories}
            noticeMessage={noticeMessage}
            onDismissNotice={() => setNoticeMessage(null)}
            isShowingMockData={isShowingMockData}
            onToggleMockData={handleToggleMockData}
          />
        )}

        {/* Global Developer Tool Footer */}
        <footer className="mt-16 pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-300">RunGit</span>
            <span>•</span>
            <span>GitHub Repository Runner</span>
            <span>•</span>
            <span className="text-emerald-400">Step 4: Project Detection</span>
          </div>
          <div className="text-[11px] text-zinc-400">
            {isAuthenticated
              ? `Connected as @${user?.login || 'user'}`
              : 'Disconnected — Connect GitHub to load repositories'}
          </div>
        </footer>
      </div>

      {/* GitHub Connection & OAuth Modal */}
      <ConnectGitHubModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        oauthConfigured={oauthConfigured}
        callbackUrl={callbackUrl}
        isConnecting={isConnecting}
        authError={authError}
        onConnectOAuth={connectWithOAuth}
        onConnectToken={connectWithToken}
      />
    </div>
  );
}
