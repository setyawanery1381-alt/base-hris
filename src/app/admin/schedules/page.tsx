"use client";
import React, { useState, useEffect } from "react";
import {
  Clock,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Users,
  CheckCircle2,
  AlertCircle,
  Moon,
  Sun,
  Coffee,
  Filter,
  Layers,
  Sparkles,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

const PRESET_COLORS = [
  "#0d9488", // Teal
  "#3b82f6", // Blue
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#10b981", // Emerald
  "#64748b", // Slate
];

export default function SchedulesPage() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"SHIFTS" | "ROSTER">("SHIFTS");

  // Shifts state
  const [shifts, setShifts] = useState<any[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(true);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any | null>(null);
  const [shiftForm, setShiftForm] = useState({
    name: "",
    code: "",
    startTime: "08:00",
    endTime: "16:00",
    breakDurationMinutes: 60,
    isOvernight: false,
    color: "#0d9488",
  });

  // Roster state
  const [employees, setEmployees] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    employeeIds: [] as string[],
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    shiftId: "",
    isOffDay: false,
    notes: "",
  });

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load Session & Shifts
  const loadShifts = async () => {
    try {
      setShiftsLoading(true);
      const [authRes, shiftsRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/schedules/shifts"),
      ]);
      if (authRes.ok) {
        const authData = await authRes.json();
        setSession(authData.user);
      }
      if (shiftsRes.ok) {
        const data = await shiftsRes.json();
        setShifts(data.shifts || []);
      }
    } catch (e) {
      console.error(e);
      setToast({ type: "error", message: "Gagal memuat data shift." });
    } finally {
      setShiftsLoading(false);
    }
  };

  // Load Roster
  const loadRoster = async () => {
    try {
      setRosterLoading(true);
      const res = await fetch(`/api/v1/schedules/roster?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
        setSchedules(data.schedules || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRosterLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  useEffect(() => {
    if (activeTab === "ROSTER") {
      loadRoster();
    }
  }, [activeTab, selectedMonth]);

  // Open Shift Create Modal
  const handleOpenCreateShift = () => {
    setEditingShift(null);
    setShiftForm({
      name: "",
      code: "",
      startTime: "08:00",
      endTime: "16:00",
      breakDurationMinutes: 60,
      isOvernight: false,
      color: PRESET_COLORS[0],
    });
    setShiftModalOpen(true);
  };

  // Open Shift Edit Modal
  const handleOpenEditShift = (shift: any) => {
    setEditingShift(shift);
    setShiftForm({
      name: shift.name,
      code: shift.code,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakDurationMinutes: shift.breakDurationMinutes,
      isOvernight: shift.isOvernight,
      color: shift.color || "#0d9488",
    });
    setShiftModalOpen(true);
  };

  // Save Shift
  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setToast(null);

    try {
      const url = editingShift
        ? `/api/v1/schedules/shifts/${editingShift.id}`
        : `/api/v1/schedules/shifts`;
      const method = editingShift ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shiftForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setToast({ type: "error", message: data.error || "Gagal menyimpan shift." });
        setActionLoading(false);
        return;
      }

      setToast({ type: "success", message: data.message || "Shift berhasil disimpan!" });
      setShiftModalOpen(false);
      loadShifts();
    } catch (err) {
      setToast({ type: "error", message: "Terjadi gangguan jaringan atau server." });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Shift
  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus shift ini?")) return;

    try {
      const res = await fetch(`/api/v1/schedules/shifts/${shiftId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal menghapus shift.");
        return;
      }
      setToast({ type: "success", message: "Shift berhasil dihapus." });
      loadShifts();
    } catch (e) {
      alert("Terjadi gangguan server.");
    }
  };

  // Assign Roster
  const handleAssignRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setToast(null);

    try {
      const res = await fetch(`/api/v1/schedules/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setToast({ type: "error", message: data.error || "Gagal mengatur jadwal." });
        setActionLoading(false);
        return;
      }

      setToast({ type: "success", message: data.message });
      setAssignModalOpen(false);
      loadRoster();
    } catch (e) {
      setToast({ type: "error", message: "Terjadi gangguan server." });
    } finally {
      setActionLoading(false);
    }
  };

  // Helper for Roster Matrix Days
  const [year, month] = selectedMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayIndices = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <AdminShell user={session}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center space-x-2">
              <Clock className="w-6 h-6 text-teal-600" />
              <span>Manajemen Shift & Roster Jadwal Kerja</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Atur pola jam kerja shift (pagi, siang, malam) dan plotting jadwal kerja karyawan ({session?.companyName}).
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {activeTab === "SHIFTS" ? (
              <Button
                onClick={handleOpenCreateShift}
                className="rounded-xl px-4 py-2.5 text-xs font-bold shadow-md bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>Tambah Shift Baru</span>
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setAssignForm({
                    employeeIds: employees.map((e) => e.id),
                    startDate: `${selectedMonth}-01`,
                    endDate: `${selectedMonth}-${daysInMonth.toString().padStart(2, "0")}`,
                    shiftId: shifts[0]?.id || "",
                    isOffDay: false,
                    notes: "",
                  });
                  setAssignModalOpen(true);
                }}
                className="rounded-xl px-4 py-2.5 text-xs font-bold shadow-md bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>Atur Jadwal Karyawan</span>
              </Button>
            )}
          </div>
        </div>

        {/* Toast Alert */}
        {toast && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center space-x-3 transition-all ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("SHIFTS")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "SHIFTS"
                ? "bg-teal-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pola Shift Kerja ({shifts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("ROSTER")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "ROSTER"
                ? "bg-teal-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Roster & Kalender Karyawan</span>
          </button>
        </div>

        {/* TAB 1: SHIFTS LIST */}
        {activeTab === "SHIFTS" && (
          <div className="space-y-4">
            {shiftsLoading ? (
              <div className="bg-white rounded-3xl p-12 text-center text-slate-400 text-xs border border-slate-200">
                Memuat data shift...
              </div>
            ) : shifts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                <Clock className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">Belum ada pola shift yang dibuat.</p>
                <Button onClick={handleOpenCreateShift} variant="outline" className="text-xs font-bold rounded-xl">
                  Buat Shift Pertama
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
                  >
                    {/* Color Bar Accent */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1.5"
                      style={{ backgroundColor: shift.color || "#0d9488" }}
                    />

                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span
                            className="inline-block px-2 py-0.5 rounded text-[10px] font-black tracking-wider text-white mb-1 uppercase"
                            style={{ backgroundColor: shift.color || "#0d9488" }}
                          >
                            {shift.code}
                          </span>
                          <h3 className="text-sm font-bold text-slate-800 leading-tight">
                            {shift.name}
                          </h3>
                        </div>

                        {shift.isOvernight && (
                          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold shrink-0">
                            <Moon className="w-3 h-3" />
                            <span>Lintas Hari</span>
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 mt-4 text-xs text-slate-600">
                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 font-mono">
                          <span className="text-[11px] text-slate-400 font-sans">Jam Kerja:</span>
                          <span className="font-bold text-slate-800">
                            {shift.startTime} — {shift.endTime}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] px-1 text-slate-500">
                          <span className="flex items-center space-x-1">
                            <Coffee className="w-3.5 h-3.5 text-slate-400" />
                            <span>Istirahat:</span>
                          </span>
                          <strong className="text-slate-700">{shift.breakDurationMinutes} menit</strong>
                        </div>

                        <div className="flex items-center justify-between text-[11px] px-1 text-slate-500">
                          <span className="flex items-center space-x-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>Karyawan Terjadwal:</span>
                          </span>
                          <strong className="text-slate-700">{shift._count?.schedules || 0} jadwal</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-4 mt-4 border-t border-slate-100">
                      <button
                        onClick={() => handleOpenEditShift(shift)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 transition-colors"
                        title="Edit Shift"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteShift(shift.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Hapus Shift"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ROSTER CALENDAR MATRIX */}
        {activeTab === "ROSTER" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <span className="text-xs font-semibold text-slate-700">Bulan Roster:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="text-xs text-slate-500">
                Total Karyawan: <strong className="text-slate-800">{employees.length} orang</strong>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 sticky left-0 bg-slate-50 z-20 min-w-[180px]">
                        Karyawan
                      </th>
                      {dayIndices.map((dayNum) => (
                        <th key={dayNum} className="px-2 py-3 text-center min-w-[36px] font-mono text-[11px]">
                          {dayNum}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rosterLoading ? (
                      <tr>
                        <td colSpan={daysInMonth + 1} className="p-8 text-center text-slate-400">
                          Memuat roster jadwal...
                        </td>
                      </tr>
                    ) : employees.length === 0 ? (
                      <tr>
                        <td colSpan={daysInMonth + 1} className="p-8 text-center text-slate-400">
                          Tidak ada data karyawan ditemukan.
                        </td>
                      </tr>
                    ) : (
                      employees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-2.5 sticky left-0 bg-white z-10 font-medium border-r border-slate-100 shadow-xs">
                            <div className="font-bold text-slate-900 truncate max-w-[160px]">
                              {emp.firstName} {emp.lastName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">
                              {emp.employeeIdNumber} • {emp.department?.code || "GEN"}
                            </div>
                          </td>

                          {dayIndices.map((dayNum) => {
                            const dateStr = `${selectedMonth}-${dayNum.toString().padStart(2, "0")}`;
                            const sched = schedules.find((s) => {
                              if (s.employeeId !== emp.id) return false;
                              const sDate = new Date(s.date).toISOString().slice(0, 10);
                              return sDate === dateStr;
                            });

                            return (
                              <td key={dayNum} className="p-1 text-center">
                                {sched ? (
                                  sched.isOffDay ? (
                                    <span
                                      title={`Off Day: ${sched.notes || "Libur"}`}
                                      className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200"
                                    >
                                      OFF
                                    </span>
                                  ) : (
                                    <span
                                      title={`${sched.shift?.name} (${sched.shift?.startTime} - ${sched.shift?.endTime})`}
                                      className="inline-block px-1.5 py-0.5 rounded text-[9px] font-black text-white"
                                      style={{ backgroundColor: sched.shift?.color || "#0d9488" }}
                                    >
                                      {sched.shift?.code || "SH"}
                                    </span>
                                  )
                                ) : (
                                  <span className="text-[10px] text-slate-300 font-mono">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 1: ADD / EDIT SHIFT */}
        <Modal
          isOpen={shiftModalOpen}
          onClose={() => setShiftModalOpen(false)}
          title={editingShift ? "Edit Pola Shift Kerja" : "Tambah Shift Kerja Baru"}
        >
          <form onSubmit={handleSaveShift} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Shift</label>
              <input
                type="text"
                required
                value={shiftForm.name}
                onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                placeholder="Contoh: Shift Pagi (07:00 - 15:00)"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Shift</label>
                <input
                  type="text"
                  required
                  value={shiftForm.code}
                  onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value.toUpperCase() })}
                  placeholder="PAGI / SIANG"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Durasi Istirahat</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={shiftForm.breakDurationMinutes}
                    onChange={(e) =>
                      setShiftForm({ ...shiftForm, breakDurationMinutes: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600 pr-12"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 font-semibold">m</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jam Masuk</label>
                <input
                  type="time"
                  required
                  value={shiftForm.startTime}
                  onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jam Pulang</label>
                <input
                  type="time"
                  required
                  value={shiftForm.endTime}
                  onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <p className="font-bold text-xs text-slate-800">Shift Lintas Hari (Overnight)</p>
                <p className="text-[10px] text-slate-500">Aktifkan jika jam selesai berada di hari berikutnya (misal: 22:00 - 06:00)</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={shiftForm.isOvernight}
                  onChange={(e) => setShiftForm({ ...shiftForm, isOvernight: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Warna Label Shift</label>
              <div className="flex items-center space-x-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setShiftForm({ ...shiftForm, color: c })}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      shiftForm.color === c ? "scale-125 ring-2 ring-offset-2 ring-slate-800" : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShiftModalOpen(false)}
                className="text-xs font-bold rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                isLoading={actionLoading}
                className="text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
              >
                Simpan Shift
              </Button>
            </div>
          </form>
        </Modal>

        {/* MODAL 2: ASSIGN ROSTER */}
        <Modal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title="Atur Jadwal Kerja Karyawan"
        >
          <form onSubmit={handleAssignRoster} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Karyawan ({assignForm.employeeIds.length} terpilih)
              </label>
              <div className="max-h-36 overflow-y-auto p-2 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200 mb-1">
                  <button
                    type="button"
                    onClick={() => setAssignForm({ ...assignForm, employeeIds: employees.map((e) => e.id) })}
                    className="text-[11px] font-bold text-teal-600 hover:underline"
                  >
                    Pilih Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignForm({ ...assignForm, employeeIds: [] })}
                    className="text-[11px] font-bold text-slate-400 hover:underline"
                  >
                    Kosongkan
                  </button>
                </div>
                {employees.map((emp) => {
                  const checked = assignForm.employeeIds.includes(emp.id);
                  return (
                    <label key={emp.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const newIds = checked
                            ? assignForm.employeeIds.filter((id) => id !== emp.id)
                            : [...assignForm.employeeIds, emp.id];
                          setAssignForm({ ...assignForm, employeeIds: newIds });
                        }}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="font-semibold text-slate-800">
                        {emp.firstName} {emp.lastName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">({emp.employeeIdNumber})</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Mulai</label>
                <input
                  type="date"
                  required
                  value={assignForm.startDate}
                  onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Selesai</label>
                <input
                  type="date"
                  required
                  value={assignForm.endDate}
                  onChange={(e) => setAssignForm({ ...assignForm, endDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <p className="font-bold text-xs text-slate-800">Tandai Sebagai Hari Libur (Off-Day)</p>
                <p className="text-[10px] text-slate-500">Karyawan tidak diharapkan hadir pada rentang tanggal ini</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={assignForm.isOffDay}
                  onChange={(e) => setAssignForm({ ...assignForm, isOffDay: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>

            {!assignForm.isOffDay && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Pola Shift</label>
                <select
                  required={!assignForm.isOffDay}
                  value={assignForm.shiftId}
                  onChange={(e) => setAssignForm({ ...assignForm, shiftId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600"
                >
                  <option value="">-- Pilih Shift --</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} - {s.endTime})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan (Opsional)</label>
              <input
                type="text"
                value={assignForm.notes}
                onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                placeholder="Misal: Rotasi Shift Mingguan"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="text-xs font-bold rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                isLoading={actionLoading}
                className="text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
              >
                Terapkan Jadwal
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminShell>
  );
}
