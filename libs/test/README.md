# `@steggy/test`

Create unit tests for libraries based off of `@steggy/boilerplate`.
This testing library aims to be api compatible with the nest testing library, while providing a bootstrapping flow that can be used for testing.

## Notes

### Configuration

File based configurations will not be loaded unless an application name or config file is explicitly provided.
Environment variables and command line switches may still have an effect

### Lifecycle events

The testing library does not run lifecycle events on providers by default.
Setting the `bootstrap.init = true` in the configuration options will cause the full lifecycle and init workflow to happen.
