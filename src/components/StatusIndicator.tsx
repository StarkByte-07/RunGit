import React from 'react';
import { RunStatus } from '../types/repository';

interface StatusIndicatorProps {
  status: RunStatus;
  showText?: boolean;
  port?: number;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  showText = true,
  port,
  className = '',
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'retrieving':
        return {
          label: 'Retrieving...',
          dotClass: 'bg-amber-400 animate-pulse',
          textClass: 'text-amber-400',
          badgeClass: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
        };
      case 'retrieved':
        return {
          label: 'Repository Retrieved',
          dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
          textClass: 'text-emerald-400',
          badgeClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
        };
      case 'detecting':
        return {
          label: 'Detecting Project...',
          dotClass: 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.6)]',
          textClass: 'text-cyan-400',
          badgeClass: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
        };
      case 'detected':
        return {
          label: 'SUPPORTED',
          dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
          textClass: 'text-emerald-400',
          badgeClass: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold',
        };
      case 'unsupported':
        return {
          label: 'NOT SUPPORTED',
          dotClass: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
          textClass: 'text-amber-400',
          badgeClass: 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold',
        };
      case 'starting':
        return {
          label: 'Starting...',
          dotClass: 'bg-amber-400 animate-pulse',
          textClass: 'text-amber-400',
          badgeClass: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
        };
      case 'running':
        return {
          label: 'Running',
          dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
          textClass: 'text-emerald-400',
          badgeClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
        };
      case 'stopped':
        return {
          label: 'Stopped',
          dotClass: 'bg-zinc-500',
          textClass: 'text-zinc-400',
          badgeClass: 'bg-zinc-800/60 border-zinc-700 text-zinc-400',
        };
      case 'error':
        return {
          label: 'Error',
          dotClass: 'bg-red-400',
          textClass: 'text-red-400',
          badgeClass: 'bg-red-500/10 border-red-500/30 text-red-300',
        };
      case 'idle':
      default:
        return {
          label: 'Ready',
          dotClass: 'bg-zinc-500',
          textClass: 'text-zinc-400',
          badgeClass: 'bg-zinc-800/40 border-zinc-700 text-zinc-400',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      id={`status-indicator-${status}`}
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-mono border ${config.badgeClass} ${className}`}
    >
      <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
      {showText && (
        <span className="font-medium">
          Status: {config.label}
          {status === 'running' && port && (
            <span className="ml-2 pl-2 border-l border-emerald-500/40 text-emerald-300/90 font-mono">
              Port: {port}
            </span>
          )}
        </span>
      )}
    </div>
  );
};
