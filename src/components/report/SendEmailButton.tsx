"use client";

import { useState } from "react";

export default function SendEmailButton() {
  const [open, setOpen]       = useState(false);
  const [emails, setEmails]   = useState("");
  const [status, setStatus]   = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errMsg, setErrMsg]   = useState("");

  async function handleSend() {
    const to = emails.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean);
    if (to.length === 0) return;

    setStatus("sending");
    setErrMsg("");

    try {
      const res = await fetch("/api/report/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Unknown error");
      setStatus("sent");
      setTimeout(() => { setStatus("idle"); setOpen(false); setEmails(""); }, 3000);
    } catch (err) {
      setStatus("error");
      setErrMsg(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#1E99C0] text-[#1E99C0] text-sm font-medium rounded-xl hover:bg-[#e6f7f5] transition-colors shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Send via Email
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 no-print">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800">Send 15-Day Report</h2>
              <button onClick={() => { setOpen(false); setStatus("idle"); }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">Recipient email(s)</label>
            <textarea
              value={emails}
              onChange={e => setEmails(e.target.value)}
              placeholder="Enter email addresses separated by comma or newline"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#28C5BE]/40 focus:border-[#28C5BE] resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">Sent from: {process.env.NEXT_PUBLIC_FROM_LABEL ?? "HR · EI Dashboard"}</p>

            {status === "error" && (
              <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{errMsg}</p>
            )}
            {status === "sent" && (
              <p className="mt-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">Report sent successfully.</p>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSend}
                disabled={status === "sending" || !emails.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#1E99C0] text-white text-sm font-medium rounded-xl hover:bg-[#28C5BE] disabled:opacity-50 transition-colors"
              >
                {status === "sending" ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Sending…
                  </>
                ) : "Send Report"}
              </button>
              <button
                onClick={() => { setOpen(false); setStatus("idle"); }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
