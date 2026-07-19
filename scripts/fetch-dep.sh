#!/bin/sh
# Fetch one vendored dependency and verify it against its pinned hash.
#
# Usage: fetch-dep.sh MANIFEST OUTPUT_FILE
#
# The dependency is looked up in MANIFEST by the basename of OUTPUT_FILE.
# The download is verified before it is put in place, so a hash mismatch
# never leaves a bad file behind for a later build to pick up.

set -eu

manifest=$1
output=$2
name=$(basename "$output")

entry=$(awk -v n="$name" '$1 == n { print; found = 1 } END { exit !found }' \
	"$manifest") || {
	echo "fetch-dep: no entry for '$name' in $manifest" >&2
	exit 1
}

url=$(echo "$entry" | awk '{ print $2 }')
want=$(echo "$entry" | awk '{ print $3 }')

tmp=$output.tmp.$$
trap 'rm -f "$tmp"' EXIT

mkdir -p "$(dirname "$output")"
echo "fetch-dep: $name <- $url"
curl -sSfL -o "$tmp" "$url"

got=sha384-$(openssl dgst -sha384 -binary "$tmp" | base64)
if [ "$got" != "$want" ]; then
	echo "fetch-dep: hash mismatch for '$name' from $url" >&2
	echo "  expected: $want" >&2
	echo "  actual:   $got" >&2
	exit 1
fi

mv "$tmp" "$output"
