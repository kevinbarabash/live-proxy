# live-proxy

Live reloading for JavaScript + sand boxing.

The purpose of this library is to eventually replace the live reload mechanism
used by live-editor.

[Demo](https://kevinbarabash.github.io/live-proxy)

## Features

### Reloading

- only re-initialize objects when the code that initialized them changes
- handles prototype style classes

### Sand Boxing

- rewrite user code that access window to access a custom window-like object
- prevent introspection of rewritten code by forcing .toString() to return 
  original user code for functions

## TODO

- allow locals to shadow global variables
- handle inheritance
- handle ES2015 style classes
- iframe sand boxing
- proper event handling in iframes
- wrap document.createElement to prevent creation of other iframes or scripts
  programmatically
- handle processing-js specific issues in a generalizable way
- automatically handle cleanup of timers and intervals
