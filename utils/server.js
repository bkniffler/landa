require('./local');
const { resolve } = require('path');
const fs = require('fs');
const crypto = require('crypto');
const execa = require('execa');
const express = require('express');
const app = express();
const port = 4004;

process.env.FRONTEND_URI = 'http://localhost:4000';
const dirname = resolve(__dirname, '..');
(async () => {
  execa('yarn', ['watch'], {
    cwd: dirname,
    stdio: 'inherit',
  });
  const watchFile = resolve(dirname, 'lib/dev/index.js');
  let lastHash = '';

  function rawBody(req, res, next) {
    req.setEncoding('utf8');
    req.rawBody = '';
    req.on('data', function (chunk) {
      req.rawBody += chunk;
    });
    req.on('end', function () {
      next();
    });
  }

  app.use(rawBody);
  app.use(async (req, res) => {
    let handled = false;
    function onResponse(result) {
      res
        .set({
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
      let successResult;
      const result = await handler(
        {
          httpMethod: req.method,
          path: req.path,
          body: req.rawBody,
          headers: req.headers,
          queryStringParameters: req.query,
        },
        {
          awsRequestId: +new Date() + '',
          succeed: (result) => {
            handled = true;
            onResponse(result);
          },
        },
        (err, res) => {
          handled = true;
          onResponse(err || res);
        },
      );
      if (!handled && result) onResponse(result);
    } catch (err) {
      console.error(err);
      res.send({ internalServerError: ':(', error: err });
      onResponse(err);
    }
  });
  app.listen(port, () => {
    console.log(`API listening at http://localhost:${port}`);
  });
})();

function fileHash(filename, algorithm = 'md5') {
  return new Promise((resolve, reject) => {
    // Algorithm depends on availability of OpenSSL on platform
    // Another algorithms: 'sha1', 'md5', 'sha256', 'sha512' ...
    let shasum = crypto.createHash(algorithm);
    try {
      let s = fs.ReadStream(filename);
      s.on('data', function (data) {
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
