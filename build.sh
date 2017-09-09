#!/bin/sh
cd "$(dirname "$0")"
pegjs "${@}" -o ./lib/json-plus-parser.js ./lib/json-plus-grammar.pegjs