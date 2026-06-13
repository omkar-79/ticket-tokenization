"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Card from "../ui/Card.jsx";
import Badge from "../ui/Badge.jsx";
import { fadeUp, fadeUpTransition } from "../../lib/motion.js";
import { hashscanTokenUrl, eventDetailUrl } from "../../lib/routes.js";
import { formatAccountDisplay } from "../../lib/accountDisplay.js";

export function formatRoyaltyPercent(token) {
  const num = token?.royalty_numerator ?? 10;
  const den = token?.royalty_denominator ?? 100;
  const pct = (num / den) * 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`;
}

export function formatHbar(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n === 0) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export default function EventCard({ token }) {
  const remaining = token.max_supply - token.minted_count;
  const pct = token.max_supply > 0 ? (token.minted_count / token.max_supply) * 100 : 0;
  const soldOut = token.minted_count >= token.max_supply;
  const collectionLabel = formatAccountDisplay(token.organizer_account_id, token.organizerEnsName);

  return (
    <motion.li {...fadeUp} transition={fadeUpTransition}>
      <Link href={eventDetailUrl(token.token_id)} className="block group">
        <Card className="transition-colors group-hover:border-accent/30">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-medium tracking-tight group-hover:text-accent transition-colors">
                {token.name}
              </h2>
              <p className="text-muted text-xs mt-1.5 font-mono text-accent break-all">
                {token.symbol} · {collectionLabel}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {token.paused && <Badge variant="pending">Paused</Badge>}
              {soldOut ? (
                <Badge>Sold out</Badge>
              ) : (
                <Badge variant="accent">{remaining} available</Badge>
              )}
              <Badge variant="default">{token.minted_count} minted</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <Stat label="Face value" value={`${token.primary_price_hbar} HBAR`} />
            <Stat label="Minted" value={`${token.minted_count} / ${token.max_supply}`} />
            <Stat label="Royalty rate" value={formatRoyaltyPercent(token)} />
            <Stat
              label="Resale fees earned"
              value={`${formatHbar(token.totalResaleFeesHbar ?? 0)} HBAR`}
              accent={token.totalResaleFeesHbar > 0}
            />
          </div>

          <div className="h-1 bg-border rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-accent transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>

          <p className="text-xs text-muted">
            View ticket registry →
          </p>
        </Card>
      </Link>
    </motion.li>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted mb-1">{label}</p>
      <p className={`text-sm font-medium tabular-nums ${accent ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}

export function EventStats({ token, tickets, royaltySummary }) {
  const unminted = token.max_supply - token.minted_count;
  const primarySales = royaltySummary?.primarySales ?? token.minted_count;
  const ticketsResold = royaltySummary?.ticketsResold ?? 0;
  const resaleTransactions = royaltySummary?.resaleTransactions ?? royaltySummary?.totalSecondarySales ?? 0;
  const heldOnResale = royaltySummary?.heldOnResale ?? tickets.filter((t) => t.currentOwner?.acquisition === "secondary").length;
  const totalFees = royaltySummary?.totalResaleFeesHbar ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-8">
      <StatBox label="Total supply" value={token.max_supply} />
      <StatBox label="Minted" value={token.minted_count} accent />
      <StatBox label="Primary sales" value={primarySales} accent={primarySales > 0} />
      <StatBox label="Tickets resold" value={ticketsResold} />
      <StatBox label="Resale transactions" value={resaleTransactions} />
      <StatBox label="Held (resale)" value={heldOnResale} />
      <StatBox
        label="Total resale fees"
        value={`${formatHbar(totalFees)} HBAR`}
        accent={totalFees > 0}
      />
      {unminted > 0 && (
        <StatBox label="Unminted" value={unminted} className="col-span-2 sm:col-span-3 xl:col-span-7" />
      )}
    </div>
  );
}

