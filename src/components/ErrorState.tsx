import React from 'react';
import { AlertTriangle, Terminal, RefreshCw, ArrowLeft } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onViewLogs?: () => void;
  onRetry?: () => void;
  onBack?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to start this repository.',
  message = 'Something went wrong while starting the project.',
  onViewLogs,
  onRetry,
  onBack,
  className = '',
}) => {
  return (
    <div
      id="reusable-error-state"
      className={`p-6 bg-red-950/20 border border-red-900/40 rounded-lg text-left ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="space-y-1.5 flex-1">
          <h3 className="text-base font-mono font-semibold text-red-200">
            {title}
          </h3>
          <p className="text-xs text-red-300/80 font-mono leading-relaxed">
            {message}
          </p>

          <div className="pt-4 flex flex-wrap items-center gap-2.5">
            {onViewLogs && (
              <button
                id="btn-error-view-logs"
                type="button"
                onClick={onViewLogs}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-mono font-medium transition-colors cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                <span>VIEW LOGS</span>
              </button>
            )}

            {onRetry && (
              <button
                id="btn-error-retry"
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 text-xs font-mono font-medium transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>RETRY</span>
              </button>
            )}

            {onBack && (
              <button
                id="btn-error-back"
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs font-mono transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>BACK TO REPOSITORIES</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
