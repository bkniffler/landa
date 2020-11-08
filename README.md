# Landa

A super simple bundler for nodeJS. Based on rollup. Specially well suited for Lambda. Strong typescript support.

## Why?

There is many tools to build nodeJS, but most need either excessiv configuration (webpack/rollup/..) or try many problems (serverless). If you'd just like to bundle your typescript so some other tool may deploy it to lambda (e.g. via `aws-cdk`), Landa is a very simple and nice tool.

## Features

- Typescript transpilation, with or without typechecking enabled
- Dev Server with automatic reloading on changes
- Production builds including dependencies
- Invocation with pre-defined request data

## Supported libraries

Landa supports most libraries that run on AWS lambda / nodeJS. These frameworks where specifically tested:

- Middy
- NestJS

## Getting started

### Installation

```bash
yarn install landa
# or: npm install landa
```

### Building

Landa builds your code using rollup, babel and typescript. Terser is run for production builds, sourcemaps are always generated.

#### Setup the build script

Add this to your scripts:

```json
{
  "build": "landa build"
}
```

#### Run a build

```bash
yarn run build
# or: npm run build
```

### Dev Server

Landa contains an express based dev server, that will redirect http requests on a given port (4004 by default) to your code, while reloading if your code changes.

#### Setup the dev script

Add this to your scripts:

```json
{
  "dev": "landa serve"
}
```

#### Run your server

```bash
yarn run dev
# or: npm run dev
```

### Invocation

Invocation allows you to define different requests by name and invoke your code with any of those requests easily, while the output is written to a json file.

#### Setup the invocation script

```json
{
  "invoke": "landa invoke"
}
```

#### Setup an invocation configuration

Add an invocation config to your project, e.g. into `invoke.js` (or `invoke.json`) in your root directory.

```js
module.exports = {
  helloWorld: {
    // Request path
    path: '/hello-world',
    // Optional body
    body: {
      hello: 'world',
    },
    // Optional headers
    headers: {
      Authorization: 'Bearer ...',
    },
    // Optional method, default is GET
    httpMethod: 'POST',
    // Optional querystring parameters
    queryStringParameters: {
      id: '123',
    },
  },
};
```

#### Invoke your code

```bash
yarn run invoke helloWorld
# or: npm run invoke helloWorld
```

## Config

Add optional configuration options to your `package.json > landa`

```json
// package.json
{
  "landa": {
    // Path to a js script thats run before anything, e.g. to setup env
    "preload": "./index.js",
    // Environment variables, especially for dev server
    "env": { "DB_URI": "http://localhost:8081" },
    // Dev server port
    "servePort": 4004,
    // Enable type-checking (disabled by default!)
    "typeCheck": true,
    // Outdir for production builds
    "outDir": "./lib/prod",
    // Outdir for dev builds
    "devDir": "./lib/dev",
    // Path to a js/json file that exports invocation config
    "invokeConfigPath": "./invoke.js",
    // Folder that invocation output is written to
    "invokeOutDir": "./out",
    // Entry, default is any of "./src/index.ts" / "./src/index.js" / "./index.ts" / "./index.js"
    "entryFile": "./src/index.ts"
  }
}
```

## Dependency handling

Make sure to add all critical dependencies to your `package.json > dependencies`. `devDependencies` will be ignored for production builds.

## Deploying to AWS

Landa does not do any deployment. Instead, you can zip the output folder yourself, or use `aws-cdk`.

## License

MIT
