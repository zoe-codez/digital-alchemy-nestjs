This repo is going **READONLY**

- [@zcc](https://github.com/zoe-codez/zcc) aims to be a feature compatible replacement, without the NestJS dependencies

-----

<h1 align="center">💻 Digital Alchemy Monorepo 🔮</h1>

## Description

`@digital-alchemy` is a collections of projects built on top of the [NestJS](https://nestjs.com/) framework. The repository is a collection of general purpose modules for building premium terminal applications, microservices, home automation logic, and more.
Modules are intended to be composed in any combination to build a desired application.

## 🛠️ Projects

### 🏡 Home Assistant / Automation ⏳

> A [docker based reference install](./docker/homeassistant/) provided to try out code without affecting an existing instance

| Local | NPM | Tags | Notes |
| --- | --- | --- | --- |
| 📂 [Automation Logic](libs/automation-logic) | [npm](https://www.npmjs.com/package/@digital-alchemy/automation-logic) | <ul><li>`nestjs_library`</li><li>`home_assistant`</li><li>`generated_types`</li></ul> | Canned automation logic, scene management, and more! |
| 📂 [Home Assistant](libs/home-assistant) | [npm](https://www.npmjs.com/package/@digital-alchemy/home-assistant)  | <ul><li>`nestjs_library`</li><li>`home_assistant`</li><li>`generated_types`</li></ul> | Websocket and rest api bindings for Home Assistant. Generates custom types based on your install |
| 🎬 [Entity Creation](apps/entity-creation) | **`N/A`** | <ul><li>`home_assistant`</li><li>`example_code`</li></ul> | Example code for generating basic push entities using `@digital-alchemy/home-assistant` |
| 🎬 [Scene Manager](apps/scene-manager) | **`N/A`** | <ul><li>`home_assistant`</li><li>`example_code`</li></ul> | Example code for creating scene managed rooms using `@digital-alchemy/automation-logic` |

### 🖥️ Terminal Applications 🕹️

| Local | NPM | Tags | Notes |
| ---  | --- | --- | --- |
| 📂 [TTY](libs/tty) | [npm](https://www.npmjs.com/package/@digital-alchemy/tty) | <ul><li>`nestjs_library`</li><li>`tty`</li></ul> | Prompts, canned components, rendering utilities, and keyboard interactions inside of the terminal |
| 👀 [Sampler App](apps/sampler-app) | `N/A` | <ul><li>`example_code`</li><li>**`try me!`**</li></ul> | Demo app for [tty](libs/tty) library functionality. Get a quick feel for how things look and work from inside your terminal |
| 🔬 [Hass CLI](apps/hass-cli) | `N/A` | <ul><li>`home_assistant`</li><li>`example_code`</li></ul> | Interactions with Home Assistant via terminal app. More development aid than functional tool. |
| 👀 [Game of Life](apps/game-of-life) | `N/A` | <ul><li>`rgb_matrix`</li><li>`example_code`</li><li>`experiment`</li><li>**`try me!`**</li></ul> | An implementation of Conway’s Game of Life with controls via [tty](libs/tty) library. Optional state mirroring to a [pi-matrix-client](libs/pi-matrix-client) compatible display |
| 🔬 [Config Builder](apps/config-builder) | `N/A` | <ul><li>`experiment`</li></ul> | Experimental application: terminal based application for manipulating config files compatible with this repo |

### 🖼️ RGB Matrix 🚦

> [Hardware build guide](./apps/pi-matrix/build.md)

| Local | NPM | Tags | Notes |
| --- | --- | --- | --- |
| 👀 [Pi Matrix](apps/pi-matrix) | [npm](https://www.npmjs.com/package/@digital-alchemy/pi-matrix) | <ul><li>`application`</li></ul>  | Simple application wrapper for `@digital-alchemy/pi-matrix-client` |
| 📂 [Pi Matrix Client](libs/pi-matrix-client) | [npm](https://www.npmjs.com/package/@digital-alchemy/pi-matrix-client) | <ul><li>`native_bindings`</li><li>`nestjs_library`</li></ul> | Code intended to run on a pi / similar. Performs rendering functions. |
| 📂 [Render Utils](libs/render-utils) | [npm](https://www.npmjs.com/package/@digital-alchemy/render-utils) | <ul><li>`shared`</li><li>`nestjs_library`</li></ul> | Generic math and utility functions for rgb matrix displays and terminal apps |
| 📂 [Rgb Matrix](libs/rgb-matrix) | [npm](https://www.npmjs.com/package/@digital-alchemy/rgb-matrix) | <ul><li>`client`</li><li>`nestjs_library`</li></ul> | Layout and rendering utilities for arduino rgb matrix displays |

### 🗜️ Meta / Other 🪆

| Local | NPM | Tags | Notes |
| --- | --- | --- | --- |
| 🎬 [Notification Tester](apps/notification-tester) | `N/A` | <ul><li>`example_code`</li></ul> | Simple example of how to import [gotify](libs/gotify) into an app, and send notifications |
| 📂 [Boilerplate](libs/boilerplate) | [npm](https://www.npmjs.com/package/@digital-alchemy/boilerplate) | <ul><li>`nestjs_library`</li></ul> | Bootstrapping, configuration, logging, and other basics |
| 📂 [Gotify](libs/gotify) | [npm](https://www.npmjs.com/package/@digital-alchemy/gotify) | <ul><li>`nestjs_library`</li></ul> | Application bindings for sending notifications though [Gotify](https://gotify.net/) |
| 📂 [MQTT](libs/mqtt) | [npm](https://www.npmjs.com/package/@digital-alchemy/mqtt) | <ul><li>`nestjs_library`</li></ul> | Basic MQTT bindings |
| 📂 [Server](libs/server) | [npm](https://www.npmjs.com/package/@digital-alchemy/server) | <ul><li>`nestjs_library`</li></ul> | Http server support, standard ssl & middleware configurations, request logging |
| 📂 [Testing](libs/testing) | [npm](https://www.npmjs.com/package/@digital-alchemy/testing) | <ul><li>`nestjs_library`</li></ul> | Extensions to NestJS unit testing to be compatible with `@digital-alchemy` apps |
| 📂 [Utilities](libs/utilities) | [npm](https://www.npmjs.com/package/@digital-alchemy/utilities) | <ul><li>`shared`</li></ul> | Standard utilities and constants used across the repository |
| 🔬 [Log Formatter](apps/log-formatter) | [npm](https://www.npmjs.com/package/@digital-alchemy/log-formatter) | <ul><li>`experiment`</li></ul> | Pipe (`\|`) friendly tool to reformat pino json logs to pretty logs |

## External Examples

### Basic Application

### Home Automation

- [Project link](https://github.com/zoe-codez/home-automation)

A working implementation of a home automation application.
Intended to show the `automation-logic` & `home-assistant` libraries being used
