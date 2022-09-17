# @steggy/boilerplate

## Description

This library is the required entrypoint for using the rest of the libraries published from this repository.
Boilerplate provides a batteries included bootstrapping workflow for NestJS applications, as well as several utility classes.

## Extra Reading

| | |
| --- | --- |
| [Logger](./docs/logger.md) | API documentation for `AutoLogService` |

## Bootstrap

### `@QuickScript` minimal applications

The `@QuickScript` annotation is based off the NestJS `@Module` annotation, and it represents the code entrypoint for the application.
When the code is run, the `@QuickScript` annotation will automatically bootstrap an application, and run the `exec` method if provided.

This annotation is intended for more minimal applications.
A few files, all business logic and no specialized build needs.
More complex applications should utilize the manual bootstrapping flow in order to get more customization.

```typescript
import { QuickScript } from "@steggy/boilerplate";

@QuickScript()
class ExampleScript {
  exec() {
    console.log("Hello world");
  }
}
```

### Manual bootstrap

The manual bootstrapping process requires the manual definition of a root application module separate from the `Bootstrap` call.
`@ApplicationModule` should be used to annotate the root module.

```typescript
import { ApplicationModule } from "@steggy/boilerplate";

@ApplicationModule({
  application: Symbol("my-application"),
  controllers: [...],
  imports: [...],
  providers: [...]
})
export class ApplicationModule {}

// Provide different bootstrapping options based on build environment files
Bootstrap(ApplicationModule, {
  config: { ... },
  http: true,
  prettyLog: true
})
```

### Lifecycle events

The bootstrap flow provides additional lifecycle events to simplify some application wiring.
When possible, it is recommended to use the standard nest lifecycle events.

```typescript
import { QuickScript } from "@steggy/boilerplate";

@QuickScript()
class ExampleScript {
  // Intended for situations where application flow needs to be changed.
  // Logic going here should either do nothing, or result in a process.exit()
  rewire(app, bootstrapOptions) {
    console.log("1");
  }
  // Called prior to kicking off the NestJS app.init()
  // Logic that might have otherwise gone in your entrypoint file can fit in here
  onPreInit(app, express, bootstrapOptions) {
    console.log("2");
  }
  // NestJS lifecycle
  onModuleInit() {
    console.log("3");
  }
  // NestJS lifecycle
  onApplicationBootstrap() {
    console.log("4");
  }
  // Called after successful init
  // Logic at the extreme end of boostrapping goes here. Ex: attaching webserver listeners
  onPostInit(app, express, bootstrapOptions) {
    console.log("5");
  }
  // Provided by `@QuickScript` only
  // Very last method to run
  exec() {
    console.log("Hello world");
  }
}
```

## Configuration

The boilerplate library has an opinionated configuration system that is based off [rc](https://www.npmjs.com/package/rc).
It's intended to provide an EVEN LAZIER way of configuration applications working through the NestJS direct injection system.
The `@InjectConfig` annotation can be used to retrieve configuration values for providers.

Some metadata is should be provided to help the configuration system.
In smaller applications, it is convenient to provide this inline with the `@InjectConfig` annotation.
Larger applications, and libraries should place metadata definitions at the module level so the information is central and can be reused.

### Inline definition

```typescript
import { QuickScript } from "@steggy/boilerplate";

@QuickScript()
class ExampleScript {
  constructor(
    @InjectConfig("SPECIAL_STRING", {
      type: "string",
      description: "A human readable description for why this exists",
      default: "so special"
    }) private readonly specialString: string
  ){}
}
```

### Module level definition

```typescript
import { QuickScript } from "@steggy/boilerplate";

@QuickScript({
  configuration: {
    SPECIAL_STRING: {
      type: "string",
      description: "A human readable description for why this exists",
      default: "so special"
    }
  }
})
class ExampleScript {
  constructor(
    @InjectConfig("SPECIAL_STRING") private readonly specialString: string
  ){}
}
```

### Value resolution

The configuration loader merges values on a per-property basis.
Values provided in sources lower in this list override values from higher.

- Inline constructor definitions
  - `private readonly prop: string = "hello world"`
- Metadata definitions
- Bootstrap overrides
- File based configurations
  - `/etc/{name}/config`
  - `/etc/{name}/config.json`
  - `/etc/{name}/config.ini`
  - `/etc/{name}/config.yaml`
  - `/etc/{name}rc`
  - `/etc/{name}rc.json`
  - `/etc/{name}rc.ini`
  - `/etc/{name}rc.yaml`
  - `cwd()/.{name}rc`
  - Recursively to system root: `cwd()/../.{name}rc`
  - `~/.config/{name}`
  - `~/.config/{name}.json`
  - `~/.config/{name}.ini`
  - `~/.config/{name}.yaml`
  - `~/.config/{name}/config`
  - `~/.config/{name}/config.json`
  - `~/.config/{name}/config.ini`
  - `~/.config/{name}/config.yaml`
- Environment variables
- Command line switches
