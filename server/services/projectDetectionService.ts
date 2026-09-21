import fs from 'fs';
import path from 'path';

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
  detectedFeatures: {
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

/**
 * Inspects a retrieved workspace directory and determines whether it is a supported
 * Vite + React project (JavaScript or TypeScript).
 *
 * STRICT BOUNDARIES:
 * - Read-only file inspection.
 * - No process execution, no npm execution, no code loading.
 * - Safe path handling to prevent any traversal outside workspace.
 */
export async function detectProject(sourcePath: string): Promise<ProjectDetectionResult> {
  const inspectedAt = new Date().toISOString();
  const signals: ProjectDetectionSignal[] = [];

  // Default empty features
  const detectedFeatures = {
    react: false,
    reactDom: false,
    vite: false,
    viteConfig: null as string | null,
    typescript: false,
    tsconfig: false,
    hasRootIndexHtml: false,
    hasSrcDir: false,
    packageScripts: {} as Record<string, string>,
  };

  // 1. Verify workspace source directory exists
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isDirectory()) {
    signals.push({
      step: 'packageJson',
      label: 'Workspace Inspection',
      status: 'failed',
      message: 'Workspace directory not found or unreadable.',
    });
    return {
      supported: false,
      projectType: 'unknown',
      framework: 'None',
      bundler: 'None',
      language: 'Other',
      packageManager: 'unknown',
      hasPackageJson: false,
      hasDevScript: false,
      reason: 'Workspace source directory not found.',
      unsupportedReason: 'Workspace source directory not found.',
      signals,
      detectedFeatures,
      inspectedAt,
    };
  }

  // 2. Check for non-Node ecosystems first if package.json is missing
  const packageJsonPath = path.join(sourcePath, 'package.json');
  const hasPackageJson = fs.existsSync(packageJsonPath);

  if (!hasPackageJson) {
    signals.push({
      step: 'packageJson',
      label: 'package.json check',
      status: 'failed',
      message: 'package.json not found',
      details: 'A valid package.json file is required in the repository root for Node.js/Vite projects.',
    });

    // Detect language/ecosystem for descriptive reporting
    let nonNodeReason = 'package.json not found.';
    let detectedLang: ProjectDetectionResult['language'] = 'Other';

    if (fs.existsSync(path.join(sourcePath, 'requirements.txt')) ||
        fs.existsSync(path.join(sourcePath, 'pyproject.toml')) ||
        fs.existsSync(path.join(sourcePath, 'setup.py')) ||
        fs.existsSync(path.join(sourcePath, 'Pipfile'))) {
      detectedLang = 'Python';
      nonNodeReason = 'Python project detected (requirements.txt / pyproject.toml found). Python backends (Flask, Django, FastAPI) are not supported in this prototype.';
    } else if (fs.existsSync(path.join(sourcePath, 'Cargo.toml'))) {
      detectedLang = 'Rust';
      nonNodeReason = 'Rust project detected (Cargo.toml found). Rust projects are not supported in this prototype.';
    } else if (fs.existsSync(path.join(sourcePath, 'go.mod'))) {
      detectedLang = 'Go';
      nonNodeReason = 'Go project detected (go.mod found). Go projects are not supported in this prototype.';
    } else if (fs.existsSync(path.join(sourcePath, 'pom.xml')) || fs.existsSync(path.join(sourcePath, 'build.gradle'))) {
      detectedLang = 'Java';
      nonNodeReason = 'Java/JVM project detected (pom.xml / build.gradle found). Java projects (Spring Boot) are not supported in this prototype.';
    } else if (fs.existsSync(path.join(sourcePath, 'pubspec.yaml'))) {
      detectedLang = 'Other';
      nonNodeReason = 'Flutter/Dart project detected (pubspec.yaml found). Flutter projects are not supported in this prototype.';
    } else if (fs.existsSync(path.join(sourcePath, 'Dockerfile'))) {
      nonNodeReason = 'Docker-only configuration detected without package.json. Standalone Docker execution is not supported in this prototype.';
    }

    return {
      supported: false,
      projectType: detectedLang !== 'Other' ? `unsupported-${detectedLang.toLowerCase()}` : 'unsupported-no-package-json',
      framework: 'None',
      bundler: 'None',
      language: detectedLang,
      packageManager: 'unknown',
      hasPackageJson: false,
      hasDevScript: false,
      reason: nonNodeReason,
      unsupportedReason: nonNodeReason,
      signals,
      detectedFeatures,
      inspectedAt,
    };
  }

  // 3. package.json exists: parse and validate
  signals.push({
    step: 'packageJson',
    label: 'package.json check',
    status: 'passed',
    message: '✓ package.json found',
  });

  let packageJson: any;
  try {
    const rawContent = fs.readFileSync(packageJsonPath, 'utf8');
    packageJson = JSON.parse(rawContent);
  } catch (err) {
    signals.push({
      step: 'packageJson',
      label: 'package.json validation',
      status: 'failed',
      message: 'Invalid package.json syntax',
      details: err instanceof Error ? err.message : 'JSON parse error',
    });
    return {
      supported: false,
      projectType: 'unsupported-invalid-json',
      framework: 'None',
      bundler: 'None',
      language: 'JavaScript',
      packageManager: 'npm',
      hasPackageJson: true,
      hasDevScript: false,
      reason: 'Invalid package.json.',
      unsupportedReason: 'Invalid package.json file syntax.',
      signals,
      detectedFeatures,
      inspectedAt,
    };
  }

  // Check for monorepo configuration
  const hasWorkspacesField = Boolean(packageJson.workspaces);
  const hasPnpmWorkspace = fs.existsSync(path.join(sourcePath, 'pnpm-workspace.yaml'));
  const hasLernaJson = fs.existsSync(path.join(sourcePath, 'lerna.json'));
  const hasTurboJson = fs.existsSync(path.join(sourcePath, 'turbo.json'));
  const hasNxJson = fs.existsSync(path.join(sourcePath, 'nx.json'));

  // Check for multi-package directory layout
  let hasMultiplePackages = false;
  const packagesDir = path.join(sourcePath, 'packages');
  const appsDir = path.join(sourcePath, 'apps');
  if (fs.existsSync(packagesDir) && fs.statSync(packagesDir).isDirectory()) {
    const subEntries = fs.readdirSync(packagesDir);
    if (subEntries.some(sub => fs.existsSync(path.join(packagesDir, sub, 'package.json')))) {
      hasMultiplePackages = true;
    }
  }
  if (fs.existsSync(appsDir) && fs.statSync(appsDir).isDirectory()) {
    const subEntries = fs.readdirSync(appsDir);
    if (subEntries.some(sub => fs.existsSync(path.join(appsDir, sub, 'package.json')))) {
      hasMultiplePackages = true;
    }
  }

  if (hasWorkspacesField || hasPnpmWorkspace || hasLernaJson || hasTurboJson || hasNxJson || hasMultiplePackages) {
    signals.push({
      step: 'monorepo',
      label: 'Monorepo inspection',
      status: 'failed',
      message: '✕ Complex monorepo structure detected',
      details: 'Multiple independent packages or workspace configurations detected. Complex monorepo execution is unsupported in this prototype.',
    });
    return {
      supported: false,
      projectType: 'unsupported-monorepo',
      framework: 'Multiple / Monorepo',
      bundler: 'Unknown',
      language: 'JavaScript',
      packageManager: hasPnpmWorkspace ? 'pnpm' : 'npm',
      hasPackageJson: true,
      hasDevScript: false,
      reason: 'Complex monorepo structure detected.',
      unsupportedReason: 'Complex monorepo structure detected. Independent application target cannot be safely determined.',
      signals,
      detectedFeatures,
      inspectedAt,
    };
  }

  // 4. Determine package manager & lockfile signals
  let packageManager: ProjectDetectionResult['packageManager'] = 'npm';
  if (fs.existsSync(path.join(sourcePath, 'package-lock.json'))) {
    packageManager = 'npm';
  } else if (fs.existsSync(path.join(sourcePath, 'bun.lock')) || fs.existsSync(path.join(sourcePath, 'bun.lockb'))) {
    packageManager = 'bun';
  } else if (fs.existsSync(path.join(sourcePath, 'yarn.lock'))) {
    packageManager = 'yarn';
  } else if (fs.existsSync(path.join(sourcePath, 'pnpm-lock.yaml'))) {
    packageManager = 'pnpm';
  }

  signals.push({
    step: 'packageManager',
    label: 'Package Manager',
    status: 'passed',
    message: '✓ npm project detected',
    details: `Package manager ecosystem: ${packageManager}`,
  });

  // Extract dependencies and devDependencies
  const dependencies = packageJson.dependencies || {};
  const devDependencies = packageJson.devDependencies || {};
  const allDeps = { ...dependencies, ...devDependencies };
  const scripts = packageJson.scripts || {};
  detectedFeatures.packageScripts = scripts;

  // 5. Inspect for UNSUPPORTED frameworks explicitly
  if (allDeps['next'] || fs.existsSync(path.join(sourcePath, 'next.config.js')) || fs.existsSync(path.join(sourcePath, 'next.config.mjs')) || fs.existsSync(path.join(sourcePath, 'next.config.ts'))) {
    signals.push({
      step: 'framework',
      label: 'Framework check',
      status: 'failed',
      message: '✕ Next.js project detected',
      details: 'Next.js requires SSR/server runtime not supported by this Vite + React prototype.',
    });
    return {
      supported: false,
      projectType: 'unsupported-nextjs',
      framework: 'Next.js',
      bundler: 'Turbopack/Webpack',
      language: allDeps['typescript'] || fs.existsSync(path.join(sourcePath, 'tsconfig.json')) ? 'TypeScript' : 'JavaScript',
      packageManager,
      hasPackageJson: true,
      hasDevScript: Boolean(scripts.dev || scripts.start),
      devScript: scripts.dev || scripts.start,
      reason: 'Next.js project detected.',
      unsupportedReason: 'Next.js project detected. RunGit prototype currently only supports Vite + React.',
      signals,
      detectedFeatures,
      inspectedAt,
    };
  }

  if ((allDeps['vue'] || allDeps['@vue/runtime-core']) && !allDeps['react']) {
    signals.push({
      step: 'framework',
      label: 'Framework check',
      status: 'failed',
      message: '✕ Vue.js project detected',
      details: 'Vue.js projects are not supported in this prototype.',
    });
    return {
      supported: false,
      projectType: 'unsupported-vue',
      framework: 'Vue',
      bundler: allDeps['vite'] ? 'Vite' : 'Unknown',
      language: allDeps['typescript'] ? 'TypeScript' : 'JavaScript',
      packageManager,
      hasPackageJson: true,
      hasDevScript: Boolean(scripts.dev || scripts.start),
      devScript: scripts.dev || scripts.start,
      reason: 'Vue project detected.',
      unsupportedReason: 'Vue project detected. RunGit prototype currently only supports Vite + React.',
      signals,
      detectedFeatures,
      inspectedAt,
    };
  }

  if (allDeps['@angular/core']) {
    signals.push({
      step: 'framework',
      label: 'Framework check',
      status: 'failed',
      message: '✕ Angular project detected',
    });
    return {
      supported: false,
      projectType: 'unsupported-angular',
      framework: 'Angular',
      bundler: 'Webpack',
      language: 'TypeScript',
      packageManager,
      hasPackageJson: true,
      hasDevScript: Boolean(scripts.start),
      devScript: scripts.start,
      reason: 'Angular project detected.',
      unsupportedReason: 'Angular project detected. RunGit prototype currently only supports Vite + React.',
      signals,
      detectedFeatures,
      inspectedAt,
    };
  }

  if (allDeps['svelte'] || allDeps['@sveltejs/kit']) {
    signals.push({
      step: 'framework',
      label: 'Framework check',
      status: 'failed',
      message: '✕ Svelte project detected',
    });
    return {
      supported: false,
      projectType: 'unsupported-svelte',
      framework: 'Svelte',
      bundler: allDeps['vite'] ? 'Vite' : 'Rollup',
      language: allDeps['typescript'] ? 'TypeScript' : 'JavaScript',
      packageManager,
      hasPackageJson: true,
      hasDevScript: Boolean(scripts.dev),
      devScript: scripts.dev,
      reason: 'Svelte project detected.',
      unsupportedReason: 'Svelte project detected. RunGit prototype currently only supports Vite + React.',
      signals,
      detectedFeatures,
      inspectedAt,
    };
  }

  // 6. Check React indicators
  const hasReact = Boolean(allDeps['react']);
  const hasReactDom = Boolean(allDeps['react-dom']);
  detectedFeatures.react = hasReact;
  detectedFeatures.reactDom = hasReactDom;

  if (hasReact && hasReactDom) {
    signals.push({
      step: 'framework',
      label: 'Framework check',
      status: 'passed',
      message: '✓ React detected',
      details: `react@${allDeps['react']}, react-dom@${allDeps['react-dom']}`,
    });
  } else {
    signals.push({
      step: 'framework',
      label: 'Framework check',
      status: 'failed',
      message: '✕ React not detected',
      details: 'Missing react or react-dom in dependencies.',
    });
  }

  // 7. Check Vite indicators
  const viteConfigFiles = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs', 'vite.config.cjs'];
  let detectedViteConfig: string | null = null;
  for (const cfg of viteConfigFiles) {
    if (fs.existsSync(path.join(sourcePath, cfg))) {
      detectedViteConfig = cfg;
      break;
    }
  }

  const hasViteDep = Boolean(allDeps['vite']);
  const devScriptCommand = scripts.dev || scripts.start || scripts.serve || '';
  const devScriptMentionsVite = typeof devScriptCommand === 'string' && devScriptCommand.includes('vite');

  detectedFeatures.vite = hasViteDep || Boolean(detectedViteConfig);
  detectedFeatures.viteConfig = detectedViteConfig;

  if (hasViteDep || detectedViteConfig || devScriptMentionsVite) {
    signals.push({
      step: 'bundler',
      label: 'Bundler check',
      status: 'passed',
      message: '✓ Vite detected',
      details: detectedViteConfig ? `Configuration: ${detectedViteConfig}` : 'vite dependency found in package.json',
    });
  } else {
    signals.push({
      step: 'bundler',
      label: 'Bundler check',
      status: 'failed',
      message: '✕ Vite not detected',
      details: 'No vite dependency or vite.config file located.',
    });
  }

  // Check additional Vite layout conventions: index.html at root, src/ dir
  const hasRootIndexHtml = fs.existsSync(path.join(sourcePath, 'index.html'));
  const hasSrcDir = fs.existsSync(path.join(sourcePath, 'src')) && fs.statSync(path.join(sourcePath, 'src')).isDirectory();
  detectedFeatures.hasRootIndexHtml = hasRootIndexHtml;
  detectedFeatures.hasSrcDir = hasSrcDir;

  // 8. Check Language indicators (TypeScript vs JavaScript)
  const hasTsDep = Boolean(allDeps['typescript']);
  const hasTsConfig = fs.existsSync(path.join(sourcePath, 'tsconfig.json'));
  let hasTsFiles = false;

  if (hasSrcDir) {
    try {
      const srcFiles = fs.readdirSync(path.join(sourcePath, 'src'));
      hasTsFiles = srcFiles.some(f => f.endsWith('.ts') || f.endsWith('.tsx'));
    } catch {
      // Ignore read errors
    }
  }

  const isTypeScript = Boolean(hasTsDep || hasTsConfig || hasTsFiles || (detectedViteConfig && detectedViteConfig.endsWith('.ts')));
  detectedFeatures.typescript = isTypeScript;
  detectedFeatures.tsconfig = hasTsConfig;

  const detectedLanguage: ProjectDetectionResult['language'] = isTypeScript ? 'TypeScript' : 'JavaScript';
  signals.push({
    step: 'language',
    label: 'Language check',
    status: 'passed',
    message: isTypeScript ? '✓ TypeScript detected' : '✓ JavaScript detected',
    details: isTypeScript ? 'TypeScript config and/or source files found' : 'Standard JavaScript project',
  });

  // 9. Inspect usable development script
  // Prefer 'dev', fallback to 'start' or 'serve' if they call vite
  let chosenDevScript: string | undefined = undefined;
  if (scripts.dev) {
    chosenDevScript = 'dev';
  } else if (scripts.start && (typeof scripts.start === 'string' && scripts.start.includes('vite'))) {
    chosenDevScript = 'start';
  } else if (scripts.serve && (typeof scripts.serve === 'string' && scripts.serve.includes('vite'))) {
    chosenDevScript = 'serve';
  } else if (scripts.start) {
    chosenDevScript = 'start';
  }

  const hasDevScript = Boolean(chosenDevScript);
  if (hasDevScript) {
    signals.push({
      step: 'scripts',
      label: 'Development script check',
      status: 'passed',
      message: `✓ Development script found: npm run ${chosenDevScript}`,
      details: scripts[chosenDevScript!],
    });
  } else {
    signals.push({
      step: 'scripts',
      label: 'Development script check',
      status: 'failed',
      message: '✕ No usable development script found in package.json',
      details: 'A "dev" or "start" script is required to execute the project.',
    });
  }

  // 10. Final Determination: Is it a supported Vite + React project?
  const isVite = detectedFeatures.vite;
  const isReact = detectedFeatures.react && detectedFeatures.reactDom;

  if (!isReact) {
    return {
      supported: false,
      projectType: 'unsupported-non-react',
      framework: 'None / Vanilla',
      bundler: isVite ? 'Vite' : 'Unknown',
      language: detectedLanguage,
      packageManager: 'npm',
      hasPackageJson: true,
      hasDevScript,
      devScript: chosenDevScript,
      reason: 'React not detected. Only Vite + React projects are currently supported.',
      unsupportedReason: 'React and react-dom dependencies were not found in package.json.',
      signals,
      detectedFeatures,
      inspectedAt,
    };
  }

  if (!isVite) {
    return {
      supported: false,
      projectType: 'unsupported-non-vite',
      framework: 'React',
      bundler: 'Webpack / Other',
      language: detectedLanguage,
      packageManager: 'npm',
      hasPackageJson: true,
      hasDevScript,
      devScript: chosenDevScript,
      reason: 'Vite bundler not detected. Only Vite + React projects are currently supported.',
      unsupportedReason: 'Project uses React but does not use Vite as the development bundler.',
      signals,
      detectedFeatures,
      inspectedAt,
    };
  }

  if (!hasDevScript) {
    return {
      supported: false,
      projectType: 'vite-react-no-script',
      framework: 'React',
      bundler: 'Vite',
      language: detectedLanguage,
      packageManager: 'npm',
      hasPackageJson: true,
      hasDevScript: false,
      reason: 'No usable development script (such as "dev" or "start") found in package.json.',
      unsupportedReason: 'No usable development script found in package.json. RunGit will not guess or invent a command.',
      signals,
      detectedFeatures,
      inspectedAt,
    };
  }

  // FULLY SUPPORTED: Vite + React (TypeScript or JavaScript)
  return {
    supported: true,
    projectType: 'vite-react',
    framework: 'React',
    bundler: 'Vite',
    language: detectedLanguage,
    packageManager: 'npm',
    hasPackageJson: true,
    hasDevScript: true,
    devScript: scripts[chosenDevScript!] || 'vite',
    reason: `Detected React + Vite project (${detectedLanguage})`,
    signals,
    detectedFeatures,
    inspectedAt,
  };
}
