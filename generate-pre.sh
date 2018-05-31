#!/bin/bash

set -e

SRC_DIR="$( cd "$( dirname "$0" )" && pwd )"
CVMFS_DIR=$SRC_DIR/cvmfs
THIRD_PARTY_DIR=$SRC_DIR/third_party
PRE_JS=$SRC_DIR/pre.js

FILES_CHANGED=0

pre_files=($CVMFS_DIR/*.js $THIRD_PARTY_DIR/*.js)
for file in ${pre_files[*]}; do
  if [[ $file != *sql.js && $file -nt $PRE_JS ]]; then
    FILES_CHANGED=1
    break
  fi
done

[[ FILES_CHANGED -eq 0 ]] && exit 0

echo "Generating pre.js"

> $PRE_JS

for file in ${pre_files[*]}; do
  if [[ $file != *sql.js && $file != *sha3.js ]]; then
    cat $file >> $PRE_JS
  fi
done

npx babel $PRE_JS -o $PRE_JS.babel
mv $PRE_JS.babel $PRE_JS

# somehow, babel messes up transpiling sha3.js correctly, but sha3.js
# also dosn't crash Emscripten's optimizer, so we can just prepend it
cat $THIRD_PARTY_DIR/sha3.js >> $PRE_JS