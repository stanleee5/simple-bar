#!/usr/bin/env sh

# Recovers simple-bar after a display topology change (monitor plugged in or
# unplugged). Bind it to yabai's display_added / display_removed signals:
#
#   yabai -m signal --add event=display_added \
#     action="$HOME/.local/bin/simple-bar-display-refresh.sh" label="simple-bar-display_added"
#   yabai -m signal --add event=display_removed \
#     action="$HOME/.local/bin/simple-bar-display-refresh.sh" label="simple-bar-display_removed"
#
# Do NOT bind it to display_changed: that event fires whenever the *active*
# display changes, i.e. on every focus switch between monitors. Relaunching
# Übersicht that often makes the bar vanish and fall back to "Loading…" several
# times a minute. As a safety net this script also skips the relaunch when the
# display count has not actually changed since the last run.

set -u

SERVER_PORT="${SIMPLE_BAR_SERVER_PORT:-7776}"
STATE_FILE="${SIMPLE_BAR_DISPLAY_STATE:-${TMPDIR:-/tmp}/simple-bar-display-count}"

# Let macOS finish rebuilding its screen list before refreshing the widget.
sleep 1

curl -s --max-time 1 "http://localhost:${SERVER_PORT}/yabai/displays/refresh" >/dev/null 2>&1
curl -s --max-time 1 "http://localhost:${SERVER_PORT}/yabai/spaces/refresh" >/dev/null 2>&1
curl -s --max-time 1 "http://localhost:${SERVER_PORT}/yabai/windows/refresh" >/dev/null 2>&1

# Count the attached displays. If yabai cannot be reached we cannot tell a
# topology change from a focus change, so fall through to the relaunch: the
# documented bindings only fire on real topology changes.
yabai_path="${YABAI_PATH:-}"
if [ -z "$yabai_path" ]; then
  yabai_path=$(command -v yabai 2>/dev/null || echo /opt/homebrew/bin/yabai)
fi

count=""
if [ -x "$yabai_path" ]; then
  count=$("$yabai_path" -m query --displays 2>/dev/null | grep -c '"uuid"')
fi

if [ -n "$count" ] && [ "$count" -gt 0 ] 2>/dev/null; then
  previous=""
  [ -f "$STATE_FILE" ] && previous=$(cat "$STATE_FILE" 2>/dev/null)
  printf '%s' "$count" > "$STATE_FILE" 2>/dev/null

  # Same number of displays as last time: this was not a topology change, so
  # the refreshes above are all that is needed.
  if [ "$count" = "$previous" ]; then
    exit 0
  fi
fi

# Übersicht 1.6 can lose its widget windows after a display topology change.
# A widget refresh does not recreate those windows, so relaunch the app.
pkill -f '/Applications/.*bersicht.app/Contents/MacOS' >/dev/null 2>&1
sleep 1
open -a 'Übersicht'