function StatBox({ label, value, accent, className = "" }) {
  return (
    <div className={`bg-surface border border-border rounded-lg px-4 py-3 ${className}`}>
      <p className="text-[10px] uppercase tracking-widest text-muted mb-1">{label}</p>
      <p className={`text-2xl font-medium tabular-nums ${accent ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}

export function TicketRegistry({ tickets, tokenId }) {
  if (!tickets.length) {
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-lg">
        <p className="text-muted text-sm">No tickets minted yet.</p>
        <p className="text-muted text-xs mt-2">
          Tickets appear here when fans purchase at face value.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="hidden sm:grid sm:grid-cols-[4rem_1fr_1fr_5rem_5rem_5rem] gap-4 px-4 py-3 bg-surface border-b border-border text-[10px] uppercase tracking-widest text-muted">
        <span>Serial</span>
        <span>Current owner</span>
        <span>Acquisition</span>
        <span>Last price</span>
        <span>Resale fees</span>
        <span>Status</span>
      </div>
      <ul className="divide-y divide-border">
        {tickets.map((t) => (
          <TicketRegistryRow key={t.serial} ticket={t} tokenId={tokenId} />
        ))}
      </ul>
    </div>
  );
}

function ticketRegistryBadge(ticket) {
  if (ticket.status === "used") {
    return { label: "Used at gate", variant: "pending" };
  }
  if (ticket.status === "listed_for_resale") {
    return { label: "Listed", variant: "pending" };
  }
  const resales = ticket.secondarySaleCount ?? 0;
  if (resales > 0) {
    return { label: `Resold ${resales}×`, variant: "pending" };
  }
  return { label: "Primary", variant: "default" };
}

function TicketRegistryRow({ ticket, tokenId }) {
  const owner = ticket.currentOwner;
  const price = owner?.price_hbar != null ? `${owner.price_hbar} HBAR` : "—";
  const fees = ticket.resaleFeesEarnedHbar ?? 0;
  const feesLabel =
    fees > 0
      ? `${formatHbar(fees)} HBAR${ticket.secondarySaleCount > 1 ? ` (${ticket.secondarySaleCount}×)` : ""}`
      : "—";
  const badge = ticketRegistryBadge(ticket);

  return (
    <li className="grid grid-cols-1 sm:grid-cols-[4rem_1fr_1fr_5rem_5rem_5rem] gap-2 sm:gap-4 px-4 py-4 hover:bg-white/[0.02] transition-colors">
      <div>
        <span className="sm:hidden text-[10px] uppercase tracking-widest text-muted block mb-0.5">Serial</span>
        <Link
          href={`/tickets/${encodeURIComponent(tokenId)}/${ticket.serial}`}
          className="text-lg font-medium text-accent hover:text-accent-dim tabular-nums"
        >
          #{ticket.serial}
        </Link>
      </div>
      <div>
        <span className="sm:hidden text-[10px] uppercase tracking-widest text-muted block mb-0.5">Owner</span>
        {owner ? (
          <span className="font-mono text-xs text-text break-all">{owner.owner_account_id}</span>
        ) : (
          <span className="text-muted text-sm">Unassigned</span>
        )}
      </div>
      <div>
        <span className="sm:hidden text-[10px] uppercase tracking-widest text-muted block mb-0.5">Acquisition</span>
        <span className="text-sm capitalize text-muted">{owner?.acquisition ?? "—"}</span>
      </div>
      <div>
        <span className="sm:hidden text-[10px] uppercase tracking-widest text-muted block mb-0.5">Last price</span>
        <span className="text-sm tabular-nums">{price}</span>
      </div>
      <div>
        <span className="sm:hidden text-[10px] uppercase tracking-widest text-muted block mb-0.5">Resale fees</span>
        <span className={`text-sm tabular-nums ${fees > 0 ? "text-accent" : "text-muted"}`}>
          {feesLabel}
        </span>
      </div>
      <div>
        <span className="sm:hidden text-[10px] uppercase tracking-widest text-muted block mb-0.5">Status</span>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>
    </li>
  );
}
