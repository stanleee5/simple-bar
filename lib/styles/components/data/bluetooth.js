// Styles for /lib/components/data/bluetooth.jsx component
// The widget passes disableSlider, so DataWidget renders no .data-widget__inner
// wrapper and --item-max-width never applies — which is what lets the expanded
// device list run past the 160px every other widget is clipped to.
//
// Only background-color is set, like every other data widget: .data-widget
// already sets color to var(--background), which reads correctly against the
// light accent colors. Inheriting the default var(--minor) background instead
// would put dark text on a dark pill.
// Colors in use elsewhere: blue=sound, magenta=battery, cyan=date, yellow=time,
// minor=weather. Orange is free and separates this pill from its neighbours.
export const bluetoothStyles = /* css */ `
.bluetooth {
  background-color: var(--orange);
  cursor: pointer;
}
.simple-bar--widgets-background-color-as-foreground .bluetooth {
  color: var(--orange);
  background-color: transparent;
}
.bluetooth__device {
  display: flex;
  align-items: center;
}
.bluetooth__device + .bluetooth__device {
  margin-left: 9px;
}
/* data-widget.js styles ".data-widget > svg" — direct children only — so the
   per-device type icons need their own rule. */
.bluetooth__device svg {
  width: 14px;
  height: 14px;
  margin-right: 5px;
  fill: currentColor;
}
.bluetooth__name {
  margin-right: 5px;
}
.bluetooth__chevron {
  margin-left: 6px;
  font-size: 0.8em;
  opacity: 0.5;
}
`;
