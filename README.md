# Landa

A super simple bundler for nodeJS. Based on rollup. Specially well suited for Lambda. Strong typescript support.

## Why?

There is many tools to build nodeJS, but most need either excessiv configuration (webpack/rollup/..) or try many problems (serverless). If you'd just like to bundle your typescript so some other tool may deploy it to lambda (e.g. via `aws-cdk`), Landa is a very simple and nice tool.

## Features

- Typescript transpilation, with or without typechecking enabled
- Dev Server with automatic reloading on changes
- Production builds including dependencies
- Invocation with pre-defined request data

## Table of Contents

- Installation
- Commands
  - Build
  - Serve
  - Invoke
- Configuration Options
- Frameworks
- Dependency Handling
- Deploying

## Installation

```bash
yarn install landa
# or: npm install landa
```

## Commands

These are some example scripts that you can add to `package.json`.

```js
{
  // Build for production
  "build": "landa build",
  // Serve dev build
  "dev": "landa serve --dev",
  // Invoke dev build
  "invoke": "landa invoke --dev"
}
```

### Build

Landa builds your code using rollup, babel and typescript. Terser is run for production builds, sourcemaps are always generated.

### Serve

Landa contains an express based dev server, that will redirect http requests on a given port (4004 by default) to your code, while reloading if your code changes.

### Invocation

Invocation allows you to define different requests by name and invoke your code with any of those requests easily, while the output is written to a json file.

#### Invocation configuration

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

You can call the `helloWorld` invocation by:

```bash
yarn run invoke helloWorld
# or: npm run invoke helloWorld
```

## Configuration Options

Add optional configuration options to your `package.json > landa`

```js
// package.json
{
  "landa": {
    // Path to a js script thats run before anything, e.g. to setup env
    "preload": "./index.js",
    // Environment variables, especially for dev server
    "env": { "DB_URI": "http://localhost:8081" },
    // Dev server port
    "servePort": 4004,
    // Enable type-checking (disabled by default!), can be set to "ts2" for `rollup-plugin-typescript2` instead of `@rollup/plugin-typescript`
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

## Frameworks

Landa supports most libraries that run on AWS lambda / nodeJS. These frameworks where specifically tested:

- Middy
- NestJS

## Dependency Handling

Make sure to add all critical dependencies to your `package.json > dependencies`. `devDependencies` will be ignored for production builds.

## Deploying

Landa does not do any deployment. Instead, you can zip the output folder yourself, or use `aws-cdk`.

## License

MIT
