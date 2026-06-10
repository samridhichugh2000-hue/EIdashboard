"use client";

import { usePathname } from "next/navigation";

const ROUTE_LABELS: Record<string, { title: string; subtitle: string }> = {
  "/":                  { title: "Overview",      subtitle: "Aggregated view across all EI categories" },
  "/category/sales":    { title: "Sales",          subtitle: "Sales team · Extended Interview"          },
  "/category/trainer":  { title: "Trainer",        subtitle: "Trainer team · Extended Interview"        },
  "/category/pt":       { title: "PT Team",        subtitle: "PT team · Extended Interview"             },
  "/report":            { title: "15-Day Report",  subtitle: "Performance snapshot for active employees" },
};

export default function TopBar() {
  const pathname = usePathname();
  const meta = ROUTE_LABELS[pathname] ?? { title: "EI Dashboard", subtitle: "" };

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-3.5 flex items-center justify-between">
      <div>
        <h1 className="text-base font-semibold text-gray-900 leading-tight">{meta.title}</h1>
        {meta.subtitle && (
          <p className="text-xs text-gray-400 mt-0.5">{meta.subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 font-medium hidden sm:block">{today}</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-100">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          <span className="text-[10px] font-semibold text-teal-700 uppercase tracking-wide">Live</span>
        </div>
      </div>
    </header>
  );
}
