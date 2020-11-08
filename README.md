# Landa

A super simple bundler for nodeJS. Based on rollup. Specially well suited for Lambda. Strong typescript support.

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

```
yarn install landa
# or: npm install landa
```

### Building

Add this to your scripts:

```
{
    "build": "landa build"
}
```

Run a build

```
yarn run build
# or: npm run build
```

### Dev Server

Add this to your scripts:

```
{
    "dev": "landa serve"
}
```

Run your server

```
yarn run dev
# or: npm run dev
```

### Invoke

Invocation allows you to define different requests by name and invoke your code with any of those requests easily, while the output is written to a json file.

Add this to your scripts:

```
{
    "invoke": "landa invoke"
}
```

Add an invocation config to your project, e.g. into `invoke.js` (or `invoke.json`) in your root directory.

```
module.exports = {
  helloWorld: {
    path: '/hello-world',
    body: {
        hello: 'world'
    },
  },
};

```

Invoke your code

```
yarn run invoke helloWorld
# or: npm run invoke helloWorld
```

## Config

Add optional configuration options to your `package.json > landa`

```
// package.json
{
    ...
    landa: {
        // Path to a js script thats run before anything, e.g. to setup env
        preload: "./index.js",
        // Environment variables, especially for dev server
        env: { DB_URI: "http://localhost:8081" },
        // Dev server port
        servePort: 4004,
        // Enable type-checking (disabled by default!)
        typeCheck: true,
        // Outdir for production builds
        outDir: "./lib/prod",
        // Outdir for dev builds
        devDir:"./lib/dev",
        // Path to a js/json file that exports invocation config
        invokeConfigPath: "./invoke.js",
        // Folder that invocation output is written to
        invokeOutDir: "./out",
        // Entry, default is any of "./src/index.ts" / "./src/index.js" / "./index.ts" / "./index.js"
        entryFile: "./src/index.ts"
    }
}
```

## License

MIT
