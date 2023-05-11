# `@digital-alchemy/gotify`

Basic Typescript friendly bindings for [Gotify](https://gotify.net/) notifications.

## Example configuration

```ini
[libs.gotify]
  BASE_URL=<base_url>
  TOKEN=<client_token>

; local channel name = <relevant application token>
[libs.gotify.CHANNEL_MAPPING]
  experiments=<application_token>
  reminders=<application_token>
  automation=<application_token>
  security=<application_token>
```

## Example Usage

See [notification-tester](https://github.com/zoe-codez/digital-alchemy/tree/main/apps/notification-tester/src/entrypoints/main.ts)
