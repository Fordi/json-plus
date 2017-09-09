#!/bin/sh
cd "$(dirname "$0")"
../build.sh "${@}" && node ./test.js

