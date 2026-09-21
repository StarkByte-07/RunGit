import React from 'react';
import { ExternalLink } from 'lucide-react';

interface PreviewButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const PreviewButton: React.FC<PreviewButtonProps> = ({
  onClick,
  disabled = false,
  className = '',
  id = 'btn-open-preview',
}) => {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-mono font-medium transition-colors duration-150 border ${
        disabled
          ? 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700 hover:border-zinc-600 shadow-sm cursor-pointer active:scale-[0.98]'
      } ${className}`}
    >
      <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
      <span>OPEN PREVIEW</span>
    </button>
  );
};
