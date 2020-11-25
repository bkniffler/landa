const glob = require('glob');
const { join, basename } = require('path');
const builtIn = require('builtin-modules');

const nodeModules = glob
  .sync(join(__dirname, 'node_modules/*'))
  .map((x) => basename(x));

require('esbuild')
  .build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    sourcemap: true,
    outfile: 'lib/index.js',
    format: 'cjs',
    external: nodeModules.concat(builtIn),
  })
  .catch(() => process.exit(1));
