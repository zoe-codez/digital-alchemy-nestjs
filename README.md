
<h1 align="center">💻 Digital Alchemy Monorepo 🔮</h1>

## Description

`@digital-alchemy` is a collections of projects built on top of the [NestJS](https://nestjs.com/) framework.
The repository is a collection of general purpose libraries for building premium terminal applications, microservices, home automation logic, and more.
Editor features are a strong focus focus of this library, with full typescript support and

## Published Packages

### Applications

| package | install | notes |
| --- | --- | --- |
| [@digital-alchemy/config-builder](apps/config-builder)  | [npm](https://www.npmjs.com/package/@digital-alchemy/config-builder) | Terminal app for managing config files related to a `@digital-alchemy` app |
| [@digital-alchemy/hass-type-generate](apps/hass-type-generate) | [npm](https://www.npmjs.com/package/@digital-alchemy/hass-type-generate) | Companion app for `@digital-alchemy/home-assistant` |
| [@digital-alchemy/log-formatter](apps/log-formatter)  | [npm](https://www.npmjs.com/package/@digital-alchemy/log-formatter) | Pipe (`\|`) friendly tool to reformat json logs to pretty logs |
| [@digital-alchemy/pi-matrix](apps/pi-matrix)  | [npm](https://www.npmjs.com/package/@digital-alchemy/pi-matrix) | Application bindings for `@digital-alchemy/rgb-matrix`. Intended to run on Raspberry Pi, includes hardware build guide |

### Libraries

| package | install | notes |
| --- | --- | --- |
| [@digital-alchemy/automation-logic](libs/automation-logic) | [npm](https://www.npmjs.com/package/@digital-alchemy/automation-logic) | Extended tools for building home automation services |
| [@digital-alchemy/boilerplate](libs/boilerplate) | [npm](https://www.npmjs.com/package/@digital-alchemy/boilerplate) | Bootstrapping, configuration, logging, and other basics |
| [@digital-alchemy/gotify](libs/gotify) | [npm](https://www.npmjs.com/package/@digital-alchemy/gotify) | Application bindings for sending notifications though [Gotify](https://gotify.net/) |
| [@digital-alchemy/home-assistant](libs/home-assistant) | [npm](https://www.npmjs.com/package/@digital-alchemy/home-assistant) | Websocket and rest api bindings for Home Assistant. Generates custom types based on your install |
| [@digital-alchemy/mqtt](libs/mqtt) | [npm](https://www.npmjs.com/package/@digital-alchemy/mqtt) | Basic MQTT bindings |
| [@digital-alchemy/rgb-matrix](libs/rgb-matrix) | [npm](https://www.npmjs.com/package/@digital-alchemy/rgb-matrix) | Layout and rendering utilities for arduino rgb matrix displays |
| [@digital-alchemy/server](libs/server) | [npm](https://www.npmjs.com/package/@digital-alchemy/server) | Http server support, standard ssl & middleware configurations, request logging  |
| [@digital-alchemy/testing](libs/testing) | [npm](https://www.npmjs.com/package/@digital-alchemy/testing) | Extensions to NestJS unit testing to be compatible with `@digital-alchemy` apps |
| [@digital-alchemy/tty](libs/tty) | [npm](https://www.npmjs.com/package/@digital-alchemy/tty) | Prompts and rendering utilities for interactions inside of the terminal |
| [@digital-alchemy/utilities](libs/utilities) | [npm](https://www.npmjs.com/package/@digital-alchemy/utilities) | Standard utilities and constants used across the repositry |

## Example Applications

> Sometimes useful example / reference code

| Application | Type | Notes |
| --- | --- | --- |
| [Sampler App](apps/sampler-app) | `terminal` | Demo app for TTY library functionality. Get a quick feel for how things look and work from inside your terminal |
| [Hass CLI](apps/hass-cli) | `home-assistant`, `terminal` | Basic interactions with Home Assistant and development aid |
| [Entity Creation](apps/entity-creation) | `home-assistant` | Minimal example app. Creates a few entities and not much else |
| [Scene Manager](apps/scene-manager) | `home-assistant` | An example home automation app, which manages several rooms |
| [Notification Tester](apps/notification-tester) | `gotify` | Simple example of how to import `@digital-alchemy/gotify` into an app, and send notifications |
| [Game of Life](apps/game-of-life) | `rgb-matrix`, `tty` | An implementation of Conway's Game of Life with controls via TTY library, and optional mirroring to a `pi-matrix-client` compatible display |
