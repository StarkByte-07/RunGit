import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types/repository';
import { Terminal, Check, ChevronRight, AlertCircle, Copy, CheckCheck } from 'lucide-react';

interface LogPanelProps {
  logs: LogEntry[];
  isSimulating?: boolean;
  className?: string;
}

export const LogPanel: React.FC<LogPanelProps> = ({
  logs,
  isSimulating = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopyLogs = () => {
    const raw = logs.map((l) => `${l.timestamp ? `[${l.timestamp}] ` : ''}${l.text}`).join('\n');
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="log-panel-container"
      className={`flex flex-col bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden shadow-inner ${className}`}
    >
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800 text-xs font-mono text-zinc-400 select-none">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-zinc-200 tracking-wider">RUN LOG</span>
          <span className="text-[11px] text-zinc-400">({logs.length} lines)</span>
        </div>

        <div className="flex items-center gap-2">
          {isSimulating && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Streaming logs...
            </span>
          )}
          <button
            id="btn-copy-logs"
            type="button"
            onClick={handleCopyLogs}
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors text-[11px]"
            title="Copy logs to clipboard"
          >
            {copied ? (
              <>
                <CheckCheck className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Terminal Content Body */}
      <div
        ref={containerRef}
        id="log-panel-scroll-area"
        className="p-4 overflow-y-auto max-h-[420px] font-mono text-xs leading-relaxed space-y-1.5 bg-zinc-950 text-zinc-300"
      >
        {logs.length === 0 ? (
          <div className="text-zinc-400 py-6 text-center italic font-mono">
            Waiting for startup sequence...
          </div>
        ) : (
          logs.map((log) => {
            const isCommand = log.type === 'command' || log.text.startsWith('>');
            const isSuccess = log.type === 'success' || log.text.startsWith('✓');
            const isError = log.type === 'error' || log.text.startsWith('✗') || log.text.includes('Error:');

            return (
              <div
                key={log.id}
                className="flex items-start gap-2.5 font-mono group hover:bg-zinc-900/30 px-1 py-0.5 rounded transition-colors"
              >
                {log.timestamp && (
                  <span className="text-[11px] text-zinc-400 select-none shrink-0 w-16">
                    {log.timestamp}
                  </span>
                )}

                <div className="flex-1 break-all whitespace-pre-wrap">
                  {isSuccess ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>{log.text.replace(/^✓\s*/, '')}</span>
                    </span>
                  ) : isCommand ? (
                    <span className="inline-flex items-center gap-1.5 text-sky-300 font-medium">
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                      <span>{log.text.replace(/^>\s*/, '')}</span>
                    </span>
                  ) : isError ? (
                    <span className="inline-flex items-center gap-1.5 text-red-400 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{log.text}</span>
                    </span>
                  ) : (
                    <span className={log.text.includes('http://') ? 'text-emerald-300 font-semibold underline underline-offset-2' : 'text-zinc-300'}>
                      {log.text}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Pulsing prompt cursor */}
        {isSimulating && (
          <div className="flex items-center gap-2 text-zinc-400 pt-1">
            <span className="w-2 h-3.5 bg-emerald-400/80 animate-pulse inline-block" />
          </div>
        )}
      </div>
    </div>
  );
};
