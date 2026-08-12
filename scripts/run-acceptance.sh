#!/usr/bin/env bash
set -euo pipefail

mode="${1:-local}"
case "$mode" in
  local) pnpm acceptance:local ;;
  api) pnpm acceptance:api ;;
  database) pnpm acceptance:database ;;
  full) pnpm acceptance:full ;;
  *)
    echo "Usage: $0 {local|api|database|full}" >&2
    exit 2
    ;;
esac

