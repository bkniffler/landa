import 'dotenv';
import yargs from 'yargs';
import { build } from './rollup';
import { getWorkspaces } from './get-workspaces';
import { invoke, serve } from './dev';
import { getConfig } from './config';
import ora from 'ora';
import { writeJsonSync } from 'fs-extra';
import { resolve } from 'path';
import execa from 'execa';

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

  const spinner = ora().start(
    `Building ${config.cwd}, production ${config.isProduction}`
  );
  try {
  } catch (err) {
    spinner.fail('Error');
    console.info('Error building', config.cwd, config.command);
    console.error(err);
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
    spinner.succeed('Build successful');
    await build({ ...config, command: 'build' });
    await invoke(config, ...rest);
    process.exit(0);
  } else if (command === 'build') {
    await build(config);
    spinner.succeed('Build successful');
    if (config.isProduction) {
      spinner.start('Packaging');
      config.packageJSON.dependencies = { ...config.dependencies };
      config.packageJSON.name = `${config.packageJSON.name}-lambda`;
      delete config.packageJSON.devDependencies;
      delete config.packageJSON.scripts;
      writeJsonSync(resolve(config.outDir, 'package.json'), config.packageJSON);
      spinner.succeed('Packaging successful');
      spinner.start('Installing dependencies ...');
      await execa.command('yarn install --no-progress --non-interactive', {
        cwd: config.outDir,
        stdio: 'inherit',
      });
      spinner.succeed('Install done');
    }
    process.exit(0);
  } else if (command === 'serve') {
    spinner.stop();
    await build({ ...config, command: 'watch' });
    serve(config);
  }
})();
