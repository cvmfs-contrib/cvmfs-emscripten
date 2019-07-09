#!/bin/bash

set -e

SRC_DIR="$( cd "$( dirname "$0" )" && pwd )"

LOCAL_JS=$SRC_DIR/local.js
CVMFS_DIR=$SRC_DIR/cvmfs
THIRD_PARTY_DIR=$SRC_DIR/third_party
CVMFS_METHODS=$SRC_DIR/fs/cvmfs_methods.js
RUN_JS=$SRC_DIR/run.js

CVMFS_JS=$SRC_DIR/cvmfs.js

FILES_CHANGED=0
pre_files=($LOCAL_JS $CVMFS_DIR/*.js $THIRD_PARTY_DIR/*.js $CVMFS_METHODS $RUN_JS)

for file in ${pre_files[*]}; do
  if [[ $file != *sql.js && $file -nt $CVMFS_JS ]]; then
    FILES_CHANGED=1
    break
  fi
done

[[ FILES_CHANGED -eq 0 ]] && exit 0

echo "Generating cvmfs.js"

> $CVMFS_JS

for file in ${pre_files[*]}; do
  if [[ $file != *sql.js && $file != *sha3.js ]]; then
    cat $file >> $CVMFS_JS
  fi
done

npx babel $CVMFS_JS -o $CVMFS_JS.babel
mv $CVMFS_JS.babel $CVMFS_JS

# somehow, babel messes up transpiling sha3.js correctly, but sha3.js
# also dosn't crash Emscripten's optimizer, so we can just prepend it
cat $THIRD_PARTY_DIR/sha3.js >> $CVMFS_JS