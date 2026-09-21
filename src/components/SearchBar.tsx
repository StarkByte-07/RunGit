import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search repositories...',
  className = '',
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="absolute left-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
      <input
        id="input-repository-search"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-9 py-2 bg-zinc-900/90 hover:bg-zinc-900 focus:bg-zinc-900 border border-zinc-700/80 focus:border-zinc-500 rounded-md text-sm text-zinc-100 placeholder:text-zinc-500 font-mono transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500"
        autoComplete="off"
        spellCheck="false"
      />
      {value && (
        <button
          id="btn-clear-search"
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-800 transition-colors"
          title="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
