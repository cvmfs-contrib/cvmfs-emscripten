# cvmfs-emscripten [![Travis CI Build Status](https://travis-ci.org/cvmfs-contrib/cvmfs-emscripten.svg?branch=master)](https://travis-ci.org/cvmfs-contrib/cvmfs-emscripten)

Compile C/C++ programs that access data from CernVM-FS repositories to WebAssembly/asm.js,
and run them on any device with a modern web browser.

## Usage

First, run `npm install` to install some dependencies.

Then, you can use `emcc-cvmfs` to compile your programs just as you would use `emcc`.
