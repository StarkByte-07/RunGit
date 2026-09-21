import { GitHubUser, Repository, AuthStatus, GetReposResult, RetrieveRepoResult, DetectRepoResult } from '../../types/repository';

const SESSION_STORAGE_KEY = 'rungit_auth_session';

/**
 * Get current session ID from storage
 */
export function getSessionId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Set session ID in storage
 */
export function setSessionId(id: string | null): void {
  try {
    if (id) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage restrictions
  }
}

/**
 * Helper to construct authorized request headers
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const sessionId = getSessionId();
  if (sessionId) {
    headers['Authorization'] = `Bearer ${sessionId}`;
  }
  return headers;
}

/**
 * Check authentication status and OAuth server configuration
 */
export async function getAuthStatus(): Promise<AuthStatus> {
  try {
    const response = await fetch('/api/auth/status', {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      return {
        authenticated: false,
        user: null,
        oauthConfigured: false,
        callbackUrl: '',
      };
    }
    return await response.json();
  } catch {
    return {
      authenticated: false,
      user: null,
      oauthConfigured: false,
      callbackUrl: '',
    };
  }
}

/**
 * Fetch OAuth authorization URL from server
 */
export async function getAuthUrl(): Promise<{
  url: string;
  isConfigured: boolean;
  callbackUrl: string;
}> {
  const response = await fetch('/api/auth/github/url');
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to retrieve auth URL' }));
    throw new Error(err.error || 'Failed to retrieve auth URL');
  }
  return response.json();
}

/**
 * Open OAuth popup directly to GitHub's authorization URL and await postMessage callback
 */
export async function authenticateWithGitHub(): Promise<{ success: boolean; sessionId?: string }> {
  const authInfo = await getAuthUrl();

  if (!authInfo.url) {
    throw new Error('OAuth authorization URL could not be retrieved from the server');
  }

  // Open provider's URL directly in a centered popup window
  const width = 600;
  const height = 700;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  const authWindow = window.open(
    authInfo.url,
    'github_oauth_popup',
    `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
  );

  if (!authWindow) {
    throw new Error('Popup was blocked by your browser. Please allow popups for this site.');
  }

  return new Promise((resolve, reject) => {
    let resolved = false;

    const cleanup = () => {
      window.removeEventListener('message', messageHandler);
      clearInterval(popupCheckInterval);
    };

    const messageHandler = (event: MessageEvent) => {
      // Validate origin is from AI Studio preview or localhost
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        resolved = true;
        const sessionId = event.data?.sessionId;
        if (sessionId) {
          setSessionId(sessionId);
        }
        cleanup();
        resolve({ success: true, sessionId });
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        resolved = true;
        cleanup();
        reject(new Error(event.data?.error || 'Authentication was declined or failed'));
      }
    };

    window.addEventListener('message', messageHandler);

    // Track if user manually closed popup without completing
    const popupCheckInterval = setInterval(() => {
      if (authWindow.closed && !resolved) {
        cleanup();
        reject(new Error('Authentication window closed before completing'));
      }
    }, 1000);
  });
}

/**
 * Authenticate via GitHub Personal Access Token (for instant testing if OAuth App is not configured)
 */
export async function authenticateWithToken(token: string): Promise<{
  success: boolean;
  user: GitHubUser;
}> {
  const response = await fetch('/api/auth/github/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token: token.trim() }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to authenticate with GitHub token');
  }

  if (data.sessionId) {
    setSessionId(data.sessionId);
  }

  return {
    success: true,
    user: data.user,
  };
}

/**
 * Fetch authenticated user profile
 */
export async function getCurrentUser(): Promise<GitHubUser> {
  const response = await fetch('/api/github/user', {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to fetch user profile' }));
    throw new Error(err.error || 'Unable to load user profile');
  }

  return response.json();
}

/**
 * Fetch repositories belonging to the authenticated GitHub user
 */
export async function getRepositories(): Promise<GetReposResult> {
  const response = await fetch('/api/github/repos', {
    headers: getAuthHeaders(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || `GitHub API request failed with status ${response.status} ${response.statusText}`;
    throw new Error(errorMsg);
  }

  return {
    repositories: data.repositories || [],
    totalCount: data.totalCount ?? (data.repositories ? data.repositories.length : 0),
    apiStatus: data.apiStatus || `${response.status} ${response.statusText}`,
    scopes: data.scopes || '',
    hasRepoScope: Boolean(data.hasRepoScope),
    username: data.username || '',
  };
}

/**
 * Disconnect authenticated GitHub session
 */
export async function disconnectGitHub(): Promise<void> {
  try {
    await fetch('/api/github/disconnect', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch {
    // Ignore network error on disconnect
  } finally {
    setSessionId(null);
  }
}

/**
 * Step 3: Trigger server-side retrieval and extraction of selected repository archive
 */
export async function retrieveSelectedRepository(params: {
  owner: string;
  repo: string;
  ref?: string;
}): Promise<RetrieveRepoResult> {
  const response = await fetch('/api/repositories/retrieve', {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    const errorMsg = data.error || `Failed to retrieve repository (${response.status} ${response.statusText})`;
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Step 4: Trigger server-side inspection and project detection on retrieved workspace
 */
export async function detectRepositoryProject(workspaceId: string): Promise<DetectRepoResult> {
  const response = await fetch('/api/repositories/detect', {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ workspaceId }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    const errorMsg = data.error || `Failed to detect project (${response.status} ${response.statusText})`;
    throw new Error(errorMsg);
  }

  return data;
}

