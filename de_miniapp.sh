#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENTRYPOINT="$SCRIPT_DIR/wuWxapkg.js"

unpack_file() {
  node "$ENTRYPOINT" "$1"
}

if [[ "${1:-}" == "-d" ]]; then
  if [[ -z "${2:-}" ]]; then
    echo "Usage: $0 -d <file.wxapkg>" >&2
    exit 2
  fi
  unpack_file "$2"
  exit 0
fi

SEARCH_DIR="${1:-$PWD}"
if [[ ! -d "$SEARCH_DIR" ]]; then
  echo "Directory does not exist: $SEARCH_DIR" >&2
  exit 1
fi

found=0
while IFS= read -r -d '' package; do
  found=1
  unpack_file "$package"
done < <(find "$SEARCH_DIR" -type f -name '*.wxapkg' -print0)

if [[ "$found" -eq 0 ]]; then
  echo "No .wxapkg files found under: $SEARCH_DIR" >&2
  exit 1
fi
