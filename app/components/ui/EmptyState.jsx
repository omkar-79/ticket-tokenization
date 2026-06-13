export default function EmptyState({ title, children }) {
  return (
    <div className="py-12 text-center">
      {title && (
        <p className="text-muted text-sm tracking-wide mb-2">{title}</p>
      )}
      <div className="text-sm text-muted leading-relaxed">{children}</div>
    </div>
  );
}
