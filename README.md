# Sass Extension for Nova

Provides the missing support in Nova for compiling .sass files into css on save.

## Requirements

Requires the sass binary. This can be installed via Homebrew (https://brew.sh )

## Features

* Auto compiles scss files on save
* Compile scss on demand via the Editor menu

# TODO

* [ ] Check that the sass binary is available
* [ ] Add Preferences for style. expanded (default), compressed
* [ ] Add preferences for [no-]indented
* [ ] Add preferences for --[no-]error-css
* [ ] Add preferences for creating a .map file

* [x] For the Editor Compile, ensure this only compiles the current file
* [x] Give notification if not a valid file type