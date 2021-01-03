import execa from 'execa';
import { LandaConfig } from '../config';

export async function tsCompile(config: LandaConfig) {
  await execa.command(`tsc`, {
    cwd: config.cwd,
    stdio: 'inherit',
  });
}
