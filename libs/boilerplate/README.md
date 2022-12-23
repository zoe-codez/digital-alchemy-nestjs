# @steggy/boilerplate

## Description

This library is the required entrypoint for using the rest of the libraries published from this repository.
Boilerplate provides a batteries included bootstrapping workflow for NestJS applications, as well as several utility classes.

## Extra Reading

| Link | Description |
| --- | --- |
| [Logger](./docs/logger.md) | API documentation for `AutoLogService` |
| [Usage example](https://github.com/mp3three/quickscript) | Small terminal app in an external repo utilizing this boilerplate |
| [Lifecycle events](./docs/lifecycle.md) | Startup lifecycle event flow for boilerplate & nestjs |

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
export class MyApplication {}

// Provide different bootstrapping options based on build environment files
Bootstrap(MyApplication, {
  config: { ... },
  http: false,
  prettyLog: true
})
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

## Configuration options

The following configuration options are utilized by this library.

```ini
; default configuration
[libs.boilerplate]
  CACHE_PROVIDER=memory
  CACHE_TTL=86_400
  LOG_LEVEL=info
  CACHE_HOST=localhost
  CACHE_PORT=6379
```

### `CACHE_PROVIDER`

Cache storage provider. default: `memory`

| option | note |
| --- | --- |
| `memory` | store in memory of node process, cleared when process dies |
| `redis` | connect to an external redis instance, data will persist after process dying |

### `CACHE_TTL`

Configuration property for redis connection

### `LOG_LEVEL`

Minimum log level to output. default: `info`

- `silent`
- `info`
- `warn`
- `debug`
- `error`

### `CACHE_HOST`

Address for redis instance, default: `localhost`

### `CACHE_PORT`

Port for redis instance, default: `6379`

## Switches

Flags and switches that are intended to be used on the command line when launching the app.

### `SCAN_CONFIG`

```bash
# Usage example
node ./dist/apps/sampler-app/main.js --scan-config | tee ./configuration.json
```

Scan all modules and providers to gather all available configuration metadata, output as json, and exit.
Implemented for use with the `config-builder` app

### `CONFIG`

```bash
# Usage example
node ./dist/apps/sampler-app/main.js --config /path/to/config/file
```

If provided, the automatic configuration file lookup & merge process will be skipped in favor of loading this single file.
All rules relating to environment variables and other command line switches will operate normally.
