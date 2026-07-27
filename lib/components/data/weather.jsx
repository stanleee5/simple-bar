import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";
import * as DataWidgetLoader from "./data-widget-loader.jsx";
import * as Icons from "../icons/icons.jsx";
import * as Utils from "../../utils";
import useWidgetRefresh from "../../hooks/use-widget-refresh";
import useServerSocket from "../../hooks/use-server-socket";
import { useSimpleBarContext } from "../simple-bar-context.jsx";

export { weatherStyles as styles } from "../../styles/components/data/weather";

const { React } = Uebersicht;

const DEFAULT_REFRESH_FREQUENCY = 1000 * 60 * 30; // Default refresh frequency set to 30 minutes

/**
 * Weather widget component
 */
export const Widget = React.memo(() => {
  const { displayIndex, settings, pushMissive } = useSimpleBarContext();
  const { widgets, weatherWidgetOptions } = settings;
  const { weatherWidget } = widgets;
  const {
    refreshFrequency,
    customLocation,
    unit,
    hideLocation,
    hideGradient,
    showOnDisplay,
    showIcon,
    weatherApp,
  } = weatherWidgetOptions;

  const refresh = React.useMemo(
    () =>
      Utils.getRefreshFrequency(refreshFrequency, DEFAULT_REFRESH_FREQUENCY),
    [refreshFrequency],
  );

  const visible =
    Utils.isVisibleOnDisplay(displayIndex, showOnDisplay) && weatherWidget;

  const [state, setState] = React.useState();
  const [loading, setLoading] = React.useState(visible);
  const location = React.useRef(
    visible && customLocation.length ? customLocation : undefined,
  );
  const detectedLocationName = React.useRef("");

  React.useEffect(() => {
    location.current = customLocation || undefined;
    detectedLocationName.current = "";
  }, [customLocation]);

  /**
   * Resets the widget state and loading status
   */
  const resetWidget = () => {
    setState(undefined);
    setLoading(false);
  };

  /**
   * Fetches weather data from wttr.in
   */
  const getWeather = React.useCallback(async () => {
    if (!visible) return;
    // navigator.geolocation and in-app fetch both go through the VPN tunnel
    // and geolocate to the wrong country; resolve coordinates and fetch
    // weather through the shell instead, which egresses directly
    if (!location.current) {
      // CoreLocation gives the real physical location (GPS/Wi-Fi), so the
      // VPN tunnel no longer skews it to the exit country. Falls back to the
      // IP-based reverse geocode if CoreLocationCLI is missing or denied.
      // MACHINE-SPECIFIC (unfixed): the CoreLocationCLI path is hardcoded to
      // the Apple Silicon Homebrew prefix (Intel Macs use /usr/local/bin), and
      // the binary must be installed and granted Location Services access. It
      // is not configurable via settings the way yabaiPath is. Degrades
      // gracefully — a missing binary just falls through to the IP lookup.
      try {
        const info = JSON.parse(
          await Uebersicht.run(
            `/opt/homebrew/bin/CoreLocationCLI --json 2>/dev/null | head -1`,
          ),
        );
        const { latitude, longitude } = info || {};
        location.current =
          latitude && longitude ? `${latitude},${longitude}` : "";
        detectedLocationName.current =
          info?.subLocality || info?.locality || info?.administrativeArea || "";
      } catch {
        try {
          const info = JSON.parse(
            await Uebersicht.run(
              `curl -s --max-time 5 https://api.bigdatacloud.net/data/reverse-geocode-client`,
            ),
          );
          const { latitude, longitude } = info || {};
          location.current =
            latitude && longitude ? `${latitude},${longitude}` : "";
          detectedLocationName.current =
            info?.locality || info?.city || info?.principalSubdivision || "";
        } catch {
          location.current = "";
          detectedLocationName.current = "";
        }
      }
    }
    try {
      // wttr.in intermittently 503s; a failed fetch leaves the widget
      // hidden until the next 30-minute cycle, so let curl absorb
      // transient errors instead
      const weatherUrl = `https://wttr.in/${location.current}?format=j1`;
      const raw = await Uebersicht.run(
        `curl -s --connect-timeout 5 --max-time 30 --retry 3 --retry-all-errors ${shellQuote(weatherUrl)}`,
      );
      const data = JSON.parse(raw);
      const areaName = data?.nearest_area?.[0]?.areaName?.[0]?.value;
      // wttr.in's nearest_area can be an obscure neighborhood (e.g.
      // "Chongdong" for Seoul); prefer the user-chosen location name
      setState({
        location:
          customLocation ||
          detectedLocationName.current ||
          areaName ||
          location.current ||
          "",
        weatherLocation: location.current,
        data,
      });
    } catch  {
      // eslint-disable-next-line no-console
      console.error("Error while fetching weather")
    }
    setLoading(false);
  }, [visible, location, customLocation]);

  useServerSocket("weather", visible, getWeather, resetWidget, setLoading);
  useWidgetRefresh(visible, getWeather, refresh);

  if (loading) return <DataWidgetLoader.Widget className="weather" />;
  if (!state || !state.data.current_condition) return null;

  const {
    temp_C: tempC,
    temp_F: tempF,
    weatherDesc,
  } = state.data.current_condition[0];
  const temperature = unit === "C" ? tempC : tempF;
  const wttrUnitParam = unit === "C" ? "?m" : "?u";

  const description = weatherDesc[0].value;

  const { astronomy } = state.data.weather[0];
  const sunriseData = astronomy[0].sunrise.replace(" AM", "").split(":");
  const sunsetData = astronomy[0].sunset.replace(" PM", "").split(":");

  const now = new Date();
  const nowIntervalStart = new Date();
  nowIntervalStart.setHours(nowIntervalStart.getHours() - 1);
  const nowIntervalStop = new Date();
  nowIntervalStop.setHours(nowIntervalStop.getHours() + 1);
  const sunriseTime = new Date();
  sunriseTime.setHours(
    parseInt(sunriseData[0], 10),
    parseInt(sunriseData[1], 10),
    0,
    0,
  );
  const sunsetTime = new Date();
  sunsetTime.setHours(
    parseInt(sunsetData[0], 10) + 12,
    parseInt(sunsetData[1], 10),
    0,
    0,
  );

  const atNight = sunriseTime >= now || now >= sunsetTime;

  const Icon = getIcon(description, atNight);
  const label = getLabel(state.location, temperature, unit, hideLocation);

  const sunRising =
    sunriseTime >= nowIntervalStart && sunriseTime <= nowIntervalStop;
  const sunSetting =
    sunsetTime >= nowIntervalStart && sunsetTime <= nowIntervalStop;

  /**
   * Handles right-click event to refresh weather data
   * @param {Event} e - The event object
   */
  const onRightClick = (e) => {
    Utils.clickEffect(e);
    setLoading(true);
    getWeather();
    Utils.notification("Refreshing forecast from wttr.in...", pushMissive);
  };

  const classes = Utils.classNames("weather", {
    "weather--sunrise": sunRising,
    "weather--sunset": sunSetting,
  });

  const wttrUrl = `https://wttr.in/${
    state.weatherLocation || state.location
  }${wttrUnitParam}`;

  return (
    <DataWidget.Widget
      classes={classes}
      Icon={showIcon ? Icon : null}
      onClick={(e) => openWeatherApp(e, weatherApp, pushMissive)}
      onMiddleClick={(e) => openWttrIn(e, wttrUrl, pushMissive)}
      onRightClick={onRightClick}
      disableSlider
    >
      {!hideGradient && <div className="weather__gradient" />}
      {label}
    </DataWidget.Widget>
  );
});

