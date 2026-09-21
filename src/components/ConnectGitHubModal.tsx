import React, { useState } from 'react';
import { Github, X, ExternalLink, Key, Lock, AlertCircle, Loader2, Copy, Check } from 'lucide-react';

interface ConnectGitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  oauthConfigured: boolean;
  callbackUrl: string;
  isConnecting: boolean;
  authError: string | null;
  onConnectOAuth: () => Promise<void>;
  onConnectToken: (token: string) => Promise<void>;
}

export const ConnectGitHubModal: React.FC<ConnectGitHubModalProps> = ({
  isOpen,
  onClose,
  oauthConfigured,
  callbackUrl,
  isConnecting,
  authError,
  onConnectOAuth,
  onConnectToken,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleOAuthClick = async () => {
    try {
      await onConnectOAuth();
      onClose();
    } catch {
      // Handled by hook
    }
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim() || isConnecting) return;
    try {
      await onConnectToken(tokenInput.trim());
      setTokenInput('');
      onClose();
    } catch {
      // Handled by hook
    }
  };

  const handleCopyCallback = () => {
    if (callbackUrl) {
      navigator.clipboard.writeText(callbackUrl);
      setCopiedCallback(true);
      setTimeout(() => setCopiedCallback(false), 2000);
    }
  };

  return (
    <div
      id="connect-github-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
    >
      <div
        id="connect-github-modal-content"
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow-2xl space-y-5"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/image.png"
              alt="RunGit Logo"
              className="h-8 w-auto object-contain rounded shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 className="text-base font-mono font-bold text-zinc-100">
                Connect GitHub
              </h2>
              <p className="text-xs font-mono text-zinc-400">
                Authenticate RunGit to fetch your repositories
              </p>
            </div>
          </div>
          <button
            id="btn-close-connect-modal"
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error notice if auth failed */}
        {authError && (
          <div
            id="auth-error-banner"
            className="p-3 bg-red-950/30 border border-red-900/50 rounded-md flex items-start gap-2.5 text-xs font-mono text-red-300"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Authentication failure</p>
              <p className="text-red-300/80">{authError}</p>
            </div>
          </div>
        )}

        {/* Method 1: OAuth Web Flow */}
        <div className="space-y-3">
          <button
            id="btn-oauth-connect"
            type="button"
            onClick={handleOAuthClick}
            disabled={isConnecting}
            className={`w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-md text-sm font-mono font-bold transition-colors shadow-sm ${
              !isConnecting
                ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 cursor-pointer active:scale-[0.99]'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700/80 cursor-not-allowed opacity-80'
            }`}
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Connecting to GitHub...</span>
              </>
            ) : (
              <>
                <Github className="w-4 h-4 fill-current" />
                <span>CONNECT WITH GITHUB OAUTH</span>
              </>
            )}
          </button>

          {!oauthConfigured && (
            <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-md text-xs font-mono text-zinc-400 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-amber-400/90 font-medium">OAuth Credentials Required</span>
                <span className="text-[10px] text-zinc-500">GITHUB_CLIENT_ID / SECRET</span>
              </div>
              <p className="text-[11px] text-zinc-500">
                To enable 1-click OAuth, create an OAuth App at{' '}
                <a
                  href="https://github.com/settings/developers"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 underline inline-flex items-center gap-0.5"
                >
                  GitHub Developers <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </p>
              {callbackUrl && (
                <div className="pt-1.5">
                  <span className="text-[10px] text-zinc-400 block mb-1">Authorization callback URL:</span>
                  <div className="flex items-center justify-between p-1.5 bg-zinc-900 rounded border border-zinc-800 text-[11px] text-zinc-300 select-all">
                    <span className="truncate mr-2">{callbackUrl}</span>
                    <button
                      type="button"
                      onClick={handleCopyCallback}
                      className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 shrink-0"
                      title="Copy callback URL"
                    >
                      {copiedCallback ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <span className="relative px-3 bg-zinc-900 text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
            Or use personal access token
          </span>
        </div>

        {/* Method 2: Personal Access Token fallback */}
        <div>
          {!showTokenInput && oauthConfigured ? (
            <button
              type="button"
              onClick={() => setShowTokenInput(true)}
              className="text-xs font-mono text-zinc-400 hover:text-zinc-200 underline underline-offset-2 flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Connect using Personal Access Token instead</span>
            </button>
          ) : (
            <form onSubmit={handleTokenSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="github-token-input" className="text-xs font-mono text-zinc-300 font-medium flex items-center gap-1.5">
                    <Key className="w-3 h-3 text-zinc-400" />
                    <span>GitHub Personal Access Token</span>
                  </label>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo,read:user&description=RunGit"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-mono text-emerald-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Generate token (with repo scope)</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    id="github-token-input"
                    type={showPassword ? 'text' : 'password'}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="ghp_... (Classic) or github_pat_... (Fine-grained)"
                    disabled={isConnecting}
                    autoComplete="off"
                    spellCheck="false"
                    className="w-full px-3 py-2 pr-16 bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-md text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-2 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 hover:text-zinc-300 bg-zinc-900 border border-zinc-800 rounded"
                  >
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
                <div className="p-2 rounded bg-zinc-950/80 border border-zinc-800/80 text-[11px] font-mono text-zinc-400 space-y-1">
                  <p className="flex items-center gap-1.5 text-zinc-300">
                    <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="font-semibold text-zinc-200">Required scope: 'repo'</span>
                  </p>
                  <p className="text-zinc-400 leading-normal">
                    Private repositories (e.g. HiveAI, ResAI, InterviewAI) require the <code className="text-emerald-400 px-1 py-0.5 bg-zinc-900 rounded">repo</code> scope. Classic tokens generated with the link above have this pre-selected.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800"
                >
                  CANCEL
                </button>
                <button
                  id="btn-submit-token"
                  type="submit"
                  disabled={!tokenInput.trim() || isConnecting}
                  className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-mono font-bold text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConnecting ? 'CONNECTING...' : 'AUTHENTICATE'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
