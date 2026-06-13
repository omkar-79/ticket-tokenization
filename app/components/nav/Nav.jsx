"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { clearStoredAccountId } from "../../lib/storage.js";
import { useAccount } from "../../hooks/useAccount.js";
import { useNotifications } from "../../hooks/useNotifications.js";
import Badge from "../ui/Badge.jsx";
import HbarBalanceMenu from "./HbarBalanceMenu.jsx";

const purchaserLinks = [
  { href: "/", label: "Marketplace" },
  { href: "/wallet", label: "My Tickets", showBadge: true },
];

const organizerLinks = [{ href: "/events", label: "My Events" }];

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const { accountId, isSignedIn, isOrganizer, loading } = useAccount();
  const { actionCount, totalCount } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);

  function logout() {
    clearStoredAccountId();
    setMenuOpen(false);
    router.push("/login");
  }

  const navLinks = isOrganizer ? organizerLinks : purchaserLinks;

  const shortId = accountId
    ? accountId.length > 12
      ? `${accountId.slice(0, 6)}…${accountId.slice(-4)}`
      : accountId
    : null;

  const isActive = (href) => {
    if (href === "/events") return pathname === "/events" || pathname.startsWith("/events/");
    if (href === "/") return pathname === "/" || pathname.startsWith("/collections/");
    if (href === "/wallet") return pathname === "/wallet";
    return pathname === href;
  };

  return (
    <>
      <header className="sticky top-0 z-30 -mx-[var(--page-x)] px-[var(--page-x)] pt-[max(0.5rem,env(safe-area-inset-top))] mb-5 md:mb-[var(--section-y)] glass-panel border-b border-border/60">
        <nav className="flex items-center justify-between gap-3 min-h-[var(--nav-height)]">
          <Link
            href={isOrganizer ? "/events" : "/"}
            className="text-sm font-semibold tracking-tight text-text hover:text-accent transition-colors shrink-0"
          >
            WC Ticket
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 text-sm flex-1 justify-center">
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                {...link}
                active={isActive(link.href)}
                badge={!isOrganizer && link.showBadge && actionCount > 0 ? actionCount : null}
              />
            ))}
          </div>

          {/* Mobile: balance + menu */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            {!loading && isSignedIn && !isOrganizer && <HbarBalanceMenu pill />}
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-border/80 text-muted hover:text-text transition-colors touch-manipulation"
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>

          {/* Desktop account */}
          <div className="hidden md:flex items-center gap-4 text-xs shrink-0">
            {!loading && isSignedIn ? (
              <>
                {!isOrganizer && <HbarBalanceMenu />}
                {isOrganizer && (
                  <span className="text-muted uppercase tracking-widest text-[10px]">Organizer</span>
                )}
                <span className="font-mono text-muted">{shortId}</span>
                <button
                  type="button"
                  onClick={logout}
                  className="text-muted hover:text-text transition-colors tracking-wide touch-manipulation"
                >
                  Log out
                </button>
              </>
            ) : !loading ? (
              <>
                <Link href="/login" className="text-muted hover:text-text transition-colors">
                  Log in
                </Link>
                <Link href="/onboard" className="text-accent hover:text-accent-dim transition-colors">
                  Create Account
                </Link>
              </>
            ) : null}
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed left-[var(--page-x)] right-[var(--page-x)] top-[calc(var(--nav-height)+env(safe-area-inset-top)+0.75rem)] z-50 rounded-2xl border border-border/80 glass-panel shadow-2xl p-4 space-y-3"
            >
              {!isSignedIn && !loading && (
                <div className="flex flex-col gap-2 pb-2 border-b border-border/60">
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="w-full text-center py-3 rounded-xl border border-border text-sm"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/onboard"
                    onClick={() => setMenuOpen(false)}
                    className="w-full text-center py-3 rounded-xl bg-accent text-bg text-sm font-medium"
                  >
                    Create Account
                  </Link>
                </div>
              )}

              {isSignedIn && (
                <>
                  <p className="text-[10px] uppercase tracking-widest text-muted">Account</p>
                  <p className="font-mono text-sm break-all">{accountId}</p>
                  {isOrganizer && (
                    <p className="text-xs text-muted">Organizer</p>
                  )}
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full text-left py-3 px-3 rounded-xl border border-border text-sm text-muted hover:text-text transition-colors touch-manipulation"
                  >
                    Log out
                  </button>
                </>
              )}

              {/* Signed-in purchasers use bottom tab bar; show links only for organizers on mobile */}
              {isOrganizer && (
                <div className="pt-2 border-t border-border/60 space-y-1">
                  {navLinks.map((link) => (
                    <NavLink
                      key={link.href}
                      {...link}
                      active={isActive(link.href)}
                      badge={totalCount > 0 ? totalCount : null}
                      onClick={() => setMenuOpen(false)}
                      className="block py-3 px-3 rounded-xl"
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function NavLink({ href, label, active, badge, onClick, className = "" }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`transition-colors tracking-wide touch-manipulation ${className} ${
        active ? "text-accent" : "text-muted hover:text-text"
      }`}
    >
      {label}
      {badge != null && badge > 0 && (
        <Badge variant="pending" className="ml-1.5">
          {badge}
        </Badge>
      )}
    </Link>
  );
}
