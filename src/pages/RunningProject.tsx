import React, { useState } from 'react';
import { Repository, RunStatus, LogEntry, ProjectDetectionResult, RetrieveRepoResult } from '../types/repository';
import { StatusIndicator } from '../components/StatusIndicator';
import { PreviewButton } from '../components/PreviewButton';
import { StopButton } from '../components/StopButton';
import { LogPanel } from '../components/LogPanel';
import { ErrorState } from '../components/ErrorState';
import { ArrowLeft, RotateCcw, AlertTriangle, Info, X, CheckCircle2, Search, FileCode, Check } from 'lucide-react';

interface RunningProjectProps {
  repository: Repository;
  runStatus: RunStatus;
  logs: LogEntry[];
  detection?: ProjectDetectionResult | null;
  workspace?: RetrieveRepoResult | null;
  isSimulating: boolean;
  onStop: () => void;
  onRestart: () => void;
  onBackToRepositories: () => void;
  onReDetect?: () => void;
  onTriggerErrorSim?: () => void;
}

export const RunningProject: React.FC<RunningProjectProps> = ({
  repository,
  runStatus,
  logs,
  detection,
  workspace,
  isSimulating,
  onStop,
  onRestart,
  onBackToRepositories,
  onReDetect,
  onTriggerErrorSim,
}) => {
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const handleOpenPreview = () => {
    setShowPreviewModal(true);
  };

  const isDetectionPhase = runStatus === 'detecting' || runStatus === 'detected' || runStatus === 'unsupported';

  return (
    <div className="space-y-6">
      {/* Top Header / Branding & Navigation */}
      <header className="border-b border-zinc-800 pb-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              id="btn-back-header"
              type="button"
              onClick={onBackToRepositories}
              className="p-1.5 -ml-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
              title="Back to Repositories"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <img
                src="/image.png"
                alt="RunGit Logo"
                className="h-8 w-auto object-contain rounded shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col">
                <h1 className="text-xl font-black font-mono tracking-tight text-zinc-100">
                  RunGit
                </h1>
                <span className="text-[10px] font-mono text-zinc-500 -mt-0.5">
                  GitHub Repository Runner
                </span>
              </div>
            </div>
            <span className="text-zinc-600 font-mono text-sm ml-1">/</span>
            <span className="text-sm font-mono text-zinc-400">
              {runStatus === 'retrieved' || runStatus === 'retrieving'
                ? 'Repository Retrieval'
                : isDetectionPhase
                ? 'Project Detection'
                : 'Running Project'}
            </span>
          </div>

          <button
            id="btn-back-to-repos-top"
            type="button"
            onClick={onBackToRepositories}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK TO REPOSITORIES</span>
          </button>
        </div>
      </header>

      {/* Main Project Control Card */}
      <div className="p-6 bg-zinc-900/70 border border-zinc-800 rounded-lg space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-xs font-mono text-zinc-500">{repository.owner}/</span>
              <h2 className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
                {repository.name}
              </h2>
            </div>
            <p className="text-xs font-mono text-zinc-400 flex items-center gap-2 flex-wrap">
              <span>Stack: {repository.framework}</span>
              <span className="text-zinc-600">•</span>
              <span>Branch: {repository.branch || 'main'}</span>
              {workspace && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-500">Files: {workspace.fileCount}</span>
                </>
              )}
            </p>
          </div>

          {/* Status Display & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <StatusIndicator
              status={runStatus}
              port={runStatus === 'running' ? (repository.defaultPort || 5173) : undefined}
            />

            {(runStatus === 'retrieved' || runStatus === 'retrieving' || runStatus === 'detecting' || runStatus === 'detected' || runStatus === 'unsupported') && (
              <div className="flex items-center gap-2 flex-wrap">
                <PreviewButton
                  onClick={handleOpenPreview}
                  disabled={true}
                  id="btn-preview-disabled-step4"
                />
                {onReDetect && runStatus !== 'detecting' && runStatus !== 'retrieving' && (
                  <button
                    id="btn-redetect-project"
                    type="button"
                    onClick={onReDetect}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-mono font-medium bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-zinc-700 transition-colors cursor-pointer"
                    title="Re-run project detection on retrieved files"
                  >
                    <Search className="w-3.5 h-3.5 text-cyan-400" />
                    <span>RE-INSPECT</span>
                  </button>
                )}
                <button
                  id="btn-restart-project"
                  type="button"
                  onClick={onRestart}
                  disabled={runStatus === 'retrieving' || runStatus === 'detecting'}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-mono font-medium border transition-colors ${
                    runStatus === 'retrieving' || runStatus === 'detecting'
                      ? 'bg-zinc-800/60 text-zinc-500 border-zinc-800 cursor-not-allowed'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700 cursor-pointer'
                  }`}
                  title="Re-retrieve repository archive"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RE-RETRIEVE</span>
                </button>
                <button
                  id="btn-back-to-repos"
                  type="button"
                  onClick={onBackToRepositories}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-mono font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>BACK TO REPOSITORIES</span>
                </button>
              </div>
            )}

            {runStatus === 'running' && (
              <>
                <PreviewButton onClick={handleOpenPreview} />
                <StopButton onClick={onStop} />
              </>
            )}

            {runStatus === 'starting' && (
              <StopButton onClick={onStop} />
            )}

            {runStatus === 'stopped' && (
              <div className="flex items-center gap-2">
                <button
                  id="btn-restart-project"
                  type="button"
                  onClick={onRestart}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-mono font-medium bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RESTART</span>
                </button>
                <button
                  id="btn-back-to-repos"
                  type="button"
                  onClick={onBackToRepositories}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-mono font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>BACK TO REPOSITORIES</span>
                </button>
              </div>
            )}

            {runStatus === 'error' && (
              <div className="flex items-center gap-2">
                <button
                  id="btn-restart-project-err"
                  type="button"
                  onClick={onRestart}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-mono font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>TRY AGAIN</span>
                </button>
                <button
                  id="btn-back-to-repos-err"
                  type="button"
                  onClick={onBackToRepositories}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-mono font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>BACK TO REPOSITORIES</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* STEP 4: ACTIVE INSPECTION IN PROGRESS */}
        {runStatus === 'detecting' && (
          <div
            id="notification-detecting"
            className="p-5 bg-zinc-950/80 border border-cyan-500/40 rounded-lg font-mono space-y-3 text-xs shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="font-bold text-cyan-400 text-sm tracking-wide">
                  PROJECT DETECTION
                </span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Step 4 Running
                </span>
              </div>
              <span className="text-zinc-400 text-xs animate-pulse">
                Inspecting repository files...
              </span>
            </div>
            <p className="text-zinc-300 leading-relaxed">
              Analyzing <span className="text-zinc-100 font-bold">package.json</span>, dependencies, configuration files, and directory layout to verify project compatibility...
            </p>
          </div>
        )}

        {/* STEP 4: SUPPORTED PROJECT DETECTED */}
        {runStatus === 'detected' && (
          <div
            id="notification-detected-supported"
            className="p-6 bg-zinc-950/90 border border-emerald-500/40 rounded-lg font-mono space-y-4 shadow-xl text-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-400 text-sm tracking-wide">
                      PROJECT DETECTED
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Step 4 Complete
                    </span>
                  </div>
                  <p className="text-zinc-200 font-bold text-base mt-0.5">
                    {detection ? `${detection.bundler} + ${detection.framework} + ${detection.language}` : 'Vite + React + TypeScript'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="text-xs text-zinc-400">Status:</span>
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/40">
                  SUPPORTED
                </span>
              </div>
            </div>

            {/* Structured Project Attributes */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Framework</span>
                <span className="text-sm font-bold text-zinc-100">{detection?.framework || 'React'}</span>
              </div>
              <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Bundler</span>
                <span className="text-sm font-bold text-zinc-100">{detection?.bundler || 'Vite'}</span>
              </div>
              <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Language</span>
                <span className="text-sm font-bold text-zinc-100">{detection?.language || 'TypeScript'}</span>
              </div>
              <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Package Manager</span>
                <span className="text-sm font-bold text-zinc-100">{detection?.packageManager || 'npm'}</span>
              </div>
            </div>

            {/* Checklist of Inspection Signals */}
            <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 block mb-1">Inspection Checklist:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {detection?.signals && detection.signals.length > 0 ? (
                  detection.signals.map((sig, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className={sig.status === 'passed' ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>
                        {sig.message}
                      </span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="text-emerald-400">✓ package.json found</div>
                    <div className="text-emerald-400">✓ npm project detected</div>
                    <div className="text-emerald-400">✓ React detected</div>
                    <div className="text-emerald-400">✓ Vite detected</div>
                    <div className="text-emerald-400">✓ TypeScript detected</div>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-zinc-500 pt-1">
              <span>Verified read-only inspection. Project source code is not executed in Step 4.</span>
              <button
                type="button"
                onClick={onBackToRepositories}
                className="text-emerald-400 hover:underline hover:text-emerald-300 font-medium self-start sm:self-auto"
              >
                Back to repositories &rarr;
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: UNSUPPORTED PROJECT DETECTED */}
        {runStatus === 'unsupported' && (
          <div
            id="notification-detected-unsupported"
            className="p-6 bg-zinc-950/90 border border-amber-500/40 rounded-lg font-mono space-y-4 shadow-xl text-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-900/40 pb-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold text-amber-400 text-sm tracking-wide block">
                    PROJECT NOT SUPPORTED
                  </span>
                  <p className="text-zinc-200 font-bold text-sm mt-0.5">
                    ✕ {detection?.reason || 'Unsupported project type detected'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="text-xs text-zinc-400">Status:</span>
                <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/40">
                  NOT SUPPORTED
                </span>
              </div>
            </div>

            <div className="p-4 bg-zinc-900/80 border border-amber-500/30 rounded text-xs space-y-2.5">
              <p className="text-amber-200 font-semibold">
                {detection?.unsupportedReason || detection?.reason}
              </p>
              <div className="text-zinc-400 space-y-1">
                <p className="font-bold text-zinc-300">This prototype currently supports:</p>
                <ul className="list-disc list-inside space-y-0.5 pl-1 text-zinc-300">
                  <li>Vite + React</li>
                  <li>JavaScript / TypeScript</li>
                  <li>Node.js / npm</li>
                </ul>
              </div>
              <p className="text-zinc-500 text-[11px] pt-1">
                Execution is safely prevented. RunGit will not attempt to run unsupported frameworks.
              </p>
            </div>

            <div className="flex items-center justify-end pt-1">
              <button
                id="btn-back-unsupported"
                type="button"
                onClick={onBackToRepositories}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-mono font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>BACK TO REPOSITORIES</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Clear REPOSITORY RETRIEVED Notification Banner (if idle between 3 & 4) */}
        {runStatus === 'retrieved' && (
          <div
            id="notification-retrieved"
            className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-zinc-200 shadow-sm"
          >
            <div className="flex items-start sm:items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-400 text-sm tracking-wide">
                    REPOSITORY RETRIEVED
                  </span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Step 3 Complete
                  </span>
                </div>
                <p className="text-zinc-300 mt-1 leading-relaxed">
                  Source code archive successfully downloaded and extracted into temporary isolated workspace.
                </p>
              </div>
            </div>
            {onReDetect && (
              <button
                type="button"
                onClick={onReDetect}
                className="px-3 py-1.5 rounded bg-emerald-500 text-zinc-950 font-bold hover:bg-emerald-400 font-mono text-xs cursor-pointer"
              >
                INSPECT PROJECT &rarr;
              </button>
            )}
          </div>
        )}

        {/* Informative Stopped Notification */}
        {runStatus === 'stopped' && (
          <div
            id="notification-stopped"
            className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-md flex items-center justify-between text-xs font-mono text-zinc-300"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
              <span>Application stopped.</span>
            </span>
            <button
              type="button"
              onClick={onBackToRepositories}
              className="text-emerald-400 hover:underline hover:text-emerald-300 font-medium cursor-pointer"
            >
              Back to repositories &rarr;
            </button>
          </div>
        )}

        {/* Development testing trigger for ErrorState verification */}
        {onTriggerErrorSim && (
          <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Dev simulation test control:</span>
            <button
              id="btn-simulate-error-toggle"
              type="button"
              onClick={onTriggerErrorSim}
              className="inline-flex items-center gap-1 text-zinc-400 hover:text-red-400 underline underline-offset-2 transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3 h-3 text-zinc-500" />
              {runStatus === 'error' ? 'Reset to Starting' : 'Simulate Startup Error'}
            </button>
          </div>
        )}
      </div>

      {/* Error state if triggered */}
      {runStatus === 'error' && (
        <ErrorState
          title="Unable to inspect this repository."
          message={`An error occurred while retrieving or inspecting ${repository.name}. Check the logs below.`}
          onViewLogs={() => {
            const el = document.getElementById('log-panel-container');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onRetry={onRestart}
          onBack={onBackToRepositories}
        />
      )}

      {/* Terminal Log Panel */}
      <LogPanel logs={logs} isSimulating={isSimulating} />

      {/* Preview Modal Notification */}
      {showPreviewModal && (
        <div
          id="preview-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
        >
          <div
            id="preview-modal-content"
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-mono font-bold text-zinc-100">
                    Application Preview
                  </h3>
                  <p className="text-xs font-mono text-zinc-400">
                    {repository.name} — Port {repository.defaultPort || 5173}
                  </p>
                </div>
              </div>
              <button
                id="btn-close-preview-modal"
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-zinc-950 rounded-md border border-zinc-800/80 text-xs font-mono text-zinc-300 leading-relaxed space-y-2">
              <p className="text-zinc-200 font-medium">
                Preview will be available in Step 5 when sandbox execution is implemented.
              </p>
              <p className="text-zinc-500 text-[11px]">
                Step 4 validates project structure (Vite + React). Sandboxed container execution and browser preview are implemented in subsequent steps.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                id="btn-dismiss-preview-modal"
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded text-xs font-mono font-medium transition-colors cursor-pointer"
              >
                GOT IT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
