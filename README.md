# 🦕 [@steggy](https://github.com/mp3three/steggy) monorepo

`@steggy` is a set of libraries built on top of the [nestjs](https://nestjs.com/) framework.
It provides a quick bootstrapping interface, which provides:

- Injectable configurations
- Context aware logging
- Additional lifecycle events
- Specialized eventing annotations

## Libraries

### [Automation Logic](libs/automation-logic)

A set of tools for more cohesively bringing together `@steggy/home assistant` with home automation logic.
Build out rooms with scenes, managed circadian lighting, and more.

### [Boilerplate](libs/boilerplate)

NestJS application bootstrapping functions, configuration, logging, and general purpose tools.

### [Home Assistant](libs/home-assistant)

Tools for interacting with Home Assistant. Contains wrappers for rest api, and websocket api.
Has the ability to transform it's internal type definitions and code api to match a target home assistant install.

### [MQTT](libs/mqtt)

Simple MQTT bindings to match the repository standards.

### [Server](libs/server)

Enables web server functionality for [@steggy/boilerplate](libs/boilerplate).
Provides generic middleware tools like `cors` and automatic request logging

### [TTY](libs/tty)

Utilities for creating terminal applications.

- Menus
- Prompts
- Keyboard management
- Screen management
- Cursor management

Enables the `--help` switch, which will output available configuations that can be sent via command line switches.

> Note: switches are accepted without TTY, this just adds a reporting mechanism

## Applications

### [Config Builder](apps/config-builder)

A script to manage file based configurations for applications based off `@steggy/boilerplate`.
It can act as a "settings screen" for applications, outputting either environment variables, or valid config file locations.

### [Log Formatter](apps/log-formatter)

Pipe JSON logs in via stdin, get pretty/readable logs out.
Fills same idea as [pino-pretty](https://www.npmjs.com/package/pino-pretty), but using the `SyncLogger` formatter from this repo so logs will format the same as during development.

### [Sampler App](apps/sampler-app)

Demonstration of the capabilities of the TTY library.

### [Hass Type Generate](apps/hass-type-generate)

Companion application to `@steggy/home-assisant`. Intended to rewrite library type definitions to match a specific home assistant install.
