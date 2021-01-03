import { LandaConfig } from '../config';
import { join, dirname } from 'path';
import builtIn from 'builtin-modules';
import { build as esbuild } from 'esbuild';
import { watch } from 'chokidar';
import TsconfigPathsPlugin from '@esbuild-plugins/tsconfig-paths';
import { tsCompile, tsWatch } from '../typescript';
import { debounce } from 'ts-debounce';

export async function build(config: LandaConfig) {
  const isWatch = config.command === 'watch';
  if (config.typeCheck) {
    if (isWatch) {
      await tsWatch(config);
    } else {
      await tsCompile(config);
    }
  }

  const b = (incremental = false) =>
    esbuild({
      entryPoints: [config.entryFile],
      bundle: true,
      sourcemap: true,
      outfile: join(config.outDir, 'index.js'),
      format: 'cjs',
      incremental,
      target: 'es2019',
      tsconfig: config.tsConfigPath,
      plugins: [
        TsconfigPathsPlugin({
          tsconfig: config.tsConfigPath,
        }),
      ],
      external: [...config.external, ...builtIn, 'aws-sdk'].concat(
        Object.keys(config.dependencies)
      ),
    });
  if (isWatch) {
    const watchFiles = join(dirname(config.entryFile), '**/*');
    const watcher = watch([watchFiles]);
    console.log('Watching files... ', watchFiles);
    const result = await b(true);
    function rebuild() {
      result.rebuild();
    }
    watcher.on('change', debounce(rebuild, 250, { isImmediate: false }));
  }
  return b(false);
}
