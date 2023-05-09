# 💻 Digital Alchemy Monorepo 🔮

## Description

`@digital-alchemy` is a collections of projects built on top of the [NestJS](https://nestjs.com/) framework. The repository is a collection of general purpose libraries for building premium terminal applications, microservices, home automation logic, and more.

## Published Packages

### Applications

| Package | Install | Notes |
| --- | --- | --- |
| [@digital-alchemy/hass-type-generate](/tmp/.mount_Joplin6iMhJm/resources/app.asar/apps/hass-type-generate "apps/hass-type-generate") | [npm](https://www.npmjs.com/package/@digital-alchemy/hass-type-generate) | Companion app for `@digital-alchemy/home-assistant` |
| [@digital-alchemy/log-formatter](/tmp/.mount_Joplin6iMhJm/resources/app.asar/apps/log-formatter "apps/log-formatter") | [npm](https://www.npmjs.com/package/@digital-alchemy/log-formatter) | Pipe (`\\|`) friendly tool to reformat json logs to pretty logs |
| [@digital-alchemy/pi-matrix](/tmp/.mount_Joplin6iMhJm/resources/app.asar/apps/pi-matrix "apps/pi-matrix") | [npm](https://www.npmjs.com/package/@digital-alchemy/pi-matrix) | Application bindings for `@digital-alchemy/pi-matrix-client`. Intended to run on Raspberry Pi, includes hardware build guide |

### Libraries

| Package | Install | Tags | Notes |
| --- | --- | --- | --- |
| [@digital-alchemy/automation-logic](/tmp/.mount_Joplin6iMhJm/resources/app.asar/libs/automation-logic "libs/automation-logic") | [npm](https://www.npmjs.com/package/@digital-alchemy/automation-logic) | `nestjs`, `home-assistant`, `generated-types` | Extended tools for building home automation services |
| [@digital-alchemy/boilerplate](/tmp/.mount_Joplin6iMhJm/resources/app.asar/libs/boilerplate "libs/boilerplate") | [npm](https://www.npmjs.com/package/@digital-alchemy/boilerplate) | `nestjs` | Bootstrapping, configuration, logging, and other basics |
| [@digital-alchemy/gotify](/tmp/.mount_Joplin6iMhJm/resources/app.asar/libs/gotify "libs/gotify") | [npm](https://www.npmjs.com/package/@digital-alchemy/gotify) | `nestjs` | Application bindings for sending notifications though [Gotify](https://gotify.net/) |
| [@digital-alchemy/home-assistant](/tmp/.mount_Joplin6iMhJm/resources/app.asar/libs/home-assistant "libs/home-assistant") | [npm](https://www.npmjs.com/package/@digital-alchemy/home-assistant) | `nestjs`, `home-assistant`, `generated-types` | Websocket and rest api bindings for Home Assistant. Generates custom types based on your install |
| [@digital-alchemy/mqtt](/tmp/.mount_Joplin6iMhJm/resources/app.asar/libs/mqtt "libs/mqtt") | [npm](https://www.npmjs.com/package/@digital-alchemy/mqtt) | `nestjs` | Basic MQTT bindings |
| [@digital-alchemy/pi-matrix-client](/tmp/.mount_Joplin6iMhJm/resources/app.asar/libs/pi-matrix-client "libs/pi-matrix-client") | [npm](https://www.npmjs.com/package/@digital-alchemy/pi-matrix-client) | `nestjs`, `rgb-matrix`, `app-as-library` | Application in the form of a library. Import and run as-is, or use as a starting point for a larger application |
| [@digital-alchemy/render-utils](/tmp/.mount_Joplin6iMhJm/resources/app.asar/libs/render-utils "libs/render-utils") | [npm](https://www.npmjs.com/package/@digital-alchemy/render-utils) | `nestjs`, `shared`, `rgb-matrix`, `tty` | Generic math and utility functions for rgb matrix displays and terminal apps |
| [@digital-alchemy/rgb-matrix](/tmp/.mount_Joplin6iMhJm/resources/app.asar/libs/rgb-matrix "libs/rgb-matrix") | [npm](https://www.npmjs.com/package/@digital-alchemy/rgb-matrix) | `nestjs`, `rgb-matrix` | Layout and rendering utilities for arduino rgb matrix displays |
| [@digital-alchemy/server](/tmp/.mount_Joplin6iMhJm/resources/app.asar/libs/server "libs/server") | [npm](https://www.npmjs.com/package/@digital-alchemy/server) | `nestjs` | Http server support, standard ssl & middleware configurations, request logging |
| [@digital-alchemy/testing](/tmp/.mount_Joplin6iMhJm/resources/app.asar/libs/testing "libs/testing") | [npm](https://www.npmjs.com/package/@digital-alchemy/testing) | `nestjs` | Extensions to NestJS unit testing to be compatible with `@digital-alchemy` apps |
| [@digital-alchemy/tty](/tmp/.mount_Joplin6iMhJm/resources/app.asar/libs/tty "libs/tty") | [npm](https://www.npmjs.com/package/@digital-alchemy/tty) | `nestjs`, `tty` | Prompts and rendering utilities for interactions inside of the terminal |
| [@digital-alchemy/utilities](/tmp/.mount_Joplin6iMhJm/resources/app.asar/libs/utilities "libs/utilities") | [npm](https://www.npmjs.com/package/@digital-alchemy/utilities) | `shared` | Standard utilities and constants used across the repository |

## Example Applications

> Sometimes useful example / reference code

| Application | Type | Notes | Tags |
| --- | --- | --- | --- |
| [Sampler App](/tmp/.mount_Joplin6iMhJm/resources/app.asar/apps/sampler-app "apps/sampler-app") | `terminal` | Demo app for [tty](/tmp/.mount_Joplin6iMhJm/resources/app.asar/libs/gotify "libs/gotify") library functionality. Get a quick feel for how things look and work from inside your terminal | `functional` |
| [Hass CLI](/tmp/.mount_Joplin6iMhJm/resources/app.asar/apps/hass-cli "apps/hass-cli") | `home-assistant`, `terminal` | Basic interactions with Home Assistant and development aid | `functional` |
| [Entity Creation](/tmp/.mount_Joplin6iMhJm/resources/app.asar/apps/entity-creation "apps/entity-creation") | `home-assistant` | Minimal example app. Creates a few entities and not much else | `reference` |
| [Scene Manager](/tmp/.mount_Joplin6iMhJm/resources/app.asar/apps/scene-manager "apps/scene-manager") | `home-assistant` | An example home automation app, which manages several rooms | `reference` |
| [Notification Tester](/tmp/.mount_Joplin6iMhJm/resources/app.asar/apps/notification-tester "apps/notification-tester") | `gotify` | Simple example of how to import [gotify](/tmp/.mount_Joplin6iMhJm/resources/app.asar/libs/gotify "libs/gotify") into an app, and send notifications | `reference` |
| [Game of Life](/tmp/.mount_Joplin6iMhJm/resources/app.asar/apps/game-of-life "apps/game-of-life") | `rgb-matrix`, `tty` | An implementation of Conway’s Game of Life with controls via [tty](/tmp/.mount_Joplin6iMhJm/resources/app.asar/libs/gotify "libs/gotify") library. Optional state mirroring to a [pi-matrix-client](/tmp/.mount_Joplin6iMhJm/resources/app.asar/libs/pi-matrix-client "libs/pi-matrix-client") compatible display | `try-me`, `experiment` |
| [Config Builder](/tmp/.mount_Joplin6iMhJm/resources/app.asar/apps/config-builder "apps/config-builder") | `tty` | Terminal app for managing config files related to a `@digital-alchemy` app | `functional`, `experiment` |
