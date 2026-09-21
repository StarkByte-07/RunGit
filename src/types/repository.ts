export type RunStatus = 'idle' | 'starting' | 'running' | 'stopped' | 'error' | 'retrieving' | 'retrieved' | 'detecting' | 'detected' | 'unsupported';

export type LogLevel = 'info' | 'step' | 'command' | 'success' | 'stdout' | 'error';

export interface LogEntry {
  id: string;
  timestamp: string;
  text: string;
  type: LogLevel;
}

export interface ProjectDetectionSignal {
  step: 'packageJson' | 'packageManager' | 'framework' | 'bundler' | 'language' | 'monorepo' | 'scripts';
  label: string;
  status: 'passed' | 'failed' | 'warning' | 'info';
  message: string;
  details?: string;
}

export interface ProjectDetectionResult {
  supported: boolean;
  projectType: string;
  framework: string;
  bundler: string;
  language: 'TypeScript' | 'JavaScript' | 'Python' | 'Go' | 'Rust' | 'Java' | 'Other';
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'pip' | 'cargo' | 'maven' | 'unknown';
  hasPackageJson: boolean;
  hasDevScript: boolean;
  devScript?: string;
  reason: string;
  unsupportedReason?: string;
  signals: ProjectDetectionSignal[];
  detectedFeatures?: {
    react: boolean;
    reactDom: boolean;
    vite: boolean;
    viteConfig: string | null;
    typescript: boolean;
    tsconfig: boolean;
    hasRootIndexHtml: boolean;
    hasSrcDir: boolean;
    packageScripts: Record<string, string>;
  };
  inspectedAt: string;
}

export interface DetectRepoResult {
  success: boolean;
  workspaceId: string;
  repository: string;
  owner: string;
  detection: ProjectDetectionResult;
  error?: string;
}

export interface RetrieveRepoResult {
  success: boolean;
  repository: string;
  owner: string;
  ref: string;
  status: 'retrieved';
  workspaceId: string;
  fileCount: number;
  topLevelEntries: string[];
  retrievedAt: string;
  error?: string;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  bio?: string | null;
  public_repos?: number;
  total_private_repos?: number;
}

export interface Repository {
  id: string;
  name: string;
  description: string;
  owner: string;
  visibility: 'public' | 'private';
  language: string;
  framework: string;
  lastUpdated: string;
  stars?: number;
  branch?: string;
  defaultPort?: number;
  htmlUrl?: string;
  isRealGitHub?: boolean;
  forksCount?: number;
  openIssuesCount?: number;
  archived?: boolean;
}

export interface AuthStatus {
  authenticated: boolean;
  user: GitHubUser | null;
  oauthConfigured: boolean;
  callbackUrl: string;
}

export interface RepoDebugInfo {
  githubConnected: boolean;
  authenticatedUser: string | null;
  apiStatus: string;
  repositoriesReceived: number;
  grantedScopes: string;
  hasRepoScope: boolean;
  endpoint: string;
  errorMessage?: string | null;
  timestamp?: string;
}

export interface GetReposResult {
  repositories: Repository[];
  totalCount: number;
  apiStatus: string;
  scopes: string;
  hasRepoScope: boolean;
  username: string;
  error?: string;
}
