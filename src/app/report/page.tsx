export const dynamic = "force-dynamic";

import { getEmployees } from "@/lib/data";
import { fetchIncidentData, RawIncidentRecord } from "@/lib/rms-auth";
import { Employee, FeedbackEntry, NREntry, PIPStatus, UtilizationEntry } from "@/types/employee";
import { formatDate, getFeedbackQuality } from "@/lib/utils";
import PrintButton from "@/components/report/PrintButton";
import SendEmailButton from "@/components/report/SendEmailButton";

// ── helpers ────────────────────────────────────────────────────────────────

function formatNR(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000)   return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return `${sign}₹${abs}`;
}

function formatIncDate(dateStr: string): string {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── cell components ────────────────────────────────────────────────────────

function PIPCell({ pip }: { pip: PIPStatus | null }) {
  if (!pip) return <span className="text-gray-400 text-[10px]">None</span>;
  const isP = pip.type === "PIP";
  return (
    <div className="flex flex-col gap-0.5 min-w-[110px]">
      <span className={`self-start px-1.5 py-0.5 rounded text-[10px] font-semibold ${isP ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
        {pip.type}
      </span>
      {pip.issuedDate && <span className="text-[9px] text-gray-500">From: {pip.issuedDate}</span>}
      {pip.endDate    && <span className="text-[9px] text-gray-500">To: {pip.endDate}</span>}
    </div>
  );
}

function IncidentCell({ incidents }: { incidents: RawIncidentRecord[] }) {
  if (!incidents.length) return <span className="text-gray-300 text-[10px]">—</span>;
  return (
    <div className="flex flex-col gap-1.5 min-w-[160px]">
      {incidents.map((inc, i) => {
        const pos = inc.IncidentType === "Positive Incident";
        return (
          <div key={i} className="flex flex-col gap-0">
            <span className="text-[9px] text-gray-400">{formatIncDate(inc.IncidentDate)}</span>
            <span className={`text-[10px] leading-snug font-medium ${pos ? "text-green-700" : "text-red-600"}`}>
              {pos ? "+" : "−"} {inc.Reason}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FBCell({ entry, tenureDays, threshold }: { entry: FeedbackEntry | null; tenureDays: number; threshold: number }) {
  if (!entry) {
    if (tenureDays >= threshold) return <span className="text-red-500 font-medium text-[10px]">Pending</span>;
    return <span className="text-gray-300 text-[10px]">—</span>;
  }
  const quality = getFeedbackQuality(entry);
  const bg    = quality === "below" ? "bg-red-50"     : quality === "above" ? "bg-emerald-50"  : "bg-green-50";
  const color = quality === "below" ? "text-red-600"  : quality === "above" ? "text-emerald-700" : "text-green-700";
  const label = quality === "below" ? "Below Satisfactory" : quality === "above" ? "Above Satisfactory" : "Satisfactory";
  return (
    <div className={`flex flex-col gap-0.5 min-w-[160px] rounded px-1.5 py-1 ${bg}`}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[9px] text-gray-400">{entry.postedOn}</span>
        <span className={`text-[9px] font-semibold ${color}`}>{label}</span>
      </div>
      <span className="text-[10px] text-gray-700 leading-snug whitespace-pre-wrap">{entry.comment || "—"}</span>
    </div>
  );
}

function NRCol({ entry }: { entry: NREntry | undefined }) {
  if (!entry) return <span className="text-gray-300">—</span>;
  return (
    <span className={entry.val < 0 ? "text-red-600" : "text-gray-800"}>
      {entry.month}<br />{formatNR(entry.val)}
    </span>
  );
}

function UtilCol({ entry }: { entry: UtilizationEntry | undefined }) {
  if (!entry) return <span className="text-gray-300">—</span>;
  const color = entry.val >= 70 ? "text-green-700" : entry.val >= 40 ? "text-amber-600" : "text-red-600";
  return <span className={color}>{entry.month}<br />{entry.val.toFixed(1)}%</span>;
}

function CountCell({ count, tone }: { count: number; tone: "amber" | "red" }) {
  if (!count) return <span className="text-gray-300">—</span>;
  const cls = tone === "red" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
  return <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{count}</span>;
}

// ── shared table primitives ────────────────────────────────────────────────

const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
  <th className={`px-2 py-2 font-semibold text-[10px] uppercase tracking-wide whitespace-nowrap ${right ? "text-right" : "text-left"}`}>
    {children}
  </th>
);

const TD = ({ children, center, right }: { children: React.ReactNode; center?: boolean; right?: boolean }) => (
  <td className={`px-2 py-2 text-[11px] align-top ${center ? "text-center" : right ? "text-right" : ""} text-gray-700`}>
    {children}
  </td>
);

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "PA Issued"  ? "bg-amber-100 text-amber-700" :
    status === "PIP Issued" ? "bg-red-100 text-red-700"     :
    status === "Confirmed"  ? "bg-green-100 text-green-700"  :
    "bg-blue-100 text-blue-700";
  const label = status === "Confirmed" ? "Closed" : status;
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>{label}</span>;
}

// ── shared row renderer ────────────────────────────────────────────────────

function empPriority(emp: Employee): 0 | 1 | 2 | 3 {
  if (emp.finalStatus === "Confirmed") return 3;
  const hasBelow = [emp.feedback.d30, emp.feedback.d60, emp.feedback.d90]
    .filter(Boolean).some(e => getFeedbackQuality(e!) === "below");
  if (hasBelow) return 0;
  if (emp.pipStatus !== null) return 1;
  return 2;
}

function sortByPriority(list: Employee[]): Employee[] {
  return [...list].sort((a, b) => empPriority(a) - empPriority(b));
}

function EmpRow({ emp, incidents, i, extraCells }: {
  emp: Employee; incidents: RawIncidentRecord[]; i: number; extraCells: React.ReactNode;
}) {
  const p = empPriority(emp);
  const bg = p === 0 ? "bg-red-50"
           : p === 1 ? (i % 2 === 0 ? "bg-amber-50" : "bg-amber-50/70")
           : p === 3 ? (i % 2 === 0 ? "bg-gray-100" : "bg-gray-100/70")
           : (i % 2 === 0 ? "bg-white" : "bg-slate-50");
  return (
    <tr className={bg}>
      <TD><span className="font-mono text-[10px]">{emp.employeeId}</span></TD>
      <TD><span className="font-semibold">{emp.name}</span></TD>
      <TD>{emp.department}</TD>
      <TD>{emp.reportingManager}</TD>
      <TD>{formatDate(emp.doj)}</TD>
      <TD center>{emp.tenureDays}d</TD>
      <TD><PIPCell pip={emp.pipStatus} /></TD>
      <TD><IncidentCell incidents={incidents} /></TD>
      <TD><FBCell entry={emp.feedback.d30} tenureDays={emp.tenureDays} threshold={30} /></TD>
      <TD><FBCell entry={emp.feedback.d60} tenureDays={emp.tenureDays} threshold={60} /></TD>
      <TD><FBCell entry={emp.feedback.d90} tenureDays={emp.tenureDays} threshold={90} /></TD>
      {extraCells}
      <TD><StatusBadge status={emp.finalStatus} /></TD>
      <TD>{emp.hrRemarks || <span className="text-gray-300">—</span>}</TD>
      <TD center>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${emp.finalStatus === "Confirmed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {emp.finalStatus === "Confirmed" ? "Yes" : "No"}
        </span>
      </TD>
    </tr>
  );
}

const COMMON_HEADERS = (
  <>
    <TH>Emp ID</TH>
    <TH>Name</TH>
    <TH>Department</TH>
    <TH>Manager</TH>
    <TH>DOJ</TH>
    <TH>Tenure</TH>
    <TH>PA / PIP</TH>
    <TH>HR Incidents</TH>
    <TH>30d Feedback</TH>
    <TH>60d Feedback</TH>
    <TH>90d Feedback</TH>
  </>
);

function SalesTable({ employees, incidentMap }: { employees: Employee[]; incidentMap: Map<string, RawIncidentRecord[]> }) {
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-[#1E99C0] text-white text-left">
          {COMMON_HEADERS}
          <TH right>NR M1</TH><TH right>NR M2</TH><TH right>NR M3</TH>
          <TH>Audit</TH>
          <TH>Final Status</TH><TH>HR Remarks</TH><TH>Closed</TH>
        </tr>
      </thead>
      <tbody>
        {employees.map((emp, i) => (
          <EmpRow key={emp.employeeId} emp={emp} incidents={incidentMap.get(emp.employeeId) ?? []} i={i}
            extraCells={<><TD right><NRCol entry={emp.nrData[0]} /></TD><TD right><NRCol entry={emp.nrData[1]} /></TD><TD right><NRCol entry={emp.nrData[2]} /></TD><TD center><CountCell count={emp.auditCount} tone="amber" /></TD></>}
          />
        ))}
      </tbody>
    </table>
  );
}

function TrainerTable({ employees, incidentMap }: { employees: Employee[]; incidentMap: Map<string, RawIncidentRecord[]> }) {
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-[#1E99C0] text-white text-left">
          {COMMON_HEADERS}
          <TH right>Util M1</TH><TH right>Util M2</TH><TH right>Util M3</TH>
          <TH>Neg. FB</TH>
          <TH>Final Status</TH><TH>HR Remarks</TH><TH>Closed</TH>
        </tr>
      </thead>
      <tbody>
        {employees.map((emp, i) => (
          <EmpRow key={emp.employeeId} emp={emp} incidents={incidentMap.get(emp.employeeId) ?? []} i={i}
            extraCells={<><TD right><UtilCol entry={emp.utilization[0]} /></TD><TD right><UtilCol entry={emp.utilization[1]} /></TD><TD right><UtilCol entry={emp.utilization[2]} /></TD><TD center><CountCell count={emp.negFeedbackCount} tone="red" /></TD></>}
          />
        ))}
      </tbody>
    </table>
  );
}

function PTTable({ employees, incidentMap }: { employees: Employee[]; incidentMap: Map<string, RawIncidentRecord[]> }) {
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-[#1E99C0] text-white text-left">
          {COMMON_HEADERS}
          <TH>Final Status</TH><TH>HR Remarks</TH><TH>Closed</TH>
        </tr>
      </thead>
      <tbody>
        {employees.map((emp, i) => (
          <EmpRow key={emp.employeeId} emp={emp} incidents={incidentMap.get(emp.employeeId) ?? []} i={i}
            extraCells={null}
          />
        ))}
      </tbody>
    </table>
  );
}

// ── page ──────────────────────────────────────────────────────────────────

export default async function ReportPage() {
  const allEmployees = await getEmployees().catch(() => [] as Employee[]);
  const reportPool = allEmployees.filter(e => e.tenureDays >= 30 && !e.resigned);

  const incidentResults = await Promise.allSettled(
    reportPool.map(e => fetchIncidentData(parseInt(e.employeeId.replace(/\D/g, ""), 10)).catch(() => [] as RawIncidentRecord[]))
  );
  const incidentMap = new Map<string, RawIncidentRecord[]>();
  reportPool.forEach((e, i) => {
    const r = incidentResults[i];
    incidentMap.set(e.employeeId, r.status === "fulfilled" ? r.value : []);
  });

  const sales   = sortByPriority(reportPool.filter(e => e.category === "sales"));
  const trainer = sortByPriority(reportPool.filter(e => e.category === "trainer"));
  const pt      = sortByPriority(reportPool.filter(e => e.category === "pt"));
  const today   = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="bg-white min-h-screen p-8 text-gray-800">

      {/* Toolbar — hidden in print */}
      <div className="no-print mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1E99C0]">15-Day Performance Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">All employees · Generated {today}</p>
        </div>
        <div className="flex items-center gap-3">
          <SendEmailButton />
          <PrintButton />
        </div>
      </div>

      {/* Report header */}
      <div className="mb-5 pb-4 border-b-2 border-[#28C5BE]">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-semibold text-[#28C5BE] uppercase tracking-widest mb-0.5">Koenig Solutions · Extended Interview</p>
            <h2 className="text-2xl font-bold text-gray-800">15-Day Performance Report</h2>
          </div>
          <p className="text-xs text-gray-500">Generated: {today}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        {[
          { label: "Total",        value: reportPool.length, color: "bg-[#EEF2FF] text-[#1B2559]" },
          { label: "Sales",        value: sales.length,   color: "bg-blue-50 text-blue-700"        },
          { label: "Trainer",      value: trainer.length, color: "bg-purple-50 text-purple-700"    },
          { label: "PT Team",      value: pt.length,      color: "bg-amber-50 text-amber-700"      },
        ].map(s => (
          <div key={s.label} className={`rounded-xl px-4 py-3 ${s.color}`}>
            <p className="text-xs font-medium opacity-70">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {sales.length > 0 && (
        <section className="mb-8">
          <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            Sales Team <span className="text-xs font-normal bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{sales.length} employees</span>
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
            <SalesTable employees={sales} incidentMap={incidentMap} />
          </div>
        </section>
      )}

      {trainer.length > 0 && (
        <section className="mb-8 print:break-before-page">
          <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            Trainer Team <span className="text-xs font-normal bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{trainer.length} employees</span>
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
            <TrainerTable employees={trainer} incidentMap={incidentMap} />
          </div>
        </section>
      )}

      {pt.length > 0 && (
        <section className="mb-8 print:break-before-page">
          <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            PT Team <span className="text-xs font-normal bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{pt.length} employees</span>
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
            <PTTable employees={pt} incidentMap={incidentMap} />
          </div>
        </section>
      )}

      {reportPool.length === 0 && (
        <div className="text-center py-20 text-gray-400">No employees found.</div>
      )}
    </div>
  );
}
