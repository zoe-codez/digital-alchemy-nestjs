# `@steggy/test`

Create unit tests for libraries based off of `@steggy/boilerplate`.
This testing library aims to be api compatible with the nest testing library, while providing a bootstrapping flow that can be used for testing.

## Notes

### Configuration

File based configurations are ignored by the test loader.
Environment variables and command line switches may still have an effect.
The intended way to provide configurations to the test adapter is via the bootstrap overrides when creating the test module.
