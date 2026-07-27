#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_DIR=$(CDPATH= cd -- "${SCRIPT_DIR}/.." && pwd)
WIDGET_DIR=${SIMPLE_BAR_DIR:-${REPO_DIR}}
NODE_PATH=${NODE_PATH:-$(command -v node || true)}

if [ -z "${NODE_PATH}" ]; then
  echo "error: node was not found in PATH" >&2
  echo "Install Node.js first, then run this script again." >&2
  exit 1
fi

HELPER_DIR="${HOME}/.local/share/simple-bar-theme-helper"
BIN_DIR="${HOME}/.local/bin"
LAUNCH_AGENTS_DIR="${HOME}/Library/LaunchAgents"
HELPER_PATH="${HELPER_DIR}/server.mjs"
PLIST_PATH="${LAUNCH_AGENTS_DIR}/com.local.simple-bar-theme-helper.plist"
TEMPLATE_PATH="${REPO_DIR}/extras/theme-helper/com.local.simple-bar-theme-helper.plist.template"

mkdir -p "${HELPER_DIR}" "${BIN_DIR}" "${LAUNCH_AGENTS_DIR}"
cp "${REPO_DIR}/extras/theme-helper/server.mjs" "${HELPER_PATH}"
cp "${REPO_DIR}/scripts/simple-bar-display-refresh.sh" \
  "${BIN_DIR}/simple-bar-display-refresh.sh"
chmod +x "${BIN_DIR}/simple-bar-display-refresh.sh"

escape_xml_sed() {
  printf '%s' "$1" |
    sed \
      -e 's/&/\&amp;/g' \
      -e 's/</\&lt;/g' \
      -e 's/>/\&gt;/g' \
      -e 's/"/\&quot;/g' \
      -e "s/'/\\\&apos;/g" |
    sed 's/[\\&|]/\\&/g'
}

NODE_ESCAPED=$(escape_xml_sed "${NODE_PATH}")
HELPER_ESCAPED=$(escape_xml_sed "${HELPER_PATH}")
WIDGET_ESCAPED=$(escape_xml_sed "${WIDGET_DIR}")

sed \
  -e "s|__NODE_PATH__|${NODE_ESCAPED}|g" \
  -e "s|__HELPER_PATH__|${HELPER_ESCAPED}|g" \
  -e "s|__SIMPLE_BAR_DIR__|${WIDGET_ESCAPED}|g" \
  "${TEMPLATE_PATH}" > "${PLIST_PATH}"

plutil -lint "${PLIST_PATH}" >/dev/null

DOMAIN="gui/$(id -u)"
if [ "${SIMPLE_BAR_SKIP_LAUNCHCTL:-0}" != "1" ]; then
  launchctl bootout "${DOMAIN}" "${PLIST_PATH}" >/dev/null 2>&1 || true
  launchctl bootstrap "${DOMAIN}" "${PLIST_PATH}"
fi

echo "Installed the theme helper: ${PLIST_PATH}"
echo "Installed the display refresh helper: ${BIN_DIR}/simple-bar-display-refresh.sh"
echo "Theme preview: ${REPO_DIR}/extras/theme-preview/index.html"
