import { existsSync, readJsonSync } from 'fs-extra';
import { join, resolve } from 'path';
import { CompilerOptions } from 'typescript';
import { getWorkspaces } from './get-workspaces';

const entryPaths = [
  'src-lib/index.ts',
  'src-lib/index.js',
  'src/index.ts',
  'src/index.js',
  'index.js',
];

function findEntry(cwd: string) {
  return entryPaths
    .map((entry) => join(cwd, entry))
    .find((entry) => existsSync(entry));
}

const workspacePackages = getWorkspaces();
const extensions = ['.js', '.ts', '.json'];
function getAllDependencies(dependencies: any = {}): [any, string[]] {
  let workspaces: string[] = [];
  let workspaceNames: string[] = [];
  dependencies = {
    ...dependencies,
  };
  for (let pkg of workspacePackages) {
    if (dependencies[pkg.name]) {
      workspaces.push(pkg.path);
      workspaceNames.push(pkg.name);
      dependencies = {
        ...dependencies,
        ...(pkg.dependencies || {}),
      };
    }
  }

  for (let key of workspaceNames) {
    delete dependencies[key];
  }
  return [dependencies, workspaces];
}

export function getConfig(
  cwd: string,
  command: string,
  forceEnv: 'production' | 'develop' | undefined,
  minify: boolean
) {
  const packageJSON = readJsonSync(resolve(cwd, 'package.json'));
  const config = packageJSON.landa || {};
  let entryFile = config.entryFile ? resolve(config.entryFile) : findEntry(cwd);
  if (!entryFile || !existsSync(entryFile)) {
    // throw new Error(`No input found, tried: \n -${entryPaths.join('\n -')}`);
  }
  const isProduction =
    forceEnv !== undefined ? forceEnv === 'production' : command === 'build';

  if (isProduction) {
    process.env.NODE_ENV = 'production';
  } else {
    process.env.NODE_ENV = 'development';
  }
  const [dependencies, workspaces] = getAllDependencies(
    packageJSON.dependencies
  );

  const typeCheck = config.typeCheck === true;
  const result: LandaConfig = {
    isProduction,
    preload: config.preload ? resolve(cwd, config.preload) : undefined,
    minify: config.minify === true || minify === true,
    packageJSON,
    command,
    dependencies,
    external: config.external || [],
    extensions,
    workspaces,
    rollup: config.rollup,
    cwd,
    env: config.env || {},
    servePort: process.env.PORT || config.servePort || 4004,
    typeCheck,
    invokeConfigPath: config.invokeConfigPath,
    outDir: isProduction
      ? resolve(cwd, config.outDir || 'lib/prod')
      : resolve(cwd, config.devDir || 'lib/dev'),
    invokeOutDir: resolve(cwd, config.invokeOutDir || 'out'),
    invokeConfig: config.invokeConfigPath
      ? tryRequire(resolve(cwd, config.invokeConfigPath || 'invoke.js'))
      : tryRequire(resolve(cwd, 'invoke.js')) ||
        tryRequire(resolve(cwd, 'invoke.json')),
    entryFile,
    tsOutDir: resolve(cwd, config.tsOutDir || 'lib/ts'),
  };
  if (typeCheck) {
    const tsConfigPath = resolve(cwd, 'tsconfig.json');
    if (existsSync(tsConfigPath)) {
      result.tsConfigPath = tsConfigPath;
    }
  }
  return result;
}

export type LandaConfig = {
  isProduction: boolean;
  minify?: boolean;
  preload?: string;
  packageJSON: any;
  command: string;
  extensions: string[];
  dependencies: string[];
  workspaces: string[];
  cwd: string;
  env: { [s: string]: any };
  servePort: number;
  rollup: 'typescript' | 'typescript2' | 'esbuild';
  external: string[];
  typeCheck: boolean;
  tsConfig?: CompilerOptions;
  tsConfigPath?: string;
  outDir: string;
  tsOutDir?: string;
  invokeConfigPath?: string;
  invokeConfig?: any;
  invokeOutDir: string;
  entryFile: string;
};

function tryRequire(file: string) {
  try {
    return require(file);
  } catch {
    return undefined;
  }
}
