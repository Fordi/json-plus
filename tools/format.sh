#!/bin/bash
for i in docs/*.svg docs/*.xhtml; do
    mv "$i" "$i.tmp"
    xmllint --format "$i.tmp" > "$i"
    rm "$i.tmp"
done