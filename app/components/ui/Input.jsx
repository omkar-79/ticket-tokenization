export default function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full min-h-11 bg-bg border border-border rounded-[var(--radius-button)] px-4 py-3 text-base sm:text-sm text-text placeholder:text-muted/60 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15 transition-colors touch-manipulation ${className}`}
      {...props}
    />
  );
}
