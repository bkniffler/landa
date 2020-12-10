import { OutputOptions, rollup, RollupOptions, watch } from 'rollup';
import { build as b2 } from './esbuild';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
// import replace from '@rollup/plugin-replace';
//@ts-ignore
import babel from 'rollup-plugin-babel';
import babel2, { RollupBabelInputPluginOptions } from '@rollup/plugin-babel';
import typescript from '@rollup/plugin-typescript';
import typescript2 from 'rollup-plugin-typescript2';
import json from '@rollup/plugin-json';
import alias from '@rollup/plugin-alias';
import builtIn from 'builtin-modules';
import ora from 'ora';
import { resolve } from 'path';
import { terser } from 'rollup-plugin-terser';
// import { rootFolder } from './get-workspaces';
import { LandaConfig } from './config';
import esbuild from 'rollup-plugin-esbuild';

function getBabelConfig(config: LandaConfig) {
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
    extensions: config.extensions,
    include: [config.cwd, ...config.workspaces].map((path) =>
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
  return babelConfig;
}

export async function build(config: LandaConfig) {
  if (!config.rollup) {
    return b2(config);
  }
  const useESBuild = config.rollup === 'esbuild';
  const input = config.entryFile;
  const inputOptions: RollupOptions = {
    input,
    treeshake: config.isProduction,
    external: [...builtIn, 'aws-sdk'].concat(Object.keys(config.dependencies)),
    //.concat(isProduction ? [] : nodeModules),
    plugins: [
      alias({
        entries: config.workspaces.map((path) => {
          return {
            find: require(resolve(path, 'package.json')).name,
            replacement: resolve(path, 'src'),
          };
        }),
      }),
      nodeResolve({
        extensions: config.extensions,
        preferBuiltins: true,
      }),
      /*!config.isProduction &&
        replace(
          Object.keys(dotenv.parsed || {}).reduce(
            (state, key) => ({
              ...state,
              [`process.env.${key}`]: JSON.stringify(dotenv.parsed[key]),
            }),
            {}
          )
        ),*/
      commonjs({ sourceMap: true }),
      json({}),
      !useESBuild &&
        config.typeCheck &&
        babel2({ ...getBabelConfig(config), babelHelpers: 'bundled' }),
      !useESBuild && !config.typeCheck && babel(getBabelConfig(config)),
      config.rollup === 'typescript2' && typescript2(),
      config.rollup === 'typescript' && typescript(),
      config.rollup === 'esbuild' &&
        esbuild({
          minify: config.isProduction && config.minify === true,
        }),
      !useESBuild && config.isProduction && config.minify === true && terser(),
    ],
  };
  const outputOptions: OutputOptions = {
    file: resolve(config.outDir, 'index.js'),
    format: 'cjs' as const,
    sourcemap: true,
  };

  if (config.command === 'build') {
    const bundle = await rollup(inputOptions);
    await bundle.write(outputOptions);
  } else if (config.command === 'watch') {
    const watcher = watch({ ...inputOptions, output: outputOptions });
    const spinner = ora();
    watcher.on('event', (event) => {
      if (event.code === 'START')
        spinner.start('Change detected, rebuilding ...');
      if (event.code === 'END') spinner.stop();
      if (event.code === 'ERROR') spinner.fail(JSON.stringify(event.error));
    });
  }
}
