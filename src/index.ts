import yargs from 'yargs';
import { build } from './rollup';
import { getWorkspaces } from './get-workspaces';

const cwd = process.cwd();

const { _ } = yargs
  .command('build', 'build the lambda')
  .command('start', 'start the lambda').argv;
const [command, ...rest] = _;

if (command === 'build-all') {
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
