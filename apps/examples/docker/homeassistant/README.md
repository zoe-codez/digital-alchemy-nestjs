# Steggy Home Assistant reference install

> username: steggy
> password: nom nom

The reference install is a barely configured docker based Home Assistant install, set up on a non-standard port as to not conflict with any other installs.

## Container management

> commands are run from repository root

| command | requires root | description | notes |
| --- | --- | --- |
| `yarn hass:compress` | `*` | compressess the reference install back into the tar file | install should not be running |
| `yarn hass:decompress` |  | extract the reference install | install should not be running |
| `yarn hass:reset` | `*` | tear down the containers, remove the data, extract from reference, start again | install should not be running |
| `yarn hass:cleanup` | `*` | cleanup data from reference install |  install should not be running |
| `yarn container:hass:{start|stop}` | depends on permissions | start / stop the docker container |

## Setup notes

- Some additional tweaks to the `configuration.yaml` may be required if you want a reverse proxy in the mix
