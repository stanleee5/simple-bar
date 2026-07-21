import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";
import * as DataWidgetLoader from "./data-widget-loader.jsx";
import * as Icons from "../icons/icons.jsx";
import * as Utils from "../../utils";
import useWidgetRefresh from "../../hooks/use-widget-refresh";
import useServerSocket from "../../hooks/use-server-socket";
import { useSimpleBarContext } from "../simple-bar-context.jsx";

export { dateStyles as styles } from "../../styles/components/data/date-display";

const { React } = Uebersicht;

const DEFAULT_REFRESH_FREQUENCY = 30000;

/**
 * Date display widget component.
 * @returns {JSX.Element} The date display widget.
 */
export const Widget = React.memo(() => {
  const { displayIndex, settings } = useSimpleBarContext();
  const { widgets, dateWidgetOptions } = settings;
  const { dateWidget } = widgets;
  const {
    refreshFrequency,
    shortDateFormat,
    locale,
    calendarApp,
    showOnDisplay,
    showIcon,
  } = dateWidgetOptions;

  // Determine if the widget should be visible based on display settings
  const visible =
    Utils.isVisibleOnDisplay(displayIndex, showOnDisplay) && dateWidget;

  // Calculate the refresh frequency for the widget
  const refresh = React.useMemo(
    () =>
      Utils.getRefreshFrequency(refreshFrequency, DEFAULT_REFRESH_FREQUENCY),
    [refreshFrequency],
  );

  const [state, setState] = React.useState();
  const [loading, setLoading] = React.useState(visible);

  /**
   * Reset the widget state.
   */
  const resetWidget = () => {
    setState(undefined);
    setLoading(false);
  };

  /**
   * Get the current date and update the state.
   */
  const getDate = React.useCallback(() => {
    if (!visible) return;
    const d = new Date();
    const resolvedLocale = resolveLocale(locale);
    const now = shortDateFormat
      ? `${d.getMonth() + 1}/${d.getDate()} (${d.toLocaleDateString(
          resolvedLocale,
          { weekday: "short" },
        )})`
      : d.toLocaleDateString(resolvedLocale, {
          weekday: "long",
          month: "long",
          day: "numeric",
        });
    setState({ now });
    setLoading(false);
  }, [visible, locale, shortDateFormat]);

  // Use server socket to get date updates
  useServerSocket("date-display", visible, getDate, resetWidget, setLoading);
  // Refresh the widget at the specified interval
  useWidgetRefresh(visible, getDate, refresh);

  if (loading) return <DataWidgetLoader.Widget className="date-display" />;
  if (!state) return null;
  const { now } = state;

  /**
   * Handle click event to open the calendar application.
   * @param {Event} e - The click event.
   */
  const onClick = (e) => {
    Utils.clickEffect(e);
    openCalendarApp(calendarApp);
  };

  return (
    <DataWidget.Widget
      classes="date-display"
      Icon={showIcon ? Icons.Date : null}
      onClick={onClick}
    >
      {now}
    </DataWidget.Widget>
  );
});

Widget.displayName = "DateDisplay";

/**
 * Open the specified calendar application.
 * @param {string} calendarApp - The name of the calendar application to open.
 */
function openCalendarApp(calendarApp) {
  const appName = calendarApp || "Calendar";
  Uebersicht.run(`open -a "${appName}"`);
}

/**
 * Resolve a usable locale, falling back to ko-KR when the provided locale is
 * empty, malformed, or unsupported by the runtime Intl implementation.
 * @param {string} locale - The configured locale tag.
 * @returns {string} A supported locale tag, or "ko-KR" as a fallback.
 */
function resolveLocale(locale) {
  const candidate = locale?.trim();
  if (!candidate) return "ko-KR";
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([candidate]).length
      ? candidate
      : "ko-KR";
  } catch {
    return "ko-KR";
  }
}
