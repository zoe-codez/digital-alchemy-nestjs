#!/bin/sh

yarn container:hass:stop
yarn hass:cleanup
yarn hass:decompress
yarn container:hass:start
