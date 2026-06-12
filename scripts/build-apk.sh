#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APK_SOURCE="$ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"
OUTPUT_DIR="$ROOT_DIR/dist/apk"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
APK_TARGET="$OUTPUT_DIR/OrionTV-${TIMESTAMP}.apk"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd yarn
require_cmd java

mkdir -p "$OUTPUT_DIR"

echo "[1/3] Building Android release APK..."
cd "$ROOT_DIR"
yarn build-android-release

if [[ ! -f "$APK_SOURCE" ]]; then
  echo "Release APK not found: $APK_SOURCE" >&2
  exit 1
fi

echo "[2/3] Copying APK to dist/apk..."
cp "$APK_SOURCE" "$APK_TARGET"
cp "$APK_SOURCE" "$OUTPUT_DIR/OrionTV-latest.apk"

echo "[3/3] Done"
echo "APK output:"
echo "  $APK_TARGET"
echo "  $OUTPUT_DIR/OrionTV-latest.apk"
