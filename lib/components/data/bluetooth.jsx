import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";
import * as DataWidgetLoader from "./data-widget-loader.jsx";
import Icon from "../icons/icon.jsx";
import useWidgetRefresh from "../../hooks/use-widget-refresh";
import useServerSocket from "../../hooks/use-server-socket";
import { useSimpleBarContext } from "../simple-bar-context.jsx";
import * as Utils from "../../utils";

export { bluetoothStyles as styles } from "../../styles/components/data/bluetooth";

const { React } = Uebersicht;

const DEFAULT_REFRESH_FREQUENCY = 30000;

// system_profiler rather than blueutil: blueutil needs Übersicht to hold the
// Bluetooth TCC permission, and aborts printing nothing when it doesn't.
//
// It is not enough on its own though: on recent hardware/macOS it omits
// device_batteryLevel* for Apple HID peripherals (Magic Keyboard, Trackpad,
// Mouse) entirely, so those would show as "—%". Their level does live in the
// IORegistry, hence the second command; the two are matched up by address.
const SEPARATOR = "@@IOREG@@";
const COMMAND = [
  "/usr/sbin/system_profiler SPBluetoothDataType -json",
  `echo ${SEPARATOR}`,
  `/usr/sbin/ioreg -r -k BatteryPercent -l | grep -E '"(DeviceAddress|BatteryPercent)" ='`,
].join("; ");

// AirPods report Left/Right, most other devices report Main. Lowest of them wins.
const BATTERY_FIELDS = [
  "device_batteryLevelMain",
  "device_batteryLevelLeft",
  "device_batteryLevelRight",
];

/**
 * Bluetooth widget, shaped after the macOS Control Center entry: each connected
 * device shows as its own type icon plus battery, so the pill stays short
 * without going down to a bare icon. Clicking expands it in place to add the
 * device names.
 *
 * The expansion is sideways rather than a dropdown on purpose: Übersicht draws
 * at desktop level, behind every app window, so anything rendered below the bar
 * is hidden the moment a window sits there. The bar strip is always visible, so
 * that is where the expanded state has to live.
 * @returns {JSX.Element|null} The bluetooth widget.
 */
export const Widget = React.memo(() => {
  const { displayIndex, settings } = useSimpleBarContext();
  const { widgets, bluetoothWidgetOptions = {} } = settings;
  const { bluetoothWidget } = widgets;
  const {
    refreshFrequency,
    showOnDisplay,
    showIcon = true,
  } = bluetoothWidgetOptions;

  const refresh = React.useMemo(
    () =>
      Utils.getRefreshFrequency(refreshFrequency, DEFAULT_REFRESH_FREQUENCY),
    [refreshFrequency],
  );

  const visible =
    Utils.isVisibleOnDisplay(displayIndex, showOnDisplay) && bluetoothWidget;

  const [state, setState] = React.useState();
  const [loading, setLoading] = React.useState(visible);
  const [expanded, setExpanded] = React.useState(false);

  const resetWidget = React.useCallback(() => {
    setState(undefined);
    setExpanded(false);
    setLoading(false);
  }, []);

  const getBluetooth = React.useCallback(async () => {
    if (!visible) return;
    try {
      const output = await Utils.cachedRun(COMMAND, refresh);
      setState(parseBluetooth(output));
    } catch {
      setState(undefined);
    } finally {
      setLoading(false);
    }
  }, [visible, refresh]);

  useServerSocket(
    "bluetooth",
    visible,
    getBluetooth,
    resetWidget,
    setLoading,
  );
  useWidgetRefresh(visible, getBluetooth, refresh);

  React.useEffect(() => {
    if (!visible) setExpanded(false);
  }, [visible]);

  if (loading) return <DataWidgetLoader.Widget className="bluetooth" />;
  if (!state) return null;

  const { powered, devices } = state;
  const hasDevices = powered && devices.length > 0;

  const onClick = (e) => {
    Utils.clickEffect(e);
    setExpanded((wasExpanded) => !wasExpanded);
  };

  const classes = Utils.classNames("bluetooth", {
    "bluetooth--expanded": expanded,
  });

  // With devices around, every device brings its own icon, so the widget-level
  // Bluetooth icon would just be noise.
  const FallbackIcon = powered ? BluetoothIcon : BluetoothOffIcon;

  return (
    <DataWidget.Widget
      classes={classes}
      Icon={!hasDevices && showIcon ? FallbackIcon : null}
      onClick={onClick}
      disableSlider
    >
      {hasDevices
        ? devices.map((device) => (
            <Device
              key={device.address}
              showIcon={showIcon}
              expanded={expanded}
              {...device}
            />
          ))
        : (
            <span className="bluetooth__label">
              {!powered ? "Off" : expanded ? "No devices" : "Null"}
            </span>
          )}
      <span className="bluetooth__chevron">{expanded ? "▴" : "▾"}</span>
    </DataWidget.Widget>
  );
});

