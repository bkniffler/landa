import { existsSync } from 'fs';
import { join, resolve } from 'path';

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

export function getConfig(
  cwd: string,
  command: string,
  forceDev: boolean,
  terser: boolean
): LandaConfig {
  const packageJSON = require(resolve(cwd, 'package.json'));
  const config = packageJSON.landa || {};
  const entryFile = config.entryFile
    ? resolve(config.entryFile)
    : findEntry(cwd);
  if (!entryFile || !existsSync(entryFile)) {
    throw new Error(`No input found, tried: \n -${entryPaths.join('\n -')}`);
  }
  return {
    preload: config.preload ? resolve(cwd, config.preload) : undefined,
    terser: config.terser === true || terser === true,
    packageJSON,
    command,
    forceDev,
    cwd,
    env: config.env || {},
    servePort: config.servePort || 4004,
    typeCheck: config.typeCheck === true,
    invokeConfigPath: config.invokeConfigPath,
    devDir: resolve(cwd, config.devDir || 'lib/dev'),
    outDir: resolve(cwd, config.outDir || 'lib/prod'),
    invokeOutDir: resolve(cwd, config.invokeOutDir || 'out'),
    invokeConfig: config.invokeConfigPath
      ? tryRequire(resolve(cwd, config.invokeConfigPath || 'invoke.js'))
      : tryRequire(resolve(cwd, 'invoke.js')) ||
        tryRequire(resolve(cwd, 'invoke.json')),
    entryFile,
  };
}

export type LandaConfig = {
  terser?: boolean;
  preload?: string;
  packageJSON: any;
  command: string;
  forceDev: boolean;
  cwd: string;
  env: { [s: string]: any };
  servePort: number;
  typeCheck: boolean;
  outDir: string;
  devDir: string;
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
