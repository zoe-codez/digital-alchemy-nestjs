
<h1 align="center">💻 Digital Alchemy Monorepo 🔮</h1>

## Description

`@digital-alchemy` is a collections of projects built on top of the [NestJS](https://nestjs.com/) framework.
The repository is a collection of general purpose libraries for building premium terminal applications, microservices, home automation logic, and more.

### Editor Features

Editor interactions are a strong focus for consuming this project.
All projects are built with Typescript from the ground up.
Some projects feature [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) APIs that build custom types based on their capabilities.

## Public Packages

### Applications

| package | install | notes |
| --- | --- | --- |
| [@digital-alchemy/config-builder](apps/config-builder)  | [npm](https://www.npmjs.com/package/@digital-alchemy/config-builder) | Terminal app for managing config files related to a `@digital-alchemy` app |
| [@digital-alchemy/hass-type-generate](apps/hass-type-generate) | [npm](https://www.npmjs.com/package/@digital-alchemy/hass-type-generate) | Companion app for `@digital-alchemy/home-assistant` |
| [@digital-alchemy/log-formatter](apps/log-formatter)  | [npm](https://www.npmjs.com/package/@digital-alchemy/log-formatter) | `\|` pipe friendly tool to reformat json logs to pretty logs |

### Libraries

| package | install | notes |
| --- | --- | --- |
| [@digital-alchemy/automation-logic](libs/automation-logic) | [npm](https://www.npmjs.com/package/@digital-alchemy/automation-logic) | Extended tools for building home automation services |
| [@digital-alchemy/boilerplate](libs/boilerplate) | [npm](https://www.npmjs.com/package/@digital-alchemy/boilerplate) | Bootstrapping, configuration, logging, and other basics |
| [@digital-alchemy/home-assistant](libs/home-assistant) | [npm](https://www.npmjs.com/package/@digital-alchemy/home-assistant) | Websocket and rest api bindings for Home Assistant. Features dyn |
| [@digital-alchemy/mqtt](libs/mqtt) | [npm](https://www.npmjs.com/package/@digital-alchemy/mqtt) | Basic MQTT bindings |
| [@digital-alchemy/rgb-matrix](libs/rgb-matrix) | [npm](https://www.npmjs.com/package/@digital-alchemy/rgb-matrix) | Layout and rendering utilities for arduino rgb matrix displays |
| [@digital-alchemy/server](libs/server) | [npm](https://www.npmjs.com/package/@digital-alchemy/server) | Http server support & basic utilities |
| [@digital-alchemy/testing](libs/testing) | [npm](https://www.npmjs.com/package/@digital-alchemy/testing) | Testing utilities |
| [@digital-alchemy/tty](libs/tty) | [npm](https://www.npmjs.com/package/@digital-alchemy/tty) | Prompts and rendering utilities for interactions inside of the terminal |
| [@digital-alchemy/utilities](libs/utilities) | [npm](https://www.npmjs.com/package/@digital-alchemy/utilities) | Standard utilities and constants used across the project |

## Example Terminal Apps

Sometimes useful example code.

### [Sampler App](apps/sampler-app)

Demo app for TTY library functionality. Get a quick feel for how things look and work from inside your terminal.

```bash
# run dev server
npx nx serve sampler-app
```

### [Hass CLI](apps/hass-cli)

Basic interactions with Home Assistant, in the form of a terminal app.
Exists as both a convenience/development tool, and a place for practical testing of functionality provided by `@steggy/home-assistant`.

```bash
# run dev server with credentials passed in via environment variables
BASE_URL=http://homeassistant.some.domain TOKEN=long_lived_access_token npx nx serve hass-cli
```

## Example Automation

This code is intended to interact with Home Assistant.
A [dockerized reference install](apps/examples/docker/homeassistant) is included with this repository intended for use with these apps to prevent accidental changes to your normal install.

### [Entity Creation](apps/examples/entity-creation)

Minimal example app. Creates a few entities and not much else.

### [Scene Manager](apps/examples/scene-manager)

> requires external mqtt dependency and additional configuration to be actually functional

An example home automation app, which manages several rooms.

## Versioning notes

> ⚠️ all packages are expected to be installed at the same version.

Version format: year.week.build
