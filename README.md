# cvmfs-emscripten [![Travis CI Build Status](https://travis-ci.org/cvmfs-contrib/cvmfs-emscripten.svg?branch=master)](https://travis-ci.org/cvmfs-contrib/cvmfs-emscripten)

Compile C/C++ programs that access data from CernVM-FS repositories to WebAssembly/asm.js,
and run them on any device with a modern web browser.

## Quick Usage

First, run `npm install` within the project directory to install some required Node.js packages.

Then, use the `emcc-cvmfs` script to compile C programs, or `em++-cvmfs` for C++ programs. These scripts are essentially wrappers around `emcc` and `em++`, which pass along a few required arguments to Emscripten. Any arguments you pass to the wrappers will also be passed on to Emscripten.

## Motivation

The goal of this project is to enable C/C++ programs compiled to Web Assembly or asm.js with Emscripten, to perform POSIX read-only I/O on CernVM-FS repositories. This means, compiling a program that does

```C
  int fd = open("/cvmfs/sft.cern.ch/my/dataset", O_RDONLY);
  read(fd, buf, len);
```

will work seamlessly by downloading the appropriate metadata and data, and also caching it on the brower's local storage for later use.

A potential application of this would be running event generator programs like Pythia and Geant4 on the browser efficiently, that is, without packaging all the required data files necessary for the computation with the HTML & JS files. Instead, as the program accesses certain files, they are fetched automatically on-demand and cached locally.

For example, here are the results for Pythia8 example main03 with and without the cvmfs backend,

| Pythia8 main03 | Without CVMFS | With CVMFS |
| - | - | - |
| Compiled files | 36 MB  | 7 MB |
| Data downloaded from CernVM-FS | -  | 750 KB |
| Link | [saurvs.github.io/pythia8-main03](https://saurvs.github.io/pythia8-main03) | [saurvs.github.io/cvmfs-pythia8-main03](https://saurvs.github.io/cvmfs-pythia8-main03) |

And similarly for Geant4 example B1,

| Geant4 B1 | Without CVMFS | With CVMFS |
| - | - | - |
| Compiled files | 270 MB  | 19 MB |
| Data downloaded from CernVM-FS | -  | 3.3 MB |
| Link | [saurvs.github.io/geant4-B1](https://saurvs.github.io/geant4-B1) | [saurvs.github.io/cvmfs-geant4-B1](https://saurvs.github.io/cvmfs-geant4-B1) |

## Project Info

This project is split into two parts - a CernVM-FS client written in JavaScript (inside `cvmfs`), and an Emscripten filesystem backend (inside `fs`) that calls into the client's APIs. Emscripten's generic filesystem backend is also slightly modified to support auto-mounting when a program accesses a repository under `/cvmfs`.

Note that compiling programs to run on Node.js isn't currently supported, as the client uses browser APIs exclusively for fetching and caching data.

### Master Keys

The only master public key included is for a test repository (`emscripten.cvmfs.io`). You can add more keys by calling `cvmfs.addMasterKey(pkcs8_key)` before mounting a repository. `pkcs8_key` must be a string representing a PKCS8 public key in PEM format.

### Caching

By default, the Local Storage API is used to cache file data and metadata, with LRU eviction when the cache is full. But since this API limits the cache size to less than 10MB on most browsers, there is an experimental caching method implemented that uses Service Workers and the new Cache API instead. Simply passing `-swcache` to `emcc-cvmfs` will enable this by placing a `sw-cache.js` Service Worker script alongside the other output files. This would allow the filesystem to cache much larger data, however, it has only been tested to work on newer (>= 57) versions of Mozilla Firefox.

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

## GSoC

This project was done as part of a Google Summer of Code project in 2018. The student was Saurav Sachidanand and the mentors were Jakob Blomer and Radu Popescu. A short blog related to this project was also maintained at [medium.com/@saurvs](https://medium.com/@saurvs).