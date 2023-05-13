# Conway's Game of Life

A proof of concept implementation of Conway's Game of Life.
Played within a terminal app, with optional mirroring to a `pi-matrix` display.

## Running

```bash
npx nx serve pi-matrix
```

Keymap is printed at the bottom of the screen.
If mirroring to a pi-matrix, updates will be sent after manually verifying the connection.

## Configuration

Basic game does not require any configuration.
The below config can be used to connect the game to a running `pi-matrix` instance.

```ini
[libs.rgb-matrix]
  PI_MATRIX_BASE_URL=http://192.168.1.100:7000
  PI_MATRIX_KEY=super-secret-password

; if connected to redis, the board state & settings will be preserved
[libs.boilerplate]
  CACHE_PROVIDER=redis
```

## Example

> Demonstration video showing the synced operation of terminal + pi matrix display

- Video starts out with the manual changes of a few pixels
- Then ticks through a few generations manually
- Finally 2 batch runs of generations

![matrix hello world](./docs/matrix_hello_world.gif)
