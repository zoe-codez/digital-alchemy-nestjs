#!/bin/sh

docker compose -f ./apps/examples/docker/homeassistant/docker-compose.yaml down --remove-orphans -t 1
yarn hass:cleanup
yarn hass:decompress
