#!/bin/bash

set -e

COMPILE=1
TEST=1
CHROME_EXE=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-compile) COMPILE=0 ;;
        --no-test) TEST=0 ;;
        --chrome-exe) shift; CHROME_EXE=$1 ;;
    esac
    shift
done

TEST_DIR="$( cd "$( dirname "$0" )" && pwd )"
SRC_DIR="$( dirname "$TEST_DIR" )"

if [ $COMPILE -eq 1 ]; then
    $SRC_DIR/emcc-cvmfs \
        -o $TEST_DIR/test.html \
        -s NO_EXIT_RUNTIME=0 \
        --shell-file $TEST_DIR/test_container.html \
        $TEST_DIR/test.c
fi

if [ $TEST -eq 1 ]; then
    node $TEST_DIR/puppet.js $TEST_DIR/test.html $CHROME_EXE
fi