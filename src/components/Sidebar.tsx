"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EmployeeCategory } from "@/types/employee";

interface CategoryCount { sales: number; trainer: number; pt: number; }
interface SidebarProps { counts?: CategoryCount; }

function IconOverview() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function IconSales() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}
function IconTrainer() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8M12 17v4" />
    </svg>
  );
}
function IconPT() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4a4 4 0 11-8 0 4 4 0 018 0zm6 0a3 3 0 11-6 0 3 3 0 016 0zM3 17a3 3 0 116 0" />
    </svg>
  );
}
function IconReport() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2h-5L9 7H5a2 2 0 00-2 2v9a2 2 0 002 2z" />
    </svg>
  );
}

const CATEGORIES: { key: EmployeeCategory; label: string; Icon: () => React.ReactElement }[] = [
  { key: "sales",   label: "Sales",   Icon: IconSales   },
  { key: "trainer", label: "Trainer", Icon: IconTrainer },
  { key: "pt",      label: "PT Team", Icon: IconPT      },
];

export default function Sidebar({ counts }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen flex flex-col shrink-0 bg-gradient-to-b from-[#28C5BE] to-[#1E99C0] shadow-xl">
      {/* Logo */}
      <div className="px-6 py-6">
        <h1 className="text-xl font-bold text-white tracking-tight">EI Dashboard</h1>
        <p className="text-xs text-white/60 mt-0.5">90-Day Tracker</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {/* Overview */}
        <NavItem
          href="/"
          label="Overview"
          Icon={IconOverview}
          isActive={pathname === "/"}
        />

        {/* Divider label */}
        <p className="px-3 pt-4 pb-1 text-[10px] font-semibold text-white/40 uppercase tracking-widest">
          Categories
        </p>

        {CATEGORIES.map(({ key, label, Icon }) => {
          const isActive = pathname === `/category/${key}`;
          const count = counts?.[key];
          return (
            <NavItem
              key={key}
              href={`/category/${key}`}
              label={label}
              Icon={Icon}
              isActive={isActive}
              badge={count}
            />
          );
        })}
      </nav>

      <div className="px-3 pb-3">
        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-white/40 uppercase tracking-widest">
          Reports
        </p>
        <NavItem
          href="/report"
          label="15-Day Report"
          Icon={IconReport}
          isActive={pathname === "/report"}
        />
      </div>

      <div className="px-6 py-5">
        <p className="text-xs text-white/40">Extended Interview · v3.0</p>
      </div>
    </aside>
  );
}

function NavItem({
  href, label, Icon, isActive, badge,
}: {
  href: string; label: string; Icon: () => React.ReactElement; isActive: boolean; badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        isActive
          ? "bg-white text-[#1E99C0] shadow-sm"
          : "text-white/80 hover:bg-white/20 hover:text-white"
      }`}
    >
      <span className="flex items-center gap-3">
        <Icon />
        <span>{label}</span>
      </span>
      {badge !== undefined && (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          isActive ? "bg-[#e6f7f5] text-[#1E99C0]" : "bg-white/20 text-white"
        }`}>
          {badge}
        </span>
      )}
    </Link>
  );
}
