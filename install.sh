#!/usr/bin/env bash

set -Eeuo pipefail

BINARY_URL="https://github.com/mrhappynice/lifeman/releases/download/v0.2/lifeman"
JSON_URL="https://github.com/mrhappynice/lifeman/raw/refs/heads/main/data.json"
INSTALL_DIR="bplus-launcher"
BINARY_NAME="bplus-launcher"
JSON_NAME="data.json"
INDEX_NAME="index.html"
SCRIPT_NAME="script.js"
CSS_NAME="style.css"
INDEX_URL="https://github.com/mrhappynice/lifeman/raw/refs/heads/main/static/index.html"
SCRIPT_URL="https://github.com/mrhappynice/lifeman/raw/refs/heads/main/static/script.js"
CSS_URL="https://github.com/mrhappynice/lifeman/raw/refs/heads/main/static/style.css"



# --- helpers ---
have() { command -v "$1" >/dev/null 2>&1; }

download() {
  # $1 = url, $2 = output file
  if have curl; then
    curl -fL --proto '=https' --tlsv1.2 --retry 3 --retry-delay 1 --progress-bar -o "$2" "$1"
  elif have wget; then
    wget --https-only --tries=3 -O "$2" "$1"
  else
    echo "Error: need 'curl' or 'wget' to download files." >&2
    exit 1
  fi
}

# --- work ---
echo "Creating '${INSTALL_DIR}' (if needed)…"
mkdir -p "${INSTALL_DIR}"
cd "${INSTALL_DIR}"

echo "Downloading binary -> ${BINARY_NAME}"
download "${BINARY_URL}" "${BINARY_NAME}"

echo "Downloading json -> ${JSON_NAME}"
download "${JSON_URL}" "${JSON_NAME}"

echo "Making '${BINARY_NAME}' executable…"
chmod +x "${BINARY_NAME}"

echo "Getting UI files.."
mkdir static
cd static
download "${INDEX_URL}" "${INDEX_NAME}" 
download "${SCRIPT_URL}" "${SCRIPT_NAME}" 
download "${CSS_URL}" "${CSS_NAME}" 

echo "Done ✅"
echo
echo "Files installed to: $(pwd)"
echo " - ${BINARY_NAME}"
echo " - ${JSON_NAME}"
echo
echo "Run it with:"
echo "  ./$(printf %q "${BINARY_NAME}")"
