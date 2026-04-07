#!/usr/bin/env bash
# Baut J-M-Reihen.zip aus den GitHub-konformen Teilen (<100 MB pro Datei).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if ! ls J-M-Reihen.zip.a* >/dev/null 2>&1; then
  echo "Keine Teile J-M-Reihen.zip.a* gefunden." >&2
  exit 1
fi
if [[ -f J-M-Reihen.zip ]]; then
  echo "J-M-Reihen.zip existiert bereits – nichts getan." >&2
  exit 0
fi
LC_ALL=C
for f in $(ls J-M-Reihen.zip.a* 2>/dev/null | sort); do
  cat "$f"
done > J-M-Reihen.zip
echo "OK: J-M-Reihen.zip ($(du -h J-M-Reihen.zip | cut -f1))"
