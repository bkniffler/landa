import { resolve } from 'path';
import { createReadStream } from 'fs';
import crypto from 'crypto';
import { fastify } from 'fastify';
import { LandaConfig } from '../config';

export function serve(config: LandaConfig) {
  const app = fastify();

  for (let key in config.env) {
    process.env[key] = config.env[key];
  }

  const watchFile = resolve(config.outDir, 'index.js');
  let lastHash: string = '';

  app.all('/*', async (req, res) => {
    let handled = false;
    function onResponse(result: any) {
      res
        .headers({
          'Content-Type': 'application/json',
          ...result.headers,
        })
        .status(result.statusCode)
        .send(result.body);
    }
    try {
      const hash = await fileHash(watchFile);
      if (lastHash && hash !== lastHash) {
        delete require.cache[require.resolve(watchFile)];
      }
      const { handler } = require(watchFile);
      lastHash = hash;
      const isJson = req.headers['content-type'] === 'application/json';
      if (!req.body && isJson) req.body = '{}';
      const body =
        req.body && typeof req.body === 'object'
          ? JSON.stringify(req.body)
          : req.body;
      const result = await handler(
        {
          httpMethod: req.method,
          path: req.url,
          body,
          headers: req.headers,
          queryStringParameters: req.query,
        },
        {
          awsRequestId: +new Date() + '',
          succeed: (result: any) => {
            handled = true;
            onResponse(result);
          },
        },
        (err: any, res: any) => {
          handled = true;
          onResponse(err || res);
        }
      );
      if (!handled && result) onResponse(result);
    } catch (err) {
      console.error(err);
      res.send({ internalServerError: ':(', error: err });
      onResponse(err);
    }
  });
  app.listen(config.servePort, () => {
    console.log(`API listening at http://localhost:${config.servePort}`);
  });
}

function fileHash(filename: string, algorithm = 'md5'): Promise<string> {
  return new Promise((resolve, reject) => {
    // Algorithm depends on availability of OpenSSL on platform
    // Another algorithms: 'sha1', 'md5', 'sha256', 'sha512' ...
    let shasum = crypto.createHash(algorithm);
    try {
      let s = createReadStream(filename);
      s.on('data', (data) => {
        shasum.update(data);
      });
      // making digest
      s.on('end', function () {
        const hash = shasum.digest('hex');
        return resolve(hash);
      });
    } catch (error) {
      return reject(error);
    }
  });
}
