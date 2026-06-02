#!/usr/bin/env bash
# Fail if any internal codename appears in tracked files.
# The pattern uses single-character regex classes (e.g. [n]etsuki) so that
# this script itself does not contain the literal forbidden substrings.
set -euo pipefail

PATTERN='[n]etsuki|お[兄]ちゃん|fox[-]note'

matches=$(grep -rliE "$PATTERN" \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=dist \
  --exclude-dir=coverage \
  --exclude=package-lock.json \
  . || true)

if [ -n "$matches" ]; then
  echo "::error::Internal codename detected in:"
  echo "$matches"
  exit 1
fi

echo "No internal codenames detected."
