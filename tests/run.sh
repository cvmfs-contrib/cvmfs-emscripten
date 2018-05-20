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

UNIT_DIR=$TEST_DIR/unit
INT_DIR=$TEST_DIR/integration

TEST_BUILD_DIR=$TEST_DIR/build
UNIT_BUILD_DIR=$TEST_BUILD_DIR/unit
INT_BUILD_DIR=$TEST_BUILD_DIR/integration

if [ $COMPILE -eq 1 ]; then
    mkdir -p $TEST_BUILD_DIR
    mkdir -p $UNIT_BUILD_DIR
    mkdir -p $INT_BUILD_DIR

    echo -n "Compiling unit tests... "
    for testfile in $UNIT_DIR/*.js; do
        testfile=$(basename $testfile)
        [ $testfile == "common.js" ] && continue
        
        $SRC_DIR/emcc-cvmfs \
            --post-js $UNIT_DIR/common.js \
            --post-js $UNIT_DIR/$testfile \
            --shell-file $TEST_DIR/test_container.html \
            --embed-file $TEST_DIR/data@/data \
            -o $UNIT_BUILD_DIR/${testfile%*.*}.html \
            $UNIT_DIR/do_nothing.c
    done
    echo "DONE"

    echo -n "Compiling integration tests... "
    for testfile in $INT_DIR/*.c; do
        testfile=$(basename $testfile)

        $SRC_DIR/emcc-cvmfs \
            -s NO_EXIT_RUNTIME=0 \
            --shell-file $TEST_DIR/test_container.html \
            -o $INT_BUILD_DIR/${testfile%*.*}.html \
            $INT_DIR/test.c
    done
    echo "DONE"
fi

if [ $TEST -eq 1 ]; then
    [ $COMPILE -eq 1 ] && echo ""

    echo "Running unit tests:"
    for testfile in $UNIT_BUILD_DIR/*.html; do
        node $TEST_DIR/puppet.js $testfile $CHROME_EXE
    done

    echo ""

    echo "Running integration tests:"
    for testfile in $INT_BUILD_DIR/*.html; do
        node $TEST_DIR/puppet.js $testfile $CHROME_EXE
    done
fi