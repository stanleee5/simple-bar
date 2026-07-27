# What this fork changes

This fork adapts [upstream simple-bar](https://github.com/Jean-Tinland/simple-bar)
to a specific local macOS setup: Apple Silicon, yabai, an always-running
[simple-bar-server](https://github.com/Jean-Tinland/simple-bar-server), and a
VPN that skews IP geolocation. Per-change rationale lives in the commit
history (`git log`); this page is the map.

## General fixes (candidates for upstream)

- **youtube-music**: clear the loading state after a successful refresh
  (the widget used to spin forever).
- **wifi**: read the SSID via `ipconfig getsummary` — on recent macOS
  (verified on 26/Tahoe) `system_profiler` no longer returns it.
- **yabai**: when no window reports `has-focus` (native macOS tab
  switching), infer focus from the frontmost app on the focused space.
- **weather**: lowercase descriptions before icon matching; map thunder
  and overcast conditions to icons.
- **schema**: register `displayForFocusedSpace` and
  `disableCaffeinateInvertedBackground` (present in settings, missing from
  the schema); move `keyboardMaxLength` to the keyboard section.

## Fork features

- **Bluetooth widget**: connected devices with battery levels, combining
  `system_profiler` JSON with an `ioreg` IORegistry lookup because recent
  macOS omits battery fields for Apple HID peripherals. `—%` means "no
  battery info", not 0%.
- **VPN-aware weather**: coordinates from CoreLocationCLI (IP
  reverse-geocode fallback), wttr.in fetched through shell `curl` with
  retries so requests egress outside the WebView/VPN network path; the
  displayed place name is kept separate from the queried coordinates.
- **Settings**: `clockApp` / `weatherApp` click targets, Bluetooth widget
  options, date locale defaulting to `ko-KR`.
- **Themes**: 72 additional curated themes.
- **Extras** (`extras/`, `scripts/`): browser theme preview, a localhost
  helper (port `7778`) that applies themes by atomically rewriting
  `~/.simplebarrc`, its LaunchAgent installer, and a display-recovery
  script.

## Local policies (machine-specific, not for upstream)

- `disableSignals = true` in `index.jsx`: refreshes are pushed by
  simple-bar-server (HTTP `7776`, WebSocket `7777`), so the osascript
  signal fallback is disabled. Without the server the bar stops reacting
  to space/window changes.
- Hardcoded Apple Silicon Homebrew paths (`/opt/homebrew/bin/...`) for
  yabai and CoreLocationCLI defaults; Intel Macs would need `/usr/local`.

## State that lives outside this repo

- `~/.simplebarrc` and Übersicht localStorage: user settings.
- `~/.local/share/simple-bar-server/`: a separate clone of
  simple-bar-server, run by the `com.jeantinland.simple-bar-server`
  LaunchAgent (not vendored here).
- `~/.local/share/simple-bar-theme-helper/` and
  `~/Library/LaunchAgents/com.local.simple-bar-theme-helper.plist`:
  installed copies produced by `scripts/install-extras.sh`.
