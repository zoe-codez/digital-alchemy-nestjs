#!/bin/sh

docker compose -f ./apps/examples/docker/homeassistant/docker-compose.yaml down --remove-orphans
yarn hass:cleanup
yarn hass:decompress
yarn container:hass:start
