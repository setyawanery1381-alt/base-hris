"use client";

import React, { useState, useEffect } from "react";
import {
  Plane,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Calendar,
  MapPin,
  Banknote,
  Eye,
  FileText,
  Sparkles,
  ChevronRight,
  Building2,
  X,
  CreditCard,
  Layers,
  Award,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Avatar } from "@/components/ui/avatar";
import {
  TRANSPORT_TYPES,
  TRIP_STATUSES,
  TRIP_SETTLEMENT_STATUSES,
  formatRupiah,
  calculateTripDuration,
  calculatePerDiemTotal,
} from "@/lib/claims-assets-engine";

export default function AdminTripsPage() {
  const [session, setSession] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalTrips: 0,
    activeTrips: 0,
    pendingCount: 0,
    totalCashAdvance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    employeeId: "",
    purpose: "",
    origin: "Jakarta",
    destination: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
    transportType: "FLIGHT",
    accommodation: "",
    perDiemRate: 250000,
    cashAdvance: 2000000,
    notes: "",
    autoApprove: true,
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [authRes, tripsRes, empRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch(`/api/v1/trips?status=${statusFilter}`),
        fetch("/api/v1/employees"),
      ]);

      if (authRes.ok) {
        const authData = await authRes.json();
        setSession(authData.user);
      }
      if (tripsRes.ok) {
        const data = await tripsRes.json();
        setTrips(data.data || []);
        if (data.summary) setSummary(data.summary);
      }
      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.employeeId || !createForm.destination || !createForm.purpose) {
      alert("Karyawan, kota tujuan, dan maksud perjalanan dinas wajib diisi");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/v1/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      if (res.ok) {
        setIsCreateModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal membuat SPPD");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTripStatusAction = async (action: "APPROVE" | "REJECT" | "DISBURSE" | "COMPLETE") => {
    if (!selectedTrip) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/trips/${selectedTrip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        setIsDetailModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal mengubah status SPPD");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredTrips = trips.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const empName = `${t.employee?.firstName || ""} ${t.employee?.lastName || ""}`.toLowerCase();
    const tripNum = (t.tripNumber || "").toLowerCase();
    const dest = (t.destination || "").toLowerCase();
    const purpose = (t.purpose || "").toLowerCase();
    return empName.includes(q) || tripNum.includes(q) || dest.includes(q) || purpose.includes(q);
  });

  const computedDuration = calculateTripDuration(createForm.startDate, createForm.endDate);
  const computedPerDiem = calculatePerDiemTotal(computedDuration, createForm.perDiemRate);

  return (
    <AdminShell user={session}>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Surat Perintah Perjalanan Dinas (SPPD)</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Perjalanan Dinas & SPPD
            </h1>
            <p className="text-sm text-blue-100/90 mt-1 max-w-2xl">
              Terbitkan surat tugas dinas, hitung otomatis uang saku harian, kelola pencairan uang muka, dan rekonsiliasi biaya settlement.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat SPPD Baru</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Penugasan SPPD</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Plane className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-3xl font-black text-slate-900">{summary.totalTrips}</span>
              <span className="text-xs text-slate-500">Tugas</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Total berkas perjalanan dinas</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Menunggu Persetujuan</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-3xl font-black text-amber-600">{summary.pendingCount}</span>
              <span className="text-xs text-slate-500">Permohonan</span>
            </div>
            <p className="text-[11px] text-amber-600 font-semibold mt-1">Menunggu otorisasi pimpinan</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Dinas Aktif / Berjalan</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-3xl font-black text-indigo-600">{summary.activeTrips}</span>
              <span className="text-xs text-slate-500">Karyawan</span>
            </div>
            <p className="text-[11px] text-indigo-600 font-semibold mt-1">Sedang bertugas di luar kota</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Kas Uang Muka</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-emerald-700">{formatRupiah(summary.totalCashAdvance)}</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">Uang muka dinas dicairkan</p>
          </div>
        </div>

        {/* Search & Tabs */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor SPPD, nama karyawan, tujuan dinas..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1 border-t border-slate-100 pt-3">
            {[
              { id: "ALL", label: "Semua Status" },
              { id: "PENDING", label: "Menunggu Persetujuan" },
              { id: "APPROVED", label: "Disetujui (SPPD Terbit)" },
              { id: "DISBURSED", label: "Uang Muka Dicairkan" },
              { id: "COMPLETED", label: "Selesai & Settled" },
              { id: "REJECTED", label: "Ditolak" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Trips Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Nomor SPPD</th>
                  <th className="px-5 py-3.5">Karyawan Ditugaskan</th>
                  <th className="px-5 py-3.5">Tujuan & Jadwal</th>
                  <th className="px-5 py-3.5">Transportasi</th>
                  <th className="px-5 py-3.5 text-right">Uang Saku & Advance</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                      Memuat data SPPD...
                    </td>
                  </tr>
                ) : filteredTrips.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      <Plane className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      Tidak ada data perjalanan dinas yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredTrips.map((trip) => {
                    const statusCfg = TRIP_STATUSES[trip.status as keyof typeof TRIP_STATUSES] || {
                      label: trip.status,
                      color: "bg-slate-100 text-slate-700 border-slate-200",
                    };
                    const transportCfg = TRANSPORT_TYPES.find((t) => t.id === trip.transportType);

                    return (
                      <tr key={trip.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900 font-mono text-[11px]">
                            {trip.tripNumber}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Diajukan: {new Date(trip.createdAt).toLocaleDateString("id-ID")}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center space-x-2.5">
                            <Avatar
                              name={`${trip.employee?.firstName || ""} ${trip.employee?.lastName || ""}`}
                              photoUrl={trip.employee?.photoUrl}
                              size="sm"
                            />
                            <div>
                              <p className="font-bold text-slate-900">
                                {trip.employee?.firstName} {trip.employee?.lastName}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {trip.employee?.position?.name || "Karyawan"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 max-w-[220px]">
                          <div className="flex items-center space-x-1.5 font-bold text-slate-900">
                            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{trip.destination}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5" title={trip.purpose}>
                            {trip.purpose}
                          </p>
                          <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">
                            {new Date(trip.startDate).toLocaleDateString("id-ID")} - {new Date(trip.endDate).toLocaleDateString("id-ID")} ({trip.durationDays} Hari)
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                            {transportCfg?.label || trip.transportType}
                          </span>
                          {trip.accommodation && (
                            <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[140px]">
                              Hotel: {trip.accommodation}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span className="font-bold font-mono text-slate-900 block">
                            {formatRupiah(trip.cashAdvance)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Uang Saku: {formatRupiah(trip.totalPerDiem)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => {
                                setSelectedTrip(trip);
                                setIsDetailModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold text-xs transition-colors flex items-center space-x-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Detail</span>
                            </button>

                            <button
                              onClick={() => {
                                setSelectedTrip(trip);
                                setIsPrintModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-bold text-xs transition-colors flex items-center space-x-1 cursor-pointer"
                              title="Cetak SPPD Resmi"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
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

      {/* Modal: Buat SPPD Baru */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Plane className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Terbitkan SPPD Baru</h3>
                  <p className="text-[11px] text-slate-500">Surat Perintah Perjalanan Dinas Resmi</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Karyawan yang Ditugaskan *</label>
                <select
                  value={createForm.employeeId}
                  onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                >
                  <option value="">-- Pilih Karyawan --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employeeIdNumber} - {e.firstName} {e.lastName} ({e.department?.name || "Karyawan"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Maksud / Tujuan Tugas Dinas *</label>
                <input
                  type="text"
                  value={createForm.purpose}
                  onChange={(e) => setCreateForm({ ...createForm, purpose: e.target.value })}
                  placeholder="Contoh: Implementasi Sistem & Supervisi Proyek Pabrik Gresik"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kota Keberangkatan</label>
                  <input
                    type="text"
                    value={createForm.origin}
                    onChange={(e) => setCreateForm({ ...createForm, origin: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kota Tujuan *</label>
                  <input
                    type="text"
                    value={createForm.destination}
                    onChange={(e) => setCreateForm({ ...createForm, destination: e.target.value })}
                    placeholder="Contoh: Surabaya, Jawa Timur"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Berangkat</label>
                  <input
                    type="date"
                    value={createForm.startDate}
                    onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Kembali</label>
                  <input
                    type="date"
                    value={createForm.endDate}
                    onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between text-blue-900">
                <span>Durasi Perjalanan: <strong>{computedDuration} Hari</strong></span>
                <span>Estimasi Uang Saku: <strong>{formatRupiah(computedPerDiem)}</strong></span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Moda Transportasi</label>
                  <select
                    value={createForm.transportType}
                    onChange={(e) => setCreateForm({ ...createForm, transportType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {TRANSPORT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Penginapan / Hotel</label>
                  <input
                    type="text"
                    value={createForm.accommodation}
                    onChange={(e) => setCreateForm({ ...createForm, accommodation: e.target.value })}
                    placeholder="Contoh: Hotel Santika Premiere"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tarif Uang Saku Harian (Rp)</label>
                  <input
                    type="number"
                    value={createForm.perDiemRate}
                    onChange={(e) => setCreateForm({ ...createForm, perDiemRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 font-mono rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Uang Muka Diminta (Cash Advance Rp)</label>
                  <input
                    type="number"
                    value={createForm.cashAdvance}
                    onChange={(e) => setCreateForm({ ...createForm, cashAdvance: Number(e.target.value) })}
                    className="w-full px-3 py-2 font-mono font-bold text-blue-700 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Tambahan / Instruksi Khusus</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="Catatan untuk tim akuntansi atau karyawan yang bertugas..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2 -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm shadow-blue-600/25 cursor-pointer disabled:opacity-50"
                >
                  <Plane className="w-4 h-4" />
                  <span>Terbitkan Dokumen SPPD</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detail & Action SPPD */}
      {isDetailModalOpen && selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {selectedTrip.tripNumber}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {selectedTrip.purpose}
                </h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Karyawan Ditugaskan</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedTrip.employee?.firstName} {selectedTrip.employee?.lastName}
                  </p>
                  <p className="text-slate-500 font-mono text-[11px]">
                    {selectedTrip.employee?.employeeIdNumber} • {selectedTrip.employee?.department?.name || "Karyawan"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Rute & Durasi</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedTrip.origin} ➔ {selectedTrip.destination}
                  </p>
                  <p className="text-blue-700 font-semibold text-[11px]">
                    {new Date(selectedTrip.startDate).toLocaleDateString("id-ID")} - {new Date(selectedTrip.endDate).toLocaleDateString("id-ID")} ({selectedTrip.durationDays} Hari)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Uang Saku Harian</span>
                  <span className="font-bold font-mono text-sm text-slate-800">
                    {formatRupiah(selectedTrip.perDiemRate)} / Hari
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Total: {formatRupiah(selectedTrip.totalPerDiem)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Uang Muka (Advance)</span>
                  <span className="font-bold font-mono text-sm text-blue-700">
                    {formatRupiah(selectedTrip.cashAdvance)}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Dicairkan: {formatRupiah(selectedTrip.disbursedCashAdvance || 0)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Status Settlement</span>
                  <span className="font-bold text-xs text-slate-800 block">
                    {TRIP_SETTLEMENT_STATUSES[selectedTrip.settlementStatus as keyof typeof TRIP_SETTLEMENT_STATUSES]?.label || selectedTrip.settlementStatus}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Realisasi: {formatRupiah(selectedTrip.actualExpense || 0)}
                  </span>
                </div>
              </div>

              {/* Settlement Balance Info if available */}
              {selectedTrip.actualExpense !== null && selectedTrip.actualExpense !== undefined && (
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950">
                  <h4 className="font-bold text-xs mb-1">Rekonsiliasi Kas (Settlement Realisasi)</h4>
                  <div className="flex justify-between items-center text-xs">
                    <span>Uang Muka Kantor: <strong>{formatRupiah(selectedTrip.disbursedCashAdvance || selectedTrip.cashAdvance)}</strong></span>
                    <span>Total Pengeluaran Real: <strong>{formatRupiah(selectedTrip.actualExpense)}</strong></span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-indigo-200/60 font-bold text-sm">
                    {selectedTrip.settlementBalance > 0 ? (
                      <span className="text-emerald-700">
                        Lebih Bayar: Karyawan mengembalikan sisa kas {formatRupiah(selectedTrip.settlementBalance)} ke kantor
                      </span>
                    ) : selectedTrip.settlementBalance < 0 ? (
                      <span className="text-rose-700">
                        Kurang Bayar: Kantor mengganti kelebihan biaya karyawan {formatRupiah(Math.abs(selectedTrip.settlementBalance))}
                      </span>
                    ) : (
                      <span className="text-slate-700">Pengeluaran tepat sesuai uang muka (Pas)</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs"
              >
                Tutup
              </button>

              {selectedTrip.status === "PENDING" && (
                <>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleTripStatusAction("REJECT")}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-1"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Tolak</span>
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleTripStatusAction("APPROVE")}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Setujui SPPD</span>
                  </button>
                </>
              )}

              {selectedTrip.status === "APPROVED" && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleTripStatusAction("DISBURSE")}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center space-x-1"
                >
                  <Banknote className="w-4 h-4" />
                  <span>Cairkan Uang Muka ({formatRupiah(selectedTrip.cashAdvance)})</span>
                </button>
              )}

              {(selectedTrip.status === "DISBURSED" || selectedTrip.settlementStatus === "SUBMITTED") && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleTripStatusAction("COMPLETE")}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Tandai Selesai (Close SPPD)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cetak Dokumen Resmi SPPD */}
      {isPrintModalOpen && selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
              <div className="flex items-center space-x-2">
                <Printer className="w-4 h-4 text-slate-600" />
                <span className="font-bold text-sm text-slate-800">Pratinjau Dokumen Resmi SPPD</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Simpan PDF</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div className="p-8 overflow-y-auto text-slate-900 bg-white font-serif leading-relaxed text-xs">
              {/* Kop Surat */}
              <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
                <h2 className="text-lg font-black tracking-wider uppercase font-sans">
                  {session?.companyName || "PT KANAYA MULTI SOLUSINDO"}
                </h2>
                <p className="text-[11px] font-sans text-slate-600">
                  Gedung Sentra Niaga Lt. 8, Puri Indah, Kembangan, Jakarta Barat 11610 • Telp: (021) 5830-8899
                </p>
                <p className="text-[10px] font-sans text-slate-500 font-mono">
                  Email: corporate@kanaya.com • Website: www.kanaya.com
                </p>
              </div>

              {/* Title */}
              <div className="text-center mb-6">
                <h3 className="text-base font-bold underline uppercase font-sans tracking-wide">
                  SURAT PERINTAH PERJALANAN DINAS (SPPD)
                </h3>
                <p className="font-mono text-xs font-bold text-slate-700 mt-1">
                  Nomor: {selectedTrip.tripNumber}
                </p>
              </div>

              {/* SPPD Body Table */}
              <table className="w-full border-collapse border border-slate-400 text-xs mb-6 font-sans">
                <tbody>
                  <tr className="border-b border-slate-300">
                    <td className="w-8 px-3 py-2 text-center font-bold border-r border-slate-300">1.</td>
                    <td className="w-56 px-3 py-2 font-bold border-r border-slate-300">Pejabat Berwenang</td>
                    <td className="px-3 py-2">Direktur Operasional / HR Department</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="px-3 py-2 text-center font-bold border-r border-slate-300">2.</td>
                    <td className="px-3 py-2 font-bold border-r border-slate-300">Nama Karyawan yang Ditugaskan</td>
                    <td className="px-3 py-2 font-bold">{selectedTrip.employee?.firstName} {selectedTrip.employee?.lastName}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="px-3 py-2 text-center font-bold border-r border-slate-300">3.</td>
                    <td className="px-3 py-2 font-bold border-r border-slate-300">Nomor Induk Karyawan (NIK) / Jabatan</td>
                    <td className="px-3 py-2">{selectedTrip.employee?.employeeIdNumber} / {selectedTrip.employee?.position?.name || "Staff"}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="px-3 py-2 text-center font-bold border-r border-slate-300">4.</td>
                    <td className="px-3 py-2 font-bold border-r border-slate-300">Maksud / Perintah Penugasan</td>
                    <td className="px-3 py-2 font-medium">{selectedTrip.purpose}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="px-3 py-2 text-center font-bold border-r border-slate-300">5.</td>
                    <td className="px-3 py-2 font-bold border-r border-slate-300">Tempat Berangkat / Tempat Tujuan</td>
                    <td className="px-3 py-2">{selectedTrip.origin} ➔ {selectedTrip.destination}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="px-3 py-2 text-center font-bold border-r border-slate-300">6.</td>
                    <td className="px-3 py-2 font-bold border-r border-slate-300">Lama Perjalanan Dinas</td>
                    <td className="px-3 py-2">{selectedTrip.durationDays} Hari ({new Date(selectedTrip.startDate).toLocaleDateString("id-ID")} s/d {new Date(selectedTrip.endDate).toLocaleDateString("id-ID")})</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="px-3 py-2 text-center font-bold border-r border-slate-300">7.</td>
                    <td className="px-3 py-2 font-bold border-r border-slate-300">Moda Transportasi</td>
                    <td className="px-3 py-2">{selectedTrip.transportType}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="px-3 py-2 text-center font-bold border-r border-slate-300">8.</td>
                    <td className="px-3 py-2 font-bold border-r border-slate-300">Uang Saku & Uang Muka Dinas</td>
                    <td className="px-3 py-2 font-mono">Uang Saku: {formatRupiah(selectedTrip.totalPerDiem)} | Uang Muka: {formatRupiah(selectedTrip.cashAdvance)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Tanda Tangan & Stempel */}
              <div className="grid grid-cols-2 gap-8 font-sans text-xs mt-10">
                <div className="text-center">
                  <p className="font-semibold">Karyawan yang Ditugaskan,</p>
                  <div className="h-20 flex items-center justify-center">
                    <span className="text-[10px] text-slate-400 italic">[Tanda Tangan Digital]</span>
                  </div>
                  <p className="font-bold underline">{selectedTrip.employee?.firstName} {selectedTrip.employee?.lastName}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{selectedTrip.employee?.employeeIdNumber}</p>
                </div>

                <div className="text-center">
                  <p className="font-semibold">Jakarta, {new Date(selectedTrip.createdAt).toLocaleDateString("id-ID")}</p>
                  <p className="font-semibold">Pemberi Perintah (HR & Management),</p>
                  <div className="h-20 flex items-center justify-center relative">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-emerald-500/40 flex items-center justify-center text-[10px] font-bold text-emerald-700/60 uppercase rotate-[-15deg]">
                      STEMPEL RESMI
                    </div>
                  </div>
                  <p className="font-bold underline">HENDRA SETIAWAN, S.H., M.M.</p>
                  <p className="text-[10px] text-slate-500">Head of Human Capital & Operations</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
