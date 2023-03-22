# @digital-alchemy/server

## Description

This library enables webserver functionality for apps based off of `@digital-alchemy`, binding configuration variables to Nest and automatically setting up common middleware.

### Dev note

The general goals of this library will stick around in the future, but some parts of the code are tuned to my specific uses.
Since web isn't a primary focus for `@digital-alchemy` right now, cleaning everything up hasn't been a high priority.
These elements are opt-in (like the Nest auth guards), so they should not have an effect unless explicitly used.
If you have opinions on what you'd like to see from this library, open an issue

## Enabling webserver functionality

### 1) Enable http in bootstrap

The options provided to `@QuickScript(options)`, and `Bootstrap(module,options)` have `http?: boolean` as an option.
This is set to false by default.
Enabling will request the bootstrap process set up nest with an express server

### 2) Import module

Add `ServerModule` to list of imports.

## What this does

After configuration, this library is intended to not have be interacted with by the developer.
Everything should happen automagically, and leave the app in a good to go & open for business state.

### Middleware

The following middleware is automatically set up

- csurf
- cors
- compression
- nest validation pipe
- cookie parser
- json body parser

### Automatic request logging

Every request is assigned a unique id, and will get logged upon completion

### Express configuration

Open up ports for listening after the application has confirmed initilization.
Has built in support for ssl certs, just provide file path to load from.

## Auth flow

The built in auth flow is mostly intended for local development and other non-public production uses.
Adding `@AuthStack` annotation to a controller will attach the guards.

The built in `AdminKeyGuard` looks for the `x-admin-key` header, and will compare that value with the one provided in the configuration

## Configuration options

The following configuration options are utilized by this library.

```ini
; default configuration
[libs.server]
  BODY_SIZE=100kb
  COMPRESSION=true
  CSURF=false
  ; 1 billion, then reset to 0
  MAX_REQUEST_ID=1000000000
  PORT=7000
```

### `ADMIN_KEY`

> default value: ""

Leave blank to disable. If this value is provided via x-admin-key header, the request will be authorized

### `BODY_SIZE`

> default value: "100kb"

Max json body size for incoming requests

### `COMPRESSION`

> default: true

Wire in compression middleware

### `CORS`

> default value: ""

CORS origin for the server. Set to blank to disable middleware

### `MAX_REQUEST_ID`

> default value: 1_000_000_000

Rollover point for request ids

### `PORT`

> default value: 7000

Port to attach webserver to

### `SSL_CERT`

> default value: undefined

File path, required if SSL_PORT is active

### `SSL_KEY`

> default value: undefined

File path, required if SSL_PORT is active

### `SSL_PORT`

> default value: undefined
