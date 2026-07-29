import Icon from "../icon.jsx";

// Straight segments rather than curves: the mark is a letterform, and fitting
// smooth beziers through its corners rounds the stems off into a wobble.
export default function Ridibooks(props) {
  return (
    <Icon {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.14 1.18L11.81 0.6L14.43 0.7L15.69 1.09L16.95 1.76L18.69 3.61L19.28 4.77L19.76 6.81L19.57 9.82L19.08 11.18L18.4 12.24L16.75 13.7L15.3 14.28L16.27 16.51L19.86 23.21L19.76 23.4L18.4 23.11L14.13 22.33L10.45 14.57L8.6 14.57L8.6 21.36L4.14 20.59ZM8.6 10.5L11.61 10.59L12.68 10.4L13.46 10.01L14.04 9.43L14.52 8.17L14.43 6.71L13.84 5.74L13.46 5.35L12.49 4.97L8.6 5.06Z"
      />
    </Icon>
  );
}
