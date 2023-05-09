# 💻 Digital Alchemy Monorepo 🔮

## Description

`@digital-alchemy` is a collections of projects built on top of the [NestJS](https://nestjs.com/) framework. The repository is a collection of general purpose libraries for building premium terminal applications, microservices, home automation logic, and more.

## Published Packages

### Applications

| Local | NPM | Notes |
| --- | --- | --- |
| [@digital-alchemy/hass-type-generate](apps/hass-type-generate) | <sup>[npm](https://www.npmjs.com/package/@digital-alchemy/hass-type-generate)</sup> | Companion app for `@digital-alchemy/home-assistant` |
| [@digital-alchemy/log-formatter](apps/log-formatter) | <sup>[npm](https://www.npmjs.com/package/@digital-alchemy/log-formatter)</sup> | Pipe (`\|`) friendly tool to reformat json logs to pretty logs |
| [@digital-alchemy/pi-matrix](apps/pi-matrix) | <sup>[npm](https://www.npmjs.com/package/@digital-alchemy/pi-matrix)</sup> | Application bindings for `@digital-alchemy/pi-matrix-client`. Intended to run on Raspberry Pi, includes hardware build guide |

### Libraries

| Local | NPM | Tags | Notes |
| ---  | --- | --- | --- |
| [@digital-alchemy/automation-logic](libs/automation-logic) | <sup>[npm](https://www.npmjs.com/package/@digital-alchemy/automation-logic)</sup> | <ul><li>`nestjs`</li><li>`home-assistant`</li><li>`generated-types`</li></ul> | Extended tools for building home automation services |
| [@digital-alchemy/boilerplate](libs/boilerplate) | <sup>[npm](https://www.npmjs.com/package/@digital-alchemy/boilerplate)</sup> | <ul><li>`nestjs`</sup> | Bootstrapping, configuration, logging, and other basics |
| [@digital-alchemy/gotify](libs/gotify) | <sup>[npm](https://www.npmjs.com/package/@digital-alchemy/gotify)</sup> | <ul><li>`nestjs`</sup> | Application bindings for sending notifications though [Gotify](https://gotify.net/) |
| [@digital-alchemy/home-assistant](libs/home-assistant) | <sup>[npm](https://www.npmjs.com/package/@digital-alchemy/home-assistant)</sup>  | <ul><li>`nestjs`</li><li>`home-assistant`</li><li>`generated-types`</li></ul> | Websocket and rest api bindings for Home Assistant. Generates custom types based on your install |
| [@digital-alchemy/mqtt](libs/mqtt) | <sup>[npm](https://www.npmjs.com/package/@digital-alchemy/mqtt)</sup> | <ul><li>`nestjs`</sup> | Basic MQTT bindings |
| [@digital-alchemy/pi-matrix-client](libs/pi-matrix-client) | <sup>[npm](https://www.npmjs.com/package/@digital-alchemy/pi-matrix-client)</sup> | <ul><li>`nestjs`</li><li>`rgb-matrix`</li><li>`app-as-library`</li></ul> | Application in the form of a library. Import and run as-is, or use as a starting point for a larger application |
| [@digital-alchemy/render-utils](libs/render-utils) | <sup>[npm](https://www.npmjs.com/package/@digital-alchemy/render-utils)</sup> | <ul><li>`nestjs`</li><li>`shared`</li><li>`rgb-matrix`</li><li>`tty`</li></ul> | Generic math and utility functions for rgb matrix displays and terminal apps |
| [@digital-alchemy/rgb-matrix](libs/rgb-matrix) | <sup>[npm](https://www.npmjs.com/package/@digital-alchemy/rgb-matrix)</sup> | <ul><li>`nestjs`</li><li>`rgb-matrix`</li></ul> | Layout and rendering utilities for arduino rgb matrix displays |
| [@digital-alchemy/server](libs/server) | <sup>[npm](https://www.npmjs.com/package/@digital-alchemy/server)</sup> | <ul><li>`nestjs`</li></ul> | Http server support, standard ssl & middleware configurations, request logging |
| [@digital-alchemy/testing](libs/testing) | <sup>[npm](https://www.npmjs.com/package/@digital-alchemy/testing)</sup> | <ul><li>`nestjs`</li></ul> | Extensions to NestJS unit testing to be compatible with `@digital-alchemy` apps |
| [@digital-alchemy/tty](libs/tty) | <sup>[npm](https://www.npmjs.com/package/@digital-alchemy/tty)</sup> | <ul><li>`nestjs`</li><li>`tty`</li></ul> | Prompts and rendering utilities for interactions inside of the terminal |
| [@digital-alchemy/utilities](libs/utilities) | <sup>[npm](https://www.npmjs.com/package/@digital-alchemy/utilities)</sup> | <ul><li>`shared`</li></ul> | Standard utilities and constants used across the repository |

## Example Applications

> Sometimes useful example / reference code

| Application | Type | Notes | Tags |
| --- | --- | --- | --- |
| [Sampler App](apps/sampler-app) | `terminal` | Demo app for [tty](libs/tty) library functionality. Get a quick feel for how things look and work from inside your terminal | <ul><li>`functional`</li></ul> |
| [Hass CLI](apps/hass-cli) | `home-assistant`, `terminal` | Basic interactions with Home Assistant and development aid | <ul><li>`functional`</li></ul> |
| [Entity Creation](apps/entity-creation) | `home-assistant` | Minimal example app. Creates a few entities and not much else | <ul><li>`reference`</li></ul> |
| [Scene Manager](apps/scene-manager) | `home-assistant` | An example home automation app, which manages several rooms | <ul><li>`reference`</li></ul> |
| [Notification Tester](apps/notification-tester) | `gotify` | Simple example of how to import [gotify](libs/gotify) into an app, and send notifications | <ul><li>`reference`</li></ul> |
| [Game of Life](apps/game-of-life) | `rgb-matrix`, `tty` | An implementation of Conway’s Game of Life with controls via [tty](libs/tty) library. Optional state mirroring to a [pi-matrix-client](libs/pi-matrix-client) compatible display | <ul><li>`try-me`</li><li>`experiment`</li></ul> |
| [Config Builder](apps/config-builder) | `tty` | Terminal app for managing config files related to a `@digital-alchemy` app | <ul><li>`functional`</li><li>`experiment`</li></ul> |
