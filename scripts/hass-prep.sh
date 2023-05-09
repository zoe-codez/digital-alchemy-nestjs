#!/bin/sh

docker compose -f ./assets/docker/homeassistant/docker-compose.yaml down --remove-orphans -t 1
yarn hass:cleanup
yarn hass:decompress
