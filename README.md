# cvmfs-emscripten [![Travis CI Build Status](https://travis-ci.org/cvmfs-contrib/cvmfs-emscripten.svg?branch=master)](https://travis-ci.org/cvmfs-contrib/cvmfs-emscripten)

Compile C/C++ programs that access data from CernVM-FS repositories to WebAssembly/asm.js,
and run them on any device with a modern web browser.

## Quick Usage

First, run `npm install` to install some required Node.js packages.

Then, use the `emcc-cvmfs` script to compile C programs, or `em++-cvmfs` for C++ programs. These scripts are essentially wrappers around `emcc` and `em++`, which include a few required arguments. Any arguments you pass to the wrappers will be passed on to Emscripten.

## Info

This project is split into two parts - a CernVM-FS client written in JavaScript (inside `cvmfs`), and an Emscripten filesystem backend (inside `fs`) that calls into the client's APIs. Emscripten's generic filesystem backend is also slightly modified to support auto-mounting when a program accesses a repository under `/cvmfs`.

The only master public key included is for a test repository (`emscripten.cvmfs.io`). You can add more keys by calling `cvmfs.addMasterKey(pkcs8_key)` before mounting a repository. `pkcs8_key` must be a string representing a PKCS8 public key in PEM format.

Also note that compiling programs to run on Node.js isn't currently supported, as the client uses browser APIs exclusively.