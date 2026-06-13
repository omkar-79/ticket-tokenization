"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { apiGet } from "../../lib/api.js";

const REFRESH_MS = Number(process.env.NEXT_PUBLIC_GATE_PASS_REFRESH_MS ?? 60000);

export default function TicketPassQr({
  tokenId,
  serial,
  accountId,
  ensName = null,
  used = false,
  size = 160,
}) {
  const [passJson, setPassJson] = useState(null);
  const [passError, setPassError] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);

  const loadPass = useCallback(async () => {
    if (!accountId || used) return;
    try {
      const data = await apiGet(
        `/api/tickets/${encodeURIComponent(tokenId)}/${serial}/pass`,
        accountId
      );
      setPassJson(data.passJson);
      setExpiresAt(data.expiresAt ?? data.pass?.exp ?? null);
      setPassError(null);
    } catch (e) {
      setPassError(e.message);
      setPassJson(null);
    }
  }, [accountId, tokenId, serial, used]);

  useEffect(() => {
    loadPass();
    if (used || !accountId) return undefined;

    const timer = setInterval(() => {
      const expSec = expiresAt ?? 0;
      const secsLeft = expSec - Math.floor(Date.now() / 1000);
      if (secsLeft < 120) {
        loadPass();
      }
    }, REFRESH_MS);

    return () => clearInterval(timer);
  }, [loadPass, used, accountId, expiresAt]);

  if (used) {
    return (
      <div className="flex flex-col items-center gap-3 py-2">
        <div
          className="rounded-2xl border-2 border-success/30 bg-success/10 flex flex-col items-center justify-center gap-2 text-success"
          style={{ width: size, height: size }}
        >
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">Checked in</span>
        </div>
        <p className="text-xs text-muted text-center max-w-[220px] leading-relaxed">
          This ticket was scanned at the gate. Have a great time!
        </p>
      </div>
    );
  }

  if (!accountId) {
    return (
      <p className="text-xs text-muted text-center max-w-[220px] leading-relaxed py-4">
        Log in as the ticket holder to show your signed gate pass QR.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-lg border border-border bg-white p-3">
        {passJson ? (
          <QRCode
            value={passJson}
            size={size}
            level="M"
            bgColor="#ffffff"
            fgColor="#0a0a0a"
          />
        ) : (
          <div
            className="bg-white/10 animate-pulse rounded flex items-center justify-center text-xs text-muted"
            style={{ width: size, height: size }}
          >
            {passError ? "Pass unavailable" : "Loading…"}
          </div>
        )}
      </div>
      {passError && (
        <p className="text-xs text-error text-center max-w-[220px]">{passError}</p>
      )}
      {ensName && (
        <p className="font-mono text-xs text-accent text-center break-all max-w-[240px]">{ensName}</p>
      )}
      <p className="text-xs text-muted text-center max-w-[240px] leading-relaxed">
        Invalid after resale. At the gate, confirm with World ID when prompted.
      </p>
      {passJson && (
        <button
          type="button"
          onClick={() => loadPass()}
          className="text-xs text-accent hover:text-accent-dim"
        >
          Refresh QR
        </button>
      )}
    </div>
  );
}
