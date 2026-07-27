# CLAUDE.md

Fork of [Jean-Tinland/simple-bar](https://github.com/Jean-Tinland/simple-bar)
(remotes: `origin` = stanleee5, `upstream` = Jean-Tinland). What diverges from
upstream and why: see `docs/fork-changes.md`.

## Deployment model

- This repo is the source of truth. The running copy lives at
  `~/Library/Application Support/Übersicht/widgets/simple-bar`.
- To deploy: copy changed files there, then refresh with
  `osascript -e 'tell application id "tracesOf.Uebersicht" to refresh'`.
- **Never overwrite the live `lib/styles/themes.js` or `lib/styles/themes/`**:
  the live tree carries ~614 extra themes not yet migrated into this repo.

## Verification

- `npm run lint` is the only check (no test suite). Run it after any
  `lib/**` or `index.jsx` change.

## Conventions

- Commit subjects: `fix:` (general bug, upstreamable) / `feat:` (fork
  feature) / `local:` (machine-specific policy, never upstreamed) /
  `docs:`. Imperative, ≤70 chars. Bodies only when needed: 2–6 lines of
  prose, no bullet lists.
- Machine-specific code carries a `MACHINE-SPECIFIC` comment; keep that
  label when touching those lines.

## Environment assumptions

- Apple Silicon Homebrew (`/opt/homebrew/bin`); yabai as window manager.
- simple-bar-server must be running (LaunchAgent, HTTP `7776` /
  WebSocket `7777`) — `disableSignals` is forced on, so without it the
  bar stops reacting to space/window changes.
- Theme helper LaunchAgent listens on `7778`; it rewrites `~/.simplebarrc`.
- User settings persist in `~/.simplebarrc` **and** Übersicht
  localStorage; code defaults only apply to fresh installs.
