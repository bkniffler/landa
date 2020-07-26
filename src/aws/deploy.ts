import execa from 'execa';
import { join } from 'path';

export async function deploy(
  cwd: string,
  outDir: string,
  args: { stackNames: string[] }
) {
  console.log('Deploy', args);
  await execa('yarn', [], {
    cwd: join(cwd, outDir),
    stdio: 'inherit',
  });
  /*await execa('yarn', ['deploy-stack', ...args.stackNames], {
    cwd: join(__dirname, '../../../infrastructure'),
    stdio: 'inherit',
  });*/
}
