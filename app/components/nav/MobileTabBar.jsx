"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "../../hooks/useAccount.js";
import { useNotifications } from "../../hooks/useNotifications.js";
import Badge from "../ui/Badge.jsx";

const purchaserTabs = [
  {
    href: "/",
    label: "Marketplace",
    match: (p) => p === "/" || p.startsWith("/collections/"),
    icon: MarketplaceIcon,
  },
  {
    href: "/wallet",
    label: "Tickets",
    match: (p) => p === "/wallet",
    icon: TicketsIcon,
    showBadge: true,
  },
];

const organizerTabs = [
  {
    href: "/events",
    label: "Events",
    match: (p) => p === "/events" || p.startsWith("/events/"),
    icon: EventsIcon,
  },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const { isSignedIn, isOrganizer, loading } = useAccount();
  const { actionCount } = useNotifications();

  if (loading || !isSignedIn) return null;

  const tabs = isOrganizer ? organizerTabs : purchaserTabs;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/70 bg-bg/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      aria-label="Main"
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto px-2 pt-1">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          const badge = tab.showBadge && actionCount > 0 ? actionCount : 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[52px] touch-manipulation transition-colors ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              <span className="relative">
                <Icon active={active} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2">
                    <Badge variant="pending" className="text-[9px] px-1 min-w-[16px] justify-center">
                      {badge}
                    </Badge>
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function MarketplaceIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 9.5 12 4l8 5.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1V9.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.12 : 0}
      />
    </svg>
  );
}

function TicketsIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="5"
        y="7"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.12 : 0}
      />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  );
}

function EventsIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4"
        y="5"
        width="16"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.12 : 0}
      />
      <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
