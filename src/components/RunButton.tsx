import React from 'react';
import { Play } from 'lucide-react';

interface RunButtonProps {
  onClick: (e?: React.MouseEvent) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  label?: string;
  id?: string;
}

export const RunButton: React.FC<RunButtonProps> = ({
  onClick,
  disabled = false,
  size = 'md',
  className = '',
  label = 'RUN',
  id = 'btn-run-project',
}) => {
  const sizeClasses =
    size === 'sm'
      ? 'px-3 py-1.5 text-xs font-semibold gap-1.5'
      : 'px-4 py-2 text-sm font-semibold gap-2';

  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-md font-mono transition-all duration-150 active:scale-[0.98] ${
        disabled
          ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
          : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold border border-emerald-400/80 shadow-sm cursor-pointer'
      } ${sizeClasses} ${className}`}
    >
      <Play className={size === 'sm' ? 'w-3 h-3 fill-current' : 'w-3.5 h-3.5 fill-current'} />
      <span>{label}</span>
    </button>
  );
};
