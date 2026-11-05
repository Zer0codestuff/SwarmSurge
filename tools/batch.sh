#!/bin/bash
# usage: batch.sh "<levels>" "<policies>"  -> runs all combos in parallel, prints results
cd "$(dirname "$0")"; rm -f out/*.txt
for p in $2; do for L in $1; do timeout 300 node run.mjs $L $p > out/${p}_$L.txt 2>&1 & done; done
wait
for p in $2; do for L in $1; do cat out/${p}_$L.txt; done; done
