# Lifecycle events

In order to accomplish some of the application flow features required by `@steggy`, additional lifecycle events are required.
This are implemented before / after the existing NestJS lifecycle events.
When possible, it is recommended to use the standard nest lifecycle events.

## `onRewire(app, bootstrapOptions)`

This event is intended for providers that want to significantly change the way the application runs.
They should either do nothing at all for a given call, or result in a `process.exit()` call at the end.

Example use cases: `--help` (TTY) & `--scan-config` (Boilerplate) switches

## `onPreInit(app, express, bootstrapOptions)`

Gain access to the nest application from inside the provider prior to the `app.init()` call.
Most useful in attaching execution order dependant middleware to Nest, but may have other uses.

## init()

Standard NestJS lifecycle events

- onModuleInit
- onApplicationBootstrap

## `onPostInit(app, express, bootstrapOptions)`

Nest has finished it's own init cycle, and released control back.
Perform any work like attaching webserver listeners here.
