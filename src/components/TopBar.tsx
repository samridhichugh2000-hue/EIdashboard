"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const ROUTE_LABELS: Record<string, { title: string; subtitle: string }> = {
  "/":                  { title: "Overview",      subtitle: "Aggregated view across all EI categories" },
  "/category/sales":    { title: "Sales",          subtitle: "Sales team · Extended Interview"          },
  "/category/trainer":  { title: "Trainer",        subtitle: "Trainer team · Extended Interview"        },
  "/category/pt":       { title: "PT Team",        subtitle: "PT team · Extended Interview"             },
  "/report":            { title: "15-Day Report",  subtitle: "Performance snapshot for active employees" },
};

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const meta = ROUTE_LABELS[pathname] ?? { title: "EI Dashboard", subtitle: "" };
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  async function handleRefresh() {
    if (syncing) return;
    setSyncing(true);
    try {
      await fetch("/api/sync", { method: "POST" });
      const t = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      setLastSynced(t);
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-white shadow-[0_1px_12px_rgba(0,0,0,0.06)] px-6 py-3.5 flex items-center justify-between">
      <div>
        <h1 className="text-base font-semibold text-gray-900 leading-tight">{meta.title}</h1>
        {meta.subtitle && (
          <p className="text-xs text-gray-400 mt-0.5">{meta.subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 font-medium hidden sm:block">{today}</span>

        {/* Force Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={syncing}
          title={lastSynced ? `Last synced at ${lastSynced}` : "Sync latest data from RMS"}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-wide transition-colors ${
            syncing
              ? "bg-violet-50 border-violet-200 text-violet-400 cursor-not-allowed"
              : "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 cursor-pointer"
          }`}
        >
          <svg
            className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {syncing ? "Syncing…" : lastSynced ? `Synced ${lastSynced}` : "Refresh"}
        </button>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-100">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          <span className="text-[10px] font-semibold text-teal-700 uppercase tracking-wide">Live</span>
        </div>
      </div>
    </header>
  );
}
