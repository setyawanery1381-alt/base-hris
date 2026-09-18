"use client";
import React, { useState, useEffect } from "react";
import { Download, Printer } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";

export default function AdminReportsPage() {
  const [session, setSession] = useState<any>(null);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const [meRes, repRes] = await Promise.all([fetch("/api/v1/auth/me"), fetch("/api/v1/reports")]);
      if (meRes.ok) setSession((await meRes.json()).user);
      if (repRes.ok) setReport(await repRes.json());
    }
    load();
  }, []);

  const summary = report?.summary || {};

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8,ID,Employee,Date,Status,Duration(Min)\n" +
      (report?.records || []).map((r: any) => `${r.id},${r.employee?.firstName} ${r.employee?.lastName},${r.date},${r.status},${r.workDurationMinutes || 0}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan-kehadiran-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminShell user={session}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Laporan & Rekapitulasi Kepegawaian</h1>
            <p className="text-xs text-slate-500 mt-0.5">Analitik performa kehadiran, rekap cuti, dan ekspor data audit.</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleExportCSV} variant="outline" size="sm" className="flex items-center space-x-1.5"><Download className="w-3.5 h-3.5" /><span>Ekspor CSV</span></Button>
            <Button onClick={() => window.print()} size="sm" className="flex items-center space-x-1.5"><Printer className="w-3.5 h-3.5" /><span>Cetak Rekap</span></Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase">Tingkat Kehadiran</span>
            <p className="text-3xl font-black text-slate-800 mt-2">{summary.attendanceRate || 100}%</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">Tepat Waktu</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase">Total Keterlambatan</span>
            <p className="text-3xl font-black text-slate-800 mt-2">{summary.lateCount || 0}</p>
            <p className="text-[11px] text-amber-600 font-semibold mt-1">Melebihi Toleransi</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase">Cuti Terealisasi</span>
            <p className="text-3xl font-black text-slate-800 mt-2">{summary.totalLeavesApproved || 0}</p>
            <p className="text-[11px] text-blue-600 font-semibold mt-1">Pengajuan Disetujui</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase">Total Jam Lembur</span>
            <p className="text-3xl font-black text-slate-800 mt-2">{summary.totalOvertimeHours || 0}j</p>
            <p className="text-[11px] text-primary font-semibold mt-1">Bulan Berjalan</p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
