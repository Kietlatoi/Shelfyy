export function MaterialIcon({
  name,
  filled = false,
  className = "",
  size = 24,
}) {
  const classes = [
    "material-symbols-outlined",
    filled ? "icon-filled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={classes}
      style={{ fontSize: `${size}px` }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
