import fs from 'fs';
import findWorkspaceRoot from 'find-yarn-workspace-root';
import { join, basename } from 'path';
import glob from 'glob';
const flatten = require('flatten');

export const rootFolder = findWorkspaceRoot(process.cwd()) || process.cwd();
/*
export const nodeModules = glob
  .sync(join(rootFolder, 'node_modules/*'))
  .map((x) => basename(x));
*/
// as per https://yarnpkg.com/blog/2018/02/15/nohoist/ -
// "workspaces" can be an array or an object that contains "packages"
function getPackages(packageJson: any) {
  if (!('workspaces' in packageJson)) {
    return null;
  }
  const { workspaces } = packageJson;
  if (Array.isArray(workspaces)) {
    return workspaces;
  }
  return workspaces.packages || null;
}

export function getWorkspaces() {
  const packages = getPackages(require(join(rootFolder, 'package.json')));
  if (!packages) {
    return [];
  }
  const paths: string[] = flatten(
    packages.map((name: string) => glob.sync(join(rootFolder, name)))
  ).filter((path: string) => fs.existsSync(join(path, 'package.json')));

  return paths.map<{ path: string; name: string; [x: string]: any }>((path) => {
    const packageJson = require(join(path, 'package.json'));
    return {
      ...packageJson,
      path,
    };
  });
}
