# <img src="./images/logo-simple-bar.png" width="200" alt="simple-bar" />

> This fork packages the local macOS setup used in this repository: additional
> themes, a Bluetooth device widget, YouTube Music and yabai fixes, VPN-aware
> weather lookup, and optional theme-preview helpers. The upstream project is
> [Jean-Tinland/simple-bar](https://github.com/Jean-Tinland/simple-bar).

A [yabai](https://github.com/koekeishiya/yabai) or [AeroSpace](https://github.com/nikitabobko/AeroSpace) status bar widget for [Übersicht](https://github.com/felixhageloh/uebersicht) inspired by [nibar](https://github.com/kkga/nibar), [yabar](https://github.com/AlexNaga/yabar) and [this reddit post](https://www.reddit.com/r/unixporn/comments/chwk89/yabai_yabai_and_gruvbox_with_custom_ubersicht_bar/).

[Website](https://www.jeantinland.com/toolbox/simple-bar) • [Documentation](https://www.jeantinland.com/toolbox/simple-bar/documentation)

[`simple-bar-server`](https://github.com/Jean-Tinland/simple-bar-server) triggers refresh and toggles widgets with `curl` commands. It is optional upstream, but **required by this fork** — see [Quick install](#quick-install).

A more "lite" & basic version is available [here](https://github.com/Jean-Tinland/simple-bar-lite).

**Notice: As I am working simultaneously on a lot of projects, things here may seem to move slowly but they are still in progress. I'm always monitoring my notifications and messages, so if you have any questions or want to chat about anything, feel free [to reach out](https://www.jeantinland.com/contact/)!**

## Features

Among the principal features of `simple-bar`, you'll find:

- **Show all opened apps** in every space
- **Show all opened windows** on the current space and its current layout mode (bsp, stack, float)
- Interactions: **focus window** on click, launch scripts, toggle states
- **Multi-monitor support**: enable individual widget on specific displays
- Add your own custom widgets in settings (it displays scripts outputs)
- **Refresh and toggle parts of simple-bar on the fly** with `curl` commands via [simple-bar-server](https://www.jeantinland.com/toolbox/simple-bar-server/documentation/introduction/), which this fork requires (see [Quick install](#quick-install)). See [widgets](https://www.jeantinland.com/toolbox/simple-bar-server/documentation/widgets/), [yabai](https://www.jeantinland.com/toolbox/simple-bar-server/documentation/yabai/) or [AeroSpace](https://www.jeantinland.com/toolbox/simple-bar-server/documentation/aerospace/) options in its documentation
- **Extensible** themes system with 3 theme behaviors: **dark**, **light**, or **system**
- Numerous customization options, try them out in settings!
- A handfull selection of widgets
- Other features available only with SIP disabled and yabai scripting addition installed (**navigate to workspace**, **create new workspace on "+" click**, **move or destroy workspace on space hover**)

[See all features in documentation](https://www.jeantinland.com/toolbox/simple-bar/documentation/features/).

## Preview

![image](./images/preview.png)

<video src="https://github.com/Jean-Tinland/simple-bar/assets/43068795/0f988d1b-e21b-4b82-a1dc-4a1c76f580f3" type="video/mp4" muted autoplay loop></video>

## Installation

### Requirements

- macOS and [Übersicht](https://github.com/felixhageloh/uebersicht)
- [yabai](https://github.com/koekeishiya/yabai) or
  [AeroSpace](https://github.com/nikitabobko/AeroSpace)

Node.js and `CoreLocationCLI` are only needed for the optional extras below.

### Quick install

Quit Übersicht if it is already running, then clone this fork into its widget
directory. If a previous installation occupies that directory, move it aside
first (`mv … …/simple-bar.backup`) to preserve its working tree.

```bash
git clone --depth 1 https://github.com/stanleee5/simple-bar.git \
  "$HOME/Library/Application Support/Übersicht/widgets/simple-bar"
open -a "Übersicht"
```

Then install
[simple-bar-server](https://github.com/Jean-Tinland/simple-bar-server)
following its official instructions, and turn on
`Enable simple-bar-server connection` in simple-bar settings (click the bar,
then press `cmd` + `,`).

> [!IMPORTANT]\
> Unlike upstream, this fork disables the osascript signal fallback and relies
> on simple-bar-server for event-driven refresh. Without the server installed,
> running, and enabled in settings, the bar will not react to space or window
> changes.

Finally, review the remaining settings (`cmd` + `,`): the yabai or AeroSpace
binary path, the widget toggles, and the YouTube Music API port (default
`26538`). The Bluetooth widget ships enabled with defaults in this fork's
schema, so no hand-edited `~/.simplebarrc` is required. Settings persist in
both Übersicht local storage and `~/.simplebarrc`.

### Optional

**Accurate weather location behind a VPN** — install
[`CoreLocationCLI`](https://github.com/fulldecent/corelocationcli)
(`brew install --cask corelocationcli`) and grant it Location Services access
once when prompted. Without it, the weather widget falls back to IP
geolocation, which a VPN skews toward the exit country.

**Theme browser with one-click switching** (needs Node.js):

```bash
cd "$HOME/Library/Application Support/Übersicht/widgets/simple-bar"
./scripts/install-extras.sh
open extras/theme-preview/index.html
```

The installer puts the theme helper under
`~/.local/share/simple-bar-theme-helper`, loads the
`com.local.simple-bar-theme-helper` LaunchAgent (port `7778`), points the
helper at the clone it was run from, and installs the display-recovery script
described under Advanced.

### Advanced & development

- The widget itself needs no `npm install`. For linting or development:
  `npm install && npm run lint` inside the widget directory.
- `SIMPLE_BAR_DIR="/absolute/path/to/simple-bar" ./scripts/install-extras.sh`
  when the clone is deliberately stored outside Übersicht's standard widget
  directory.
- `SIMPLE_BAR_SKIP_LAUNCHCTL=1 ./scripts/install-extras.sh` installs all files
  without loading the LaunchAgent (packaging tests).
- The display-recovery helper (`~/.local/bin/simple-bar-display-refresh.sh`)
  is installed by `install-extras.sh` but not registered automatically. It
  refreshes simple-bar-server on port `7776` (override with
  `SIMPLE_BAR_SERVER_PORT`) and relaunches Übersicht, which is needed because
  Übersicht 1.6 can lose its widget windows after a monitor is plugged in or
  unplugged. Bind it to the topology events only:

  ```sh
  yabai -m signal --add event=display_added \
    action="$HOME/.local/bin/simple-bar-display-refresh.sh" label="simple-bar-display_added"
  yabai -m signal --add event=display_removed \
    action="$HOME/.local/bin/simple-bar-display-refresh.sh" label="simple-bar-display_removed"
  ```

  Do **not** bind it to `display_changed`. That event fires when the *active*
  display changes — every focus switch between monitors — so the helper would
  kill and relaunch Übersicht several times a minute, and the bar would keep
  dropping back to "Loading…". Use `display_changed` for a plain refresh
  instead:

  ```sh
  SB="curl -s --max-time 1 http://localhost:7776/yabai"
  yabai -m signal --add event=display_changed \
    action="$SB/displays/refresh; $SB/spaces/refresh; $SB/windows/refresh" \
    label="simple-bar-display_changed"
  ```

  As a safety net the helper skips the relaunch when the display count is
  unchanged since its last run, so a misbinding degrades to a no-op rather
  than a restart loop.
- This fork does not vendor simple-bar-server itself; it is a separately
  maintained service.

The full upstream installation guide remains available in the
[simple-bar documentation](https://www.jeantinland.com/toolbox/simple-bar/documentation/installation/).

> [!WARNING]\
> If you encounter this error: "simple-bar-index.jsx: Something went wrong…", it may be simply due to the fact that the default value for yabai or AeroSpace path is wrong in simple-bar. You can set this path in the settings module.\
> The default paths are `$(which yabai)` and `$(which aerospace)`.

> [!NOTE]\
> `simple-bar` is trying to use yabai by default. If you want to switch to AeroSpace, you'll need to open the settings module (simply click on `simple-bar` then press `cmd` + `,`). You'll find the window manager choice in the "Global" tab.

## Roadmap

Here are the features I'm planning to add in the future:

- A timer widget ([#474](https://github.com/Jean-Tinland/simple-bar/issues/474))
- Bars configurator (spawn multiple bars, place widgets anywhere…) [#380](https://github.com/Jean-Tinland/simple-bar/issues/380)
- More accessibility settings like reading direction (LTR or RTL)
- More default themes

Feel free to open an issue if you have any feature request or if you want me to prioritize one of these features.

## Special thanks

I started this project with a simple idea and inspired by similar projects but over the year it has become a real community project. I want to thank everyone who contributed to this project, whether it's by opening issues, suggesting features, or even making pull requests. Furthermore, I also want to thank everyone who is using this project, I'm glad to see that it can be useful to others.

So thank you, [@Amar1729](https://github.com/Amar1729), [@yorhodes](https://github.com/yorhodes), [@ZhongXiLu](https://github.com/ZhongXiLu), [@jamieweavis](https://github.com/jamieweavis), [@kvndrsslr](https://github.com/kvndrsslr), [@rosenpin](https://github.com/rosenpin), [@MikoMagni](https://github.com/MikoMagni), [@anujc4](https://github.com/anujc4), [@SijanC147](https://github.com/SijanC147), [@donaldguy](https://github.com/donaldguy), [@d-miketa](https://github.com/d-miketa), [@izifortune](https://github.com/izifortune), [@theshortcut](https://github.com/theshortcut), [@jming422](https://github.com/jming422), [@s00500](https://github.com/s00500), [@spwx](https://github.com/spwx), [@basbebe](https://github.com/basbebe), [@is0n](https://github.com/is0n), [@Joroovb](https://github.com/Joroovb), [@Sylenss](https://github.com/Sylenss), [@mrzone64](https://github.com/mrzone64), [@devinbhatt](https://github.com/devinbhatt), [@mdwitr0](https://github.com/mdwitr0), [@wr1159](https://github.com/wr1159), [@ardnep](https://github.com/ardnep), [@kntng](https://github.com/kntng) and every other that are helping me improve this little project by adding icons, fixing what they can, and more…

I tried to keep track of everyone who contributed to this project in every page of the documentation. If you think I forgot you, please let me know. :)
