import { relative, basename } from 'path';
import yargs from 'yargs';
import { log, deploy } from './aws';
import { snakeToCamel } from './utils';
import { build } from './rollup';
import { getWorkspaces, rootFolder } from './get-workspaces';

const cwd = process.cwd();

const { _ } = yargs
  .command('build', 'build the lambda')
  .command('start', 'start the lambda').argv;
const [command, ...rest] = _;

if (command === 'log' || command === 'logs') {
  const name = snakeToCamel(basename(cwd).split('/').join(''));
  log({ group: `/aws/lambda/${name}` });
} else if (command === 'deploy') {
  (async () => {
    const name = snakeToCamel(basename(cwd).split('/').join(''));
    await deploy(cwd, '', {
      stackNames: [`LambdaV2${name}Stack`, '--outputs-file outputs.json'],
    });
  })();
} else if (command === 'build-all') {
  (async () => {
    const workspaces = getWorkspaces();
    const [glob] = rest;
    for (let item of workspaces) {
      if (glob && !item.path.includes(glob.replace('*', ''))) {
        continue;
      }
      await build(item.path, 'build');
    }
  })();
} else {
  (async () => {
    await build(cwd, command);
  })();
}
