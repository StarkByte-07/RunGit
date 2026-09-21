import React from 'react';
import { Square } from 'lucide-react';

interface StopButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const StopButton: React.FC<StopButtonProps> = ({
  onClick,
  disabled = false,
  className = '',
  id = 'btn-stop-project',
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
          : 'bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 border-red-500/30 hover:border-red-500/50 shadow-sm cursor-pointer active:scale-[0.98]'
      } ${className}`}
    >
      <Square className="w-3.5 h-3.5 fill-current" />
      <span>STOP</span>
    </button>
  );
};
