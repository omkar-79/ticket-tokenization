import Button from "../ui/Button.jsx";
import Badge from "../ui/Badge.jsx";

export default function BidList({
  bids,
  listingStatus,
  onAccept,
  onDecline,
  loading,
  showTitle = false,
  emptyLabel,
}) {
  const items = bids ?? [];
  const hasBids = items.length > 0;

  if (!hasBids && !emptyLabel) return null;

  return (
    <div className="border-t border-border/80 pt-4 space-y-3">
      {showTitle && (
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[10px] uppercase tracking-widest text-muted">Bids</h3>
          {hasBids && (
            <span className="text-[10px] text-muted tabular-nums">
              {items.filter((b) => b.status === "pending").length} pending
            </span>
          )}
        </div>
      )}

      {!hasBids && emptyLabel && (
        <p className="text-xs text-muted leading-relaxed">{emptyLabel}</p>
      )}

      {hasBids && (
        <ul className="space-y-2">
          {items.map((b) => (
            <li
              key={b.id}
              className="rounded-xl border border-border/70 bg-bg/40 px-3 py-3 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3"
            >
              <div className="min-w-0">
                <p className="font-mono text-[11px] text-muted truncate">{b.bidderAccountId}</p>
                <p className="mt-1 flex flex-wrap items-baseline gap-2">
                  <span className="text-lg font-semibold tabular-nums text-text">
                    {b.bidPriceHbar} HBAR
                  </span>
                  <Badge variant={b.status === "pending" ? "pending" : "default"} className="capitalize">
                    {b.status}
                  </Badge>
                </p>
              </div>

              {b.status === "pending" && listingStatus === "open" && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="primary"
                    className="flex-1 sm:flex-none"
                    onClick={() => onAccept(b.id)}
                    loading={loading === `accept-${b.id}`}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 sm:flex-none"
                    onClick={() => onDecline(b.id)}
                    loading={loading === `decline-${b.id}`}
                  >
                    Decline
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
