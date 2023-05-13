
<h1 align="center">💻 Digital Alchemy Monorepo 🔮</h1>

## Description

`@digital-alchemy` is a collections of projects built on top of the [NestJS](https://nestjs.com/) framework. The repository is a collection of general purpose modules for building premium terminal applications, microservices, home automation logic, and more.
Modules are intended to be composed in any combination to build a desired application.

## Project Groups

### Home Assistant/Automation

> A [docker based reference install](./docker/homeassistant/) provided to try out code without affecting an existing instance

| Local | NPM | Tags | Notes |
| --- | --- | --- | --- |
| [@digital-alchemy/hass-type-generate](apps/hass-type-generate) | [npm](https://www.npmjs.com/package/@digital-alchemy/hass-type-generate) | <ul><li>`application`</li><li>`home&#8209;assistant`</li><li>`support`</li></ul> | Companion app for building dynamic types related to `automation-logic` & `home&#8209;assistant` |
| [@digital-alchemy/automation-logic](libs/automation-logic) | [npm](https://www.npmjs.com/package/@digital-alchemy/automation-logic) | <ul><li>`nestjs library`</li><li>`home&#8209;assistant`</li><li>`generated-types`</li></ul> | Canned automation logic, scene management, and more! |
| [@digital-alchemy/home-assistant](libs/home-assistant) | [npm](https://www.npmjs.com/package/@digital-alchemy/home-assistant)  | <ul><li>`nestjs library`</li><li>`home&#8209;assistant`</li><li>`generated-types`</li></ul> | Websocket and rest api bindings for Home Assistant. Generates custom types based on your install |
| [Entity Creation](apps/entity-creation) | **`N/A`** | <ul><li>`home&#8209;assistant`</li><li>`example&#8209;code`</li></ul> | Example code for generating basic push entities using `@digital-alchemy/home-assistant` |
| [Scene Manager](apps/scene-manager) | **`N/A`** | <ul><li>`home&#8209;assistant`</li><li>`example&#8209;code`</li></ul> | Example code for creating scene managed rooms using `@digital-alchemy/automation-logic` |

### Terminal Applications

| Local | NPM | Tags | Notes |
| ---  | --- | --- | --- |
| [@digital-alchemy/tty](libs/tty) | [npm](https://www.npmjs.com/package/@digital-alchemy/tty) | <ul><li>`nestjs library`</li><li>`tty`</li></ul> | Prompts and rendering utilities for interactions inside of the terminal |
| [Sampler App](apps/sampler-app) | `N/A` | <ul><li>`example&#8209;code`</li><li>**`try&#8209;me!`**</li></ul> | Demo app for [tty](libs/tty) library functionality. Get a quick feel for how things look and work from inside your terminal |
| [Hass CLI](apps/hass-cli) | `N/A` | <ul><li>`home&#8209;assistant`</li><li>`example&#8209;code`</li></ul> | Interactions with Home Assistant via terminal app. More development aid than functional tool. |
| [Game of Life](apps/game-of-life) | `N/A` | <ul><li>`rgb&#8209;matrix`</li><li>`example&#8209;code`</li><li>`experiment`</li><li>**`try&#8209;me!`**</li></ul> | An implementation of Conway’s Game of Life with controls via [tty](libs/tty) library. Optional state mirroring to a [pi-matrix-client](libs/pi-matrix-client) compatible display |
| [Config Builder](apps/config-builder) | `N/A` | <ul><li>`experiment`</li></ul> | Experimental application: terminal based application for manipulating config files compatible with this repo |

<span style="">

### RGB Matrix

> [Hardware build guide](./apps/pi-matrix/build.md)

| Local | NPM | Tags | Notes |
| --- | --- | --- | --- |
| [@digital-alchemy/pi-matrix](apps/pi-matrix) | [npm](https://www.npmjs.com/package/@digital-alchemy/pi-matrix) | <ul><li>`application`</li></ul>  | Simple application wrapper for `@digital-alchemy/pi-matrix-client` |
| [@digital-alchemy/pi-matrix-client](libs/pi-matrix-client) | [npm](https://www.npmjs.com/package/@digital-alchemy/pi-matrix-client) | <ul><li>`native&#8209;bindings`</li><li>`nestjs library`</li></ul> | Code intended to run on a pi / similar. Performs rendering functions. |
| [@digital-alchemy/render-utils](libs/render-utils) | [npm](https://www.npmjs.com/package/@digital-alchemy/render-utils) | <ul><li>`shared`</li><li>`nestjs library`</li></ul> | Generic math and utility functions for rgb matrix displays and terminal apps |
| [@digital-alchemy/rgb-matrix](libs/rgb-matrix) | [npm](https://www.npmjs.com/package/@digital-alchemy/rgb-matrix) | <ul><li>`client`</li><li>`nestjs library`</li></ul> | Layout and rendering utilities for arduino rgb matrix displays |

### Meta / Other

| Local | NPM | Tags | Notes |
| --- | --- | --- | --- |
| [@digital-alchemy/log-formatter](apps/log-formatter) | [npm](https://www.npmjs.com/package/@digital-alchemy/log-formatter) | <ul><li>`experiment application`</li></ul> | Pipe (`\|`) friendly tool to reformat pino json logs to pretty logs |
| [@digital-alchemy/boilerplate](libs/boilerplate) | [npm](https://www.npmjs.com/package/@digital-alchemy/boilerplate) | <ul><li>`nestjs library`</li></ul> | Bootstrapping, configuration, logging, and other basics |
| [@digital-alchemy/gotify](libs/gotify) | [npm](https://www.npmjs.com/package/@digital-alchemy/gotify) | <ul><li>`nestjs library`</li></ul> | Application bindings for sending notifications though [Gotify](https://gotify.net/) |
| [@digital-alchemy/mqtt](libs/mqtt) | [npm](https://www.npmjs.com/package/@digital-alchemy/mqtt) | <ul><li>`nestjs library`</li></ul> | Basic MQTT bindings |
| [@digital-alchemy/server](libs/server) | [npm](https://www.npmjs.com/package/@digital-alchemy/server) | <ul><li>`nestjs library`</li></ul> | Http server support, standard ssl & middleware configurations, request logging |
| [@digital-alchemy/testing](libs/testing) | [npm](https://www.npmjs.com/package/@digital-alchemy/testing) | <ul><li>`nestjs library`</li></ul> | Extensions to NestJS unit testing to be compatible with `@digital-alchemy` apps |
| [@digital-alchemy/utilities](libs/utilities) | [npm](https://www.npmjs.com/package/@digital-alchemy/utilities) | <ul><li>`shared`</li></ul> | Standard utilities and constants used across the repository |
| [Notification Tester](apps/notification-tester) | `N/A` | <ul><li>`example&#8209;code`</li></ul> | Simple example of how to import [gotify](libs/gotify) into an app, and send notifications |
