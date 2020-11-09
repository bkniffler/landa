import { OutputOptions, rollup, RollupOptions, watch } from 'rollup';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
//@ts-ignore
import babel from 'rollup-plugin-babel';
import babel2, { RollupBabelInputPluginOptions } from '@rollup/plugin-babel';
import typescript from 'rollup-plugin-typescript2';
import ora from 'ora';
import json from '@rollup/plugin-json';
import alias from '@rollup/plugin-alias';
import builtIn from 'builtin-modules';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { terser } from 'rollup-plugin-terser';
import execa from 'execa';
import { getWorkspaces, rootFolder } from './get-workspaces';
import { LandaConfig } from './config';

const dotenv = require('dotenv').config({
  path: resolve(rootFolder, '.env'),
});

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

export async function build(config: LandaConfig) {
  const isProduction = config.command === 'build' && !config.forceDev;
  const [dependencies, workspaces] = getAllDependencies(
    config.packageJSON.dependencies
  );
  const input = config.entryFile;

  const spinner = ora().start(
    `Building ${config.cwd}, production ${isProduction}`
  );
  try {
    const presets: (any[] | string)[] = [
      [
        require.resolve('@babel/preset-env'),
        {
          modules: false,
          targets: {
            node: '12',
          },
        },
      ],
    ];
    if (!config.typeCheck) {
      presets.push(require.resolve('@babel/preset-typescript'));
    }
    const babelConfig: RollupBabelInputPluginOptions = {
      extensions,
      babelHelpers: 'bundled',
      include: [config.cwd, ...workspaces].map((path) =>
        resolve(path, 'src/**/*')
      ),
      babelrc: false,
      presets,
      plugins: [
        [
          require.resolve('@babel/plugin-proposal-decorators'),
          {
            legacy: true,
          },
        ],
        require.resolve('@babel/plugin-proposal-class-properties'),
        require.resolve('babel-plugin-source-map-support'),
        require.resolve('@babel/plugin-proposal-optional-chaining'),
      ],
    };
    const inputOptions: RollupOptions = {
      input,
      treeshake: isProduction,
      external: [...builtIn, 'aws-sdk'].concat(Object.keys(dependencies)),
      //.concat(isProduction ? [] : nodeModules),
      plugins: [
        alias({
          entries: workspaces.map((path) => {
            return {
              find: require(resolve(path, 'package.json')).name,
              replacement: resolve(path, 'src'),
            };
          }),
        }),
        nodeResolve({
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
        (config.typeCheck ? babel2 : babel)(babelConfig),
        config.typeCheck && typescript(),
        isProduction && config.terser === true && terser(),
      ],
    };
    const outputOptions: OutputOptions = {
      file: resolve(isProduction ? config.outDir : config.devDir, 'index.js'),
      format: 'cjs' as const,
      sourcemap: true,
    };

    if (config.command === 'build') {
      const bundle = await rollup(inputOptions);
      // const { output } = await bundle.generate(outputOptions);
      await bundle.write(outputOptions);
      spinner.succeed('Build successful');
      if (isProduction) {
        spinner.start('Packaging');
        config.packageJSON.dependencies = { ...dependencies };
        config.packageJSON.name = `${config.packageJSON.name}-lambda`;
        delete config.packageJSON.devDependencies;
        delete config.packageJSON.scripts;
        writeFileSync(
          resolve(config.outDir, 'package.json'),
          JSON.stringify(config.packageJSON, null, 2)
        );
        spinner.start('Installing dependencies ...');
        await execa.command('yarn install --no-progress --non-interactive', {
          cwd: config.outDir,
          stdio: 'inherit',
        });
      }
      spinner.succeed('Packaging successful');
    } else if (config.command === 'watch') {
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
    console.info('Error building', config.cwd, config.command);
    console.error(err);
  }
  return isProduction ? config.outDir : config.devDir;
}
