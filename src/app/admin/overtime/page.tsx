"use client";
import React, { useState, useEffect } from "react";
import { Clock, Check, X, CheckCircle } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";

export default function AdminOvertimePage() {
  const [session, setSession] = useState<any>(null);
  const [overtimes, setOvertimes] = useState<any[]>([]);
  const [feedback, setFeedback] = useState("");

  const loadData = async () => {
    try {
      const [meRes, otRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/overtime"),
      ]);
      if (meRes.ok) setSession((await meRes.json()).user);
      if (otRes.ok) setOvertimes((await otRes.json()).requests || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleAction = async (id: string, action: string) => {
    try {
      const res = await fetch("/api/v1/overtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) {
        setFeedback(`Lembur berhasil di-${action === "APPROVE" ? "setujui" : "tolak"}!`);
        loadData();
        setTimeout(() => setFeedback(""), 3000);
      }
    } catch (e) { console.error(e); }
  };

  const totalHours = overtimes.filter((o: any) => o.status === "APPROVED").reduce((acc: number, curr: any) => acc + curr.hours, 0);

  return (
    <AdminShell user={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Manajemen Lembur (Overtime)</h1>
          <p className="text-xs text-slate-500 mt-0.5">Persetujuan lembur staf, verifikasi jam kerja tambahan, dan kompensasi.</p>
        </div>

        {feedback && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase">Total Jam Disetujui</span>
            <p className="text-3xl font-black text-slate-800 mt-2">{totalHours} Jam</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase">Menunggu Approval</span>
            <p className="text-3xl font-black text-slate-800 mt-2">{overtimes.filter((o: any) => o.status === "PENDING").length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase">Total Pengajuan</span>
            <p className="text-3xl font-black text-slate-800 mt-2">{overtimes.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Karyawan</th>
                <th className="px-6 py-3.5">Tanggal</th>
                <th className="px-6 py-3.5">Waktu</th>
                <th className="px-6 py-3.5">Durasi</th>
                <th className="px-6 py-3.5">Alasan</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {overtimes.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Belum ada pengajuan lembur.</td></tr>
              ) : (
                overtimes.map((ot: any) => (
                  <tr key={ot.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{ot.employee?.firstName} {ot.employee?.lastName}</td>
                    <td className="px-6 py-4">{new Date(ot.date).toLocaleDateString("id-ID")}</td>
                    <td className="px-6 py-4 font-mono">{ot.startTime} - {ot.endTime}</td>
                    <td className="px-6 py-4 font-bold text-primary">{ot.hours} Jam</td>
                    <td className="px-6 py-4">{ot.reason}</td>
                    <td className="px-6 py-4"><Badge variant={ot.status === "APPROVED" ? "success" : ot.status === "PENDING" ? "warning" : "danger"}>{ot.status}</Badge></td>
                    <td className="px-6 py-4 text-right">
                      {ot.status === "PENDING" ? (
                        <div className="flex justify-end space-x-1.5">
                          <button onClick={() => handleAction(ot.id, "APPROVE")} className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center space-x-1"><Check className="w-3.5 h-3.5" /><span>Setujui</span></button>
                          <button onClick={() => handleAction(ot.id, "REJECT")} className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs flex items-center space-x-1"><X className="w-3.5 h-3.5" /><span>Tolak</span></button>
                        </div>
                      ) : <span className="text-slate-400">Selesai</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