Widget.displayName = "Weather";

/**
 * Returns the appropriate weather icon based on the description and time of day
 * @param {string} description - Weather description
 * @param {boolean} atNight - Whether it is currently night time
 * @returns {JSX.Element} - The weather icon component
 */
function getIcon(description, atNight) {
  // wttr.in capitalizes the first word, so a keyword leading the description
  // ("Cloudy", "Rain") never matched these lowercase tests and fell through to
  // Sun — only forms like "Partly cloudy" happened to work.
  const condition = description.toLowerCase();
  if (condition.includes("fog") || condition.includes("mist")) {
    return Icons.Fog;
  }
  // wttr.in says "Thundery outbreaks possible", never "storm", for dry thunder.
  if (condition.includes("storm") || condition.includes("thunder")) {
    return Icons.Storm;
  }
  if (condition.includes("snow")) return Icons.Snow;
  if (condition.includes("rain")) return Icons.Rain;
  if (condition.includes("cloud")) return Icons.Cloud;
  if (condition.includes("overcast")) return Icons.Cloud;
  if (atNight) return Icons.Moon;
  return Icons.Sun;
}

/**
 * Returns the label for the weather widget
 * @param {string} location - The location name
 * @param {string} temperature - The temperature value
 * @param {string} unit - The temperature unit (C or F)
 * @param {boolean} hideLocation - Whether to hide the location name
 * @returns {string} - The label text
 */
function getLabel(location, temperature, unit, hideLocation) {
  if (!location) return "Fetching...";
  if (hideLocation) return `${temperature}°${unit}`;
  return `${location}, ${temperature}°${unit}`;
}

/**
 * Opens the weather application
 * @param {Event} e - The event object
 * @param {string} weatherApp - The name of the weather application to open
 * @param {Function} pushMissive - Function to push notifications
 */
function openWeatherApp(e, weatherApp, pushMissive) {
  Utils.clickEffect(e);
  const appName = weatherApp || "Weather";
  Utils.notification(`Opening ${appName}...`, pushMissive);
  Uebersicht.run(`open -a ${shellQuote(appName)}`);
}

/**
 * Handles middle-click/cmd-click to open the wttr.in forecast in the browser
 * @param {Event} e - The event object
 * @param {string} url - The wttr.in forecast url
 * @param {function} pushMissive - The missive push function
 */
function openWttrIn(e, url, pushMissive) {
  Utils.clickEffect(e);
  Utils.notification("Opening forecast from wttr.in...", pushMissive);
  Uebersicht.run(`open ${shellQuote(url)}`);
}

/**
 * Quotes a value as one POSIX shell argument.
 * @param {string} value - The value to quote.
 * @returns {string} A safely quoted shell argument.
 */
function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}
