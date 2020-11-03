const { resolve } = require('path');
const { writeFileSync, existsSync, mkdirSync } = require('fs');

module.exports = (dir, payloads) => {
  const outDir = resolve(dir, 'out');
  if (!existsSync(outDir)) {
    mkdirSync(outDir);
  }

  const { handler } = require(resolve(dir, 'lib/prod'));
  const command = process.argv[2];
  function get(path) {
    if (!payloads[path]) {
      throw new Error('Command not found ' + path);
    }
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
  console.log('Starting');
  const request = get(command);
  function finish(err, result) {
    if (err) {
      console.log('Error');
      console.error(err);
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
        writeFileSync(resolve(outDir, `${command}.body.txt`), result.body, {});
      }
      writeFileSync(
        resolve(outDir, `${command}.json`),
        JSON.stringify({ request, result }, null, 2),
        {}
      );
    }
  }
  handler(
    request,
    {
      awsRequestId: +new Date() + '',
      succeed: (result) => finish(null, result),
    },
    finish
  );
};
