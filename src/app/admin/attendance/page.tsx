"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  Settings,
  Eye,
  Edit3,
  UserCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  PlusCircle,
  Download,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export default function AdminAttendancePage() {
  const [session, setSession] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [policy, setPolicy] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    total: 0,
    present: 0,
    late: 0,
    earlyLeave: 0,
    onTimeRate: 100,
    totalHours: 0,
  });

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [empFilter, setEmpFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Modals state
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);

  // Correction Form state
  const [correctionTarget, setCorrectionTarget] = useState<any>(null);
  const [correctionForm, setCorrectionForm] = useState({
    date: dateFilter,
    employeeId: "",
    requestedCheckIn: "08:00",
    requestedCheckOut: "17:00",
    reason: "",
    adminNotes: "",
  });
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [correctionMsg, setCorrectionMsg] = useState("");
  const [correctionErr, setCorrectionErr] = useState("");

  const loadAttendance = async () => {
    try {
      const [authRes, attRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch(
          `/api/v1/attendance/records?date=${dateFilter}&status=${statusFilter}&departmentId=${deptFilter}&employeeId=${empFilter}`
        ),
      ]);
      if (authRes.ok) {
        const auth = await authRes.json();
        setSession(auth.user);
      }
      if (attRes.ok) {
        const data = await attRes.json();
        setRecords(data.records || []);
        setPolicy(data.policy);
        setDepartments(data.departments || []);
        setEmployees(data.employees || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [dateFilter, statusFilter, deptFilter, empFilter]);

  const handleOpenCorrection = (record?: any) => {
    if (record) {
      setCorrectionTarget(record);
      setCorrectionForm({
        date: record.date ? record.date.split("T")[0] : dateFilter,
        employeeId: record.employeeId,
        requestedCheckIn: record.checkInTime
          ? new Date(record.checkInTime).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            }).replace(".", ":")
          : "08:00",
        requestedCheckOut: record.checkOutTime
          ? new Date(record.checkOutTime).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            }).replace(".", ":")
          : "17:00",
        reason: "Penyesuaian absensi oleh HR Admin",
        adminNotes: "",
      });
    } else {
      setCorrectionTarget(null);
      setCorrectionForm({
        date: dateFilter,
        employeeId: employees[0]?.id || "",
        requestedCheckIn: "08:00",
        requestedCheckOut: "17:00",
        reason: "Pencatatan absensi manual oleh HR Admin",
        adminNotes: "",
      });
    }
    setCorrectionMsg("");
    setCorrectionErr("");
    setIsCorrectionModalOpen(true);
  };

  const handleSubmitCorrection = async () => {
    if (!correctionForm.employeeId || !correctionForm.reason) {
      setCorrectionErr("Pilih karyawan dan isi alasan koreksi.");
      return;
    }

    setIsSubmittingCorrection(true);
    setCorrectionErr("");
    setCorrectionMsg("");

    try {
      const res = await fetch("/api/v1/attendance/correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...correctionForm,
          action: "APPLY_DIRECT",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCorrectionErr(data.error || "Gagal menerapkan koreksi.");
        setIsSubmittingCorrection(false);
        return;
      }

      setCorrectionMsg("Koreksi absensi berhasil diterapkan!");
      setTimeout(() => {
        setIsSubmittingCorrection(false);
        setIsCorrectionModalOpen(false);
        loadAttendance();
      }, 1000);
    } catch (err: any) {
      setCorrectionErr("Terjadi kesalahan: " + err.message);
      setIsSubmittingCorrection(false);
    }
  };

  return (
    <AdminShell user={session}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              Rekap Kehadiran & Absensi Karyawan
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Pemantauan absensi geofence, waktu server, toleransi terlambat, dan verifikasi foto ({session?.companyName}).
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleOpenCorrection()}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Koreksi / Input Manual</span>
            </button>
            <Link
              href="/admin/attendance/policy"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Settings className="w-4 h-4" />
              <span>Kebijakan Absensi</span>
            </Link>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Hadir
            </span>
            <span className="text-2xl font-black text-slate-800 font-mono mt-1 block">
              {summary.total}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Karyawan</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
              Tepat Waktu
            </span>
            <span className="text-2xl font-black text-emerald-700 font-mono mt-1 block">
              {summary.present}
            </span>
            <span className="text-[10px] text-emerald-500 mt-0.5 block">
              {summary.onTimeRate}% on-time
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
              Terlambat
            </span>
            <span className="text-2xl font-black text-amber-700 font-mono mt-1 block">
              {summary.late}
            </span>
            <span className="text-[10px] text-amber-500 mt-0.5 block">
              &gt; {policy?.lateToleranceMinutes || 15} min
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
              Pulang Awal
            </span>
            <span className="text-2xl font-black text-rose-700 font-mono mt-1 block">
              {summary.earlyLeave}
            </span>
            <span className="text-[10px] text-rose-500 mt-0.5 block">Sebelum selesai</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
              Total Jam Kerja
            </span>
            <span className="text-2xl font-black text-blue-700 font-mono mt-1 block">
              {summary.totalHours}j
            </span>
            <span className="text-[10px] text-blue-500 mt-0.5 block">Bersih minus break</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-teal-100 shadow-sm">
            <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider block">
              Tingkat Disiplin
            </span>
            <span className="text-2xl font-black text-teal-700 font-mono mt-1 block">
              {summary.onTimeRate}%
            </span>
            <span className="text-[10px] text-teal-500 mt-0.5 block">Sesuai kebijakan</span>
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
              <span>Toleransi Terlambat: <strong className="text-white">{policy.lateToleranceMinutes}m</strong></span>
              <span>Geofence: <strong className="text-white">{policy.geofenceRadiusMeters}m</strong></span>
              <span>Selfie: <strong className="text-teal-300">{policy.isSelfieRequired ? "WAJIB" : "OPSIONAL"}</strong></span>
              <span>Koreksi: <strong className="text-white">{policy.isCorrectionAllowed ? `Maks ${policy.maxCorrectionDays} hari` : "NONAKTIF"}</strong></span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Tanggal:
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Departemen:
              </label>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-600"
              >
                <option value="ALL">Semua Departemen</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Karyawan:
              </label>
              <select
                value={empFilter}
                onChange={(e) => setEmpFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-600"
              >
                <option value="">Semua Karyawan</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.employeeIdNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Status Kehadiran:
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-600"
              >
                <option value="ALL">Semua Status</option>
                <option value="PRESENT">Tepat Waktu (PRESENT)</option>
                <option value="LATE">Terlambat (LATE)</option>
                <option value="EARLY_LEAVE">Pulang Awal (EARLY_LEAVE)</option>
                <option value="ABSENT">Tidak Hadir (ABSENT)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table of Records */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Karyawan</th>
                  <th className="px-5 py-3.5">Jam Masuk (In)</th>
                  <th className="px-5 py-3.5">Jam Pulang (Out)</th>
                  <th className="px-5 py-3.5">Durasi Kerja</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Geofence GPS</th>
                  <th className="px-5 py-3.5">Catatan / Shift</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {records.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-8 text-center text-slate-400"
                    >
                      Belum ada data absensi yang sesuai filter untuk tanggal{" "}
                      {dateFilter}.
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">
                          {rec.employee?.firstName} {rec.employee?.lastName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          NIK: {rec.employee?.employeeIdNumber} •{" "}
                          {rec.employee?.department?.name || "Umum"}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-800">
                        {rec.checkInTime
                          ? new Date(rec.checkInTime).toLocaleTimeString(
                              "id-ID",
                              { hour: "2-digit", minute: "2-digit" }
                            )
                          : "-"}
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-800">
                        {rec.checkOutTime
                          ? new Date(rec.checkOutTime).toLocaleTimeString(
                              "id-ID",
                              { hour: "2-digit", minute: "2-digit" }
                            )
                          : "-"}
                      </td>
                      <td className="px-5 py-4">
                        {rec.workDurationMinutes ? (
                          <span className="font-semibold text-slate-700">
                            {Math.floor(rec.workDurationMinutes / 60)}j{" "}
                            {rec.workDurationMinutes % 60}m
                          </span>
                        ) : (
                          <span className="text-slate-400">Sedang Berjalan</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          variant={
                            rec.status === "PRESENT"
                              ? "success"
                              : rec.status === "LATE"
                              ? "warning"
                              : rec.status === "EARLY_LEAVE"
                              ? "neutral"
                              : "danger"
                          }
                        >
                          {rec.status === "PRESENT"
                            ? "Tepat Waktu"
                            : rec.status === "LATE"
                            ? "Terlambat"
                            : rec.status === "EARLY_LEAVE"
                            ? "Pulang Awal"
                            : "Tidak Hadir"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-1 font-mono text-[11px] text-slate-600">
                          <MapPin className="w-3 h-3 text-teal-600" />
                          <span>
                            {rec.checkInDistanceMeters !== null
                              ? `${rec.checkInDistanceMeters}m`
                              : "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 max-w-[200px] truncate text-[11px] text-slate-500">
                        {rec.notes || "-"}
                      </td>
                      <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedRecord(rec);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="Lihat Detail & Selfie"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenCorrection(rec)}
                          className="p-1.5 rounded-lg border border-teal-200 text-teal-600 hover:text-teal-800 hover:bg-teal-50 transition-colors"
                          title="Koreksi Absensi"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Modal */}
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title="Detail Absensi & Bukti Verifikasi"
        >
          {selectedRecord && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {selectedRecord.employee?.firstName}{" "}
                    {selectedRecord.employee?.lastName}
                  </h4>
                  <p className="text-slate-400 font-mono text-[11px]">
                    NIK: {selectedRecord.employee?.employeeIdNumber} •{" "}
                    {selectedRecord.employee?.department?.name || "Umum"}
                  </p>
                </div>
                <Badge
                  variant={
                    selectedRecord.status === "PRESENT"
                      ? "success"
                      : selectedRecord.status === "LATE"
                      ? "warning"
                      : "neutral"
                  }
                >
                  {selectedRecord.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Check In Card */}
                <div className="p-3 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center space-x-1 text-teal-700 font-bold uppercase tracking-wider text-[10px]">
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>Check In</span>
                  </div>
                  <p className="text-lg font-black font-mono text-slate-800">
                    {selectedRecord.checkInTime
                      ? new Date(
                          selectedRecord.checkInTime
                        ).toLocaleTimeString("id-ID")
                      : "-"}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Jarak: {selectedRecord.checkInDistanceMeters ?? "-"}m
                  </p>
                  <p className="text-slate-500 text-[11px] truncate">
                    Lokasi: {selectedRecord.checkInAddress || "Kantor"}
                  </p>
                  {selectedRecord.checkInPhotoUrl && (
                    <div className="mt-2">
                      <p className="text-[10px] font-bold text-slate-400 mb-1">
                        Foto Selfie:
                      </p>
                      <img
                        src={selectedRecord.checkInPhotoUrl}
                        alt="Check In Selfie"
                        className="w-full h-36 object-cover rounded-lg border border-slate-200"
                        onError={(e: any) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Check Out Card */}
                <div className="p-3 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center space-x-1 text-rose-700 font-bold uppercase tracking-wider text-[10px]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Check Out</span>
                  </div>
                  <p className="text-lg font-black font-mono text-slate-800">
                    {selectedRecord.checkOutTime
                      ? new Date(
                          selectedRecord.checkOutTime
                        ).toLocaleTimeString("id-ID")
                      : "Belum Keluar"}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Durasi:{" "}
                    {selectedRecord.workDurationMinutes
                      ? `${Math.floor(
                          selectedRecord.workDurationMinutes / 60
                        )}j ${selectedRecord.workDurationMinutes % 60}m`
                      : "-"}
                  </p>
                  <p className="text-slate-500 text-[11px] truncate">
                    Lokasi: {selectedRecord.checkOutAddress || "Kantor"}
                  </p>
                  {selectedRecord.checkOutPhotoUrl && (
                    <div className="mt-2">
                      <p className="text-[10px] font-bold text-slate-400 mb-1">
                        Foto Keluar:
                      </p>
                      <img
                        src={selectedRecord.checkOutPhotoUrl}
                        alt="Check Out Photo"
                        className="w-full h-36 object-cover rounded-lg border border-slate-200"
                        onError={(e: any) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {selectedRecord.notes && (
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-600">
                  <span className="font-bold block text-[10px] text-slate-400 uppercase">
                    Catatan / Log:
                  </span>
                  <span>{selectedRecord.notes}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailModalOpen(false)}
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Correction Modal */}
        <Modal
          isOpen={isCorrectionModalOpen}
          onClose={() => setIsCorrectionModalOpen(false)}
          title="Koreksi / Input Manual Absensi"
        >
          <div className="space-y-4 text-xs">
            {correctionErr && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                {correctionErr}
              </div>
            )}
            {correctionMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                {correctionMsg}
              </div>
            )}

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Karyawan:
              </label>
              <select
                value={correctionForm.employeeId}
                onChange={(e) =>
                  setCorrectionForm({
                    ...correctionForm,
                    employeeId: e.target.value,
                  })
                }
                disabled={Boolean(correctionTarget)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800"
              >
                <option value="">-- Pilih Karyawan --</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.employeeIdNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Tanggal Absensi:
              </label>
              <input
                type="date"
                value={correctionForm.date}
                onChange={(e) =>
                  setCorrectionForm({ ...correctionForm, date: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Jam Masuk (In):
                </label>
                <input
                  type="time"
                  value={correctionForm.requestedCheckIn}
                  onChange={(e) =>
                    setCorrectionForm({
                      ...correctionForm,
                      requestedCheckIn: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Jam Keluar (Out):
                </label>
                <input
                  type="time"
                  value={correctionForm.requestedCheckOut}
                  onChange={(e) =>
                    setCorrectionForm({
                      ...correctionForm,
                      requestedCheckOut: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Alasan Koreksi / Catatan:
              </label>
              <textarea
                value={correctionForm.reason}
                onChange={(e) =>
                  setCorrectionForm({
                    ...correctionForm,
                    reason: e.target.value,
                  })
                }
                rows={2}
                placeholder="Contoh: Lupa check-in karena langsung meeting klien di luar kantor."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 placeholder-slate-400"
              />
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsCorrectionModalOpen(false)}
                disabled={isSubmittingCorrection}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitCorrection}
                isLoading={isSubmittingCorrection}
              >
                Terapkan Koreksi
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminShell>
  );
}