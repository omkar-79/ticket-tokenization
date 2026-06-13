"use client";

import Link from "next/link";
import PageTransition from "./components/layout/PageTransition.jsx";
import PageHeader from "./components/layout/PageHeader.jsx";

export default function Error({ error, reset }) {
  return (
    <PageTransition>
      <PageHeader title="Something went wrong" description={error?.message ?? "An unexpected error occurred."} />
      <div className="flex gap-4">
        <button
          type="button"
          onClick={reset}
          className="text-sm text-accent hover:text-accent-dim transition-colors"
        >
          Try again
        </button>
        <Link href="/" className="text-sm text-muted hover:text-text transition-colors">
          Marketplace
        </Link>
      </div>
    </PageTransition>
  );
}
