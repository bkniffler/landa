import yargs from 'yargs';
import { build } from './rollup';
import { getWorkspaces } from './get-workspaces';
import { invoke, serve } from './dev';
import { getConfig } from './config';

(async () => {
  const cwd = process.cwd();

  const { _, d, pc, t } = yargs
    .option('d', {
      alias: 'dev',
      describe: 'Is Develop?',
      type: 'boolean',
    })
    .option('t', {
      alias: 'terser',
      describe: 'Use terser?',
      type: 'boolean',
    })
    .option('pc', {
      alias: 'print-config',
      describe: 'Print configuration?',
      type: 'boolean',
    })
    .command('invoke', 'invoke the lambda')
    .command('build', 'build the lambda')
    .command('serve', 'serve the lambda').argv;
  const [command, ...rest] = _;
  const config = getConfig(cwd, command, d === true, t);

  if (pc) {
    console.log(JSON.stringify(config, null, 2));
  }
  if (config.preload) {
    const result = require(config.preload);
    if (typeof result === 'function') {
      result(config);
    }
  }

  if (command === 'build-all') {
    const workspaces = getWorkspaces();
    const [glob] = rest;
    for (let item of workspaces) {
      if (glob && !item.path.includes(glob.replace('*', ''))) {
        continue;
      }
      await build(config);
    }
  } else if (command === 'invoke') {
    const outDir = await build({ ...config, command: 'build' });
    await invoke(outDir, config, ...rest);
  } else if (command === 'build') {
    await build(config);
  } else if (command === 'serve') {
    const outDir = await build({ ...config, command: 'watch' });
    serve(outDir, config);
  }
})();
