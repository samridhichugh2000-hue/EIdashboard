import { FinalStatus, EmployeeCategory } from "@/types/employee";

export function computeTenureDays(doj: string): number {
  const joinDate = new Date(doj);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  joinDate.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
}

export function getTenureBand(days: number): "early" | "mid" | "complete" {
  if (days <= 30) return "early";
  if (days <= 60) return "mid";
  return "complete";
}

export function getTenureBadgeClass(days: number): string {
  const band = getTenureBand(days);
  if (band === "early") return "bg-amber-100 text-amber-800";
  if (band === "mid") return "bg-blue-100 text-blue-800";
  return "bg-green-100 text-green-800";
}

export function getStatusChipClass(status: FinalStatus): string {
  switch (status) {
    case "Confirmed":   return "bg-green-100 text-green-800";
    case "In Progress": return "bg-blue-100 text-blue-800";
    case "PA Issued":   return "bg-amber-100 text-amber-800";
    case "PIP Issued":  return "bg-red-100 text-red-800";
  }
}

export function formatIndianNumber(val: number): string {
  return val.toLocaleString("en-IN");
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function categoryLabel(cat: EmployeeCategory): string {
  switch (cat) {
    case "sales":   return "Sales";
    case "trainer": return "Trainer";
    case "pt":      return "PT Team";
  }
}

export function categoryIcon(cat: EmployeeCategory): string {
  switch (cat) {
    case "sales":   return "📣";
    case "trainer": return "🖥️";
    case "pt":      return "👥";
  }
}

// Returns true when feedback indicates "below satisfactory" performance:
// — no strengths noted at all, OR explicit "below satisfactory" text
export function isBelowSatisfactory(entry: { areaOfStrength: string | null; areaOfImprovement: string | null; comment: string }): boolean {
  const lower = entry.comment.toLowerCase();
  if (
    lower.includes("below satisfactory") ||
    lower.includes("not satisfactory") ||
    lower.includes("below expectation") ||
    lower.includes("below average")
  ) return true;
  const hasStrength    = !!entry.areaOfStrength?.trim();
  const hasImprovement = !!entry.areaOfImprovement?.trim();
  return !hasStrength && hasImprovement;
}

// Infer milestone from feedback date relative to DOJ
export function inferMilestone(dojStr: string, feedbackDateStr: string): "d30" | "d60" | "d90" | null {
  const doj = new Date(dojStr);
  const fbDate = parseDateOfFb(feedbackDateStr);
  if (!fbDate) return null;
  const diff = Math.floor((fbDate.getTime() - doj.getTime()) / (1000 * 60 * 60 * 24));
  if (diff >= 15 && diff <= 50) return "d30";
  if (diff > 50 && diff <= 80) return "d60";
  if (diff > 80) return "d90";
  return null;
}

// Parse "DD Mon YYYY" or ISO date string → Date
export function parseDateOfFb(dateStr: string): Date | null {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    return null;
  } catch {
    return null;
  }
}

// Fix UTF-8 text decoded as Latin-1 (mojibake) and strip HTML from API feedback
// The bullet char U+2022 (UTF-8: E2 80 A2) appears as U+00E2 U+0080 U+00A2 when misread as Latin-1
export function cleanFeedbackText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/â¢\s*/g, "• ") // bullet •
    .replace(/â/g, "‘")      // left single quote
    .replace(/â/g, "’")      // right single quote
    .replace(/â/g, "“")      // left double quote
    .replace(/â/g, "”")      // right double quote
    .replace(/â/g, "–")      // en-dash
    .replace(/â/g, "—")      // em-dash
    .replace(/<br\s*\/?>/gi, "\n")                  // <br /> to newline
    .replace(/<[^>]+>/g, "")                        // strip remaining HTML tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")                    // collapse 3+ newlines
    .trim();
}

// ISO date → "DD-Mon-YYYY" for API calls (e.g. "2026-01-26" → "26-Jan-2026")
export function isoToApiDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
}

// 4 months ago date as "DD-Mon-YYYY" for API calls
export function getFourMonthsAgoDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 4);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
}

export function todayAsApiDate(): string {
  const d = new Date();
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
}
