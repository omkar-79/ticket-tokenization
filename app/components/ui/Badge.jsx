export default function Badge({ children, variant = "default", className = "" }) {
  const colors =
    variant === "accent"
      ? "text-accent border-accent/30"
      : variant === "pending"
        ? "text-pending border-pending/30"
        : variant === "success"
          ? "text-success border-success/30"
          : "text-muted border-border";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium tracking-wide border rounded-md ${colors} ${className}`}
    >
      {children}
    </span>
  );
}
