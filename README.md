# cvmfs-emscripten [![Travis CI Build Status](https://travis-ci.org/cvmfs-contrib/cvmfs-emscripten.svg?branch=master)](https://travis-ci.org/cvmfs-contrib/cvmfs-emscripten)

Compile C/C++ programs that access data from CernVM-FS repositories to WebAssembly/asm.js,
and run them on any device with a modern web browser.

## Quick Usage

First, run `npm install` to install some required Node.js packages.

Then, use the `emcc-cvmfs` script to compile C programs, or `em++-cvmfs` for C++ programs. These scripts are essentially wrappers around `emcc` and `em++`, which pass along a few required arguments to Emscripten. Any arguments you pass to the wrappers will also be passed on to Emscripten.

## Brief Info

This project is split into two parts - a CernVM-FS client written in JavaScript (inside `cvmfs`), and an Emscripten filesystem backend (inside `fs`) that calls into the client's APIs. Emscripten's generic filesystem backend is also slightly modified to support auto-mounting when a program accesses a repository under `/cvmfs`.

The only master public key included is for a test repository (`emscripten.cvmfs.io`). You can add more keys by calling `cvmfs.addMasterKey(pkcs8_key)` before mounting a repository. `pkcs8_key` must be a string representing a PKCS8 public key in PEM format.

Note that compiling programs to run on Node.js isn't currently supported, as the client uses browser APIs exclusively for fetching and caching data.

## cvmfs.js

Running `generate-cvmfs.sh` will create a `cvmfs.js` file in the source directory, which contains the entier cvmfs client code (and code from all dependencies). As mentioned above, it can currently only be run on the browser.

The central object is `cvmfs.repo`, and it's constructor is `function(base_url, repo_name)`. Calling this function will download the manifest, whitelist, and certificate, and then verify all of them. If any error is detected, an `undefined` value is returned. It has the following methods:

* `function getManifest()` Returns an object storing the properties of the manifest.

* `function getWhitelist()` Returns an object storing the properties of the whitelist.

* `function getCertificate()` Returns the certificate of the repository as a `KJUR.asn1.x509` object.

* `function getCatalog(hash)` Returns an SQL database object representing the catalog for the given `hash`, which must be a `cvmfs.util.hash` object.

* `function getCatalogStats(catalog)` Returns an object storing the catalog's statistics.

* `function getCatalogProperties(catalog)` Returns an object storing the catalog's properties (table).

* `function getEntriesForParentPath(catalog, path)` Returns an array of string entires for the given directory path.

* `function getContentForRegularFile(catalog, path, flags)` Returns the string content of the given regular file at the given path and flags.

* `function getChunksWithinRangeForPath(catalog, path, flags, low, high)` Returns an array of chunks (strings) within the given range of a chunked file at the given path and flags.

* `function getSymlinkForPath(catalog, path)` Returns the raw string content of the symbolic link at the given path. No variable substitution is performed.

* `function getStatInfoForPath(catalog, path)` Returns the following info about the entry at the given path: uid, gid, size, mtime, mode, flags.

* `function getNestedCatalogHash(catalog, path)` Returns a `cvmfs.util.hash` object for the nested catalog whose entry is at the given path in the given catalog.

* `function getBindMountpointHash(catalog, path)` Returns a `cvmfs.util.hash` object for the bind mountpoint whose entry is at the given path in the given catalog.