import { resolve } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { LandaConfig } from '../config';

export function invoke(config: LandaConfig, command?: string) {
  return new Promise((yay, nay) => {
    if (!existsSync(config.invokeOutDir)) {
      mkdirSync(config.invokeOutDir);
    }

    const { handler } = require(config.outDir);
    const payloads = config.invokeConfig;
    if (!payloads) {
      return nay(
        new Error(
          'Could not find invoke.js, invoke.json or packageJson.landa.invoke files.'
        )
      );
    }
    function get(path: string) {
      const payload = payloads[path];
      return {
        path: payload.path,
        body: JSON.stringify(payload.body),
        headers: {
          Origin: 'http://local.host',
          ...(payload.headers || {}),
        },
        httpMethod: payload.method || 'GET',
        queryStringParameters: payload.query || {},
      };
    }
    if (!payloads[command]) {
      return nay(new Error('Command not found ' + command));
    }
    const request = get(command);
    function finish(err: any, result: any) {
      if (err) {
        console.log('Error');
        console.error(err);
        return nay(err);
      } else {
        console.log('Done');
        if (typeof result.body === 'string') {
          try {
            result.body = JSON.parse(result.body);
          } catch (e) {}
        }
        if (result.body.error && result.body.error.prettyError) {
          console.log(result.body.error.prettyError);
        } else {
          console.log(result);
        }
        if (result.headers['Content-Disposition']) {
          writeFileSync(
            resolve(config.invokeOutDir, `${command}.body.txt`),
            result.body,
            {}
          );
        }
        writeFileSync(
          resolve(config.invokeOutDir, `${command}.json`),
          JSON.stringify({ request, result }, null, 2),
          {}
        );
        return yay(result);
      }
    }
    return handler(
      request,
      {
        awsRequestId: +new Date() + '',
        succeed: (result: any) => finish(null, result),
      },
      finish
    );
  });
}
