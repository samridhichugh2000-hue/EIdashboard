import { FinalStatus, EmployeeCategory } from "@/types/employee";

export function computeTenureDays(doj: string): number {
  const joinDate = new Date(doj);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  joinDate.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
}

export function getTenureBand(days: number): "early" | "mid" | "complete" {
  if (days <= 59) return "early";
  if (days <= 89) return "mid";
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
  // Accepts ISO or "DD Mon YYYY" — returns "DD Mon YYYY"
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

// Parse "DD Mon YYYY" → Date
export function parseDateOfFb(dateStr: string): Date | null {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    return null;
  } catch {
    return null;
  }
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
