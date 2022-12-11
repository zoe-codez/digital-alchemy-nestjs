# @steggy/server

## Description

This library enables webserver functionality for apps based off of `@steggy`, binding configuration variables to Nest and automatically setting up common middleware.

### Dev note

The general goals of this library will stick around in the future, but some parts of the code are tuned to my specific uses.
Since web isn't a primary focus for `@steggy` right now, cleaning everything up hasn't been a high priority.
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
