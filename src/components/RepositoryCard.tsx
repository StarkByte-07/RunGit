import React from 'react';
import { Repository } from '../types/repository';
import { RunButton } from './RunButton';
import { GitBranch, Clock, Lock, Globe, Star, ExternalLink, GitFork } from 'lucide-react';

interface RepositoryCardProps {
  repository: Repository;
  onRun: (repo: Repository) => void;
  isRunning?: boolean;
}

export const RepositoryCard: React.FC<RepositoryCardProps> = ({
  repository,
  onRun,
  isRunning = false,
}) => {
  return (
    <div
      id={`repo-card-${repository.id}`}
      className="group relative flex flex-col justify-between p-5 bg-zinc-900/60 hover:bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700/90 rounded-lg transition-all duration-150"
    >
      <div>
        {/* Top Header: Owner / Name & Visibility */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-mono text-zinc-400 block mb-0.5">
              {repository.owner}/
            </span>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-bold text-zinc-100 font-mono tracking-tight truncate group-hover:text-emerald-400 transition-colors">
                {repository.name}
              </h3>
              {repository.htmlUrl && (
                <a
                  href={repository.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
                  title="View on GitHub"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider border shrink-0 ${
              repository.visibility === 'private'
                ? 'bg-zinc-800/80 text-amber-300/90 border-amber-500/20'
                : 'bg-zinc-800/60 text-zinc-300 border-zinc-700/60'
            }`}
          >
            {repository.visibility === 'private' ? (
              <Lock className="w-2.5 h-2.5" />
            ) : (
              <Globe className="w-2.5 h-2.5" />
            )}
            {repository.visibility}
          </span>
        </div>

        {/* Short Description */}
        <p className="text-xs text-zinc-400 line-clamp-2 mb-4 leading-relaxed min-h-[2.5rem]">
          {repository.description || 'No description provided.'}
        </p>

        {/* Technical stack & Language tags */}
        <div className="space-y-1.5 mb-4 font-mono text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="text-zinc-400 text-[11px]">Stack:</span>
            <span className="text-zinc-200 font-medium truncate">{repository.framework}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-[11px]">Language:</span>
              <span className="inline-flex items-center gap-1.5 text-zinc-300">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                {repository.language}
              </span>
            </div>

            {/* Stars & Forks indicators */}
            <div className="flex items-center gap-2.5 text-[11px] text-zinc-400">
              {typeof repository.stars === 'number' && repository.stars > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400/90" />
                  {repository.stars}
                </span>
              )}
              {typeof repository.forksCount === 'number' && repository.forksCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <GitFork className="w-3 h-3 text-zinc-400" />
                  {repository.forksCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer: Metadata & RUN button */}
      <div className="pt-3.5 mt-2 border-t border-zinc-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400 truncate">
          <span className="inline-flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3" />
            {repository.lastUpdated}
          </span>
          {repository.branch && (
            <span className="hidden sm:inline-flex items-center gap-1 text-zinc-400 truncate">
              <GitBranch className="w-3 h-3 shrink-0" />
              <span className="truncate">{repository.branch}</span>
            </span>
          )}
        </div>

        <RunButton
          id={`btn-run-${repository.name.toLowerCase()}`}
          onClick={() => onRun(repository)}
          label={isRunning ? 'RUNNING' : 'RUN'}
          disabled={isRunning}
          size="sm"
        />
      </div>
    </div>
  );
};
