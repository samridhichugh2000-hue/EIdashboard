"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EmployeeCategory } from "@/types/employee";

interface CategoryCount { sales: number; trainer: number; pt: number; }
interface SidebarProps { counts?: CategoryCount; }

const CATEGORIES: { key: EmployeeCategory; label: string; color: string }[] = [
  { key: "sales",   label: "Sales",   color: "bg-teal-400"   },
  { key: "trainer", label: "Trainer", color: "bg-violet-400" },
  { key: "pt",      label: "PT Team", color: "bg-amber-400"  },
];

export default function Sidebar({ counts }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] min-h-screen flex flex-col shrink-0 bg-[#0f172a] border-r border-white/[0.06]">

      {/* Logo */}
      <div className="px-5 pt-6 pb-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#28C5BE] to-[#1E99C0] flex items-center justify-center shrink-0 shadow-lg shadow-teal-900/40">
          <span className="text-white text-xs font-bold tracking-tight">EI</span>
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold leading-tight truncate">EI Dashboard</p>
          <p className="text-slate-500 text-[10px] leading-tight mt-0.5 truncate">Koenig Solutions</p>
        </div>
      </div>

      <div className="px-3 flex-1 flex flex-col gap-0.5">

        {/* Overview */}
        <NavItem href="/" label="Overview" isActive={pathname === "/"} icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
          </svg>
        } />

        {/* Teams section */}
        <p className="px-3 pt-5 pb-2 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
          Teams
        </p>

        {CATEGORIES.map(({ key, label, color }) => {
          const isActive = pathname === `/category/${key}`;
          const count = counts?.[key];
          return (
            <NavItem
              key={key}
              href={`/category/${key}`}
              label={label}
              isActive={isActive}
              badge={count}
              dot={color}
              icon={null}
            />
          );
        })}

        {/* Reports section */}
        <p className="px-3 pt-5 pb-2 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
          Reports
        </p>

        <NavItem href="/report" label="15-Day Report" isActive={pathname === "/report"} icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2h-5L9 7H5a2 2 0 00-2 2v9a2 2 0 002 2z" />
          </svg>
        } />
      </div>

      {/* Footer */}
      <div className="px-5 py-5 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-slate-300 text-xs font-medium leading-tight truncate">HR Team</p>
            <p className="text-slate-600 text-[10px] leading-tight mt-0.5">v3.0 · Extended Interview</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  href, label, isActive, icon, badge, dot,
}: {
  href: string;
  label: string;
  isActive: boolean;
  icon: React.ReactElement | null;
  badge?: number;
  dot?: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
        isActive
          ? "bg-[#28C5BE]/10 text-[#28C5BE]"
          : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
      }`}
    >
      <span className="flex items-center gap-2.5 min-w-0">
        {dot ? (
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "bg-[#28C5BE]" : dot}`} />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        <span className="truncate font-medium">{label}</span>
      </span>
      {badge !== undefined && (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 ml-1 ${
          isActive ? "bg-[#28C5BE]/20 text-[#28C5BE]" : "bg-white/[0.06] text-slate-500"
        }`}>
          {badge}
        </span>
      )}
    </Link>
  );
}
