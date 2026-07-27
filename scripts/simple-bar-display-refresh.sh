#!/usr/bin/env sh

set -u

SERVER_PORT="${SIMPLE_BAR_SERVER_PORT:-7776}"

# Let macOS finish rebuilding its screen list before refreshing the widget.
sleep 1

curl -s --max-time 1 "http://localhost:${SERVER_PORT}/yabai/displays/refresh" >/dev/null 2>&1
curl -s --max-time 1 "http://localhost:${SERVER_PORT}/yabai/spaces/refresh" >/dev/null 2>&1
curl -s --max-time 1 "http://localhost:${SERVER_PORT}/yabai/windows/refresh" >/dev/null 2>&1

# Übersicht 1.6 can lose its widget windows after a display topology change.
# A widget refresh does not recreate those windows, so relaunch the app.
pkill -f '/Applications/.*bersicht.app/Contents/MacOS' >/dev/null 2>&1
sleep 1
open -a 'Übersicht'