Widget.displayName = "Bluetooth";

/**
 * A single connected device: type icon, name when expanded, battery.
 * @param {Object} props - The properties object.
 * @param {string} props.name - The cleaned-up device name.
 * @param {string} props.type - The device_minorType reported by system_profiler.
 * @param {number|undefined} props.battery - Lowest reported battery percentage.
 * @param {boolean} props.expanded - Whether to show the device name.
 * @param {boolean} props.showIcon - Whether to show the type icon.
 * @returns {JSX.Element} The rendered device.
 */
function Device({ name, type, battery, expanded, showIcon }) {
  return (
    <span className="bluetooth__device">
      {showIcon && <DeviceIcon type={type} name={name} />}
      {expanded && <span className="bluetooth__name">{name}</span>}
      <span>{battery === undefined ? "—%" : `${battery}%`}</span>
    </span>
  );
}

/**
 * Picks an icon for a device. Mostly keys off device_minorType ("Headphones",
 * "Magic Trackpad", ...), except for AirPods: those are earbuds and deserve
 * their own mark, but minorType reports them as plain "Headphones", so the name
 * is what tells them apart. AirPods Max are over-ear, hence the exclusion.
 * @param {Object} props - The properties object.
 * @param {string} props.type - The device_minorType reported by system_profiler.
 * @param {string} props.name - The cleaned-up device name.
 * @returns {JSX.Element} The icon for that device kind.
 */
function DeviceIcon({ type, name }) {
  const kind = type || "";
  const label = name || "";
  if (/airpod/i.test(label) && !/max/i.test(label)) return <AirPodsIcon />;
  if (/headphone|headset|airpod/i.test(`${kind} ${label}`))
    return <HeadphonesIcon />;
  if (/keyboard/i.test(kind)) return <KeyboardIcon />;
  if (/trackpad/i.test(kind)) return <TrackpadIcon />;
  if (/mouse/i.test(kind)) return <MouseIcon />;
  return <BluetoothIcon />;
}

/**
 * Parses the combined system_profiler JSON + ioreg payload.
 * @param {string} output - Raw stdout from the command.
 * @returns {{powered: boolean, devices: Array<Object>}|undefined} Parsed state,
 *   or undefined when the payload could not be read.
 */
function parseBluetooth(output) {
  const [profilerOutput = "", ioregOutput = ""] = output.split(SEPARATOR);
  const ioregLevels = parseIoregBatteries(ioregOutput);

  let data;
  try {
    data = JSON.parse(profilerOutput);
  } catch {
    return undefined;
  }
  const controller = data?.SPBluetoothDataType?.[0];
  if (!controller) return undefined;

  const powered =
    controller.controller_properties?.controller_state !== "attrib_off";

  // Each entry is a single-key object: { "<device name>": { ...details } }.
  const devices = (controller.device_connected || [])
    .map((entry) => {
      const first = Object.entries(entry)[0];
      if (!first) return null;
      const [rawName, details = {}] = first;
      const address = details.device_address || rawName;
      const levels = BATTERY_FIELDS.map((field) =>
        parseInt(details[field], 10),
      ).filter((level) => !isNaN(level));
      return {
        name: cleanName(rawName),
        type: details.device_minorType,
        address,
        battery: levels.length
          ? Math.min(...levels)
          : ioregLevels[normalizeAddress(address)],
      };
    })
    .filter(Boolean);

  return { powered, devices };
}

