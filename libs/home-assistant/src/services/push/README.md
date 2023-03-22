# Description

This folder contains providers that exist to generate new entities within Home Home Assistant, and push values to them.

## General Theory

These plugins work by generating YAML for Home Assistant to consume that represents the desired devices to create.
The newly created devices will all have unique ids, so that they will properly have their history recorded and be properly tracked.

All of the generated entities will be based off of the [Template](https://www.home-assistant.io/integrations/template/) integration.
These entities only need to have their push proxies injected for the purpose of manipulation of the entity.
Push entities are intended to act as much like normal entities as possible.
Switches will respond respond to service calls, etc.

### YAML Packages

This library builds all of it's YAML into a single target folder, with a single `include.yaml` to act as an entrypoint include.
These individual directories are then pulled into Home Assistant

```yaml
homeassistant:
  packages:
    my_app: !include ./packages/my_app/include.yaml
```

## Supported Domains

### Binary Sensor & Sensors

These are set up as pure template entities.
They feature support for setting attributes, and have their availability controlled by the owning node app sending consistent health checks.

### Switches

Switches are based off of the template switch integration.
These switches do have ahve support for attributes like sensors.

Switches operate by sending callback rest calls back to the service that created them.
That service will manage the state, sending replies back to Home Assistant to reflect the current state.

**Work arounds**: Template switches no have the ability to define their own state in the same way as templated sensors.
The way this library implements a work around that stores the states for all switches in the attributes of a binary sensor, and commonly references it

### Button

Buttons operate as callbacks, instead of pure entities like switches & sensors.
A button should be declared in the push entity configuration, and an appropriate method annotated with `TemplateButton`.
When the button is pressed, Home Assistant will pass through a call to the process, which will run the appropriate method associated with the button.

## Automatically created entities

Requirements scale

> 1 - Required for correct operation
> 2 - Enabled by default, highly recommended
> 3 - Disabled by default, may be interested
> 4 - For reference only: requires some configuration / changes to actually be useful

### {app} is online

> **1 / required**

This entity is set to be permanently available, not having it's own state tied to anything.
It will remain turned on as long as the owning app is sending consistent health checks.
If that app ever stops sending health checks, this entity will automatically turn off, flipping all other entities owned by the same script to unavailable also.

In the attributes, this entity also stores the current state of all template switches.

### {app} uptime

> **2 / recommended**

Number sensor that represents the uptime of the process in seconds.
Updated every 10 seconds, and starts at 0 every time the process restarts.

## Planned future features & entities

### `button.{app}_rebuild`

Initiate configuration dump on demand, then restart Home Assistant (gated behind a config flag, default: off)

### `[binary_sensor|update].{app}_config_current`

Is the current dumped data accurate to what is running?
Operates by looking at filesystem, does not reflect the state that is loaded into the running state of Home Assistant

### `binary_sensor.{app}_config_running`

Is Home Assistant currently running with a yaml package that is current?
If the setup requires a restart, this will remain false until the newest code is loaded.

## Rejected ideas

### Scenes

The only way I've found to integrate node based scene processing logic is to integrate though MQTT.
A MQTT integration is outside the scope of `@digital-alchemy/home-assistant`.
This functionality **IS** included within `@digital-alchemy/automation-logic`, which features MQTT as a hard dependency.

### MQTT entity autodiscovery

It's trash, and basically never works.
