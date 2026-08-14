#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if [[ -z "${1:-}" ]]; then
  echo "Usage: $0 <file.wxapkg|directory> [unpacker option]" >&2
  exit 2
fi

target="$1"
option="${2:-}"

if [[ -d "$target" ]]; then
  exec "$SCRIPT_DIR/de_miniapp.sh" "$target"
fi

if [[ ! -f "$target" ]]; then
  echo "Package does not exist: $target" >&2
  exit 1
fi

if [[ -n "$option" ]]; then
  exec node "$SCRIPT_DIR/wuWxapkg.js" "$option" "$target"
else
  exec node "$SCRIPT_DIR/wuWxapkg.js" "$target"
fi