/**
 * Parses the grepped ioreg lines into an address-keyed battery map. The lines
 * come in per-service order, "DeviceAddress" always ahead of "BatteryPercent",
 * so an address stays pending until its percentage shows up.
 * @param {string} output - The ioreg portion of the command output.
 * @returns {Object<string, number>} Normalized address -> battery percentage.
 */
function parseIoregBatteries(output) {
  const levels = {};
  let pending;
  for (const line of output.split("\n")) {
    const address = line.match(/"DeviceAddress"\s*=\s*"([^"]+)"/);
    if (address) {
      pending = normalizeAddress(address[1]);
      continue;
    }
    const percent = line.match(/"BatteryPercent"\s*=\s*(\d+)/);
    if (percent && pending) {
      levels[pending] = parseInt(percent[1], 10);
      pending = undefined;
    }
  }
  return levels;
}

/**
 * ioreg prints "48-e1-5c-c6-64-19" where system_profiler prints
 * "48:E1:5C:C6:64:19". Reduce both to the bare uppercase hex.
 * @param {string} address - A device address in either notation.
 * @returns {string} The comparable form.
 */
function normalizeAddress(address) {
  return String(address).replace(/[^0-9a-fA-F]/g, "").toUpperCase();
}

/**
 * Strips the owner prefix and Find My suffix macOS adds to device names,
 * e.g. "현수의 AirPods Pro - Find My" -> "AirPods Pro".
 * @param {string} name - The raw device name.
 * @returns {string} The shortened name.
 */
function cleanName(name) {
  return name
    .replace(/ - Find My$/, "")
    .replace(/^\S+의 /, "")
    .replace(/^\S+[’']s /, "");
}

function HeadphonesIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9Z" />
    </Icon>
  );
}

// Two earbuds: a head plus a stem each. Built from circle/rect rather than a
// path so it stays legible at the 14px the bar renders icons at.
function AirPodsIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="7" cy="6.6" r="3.4" />
      <rect x="5.8" y="6.6" width="2.4" height="11.4" rx="1.2" />
      <circle cx="17" cy="6.6" r="3.4" />
      <rect x="15.8" y="6.6" width="2.4" height="11.4" rx="1.2" />
    </Icon>
  );
}

function KeyboardIcon(props) {
  return (
    <Icon {...props}>
      <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2Zm-9 3h2v2h-2V8Zm0 3h2v2h-2v-2ZM8 8h2v2H8V8Zm0 3h2v2H8v-2Zm-1 2H5v-2h2v2Zm0-3H5V8h2v2Zm9 7H8v-2h8v2Zm0-4h-2v-2h2v2Zm0-3h-2V8h2v2Zm3 3h-2v-2h2v2Zm0-3h-2V8h2v2Z" />
    </Icon>
  );
}

function MouseIcon(props) {
  return (
    <Icon {...props}>
      <path d="M13 1.07V9h7c0-4.08-3.05-7.44-7-7.93ZM4 15c0 4.42 3.58 8 8 8s8-3.58 8-8v-4H4v4Zm7-13.93C7.05 1.56 4 4.92 4 9h7V1.07Z" />
    </Icon>
  );
}

function TrackpadIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 2v10h16V5H4Zm0 12v2h16v-2H4Z" />
    </Icon>
  );
}

function BluetoothIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12.5 2h.75l4.75 4.75-4.5 4.5 4.5 4.5L13.25 22h-.75v-7.5L8 19l-1.25-1.25 5.25-5.25L6.75 7.25 8 6l4.5 4.5V2Zm1.5 3.6v4.15l2.1-2.1L14 5.6Zm0 8.65v4.15l2.1-2.1-2.1-2.05Z" />
    </Icon>
  );
}

function BluetoothOffIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12.5 2h.75l4.75 4.75-4.5 4.5 4.5 4.5L13.25 22h-.75v-7.5L8 19l-1.25-1.25 5.25-5.25L6.75 7.25 8 6l4.5 4.5V2Zm1.5 3.6v4.15l2.1-2.1L14 5.6Zm0 8.65v4.15l2.1-2.1-2.1-2.05Z" />
      <path d="M3.4 2.2 21.8 20.6l-1.2 1.2L2.2 3.4l1.2-1.2Z" />
    </Icon>
  );
}
