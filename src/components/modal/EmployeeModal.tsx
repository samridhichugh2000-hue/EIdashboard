"use client";

import { Employee, FeedbackEntry, HRIncident, NREntry, PIPStatus, UtilizationEntry } from "@/types/employee";
import { formatDate, getTenureBadgeClass, getStatusChipClass, formatIndianNumber, cleanFeedbackText, getFeedbackQuality } from "@/lib/utils";
import { useEffect, useState } from "react";

interface EmployeeModalProps { employee: Employee; onClose: () => void; }

// "Apr 2026" or "Apr-2026" → year*12+month for chronological comparison
function monthToOrdinal(monthStr: string): number {
  const d = new Date(monthStr.replace("-", " "));
  if (isNaN(d.getTime())) return 0;
  return d.getFullYear() * 12 + d.getMonth();
}

export default function EmployeeModal({ employee, onClose }: EmployeeModalProps) {
  const [incidents, setIncidents] = useState<HRIncident[]>(employee.hrIncidents);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [pipData, setPipData] = useState<PIPStatus | null | undefined>(undefined); // undefined = loading
  const [utilizationData, setUtilizationData] = useState<UtilizationEntry[] | undefined>(undefined); // undefined = loading
  const [nrData, setNrData] = useState<NREntry[] | undefined>(undefined); // undefined = loading

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    const empCode = employee.employeeId.replace(/\D/g, "");
    if (!empCode) { setIncidentsLoading(false); return; }
    fetch(`/api/incidents?empCode=${empCode}`)
      .then((r) => r.json())
      .then((res) => { if (res.success) setIncidents(res.data); })
      .catch(console.error)
      .finally(() => setIncidentsLoading(false));
  }, [employee.employeeId]);

  useEffect(() => {
    const empCode = employee.employeeId.replace(/\D/g, "");
    if (!empCode) { setPipData(null); return; }
    const from = employee.doj; // ISO "YYYY-MM-DD"
    const to = new Date().toISOString().split("T")[0];
    fetch(`/api/pip?empCode=${empCode}&from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((res) => { setPipData(res.success ? res.data : null); })
      .catch(() => setPipData(employee.pipStatus)); // fallback to mock on error
  }, [employee.employeeId, employee.doj, employee.pipStatus]);

  useEffect(() => {
    if (employee.category !== "trainer") return;
    const empCode = employee.employeeId.replace(/\D/g, "");
    if (!empCode) { setUtilizationData([]); return; }
    const dojOrdinal = monthToOrdinal(employee.doj);
    fetch(`/api/utilization?empCode=${empCode}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setUtilizationData(res.data.filter((e: UtilizationEntry) => monthToOrdinal(e.month) >= dojOrdinal));
        } else {
          setUtilizationData(employee.utilization);
        }
      })
      .catch(() => setUtilizationData(employee.utilization));
  }, [employee.employeeId, employee.category, employee.doj, employee.utilization]);

  useEffect(() => {
    if (employee.category !== "sales") return;
    const empCode = employee.employeeId.replace(/\D/g, "");
    if (!empCode) { setNrData([]); return; }
    const dojOrdinal = monthToOrdinal(employee.doj);
    fetch(`/api/nr?empCode=${empCode}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setNrData(res.data.filter((e: NREntry) => monthToOrdinal(e.month) >= dojOrdinal));
        } else {
          setNrData([]);
        }
      })
      .catch(() => setNrData([]));
  }, [employee.employeeId, employee.category, employee.doj]);

  const { feedback, finalStatus } = employee;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto z-10">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#28C5BE] to-[#1E99C0] px-6 py-4 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">{employee.name}</h2>
              <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-white/70">
                <span className="font-mono text-xs bg-white/20 px-2 py-0.5 rounded text-white">{employee.employeeId}</span>
                {employee.department && <span className="bg-white/20 px-2 py-0.5 rounded text-xs text-white">{employee.department}</span>}
                <span>DOJ: {formatDate(employee.doj)}</span>
                <span>Manager: {employee.reportingManager}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
                  {employee.tenureDays} days in org
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/20 ml-4 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Feedback Timeline */}
          <Section title="Feedback Timeline">
            <div className="space-y-3">
              <FeedbackMilestone label="30-Day Review" entry={feedback.d30} tenureDays={employee.tenureDays} minDays={30} />
              <FeedbackMilestone label="60-Day Review" entry={feedback.d60} tenureDays={employee.tenureDays} minDays={60} />
              <FeedbackMilestone label="90-Day Review" entry={feedback.d90} tenureDays={employee.tenureDays} minDays={90} />
            </div>
          </Section>

          {/* NR — Sales only */}
          {employee.category === "sales" && (
            <Section title="NR — Month-wise Numbers">
              {nrData === undefined ? (
                <p className="text-sm text-gray-400 italic">Loading NR data…</p>
              ) : nrData.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No NR data available</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-gray-500 font-medium">Month</th>
                      <th className="text-right py-2 text-gray-500 font-medium">NR Value (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nrData.map((row) => (
                      <tr key={row.month} className="border-b border-gray-50">
                        <td className="py-2 text-gray-700">{row.month}</td>
                        <td className={`py-2 text-right font-mono font-medium ${row.val < 0 ? "text-red-600" : "text-gray-900"}`}>
                          {row.val < 0 ? "-" : ""}₹{formatIndianNumber(Math.abs(row.val))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>
          )}

          {/* Trainer Utilization */}
          {employee.category === "trainer" && (
            <Section title="Trainer Utilization">
              {utilizationData === undefined ? (
                <p className="text-sm text-gray-400 italic">Loading utilization…</p>
              ) : utilizationData.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No utilization data available</p>
              ) : (
                <div className="space-y-2">
                  {utilizationData.map((row) => {
                    const pct = Math.min(100, row.val);
                    const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
                    const textColor = pct >= 70 ? "text-green-700" : pct >= 40 ? "text-amber-700" : "text-red-600";
                    return (
                      <div key={row.month}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{row.month}</span>
                          <span className={`font-semibold ${textColor}`}>{row.val.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          )}

          {/* PA/PIP */}
          <Section title="PA / PIP Status">
            {pipData === undefined ? (
              <div className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg animate-pulse">
                <p className="text-sm text-gray-400 italic">Loading PA/PIP status…</p>
              </div>
            ) : pipData ? (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${pipData.type === "PIP" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                <span className="text-xl">{pipData.type === "PIP" ? "🚨" : "⚠️"}</span>
                <p className={`text-sm font-medium ${pipData.type === "PIP" ? "text-red-700" : "text-amber-700"}`}>
                  {pipData.type} Issued on {pipData.issuedDate} till {pipData.endDate}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-green-600 font-medium text-sm">✓ No Active PA/PIP</span>
              </div>
            )}
          </Section>

          {/* HR Incidents */}
          <Section title="HR Incidents">
            {incidentsLoading ? (
              <p className="text-sm text-gray-400 italic">Loading incidents…</p>
            ) : incidents.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No incident recorded</p>
            ) : (
              <div className="space-y-2">
                {incidents.map((inc, i) => (
                  <div key={i} className={`px-4 py-3 rounded-lg border text-sm ${inc.type === "pos" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                    <span className="font-semibold">{inc.type === "pos" ? "Positive" : "Negative"} Incident</span>
                    {" — "}{inc.comment}
                    {" — "}<span className="text-xs opacity-70">{inc.date}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Final Status */}
          <Section title="Final Status">
            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold ${getStatusChipClass(finalStatus)}`}>
              {finalStatus}
            </span>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  );
}

function FeedbackMilestone({ label, entry, tenureDays, minDays }: {
  label: string; entry: FeedbackEntry | null; tenureDays: number; minDays: number;
}) {
  if (!entry) {
    return (
      <div className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg">
        <p className="text-sm font-medium text-gray-400">
          {label} — {tenureDays < minDays ? "Pending — not yet due" : "No feedback submitted yet"}
        </p>
      </div>
    );
  }
  const quality = getFeedbackQuality(entry);
  const style =
    quality === "below"
      ? { wrap: "bg-red-50 border-red-200",     label: "text-red-800",     badge: "bg-red-100 text-red-700",     icon: "⚠️", tag: "Below Satisfactory" }
      : quality === "above"
      ? { wrap: "bg-emerald-50 border-emerald-200", label: "text-emerald-800", badge: "bg-emerald-100 text-emerald-700", icon: "⭐", tag: "Above Satisfactory" }
      : { wrap: "bg-green-50 border-green-200",   label: "text-green-800",   badge: "bg-green-100 text-green-700",   icon: "✓",  tag: "Satisfactory" };
  return (
    <div className={`px-4 py-3 rounded-lg border ${style.wrap}`}>
      <div className="flex items-center justify-between mb-1.5">
        <p className={`text-sm font-semibold ${style.label}`}>{label}</p>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${style.badge}`}>
          {style.icon} {style.tag}
        </span>
      </div>
      <p className="text-sm text-gray-700 whitespace-pre-line">{cleanFeedbackText(entry.comment)}</p>
      {entry.postedOn && <p className="text-xs text-gray-400 mt-1">Shared: {entry.postedOn}</p>}
    </div>
  );
}
