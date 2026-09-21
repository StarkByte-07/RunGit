import { useState, useEffect, useCallback } from 'react';
import { GitHubUser, Repository, RepoDebugInfo } from '../types/repository';
import * as githubService from '../services/github/githubService';

export interface UseGitHubReturn {
  isAuthenticated: boolean;
  user: GitHubUser | null;
  repositories: Repository[];
  isConnecting: boolean;
  isLoadingRepos: boolean;
  authError: string | null;
  repoError: string | null;
  oauthConfigured: boolean;
  callbackUrl: string;
  debugInfo: RepoDebugInfo;
  connectWithOAuth: () => Promise<void>;
  connectWithToken: (token: string) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshRepositories: () => Promise<void>;
  clearErrors: () => void;
}

export function useGitHub(): UseGitHubReturn {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [oauthConfigured, setOauthConfigured] = useState<boolean>(false);
  const [callbackUrl, setCallbackUrl] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<RepoDebugInfo>({
    githubConnected: false,
    authenticatedUser: null,
    apiStatus: 'idle',
    repositoriesReceived: 0,
    grantedScopes: '',
    hasRepoScope: false,
    endpoint: 'GET https://api.github.com/user/repos',
    errorMessage: null,
  });

  const clearErrors = useCallback(() => {
    setAuthError(null);
    setRepoError(null);
  }, []);

  // Fetch repositories for the authenticated user
  const fetchRepos = useCallback(async () => {
    setIsLoadingRepos(true);
    setRepoError(null);
    try {
      const result = await githubService.getRepositories();
      setRepositories(result.repositories);
      setDebugInfo((prev) => ({
        ...prev,
        githubConnected: true,
        authenticatedUser: result.username || prev.authenticatedUser,
        apiStatus: result.apiStatus,
        repositoriesReceived: result.totalCount,
        grantedScopes: result.scopes,
        hasRepoScope: result.hasRepoScope,
        endpoint: 'GET https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member&visibility=all',
        errorMessage: null,
        timestamp: new Date().toLocaleTimeString(),
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to load repositories from GitHub.';
      setRepoError(message || 'Unable to load repositories from GitHub.');
      setDebugInfo((prev) => ({
        ...prev,
        apiStatus: 'Error',
        errorMessage: message,
        repositoriesReceived: 0,
        timestamp: new Date().toLocaleTimeString(),
      }));
    } finally {
      setIsLoadingRepos(false);
    }
  }, []);

  // Check existing session on mount
  useEffect(() => {
    let mounted = true;
    async function checkAuth() {
      try {
        const status = await githubService.getAuthStatus();
        if (!mounted) return;
        setOauthConfigured(status.oauthConfigured);
        setCallbackUrl(status.callbackUrl);

        if (status.authenticated && status.user) {
          setIsAuthenticated(true);
          setUser(status.user);
          setDebugInfo((prev) => ({
            ...prev,
            githubConnected: true,
            authenticatedUser: status.user?.login || null,
          }));
          fetchRepos();
        }
      } catch {
        // Not authenticated yet
      }
    }
    checkAuth();
    return () => {
      mounted = false;
    };
  }, [fetchRepos]);

  // Connect using standard OAuth popup flow
  const connectWithOAuth = useCallback(async () => {
    setIsConnecting(true);
    setAuthError(null);
    try {
      await githubService.authenticateWithGitHub();
      const currentUser = await githubService.getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
      setDebugInfo((prev) => ({
        ...prev,
        githubConnected: true,
        authenticatedUser: currentUser.login,
      }));
      await fetchRepos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to GitHub. Please try again.';
      setAuthError(msg || 'Unable to connect to GitHub. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  }, [fetchRepos]);

  // Connect using Token
  const connectWithToken = useCallback(async (token: string) => {
    setIsConnecting(true);
    setAuthError(null);
    try {
      const res = await githubService.authenticateWithToken(token);
      setUser(res.user);
      setIsAuthenticated(true);
      setDebugInfo((prev) => ({
        ...prev,
        githubConnected: true,
        authenticatedUser: res.user.login,
      }));
      await fetchRepos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to GitHub. Please try again.';
      setAuthError(msg || 'Unable to connect to GitHub. Please try again.');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [fetchRepos]);

  // Disconnect GitHub
  const disconnect = useCallback(async () => {
    try {
      await githubService.disconnectGitHub();
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      setRepositories([]);
      setAuthError(null);
      setRepoError(null);
      setDebugInfo({
        githubConnected: false,
        authenticatedUser: null,
        apiStatus: 'idle',
        repositoriesReceived: 0,
        grantedScopes: '',
        hasRepoScope: false,
        endpoint: 'GET https://api.github.com/user/repos',
        errorMessage: null,
      });
    }
  }, []);

  return {
    isAuthenticated,
    user,
    repositories,
    isConnecting,
    isLoadingRepos,
    authError,
    repoError,
    oauthConfigured,
    callbackUrl,
    debugInfo,
    connectWithOAuth,
    connectWithToken,
    disconnect,
    refreshRepositories: fetchRepos,
    clearErrors,
  };
}
