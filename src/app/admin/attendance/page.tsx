"use client";
import React, { useState, useEffect } from "react";
import {
  CalendarCheck,
  Search,
  Filter,
  MapPin,
  Camera,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Building,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";

export default function AdminAttendancePage() {
  const [session, setSession] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [policy, setPolicy] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);

  const loadAttendance = async () => {
    try {
      const [authRes, attRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch(`/api/v1/attendance/records?date=${dateFilter}&status=${statusFilter}`),
      ]);
      if (authRes.ok) {
        const auth = await authRes.json();
        setSession(auth.user);
      }
      if (attRes.ok) {
        const data = await attRes.json();
        setRecords(data.records || []);
        setPolicy(data.policy);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [dateFilter, statusFilter]);

  return (
    <AdminShell user={session}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              Rekap Kehadiran & Absensi Harian
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Pemantauan absensi geofence, waktu server, toleransi terlambat, dan verifikasi foto ({session?.companyName}).
            </p>
          </div>
        </div>

        {/* Policy Highlights Banner */}
        {policy && (
          <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-md flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <span className="font-bold">Kebijakan Aktif: {policy.name}</span>
            </div>
            <div className="flex items-center space-x-4 text-slate-300">
              <span>Jam Kerja: <strong className="text-white">{policy.workStartTime} - {policy.workEndTime}</strong></span>
              <span>Toleransi: <strong className="text-white">{policy.lateToleranceMinutes}m</strong></span>
              <span>Geofence: <strong className="text-white">{policy.geofenceRadiusMeters}m</strong></span>
              <span>Selfie: <strong className="text-teal-300">{policy.isSelfieRequired ? "WAJIB" : "OPSIONAL"}</strong></span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-700">Pilih Tanggal:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto">
            {["ALL", "PRESENT", "LATE", "ABSENT"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  statusFilter === st
                    ? "bg-primary text-white border-primary"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {st === "ALL" ? "Semua Status" : st}
              </button>
            ))}
          </div>
        </div>

        {/* Table of Records */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Karyawan</th>
                  <th className="px-6 py-3.5">Jam Masuk (In)</th>
                  <th className="px-6 py-3.5">Jam Pulang (Out)</th>
                  <th className="px-6 py-3.5">Durasi Kerja</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Geofence GPS</th>
                  <th className="px-6 py-3.5">Tipe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                      Belum ada data absensi yang tercatat untuk tanggal {dateFilter}.
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">
                          {rec.employee?.firstName} {rec.employee?.lastName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          NIK: {rec.employee?.employeeIdNumber} • {rec.employee?.department?.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-800">
                        {rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-800">
                        {rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}
                      </td>
                      <td className="px-6 py-4">
                        {rec.workDurationMinutes ? (
                          <span className="font-semibold text-slate-700">
                            {Math.floor(rec.workDurationMinutes / 60)}j {rec.workDurationMinutes % 60}m
                          </span>
                        ) : (
                          <span className="text-slate-400">Sedang Berjalan</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={rec.status === "PRESENT" ? "success" : rec.status === "LATE" ? "warning" : "danger"}>
                          {rec.status === "PRESENT" ? "Tepat Waktu" : rec.status === "LATE" ? "Terlambat" : "Tidak Hadir"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1 font-mono text-[11px] text-slate-600">
                          <MapPin className="w-3 h-3 text-teal-600" />
                          <span>{rec.checkInDistanceMeters !== null ? `${rec.checkInDistanceMeters}m (Valid)` : "-"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-700">{rec.workType || "WFO"}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}