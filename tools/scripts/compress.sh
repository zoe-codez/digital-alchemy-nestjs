#!/bin/sh
cd apps/examples/docker/homeassistant || exit
rm ./reference.tar.gz
tar -czvf ./reference.tar.gz ./config
