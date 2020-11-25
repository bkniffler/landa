import { LandaConfig } from '../config';
import { join, dirname } from 'path';
import builtIn from 'builtin-modules';
import { emit } from './emit';
import { build as esbuild } from 'esbuild';
import { watch } from 'chokidar';

export async function build(config: LandaConfig) {
  if (config.typeCheck) {
    const result = await emit(config, false);
    for (let item of result) {
      if (item.messageText) {
        const type =
          item.category === 0 ? 'log' : item.category === 1 ? 'warn' : 'error';
        console[type](type, item.messageText);
      }
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
      external: [...config.external, ...builtIn, 'aws-sdk'].concat(
        Object.keys(config.dependencies)
      ),
    });
  if (config.command === 'watch') {
    const watchFiles = join(dirname(config.entryFile), '**/*');
    const watcher = watch([watchFiles]);
    console.log('Watching files... ', watchFiles);
    const result = await b(true);
    watcher.on('change', () => {
      result.rebuild();
    });
  }
  return b(false);
}
