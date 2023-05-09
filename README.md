
<h1 align="center">💻 Digital Alchemy Monorepo 🔮</h1>

## Description

`@digital-alchemy` is a collections of projects built on top of the [NestJS](https://nestjs.com/) framework.
The repository is a collection of general purpose libraries for building premium terminal applications, microservices, home automation logic, and more.

## Published Packages

### Applications

| Package | Install | Notes |
| --- | --- | --- |
| [@digital-alchemy/hass-type-generate](apps/hass-type-generate) | [npm](https://www.npmjs.com/package/@digital-alchemy/hass-type-generate) | Companion app for `@digital-alchemy/home-assistant` |
| [@digital-alchemy/log-formatter](apps/log-formatter)  | [npm](https://www.npmjs.com/package/@digital-alchemy/log-formatter) | Pipe (`\|`) friendly tool to reformat json logs to pretty logs |
| [@digital-alchemy/pi-matrix](apps/pi-matrix)  | [npm](https://www.npmjs.com/package/@digital-alchemy/pi-matrix) | Application bindings for `@digital-alchemy/pi-matrix-client`. Intended to run on Raspberry Pi, includes hardware build guide |

### Libraries

| Package | Install | Notes | Tags |
| --- | --- | --- | --- |
| [@digital-alchemy/automation-logic](libs/automation-logic) | [npm](https://www.npmjs.com/package/@digital-alchemy/automation-logic) | Extended tools for building home automation services  | `nestjs`, `home-assistant`, `generated-types`
| [@digital-alchemy/boilerplate](libs/boilerplate) | [npm](https://www.npmjs.com/package/@digital-alchemy/boilerplate) | Bootstrapping, configuration, logging, and other basics | `nestjs` |
| [@digital-alchemy/gotify](libs/gotify) | [npm](https://www.npmjs.com/package/@digital-alchemy/gotify) | Application bindings for sending notifications though [Gotify](https://gotify.net/) | `nestjs` |
| [@digital-alchemy/home-assistant](libs/home-assistant) | [npm](https://www.npmjs.com/package/@digital-alchemy/home-assistant) | Websocket and rest api bindings for Home Assistant. Generates custom types based on your install | `nestjs`, `home-assistant`, `generated-types` |
| [@digital-alchemy/mqtt](libs/mqtt) | [npm](https://www.npmjs.com/package/@digital-alchemy/mqtt) | Basic MQTT bindings | `nestjs` |
| [@digital-alchemy/pi-matrix-client](libs/pi-matrix-client) | [npm](https://www.npmjs.com/package/@digital-alchemy/pi-matrix-client) | Application in the form of a library. Import and run as-is, or use as a starting point for a larger application | `nestjs`, `rgb-matrix`, `app-as-library` |
| [@digital-alchemy/render-utils](libs/render-utils) | [npm](https://www.npmjs.com/package/@digital-alchemy/render-utils) | Generic math and utility functions for rgb matrix displays and terminal apps | `nestjs`, `shared`, `rgb-matrix`, `tty` |
| [@digital-alchemy/rgb-matrix](libs/rgb-matrix) | [npm](https://www.npmjs.com/package/@digital-alchemy/rgb-matrix) | Layout and rendering utilities for arduino rgb matrix displays | `nestjs`, `rgb-matrix` |
| [@digital-alchemy/server](libs/server) | [npm](https://www.npmjs.com/package/@digital-alchemy/server) | Http server support, standard ssl & middleware configurations, request logging  | `nestjs` |
| [@digital-alchemy/testing](libs/testing) | [npm](https://www.npmjs.com/package/@digital-alchemy/testing) | Extensions to NestJS unit testing to be compatible with `@digital-alchemy` apps | `nestjs` |
| [@digital-alchemy/tty](libs/tty) | [npm](https://www.npmjs.com/package/@digital-alchemy/tty) | Prompts and rendering utilities for interactions inside of the terminal | `nestjs`, `tty` |
| [@digital-alchemy/utilities](libs/utilities) | [npm](https://www.npmjs.com/package/@digital-alchemy/utilities) | Standard utilities and constants used across the repository | `shared` |

## Example Applications

> Sometimes useful example / reference code

| Application | Type | Notes | Tags |
| --- | --- | --- | --- |
| [Sampler App](apps/sampler-app) | `terminal` | Demo app for [tty](libs/gotify) library functionality. Get a quick feel for how things look and work from inside your terminal | `functional` |
| [Hass CLI](apps/hass-cli) | `home-assistant`, `terminal` | Basic interactions with Home Assistant and development aid | `functional` |
| [Entity Creation](apps/entity-creation) | `home-assistant` | Minimal example app. Creates a few entities and not much else | `reference` |
| [Scene Manager](apps/scene-manager) | `home-assistant` | An example home automation app, which manages several rooms | `reference` |
| [Notification Tester](apps/notification-tester) | `gotify` | Simple example of how to import [gotify](libs/gotify) into an app, and send notifications | `reference` |
| [Game of Life](apps/game-of-life) | `rgb-matrix`, `tty` | An implementation of Conway's Game of Life with controls via [tty](libs/gotify) library. Optional state mirroring to a [pi-matrix-client](libs/pi-matrix-client) compatible display | `try-me`, `experiment` |
| [Config Builder](apps/config-builder)  | `tty` | Terminal app for managing config files related to a `@digital-alchemy` app | `functional`, `experiment` |
