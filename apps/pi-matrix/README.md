# Description

This application provides a canned rest interface intended for basic drawing, text, images, and basic gif rendering on rgb matrix panels.
It utilizes [hzeller/rpi-rgb-led-matrix](https://github.com/hzeller/rpi-rgb-led-matrix) under the hood.

This application & related matrix rendering libraries are under active development.
Code APIs may receive breaking changes in the future as code matures

## Hardware & compatibility

See [build guide](./build.md) for reference hardware used in development. Anything compatible with the underlying libraries should work, there is no logic here that creates additional restrictions.

## Installing

This script is intended to install the app on a fresh rasbian lite install, and set it up to automatically run at boot.
It will require a password and the configuration file to be entered at the start, and is hands free after that.

```bash
# - Basics
# change to root
sudo su
# create configuration file
mkdir /root/.config
# save your configuration
nano /root/.config/pi-matrix
# (optional) update system & install extra runtime dependencies
apt-get update; apt-get upgrade
apt-get install -y imagemagick mplayer
# - imagemagick needed for images
# - mplayer needed for audio alerts via usb speaker

# - NodeJS
# Fast Node Manager
curl -fsSL https://fnm.vercel.app/install | bash
source /root/.bashrc

# install node
fnm install 18

# install yarn
curl -o- -L https://yarnpkg.com/install.sh | bash
source /root/.bashrc

# - app
# install pi-matrix & pm2
yarn global add @digital-alchemy/pi-matrix pm2

#  Start the app
cd "$(yarn global dir)/node_modules/@digital-alchemy/pi-matrix/"
pm2 start main.js
# Set pm2 to startup at device boot
pm2 startup
pm2 save
echo "Install complete!"
```

### Updating

```bash
yarn global upgrade @digital-alchemy/pi-matrix
pm2 restart all
```

## Running

### On Boot

When the application initially boots, it will display a clock on the first panel as proof of life.

### Stability

Application may randomly crash with an error like `free(): invalid pointer`.
This originates from lower level libraries, and no current fix exists.

`pm2` or similar mechanism should be used to automatically restart the app in case of failure.

> Anecdotally, this error never happens while app is running in background with `pm2` and no extra work is being done by the pi.

### Custom logic on device

[@digital-alchemy/pi-matrix-client](libs/li-matrix-client) contains all the logic, with this application being an extremely minimal rest wrapper.
The best way to add additional functionality or different methods of interaction (ex: setting via mqtt, health checks, device boot announcements, etc) is to import the matrix client library into your own application, and build to your liking.

## Example Configuration

> This configuration can be used with the hardware in the build guide.

```ini
; https://github.com/alexeden/rpi-led-matrix#matrix-options
[libs.rgb-matrix.MATRIX_OPTIONS]
  chainLength=10
  cols=64
  hardwareMapping=adafruit-hat
  rows=32

; https://github.com/alexeden/rpi-led-matrix#runtime-options
[libs.pi-matrix-client.RUNTIME_OPTIONS]
  gpioSlowdown=4
  dropPrivileges=0

[libs.server]
  ADMIN_KEY=super-secret-password
```
