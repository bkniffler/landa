import { join } from 'path';
import { existsSync, writeFileSync } from 'fs';
import ora from 'ora';
import chalk from 'chalk';

export async function invoke(name: string, cwd: string, execPath: string) {
  const inputPath = join(cwd, 'input.json');
  const { handler } = require(join(cwd, execPath));
  let input: any = {};
  if (!existsSync(inputPath)) {
    console.warn(
      'Could not find an input.json file in the folder, using empty params'
    );
  } else {
    input = require(inputPath);
  }
  if (!input.body) {
    input = { body: input };
  }
  const spinner = ora();
  spinner.info(`${chalk.blue('Input')} ${JSON.stringify(input)}`);
  spinner.start(`${chalk.blue('Invoking')} ${name}`);
  const result = await handler({
    body: JSON.stringify(input.body),
    headers: input.headers || {},
  });
  spinner.info(
    `${chalk.blue('Output')} [code ${result.statusCode}] ${result.body}`
  );
  if (result.statusCode === 200) {
    spinner.succeed('Done');
    writeFileSync(
      join(cwd, 'output.json'),
      JSON.stringify(JSON.parse(result.body), null, 2),
      { encoding: 'utf8' }
    );
  } else {
    spinner.fail('Error');
  }
}
