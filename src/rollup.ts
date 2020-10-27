import { rollup, watch } from 'rollup';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
//@ts-ignore
import babel from 'rollup-plugin-babel';
import ora from 'ora';
import json from '@rollup/plugin-json';
import alias from '@rollup/plugin-alias';
import builtIn from 'builtin-modules';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { terser } from 'rollup-plugin-terser';
import execa from 'execa';
import { invoke } from './invoke';
import { getWorkspaces, rootFolder } from './get-workspaces';

const dotenv = require('dotenv').config({
  path: join(rootFolder, '.env'),
});

const workspacePackages = getWorkspaces();
const extensions = ['.js', '.ts', '.json'];
const entryPaths = ['src/index.ts', 'src/index.js', 'index.js'];
const outDirs = { prod: 'lib/prod', dev: 'lib/dev' };
function findEntry(cwd: string) {
  return entryPaths
    .map((entry) => join(cwd, entry))
    .find((entry) => existsSync(entry));
}
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

export async function build(cwd: string, command: string) {
  const isProduction = command === 'build';

  const pkg = require(join(cwd, 'package.json'));
  const [dependencies, workspaces] = getAllDependencies(pkg.dependencies);
  const input = findEntry(cwd);
  if (!input) {
    throw new Error(`No input found, tried: \n -${entryPaths.join('\n -')}`);
  }

  const spinner = ora().start(`Building ${cwd}`);
  try {
    const inputOptions = {
      input,
      treeshake: isProduction,
      external: [...builtIn, 'aws-sdk'].concat(Object.keys(dependencies)),
      //.concat(isProduction ? [] : nodeModules),
      plugins: [
        alias({
          entries: workspaces.map((path) => {
            return {
              find: require(join(path, 'package.json')).name,
              replacement: join(path, 'src'),
            };
          }),
        }),
        resolve({
          extensions,
          preferBuiltins: true,
        }),
        replace(
          Object.keys(dotenv.parsed || {}).reduce(
            (state, key) => ({
              ...state,
              [`process.env.${key}`]: JSON.stringify(dotenv.parsed[key]),
            }),
            {}
          )
        ),
        commonjs({ sourceMap: true }),
        json({}),
        babel({
          extensions,
          include: [cwd, ...workspaces].map((path) => join(path, 'src/**/*')),
          babelrc: false,
          presets: [
            [
              require.resolve('@babel/preset-env'),
              {
                modules: false,
                targets: {
                  node: '12',
                },
              },
            ],
            require.resolve('@babel/preset-typescript'),
          ],
          plugins: [
            require.resolve('@babel/plugin-proposal-class-properties'),
            require.resolve('babel-plugin-source-map-support'),
            require.resolve('@babel/plugin-proposal-optional-chaining'),
          ],
        }),
        isProduction && terser(),
      ],
    };
    const outputOptions = {
      file: join(cwd, isProduction ? outDirs.prod : outDirs.dev, 'index.js'),
      format: 'cjs' as const,
      sourcemap: true,
    };

    if (command === 'build' || command === 'invoke' || command === 'start') {
      const bundle = await rollup(inputOptions);
      // const { output } = await bundle.generate(outputOptions);
      await bundle.write(outputOptions);
      spinner.succeed('Build successful');
      if (command === 'invoke') {
        await invoke(pkg.name, cwd, `${outDirs.dev}/index.js`);
        // wtf.dump();
      } else if (command === 'start') {
        require(join(cwd, outDirs.dev, 'index.js'));
      } else {
        spinner.start('Packaging');
        pkg.dependencies = { ...dependencies };
        pkg.name = `${pkg.name}-lambda`;
        delete pkg.devDependencies;
        delete pkg.scripts;
        writeFileSync(
          join(cwd, outDirs.prod, 'package.json'),
          JSON.stringify(pkg, null, 2)
        );

        await execa.command('yarn install --no-progress --non-interactive', {
          cwd: join(cwd, outDirs.prod),
          stdio: 'inherit',
        });
        spinner.succeed('Packaging successful');
      }
    } else if (command === 'watch') {
      spinner.stop();
      const watcher = watch({ ...inputOptions, output: outputOptions });
      watcher.on('event', (event) => {
        if (event.code === 'START')
          spinner.start('Change detected, rebuilding ...');
        if (event.code === 'END') spinner.stop();
        if (event.code === 'ERROR') spinner.fail(JSON.stringify(event.error));
      });
    }
  } catch (err) {
    spinner.fail('Error');
    console.info('Error building', cwd, command);
    console.error(err);
  }
}
