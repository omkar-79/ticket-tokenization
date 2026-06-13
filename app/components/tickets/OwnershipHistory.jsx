import { formatAccountDisplay } from "../../lib/accountDisplay.js";

export default function OwnershipHistory({ history }) {
  if (!history?.length) return null;

  return (
    <details className="text-sm">
      <summary className="text-muted cursor-pointer hover:text-text transition-colors">
        Ownership history ({history.length})
      </summary>
      <ol className="mt-2 space-y-1 text-xs text-muted font-mono">
        {history.map((h) => (
          <li key={h.id}>
            {h.acquisition} →{" "}
            <span className="text-accent">
              {formatAccountDisplay(h.owner_account_id, h.ownerEnsName)}
            </span>
            {h.price_hbar ? ` @ ${h.price_hbar} HBAR` : ""}
            {h.tx_id && (
              <>
                {" "}
                <a
                  href={`https://hashscan.io/testnet/transaction/${h.tx_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent"
                >
                  tx
                </a>
              </>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}
