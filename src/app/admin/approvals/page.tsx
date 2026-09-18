"use client";
import React, { useState, useEffect } from "react";
import { CheckCircle2, Check, X } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";

export default function AdminApprovalsPage() {
  const [session, setSession] = useState<any>(null);
  const [approvals, setApprovals] = useState<any>({ leaves: [], overtimes: [] });
  const [feedback, setFeedback] = useState("");

  const loadApprovals = async () => {
    try {
      const [meRes, apprRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/approvals"),
      ]);
      if (meRes.ok) setSession((await meRes.json()).user);
      if (apprRes.ok) setApprovals(await apprRes.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadApprovals(); }, []);

  const handleAction = async (module: string, id: string, action: string) => {
    try {
      const url = module === "LEAVE" ? `/api/v1/leave/${id}/action` : "/api/v1/overtime";
      const payload = module === "LEAVE" ? { action } : { id, action };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setFeedback(`Permohonan ${module} berhasil di-${action === "APPROVE" ? "setujui" : "tolak"}!`);
        loadApprovals();
        setTimeout(() => setFeedback(""), 3000);
      }
    } catch (e) { console.error(e); }
  };

  const leaves = approvals.leaves || [];
  const overtimes = approvals.overtimes || [];
  const total = leaves.length + overtimes.length;

  return (
    <AdminShell user={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Pusat Persetujuan Terpadu (Unified Approval Center)</h1>
          <p className="text-xs text-slate-500 mt-0.5">Satu kotak masuk untuk seluruh persetujuan cuti, izin, dan lembur (PRD Section 20).</p>
        </div>

        {feedback && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}

        <div className="space-y-3">
          {total === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              <p className="text-sm font-bold text-slate-700">Semua Antrean Beres!</p>
              <p className="text-xs">Tidak ada permohonan yang menunggu persetujuan Anda saat ini.</p>
            </div>
          ) : (
            <>
              {leaves.map((l: any) => (
                <div key={l.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant="primary" className="text-[10px]">PENGAJUAN CUTI</Badge>
                      <span className="text-xs font-bold text-slate-800">{l.leaveType?.name} ({l.durationDays} Hari)</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{l.employee?.firstName} {l.employee?.lastName}</p>
                    <p className="text-xs text-slate-500">Tanggal: {new Date(l.startDate).toLocaleDateString("id-ID")} - {new Date(l.endDate).toLocaleDateString("id-ID")} • Alasan: {l.reason}</p>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button onClick={() => handleAction("LEAVE", l.id, "APPROVE")} className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 shadow-sm"><Check className="w-3.5 h-3.5" /><span>Setujui</span></button>
                    <button onClick={() => handleAction("LEAVE", l.id, "REJECT")} className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-1 shadow-sm"><X className="w-3.5 h-3.5" /><span>Tolak</span></button>
                  </div>
                </div>
              ))}
              {overtimes.map((o: any) => (
                <div key={o.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant="warning" className="text-[10px]">PENGAJUAN LEMBUR</Badge>
                      <span className="text-xs font-bold text-slate-800">{o.hours} Jam Kerja</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{o.employee?.firstName} {o.employee?.lastName}</p>
                    <p className="text-xs text-slate-500">Waktu: {o.startTime} - {o.endTime} • Alasan: {o.reason}</p>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button onClick={() => handleAction("OVERTIME", o.id, "APPROVE")} className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 shadow-sm"><Check className="w-3.5 h-3.5" /><span>Setujui</span></button>
                    <button onClick={() => handleAction("OVERTIME", o.id, "REJECT")} className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-1 shadow-sm"><X className="w-3.5 h-3.5" /><span>Tolak</span></button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
