"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { buildGateScanUrl } from "../../lib/gate.js";

export default function TicketPassQr({ tokenId, serial, ensName = null, used = false, size = 160 }) {
  const [value, setValue] = useState(null);

  useEffect(() => {
    setValue(buildGateScanUrl(window.location.origin, tokenId, serial));
  }, [tokenId, serial]);

  if (used) {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <div
          className="rounded-lg border border-border bg-white/5 flex items-center justify-center text-muted text-xs uppercase tracking-widest"
          style={{ width: size, height: size }}
        >
          Used
        </div>
        <p className="text-xs text-muted text-center max-w-[200px]">
          This ticket was already scanned at the gate.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-lg border border-border bg-white p-3">
        {value ? (
          <QRCode
            value={value}
            size={size}
            level="M"
            bgColor="#ffffff"
            fgColor="#0a0a0a"
          />
        ) : (
          <div
            className="bg-white/10 animate-pulse rounded"
            style={{ width: size, height: size }}
          />
        )}
      </div>
      {ensName && (
        <p className="font-mono text-xs text-accent text-center break-all max-w-[240px]">{ensName}</p>
      )}
      <p className="text-xs text-muted text-center max-w-[220px] leading-relaxed">
        Show this QR at the gate for the organizer to scan.
      </p>
    </div>
  );
}
