#!/bin/sh

yarn container:hass:stop
yarn container:redis:stop
yarn hass:cleanup
yarn hass:decompress
yarn container:hass:start
yarn container:redis:start
