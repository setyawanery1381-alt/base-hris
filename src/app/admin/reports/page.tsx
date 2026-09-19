"use client";
import React, { useState, useEffect } from "react";
import { Download, Printer, Search, MapPin, Clock, Calendar } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminReportsPage() {
  const [session, setSession] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const [meRes, repRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/reports"),
      ]);
      if (meRes.ok) setSession((await meRes.json()).user);
      if (repRes.ok) setReport(await repRes.json());
    }
    load();
  }, []);

  const summary = report?.summary || {};
  const records = report?.records || [];

  const filteredRecords = records.filter((r: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.toLowerCase();
    const nik = (r.employee?.employeeIdNumber || "").toLowerCase();
    const status = (r.status || "").toLowerCase();
    return name.includes(q) || nik.includes(q) || status.includes(q);
  });

  const handleExportCSV = () => {
    const headers = [
      "No",
      "NIK",
      "Nama Karyawan",
      "Departemen",
      "Jabatan",
      "Tanggal",
      "Waktu Check-In",
      "Waktu Check-Out",
      "Durasi Kerja",
      "Status",
      "Tipe Kerja",
      "Jarak Check-In",
    ];

    const rows = records.map((r: any, index: number) => {
      const empName = `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.trim() || "-";
      const nik = r.employee?.employeeIdNumber || "-";
      const dept = r.employee?.department?.name || "-";
      const pos = r.employee?.position?.name || "-";

      // Tanggal
      const dateObj = r.date ? new Date(r.date) : null;
      const formattedDate = dateObj
        ? dateObj.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })
        : "-";

      // Waktu Check-In
      const checkInObj = r.checkInTime ? new Date(r.checkInTime) : null;
      const checkInStr = checkInObj
        ? checkInObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WIB"
        : "-";

      // Waktu Check-Out
      const checkOutObj = r.checkOutTime ? new Date(r.checkOutTime) : null;
      const checkOutStr = checkOutObj
        ? checkOutObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WIB"
        : "-";

      // Durasi Kerja
      const durationMins = r.workDurationMinutes || 0;
      const durationStr = durationMins > 0
        ? `${Math.floor(durationMins / 60)} Jam ${durationMins % 60} Menit`
        : "-";

      // Status
      const statusStr =
        r.status === "PRESENT"
          ? "Tepat Waktu"
          : r.status === "LATE"
          ? "Terlambat"
          : r.status === "EARLY_LEAVE"
          ? "Pulang Cepat"
          : "Tidak Hadir";

      const workType = r.workType || "WFO";
      const distance = r.checkInDistanceMeters !== null && r.checkInDistanceMeters !== undefined
        ? `${Math.round(r.checkInDistanceMeters)}m`
        : "-";

      return [
        index + 1,
        `"${nik}"`,
        `"${empName.replace(/"/g, '""')}"`,
        `"${dept.replace(/"/g, '""')}"`,
        `"${pos.replace(/"/g, '""')}"`,
        `"${formattedDate}"`,
        `"${checkInStr}"`,
        `"${checkOutStr}"`,
        `"${durationStr}"`,
        `"${statusStr}"`,
        `"${workType}"`,
        `"${distance}"`,
      ].join(",");
    });

    // Add UTF-8 BOM so Excel/WPS opens properly without garbled characters
    const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `laporan-kehadiran-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <AdminShell user={session}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Laporan & Rekapitulasi Kepegawaian</h1>
            <p className="text-xs text-slate-500 mt-0.5">Analitik performa kehadiran, rekap cuti, dan ekspor data audit.</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleExportCSV} variant="outline" size="sm" className="flex items-center space-x-1.5">
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </Button>
            <Button onClick={() => window.print()} size="sm" className="flex items-center space-x-1.5">
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Rekap</span>
            </Button>
          </div>
        </div>

        {/* Metric Cards */}
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

        {/* Attendance Records Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Riwayat Presensi Karyawan</h3>
              <p className="text-xs text-slate-500">Data waktu check-in, check-out, durasi, dan verifikasi geofence</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama / NIK / status..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Karyawan</th>
                  <th className="px-5 py-3.5">Tanggal</th>
                  <th className="px-5 py-3.5">Waktu Masuk</th>
                  <th className="px-5 py-3.5">Waktu Keluar</th>
                  <th className="px-5 py-3.5">Durasi</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Jarak & Tipe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                      Belum ada data presensi yang sesuai.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r: any) => {
                    const empName = `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.trim();
                    const checkInStr = r.checkInTime
                      ? new Date(r.checkInTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                      : "-";
                    const checkOutStr = r.checkOutTime
                      ? new Date(r.checkOutTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                      : "-";
                    const durationMins = r.workDurationMinutes || 0;
                    const durationStr = durationMins > 0
                      ? `${Math.floor(durationMins / 60)}j ${durationMins % 60}m`
                      : "-";

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900">{empName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            NIK: {r.employee?.employeeIdNumber || "-"} • {r.employee?.department?.name || "Tech"}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-600">
                          {r.date ? new Date(r.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                        </td>
                        <td className="px-5 py-3.5 font-mono font-bold text-teal-700">
                          {checkInStr}
                        </td>
                        <td className="px-5 py-3.5 font-mono font-bold text-rose-700">
                          {checkOutStr}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-700">
                          {durationStr}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={r.status === "PRESENT" ? "success" : r.status === "LATE" ? "warning" : "neutral"}>
                            {r.status === "PRESENT" ? "Tepat Waktu" : r.status === "LATE" ? "Terlambat" : r.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center space-x-1 text-[11px] text-slate-600">
                            <MapPin className="w-3 h-3 text-teal-600" />
                            <span>{r.checkInDistanceMeters !== null ? `${Math.round(r.checkInDistanceMeters)}m` : "-"}</span>
                            <span className="font-bold text-slate-500">({r.workType || "WFO"})</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
