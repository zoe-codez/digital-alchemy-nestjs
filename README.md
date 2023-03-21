
<h1 align="center">Digital Alchemy Monorepo</h1>

## Description

`@digital-alchemy` is a collections of projects built on top of the [NestJS](https://nestjs.com/) framework.
The repository publishes a number of general purpose libraries for quickly building scripts, small microservices, home automation logic, and more.

## Packages

### Applications

| package | npm | notes |
| --- | --- | --- |
| [@digital-alchemy/config-builder](apps/config-builder)  | [npm](http://test.com) | Terminal app for managing config files related to a @digital-alchemy app |
| [@digital-alchemy/hass-type-generate](apps/hass-type-generate) | [npm](http://test.com) | Companion app for @digital-alchemy/home-assistant |
| [@digital-alchemy/log-formatter](apps/log-formatter)  | [npm](http://test.com) | Pipe friendly tool to reformat json logs to pretty logs |

### Libraries

| package | npm | notes |
| --- | --- | --- |
| [@digital-alchemy/automation-logic](libs/automation-logic) | [npm](http://test.com) | Extended tools for building home automation services |
| [@digital-alchemy/boilerplate](libs/boilerplate) | [npm](http://test.com) | Bootstrapping, configuration, logging, and other basics |
| [@digital-alchemy/home-assistant](libs/home-assistant) | [npm](http://test.com) | Websocket and rest api bindings for Home Assistant |
| [@digital-alchemy/mqtt](libs/mqtt) | [npm](http://test.com) | Basic MQTT bindings |
| [@digital-alchemy/rgb-matrix](libs/rgb-matrix) | [npm](http://test.com) | Layout and rendering utilities for arduino rgb matrix displays |
| [@digital-alchemy/server](libs/server) | [npm](http://test.com) | Http server support & basic utilities |
| [@digital-alchemy/testing](libs/testing) | [npm](http://test.com) | Testing utilities |
| [@digital-alchemy/tty](libs/tty) | [npm](http://test.com) | Prompts and rendering utilities for interactions inside of the terminal |
| [@digital-alchemy/utilities](libs/utilities) | [npm](http://test.com) | Standard utilities and constants used across the project |

### Versioning notes

⚠️ All packages are expected to be installed at the same version. Mixed versions may result in unpredictable behavior.

> Version format: year.week.build
