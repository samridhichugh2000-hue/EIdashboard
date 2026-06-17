"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TrainerAssignment } from "@/types/employee";

interface AssignmentBadgeProps {
  assignments: TrainerAssignment[];
  empName: string;
}

interface PopupPos {
  top: number;
  left: number;
}

export default function AssignmentBadge({ assignments, empName }: AssignmentBadgeProps) {
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
    const popupWidth = 420;
    let left = rect.left;
    if (left + popupWidth > window.innerWidth - 16) {
      left = window.innerWidth - popupWidth - 16;
    }
    setPos({ top: rect.bottom + 6, left });
    setOpen((v) => !v);
  }

  const total = assignments.length;

  const popup = open && total > 0 && (
    <div
      ref={popupRef}
      onMouseDown={(e) => e.stopPropagation()}
      style={{ position: "fixed", top: pos.top, left: pos.left, width: 420, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{empName} — Assignments</p>
          <p className="text-xs text-gray-500 mt-0.5">{total} assignment{total !== 1 ? "s" : ""}</p>
        </div>
        <button
          onMouseDown={(e) => { e.stopPropagation(); setOpen(false); }}
          className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-blue-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Assignment rows */}
      <div className="max-h-80 overflow-y-auto">
        {assignments.map((a, i) => {
          const period = [a.startDate, a.endDate].filter(Boolean).join(" → ") || null;
          return (
            <div key={i} className="px-4 py-3 border-b last:border-0 border-gray-100 bg-white hover:bg-blue-50 transition-colors">
              {/* Client + dates */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-semibold text-gray-900">{a.clientName ?? "—"}</p>
                {period && <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">{period}</span>}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {a.deliveryMode && (
                  <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                    {a.deliveryMode}
                  </span>
                )}
                {a.scId && (
                  <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                    SC: {a.scId}
                  </span>
                )}
              </div>

              {/* Feedback */}
              {a.feedbackAnswer && (
                <div className="mt-1 pt-1.5 border-t border-gray-100">
                  {a.feedbackQuestion && (
                    <p className="text-[10px] text-gray-400 mb-0.5">{a.feedbackQuestion}</p>
                  )}
                  <p className="text-xs text-gray-700 leading-snug">{a.feedbackAnswer}</p>
                  {a.feedbackDate && (
                    <p className="text-[10px] text-gray-400 mt-0.5">{a.feedbackDate}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
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
            : "bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer"
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
