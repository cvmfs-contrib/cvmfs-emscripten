#!/bin/bash

TEST_DIR="$( cd "$( dirname "$0" )" && pwd )"
SRC_DIR="$( dirname "$TEST_DIR" )"

$SRC_DIR/emcc-cvmfs \
    -o $TEST_DIR/test.html \
    -s NO_EXIT_RUNTIME=0 \
    --shell-file $TEST_DIR/test_container.html \
    $TEST_DIR/test.c

node $TEST_DIR/puppet.js $TEST_DIR/test.html