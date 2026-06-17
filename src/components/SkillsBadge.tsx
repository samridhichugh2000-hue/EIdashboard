"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TrainerSkill } from "@/types/employee";

interface SkillsBadgeProps {
  skills: TrainerSkill[];
  empName: string;
}

interface PopupPos {
  top: number;
  left: number;
}

export default function SkillsBadge({ skills, empName }: SkillsBadgeProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PopupPos>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (popupRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("scroll", close, true);
    };
  }, [open]);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const popupWidth = 400;
    let left = rect.left;
    if (left + popupWidth > window.innerWidth - 16) {
      left = window.innerWidth - popupWidth - 16;
    }
    setPos({ top: rect.bottom + 6, left });
    setOpen((v) => !v);
  }

  const total = skills.length;
  const active = skills.filter((s) => !s.isDiscontinue).length;

  const popup = open && total > 0 && (
    <div
      ref={popupRef}
      onMouseDown={(e) => e.stopPropagation()}
      style={{ position: "fixed", top: pos.top, left: pos.left, width: 400, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{empName} — Skills Marked</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {active} active{total !== active ? `, ${total - active} discontinued` : ""}
          </p>
        </div>
        <button
          onMouseDown={(e) => { e.stopPropagation(); setOpen(false); }}
          className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-emerald-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Skill rows */}
      <div className="max-h-80 overflow-y-auto">
        {skills.map((s, i) => (
          <div
            key={i}
            className={`px-4 py-2.5 border-b last:border-0 border-gray-100 flex items-center gap-2 ${s.isDiscontinue ? "opacity-50" : "hover:bg-emerald-50"} transition-colors`}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-400" />
            <span className={`text-sm flex-1 ${s.isDiscontinue ? "line-through text-gray-400" : "text-gray-800"}`}>
              {s.courseName ?? "—"}
            </span>
            {s.isDiscontinue && (
              <span className="text-[10px] font-medium bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full shrink-0">discontinued</span>
            )}
            {s.isDuplicate && !s.isDiscontinue && (
              <span className="text-[10px] font-medium bg-amber-50 text-amber-500 px-1.5 py-0.5 rounded-full shrink-0">duplicate</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleClick}
        disabled={total === 0}
        className={`inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-bold transition-colors ${
          total === 0
            ? "bg-gray-100 text-gray-400 cursor-default"
            : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 cursor-pointer"
        }`}
      >
        {total}
      </button>

      {typeof window !== "undefined" && popup
        ? createPortal(popup, document.body)
        : null}
    </>
  );
}
