#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js 22 or newer and npm are required." >&2
  exit 1
fi

node -e 'const major=Number(process.versions.node.split(".")[0]); if (major < 22) { console.error("Node.js 22 or newer is required."); process.exit(1); }'
npm ci

echo "Dependencies installed locally with Node.js $(node --version)."
