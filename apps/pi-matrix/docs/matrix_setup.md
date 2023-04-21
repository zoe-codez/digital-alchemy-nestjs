# Matrix Setup

> WIP

## Commands

```bash
sudo su
apt-get update
apt-get upgrade
apt-get install mplayer

# * Install node + yarn
curl -fsSL https://fnm.vercel.app/install | bash
source /root/.bashrc
fnm install 18
source "$HOME/.bashrc"
curl -o- -L https://yarnpkg.com/install.sh | bash
export PATH="$HOME/.yarn/bin:$HOME/.config/yarn/global/node_modules/.bin:$PATH"

# * Install yarn dependencies
yarn global add @digital-alchemy/log-formatter pm2
```

## Tuning

- https://github.com/hzeller/rpi-rgb-led-matrix#use-minimal-raspbian-distribution
