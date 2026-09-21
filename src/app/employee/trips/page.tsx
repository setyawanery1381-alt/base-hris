"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plane,
  Plus,
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Banknote,
  FileSpreadsheet,
  ChevronRight,
  Sparkles,
  CreditCard,
  FileText,
  X,
  PlusCircle,
} from "lucide-react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { useTheme } from "@/components/layout/theme-provider";
import {
  TRANSPORT_TYPES,
  TRIP_STATUSES,
  TRIP_SETTLEMENT_STATUSES,
  formatRupiah,
  calculateTripDuration,
  calculatePerDiemTotal,
  calculateSettlementBalance,
} from "@/lib/claims-assets-engine";

export default function EmployeeTripsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [session, setSession] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Request Form
  const [purpose, setPurpose] = useState("");
  const [origin, setOrigin] = useState("Jakarta");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000).toISOString().split("T")[0]);
  const [transportType, setTransportType] = useState("FLIGHT");
  const [accommodation, setAccommodation] = useState("");
  const [perDiemRate, setPerDiemRate] = useState(250000);
  const [cashAdvance, setCashAdvance] = useState(1500000);

  // Settlement Form Items
  const [settlementExpenses, setSettlementExpenses] = useState<any[]>([
    {
      date: new Date().toISOString().split("T")[0],
      category: "TRANSPORT",
      merchantName: "",
      amount: "",
      notes: "",
    },
  ]);
  const [settlementNotes, setSettlementNotes] = useState("");

  const loadTrips = async () => {
    setIsLoading(true);
    try {
      const [authRes, tripsRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/trips"),
      ]);

      if (authRes.ok) {
        const authData = await authRes.json();
        setSession(authData.user);
      }
      if (tripsRes.ok) {
        const data = await tripsRes.json();
        setTrips(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  const computedDuration = calculateTripDuration(startDate, endDate);
  const computedPerDiem = calculatePerDiemTotal(computedDuration, perDiemRate);

  const handleRequestTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose || !destination) {
      alert("Tujuan tugas dan kota destinasi wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose,
          origin,
          destination,
          startDate,
          endDate,
          transportType,
          accommodation,
          perDiemRate,
          cashAdvance,
        }),
      });

      if (res.ok) {
        setIsRequestOpen(false);
        setPurpose("");
        setDestination("");
        loadTrips();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal mengajukan perjalanan dinas");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openSettlementModal = (trip: any) => {
    setSelectedTrip(trip);
    setSettlementExpenses(
      trip.expenses && trip.expenses.length > 0
        ? trip.expenses.map((e: any) => ({
            date: new Date(e.date).toISOString().split("T")[0],
            category: e.category,
            merchantName: e.merchantName || "",
            amount: e.amount,
            notes: e.notes || "",
          }))
        : [
            {
              date: new Date(trip.startDate).toISOString().split("T")[0],
              category: "TRANSPORT",
              merchantName: "Tiket Transportasi",
              amount: "",
              notes: "",
            },
          ]
    );
    setSettlementNotes(trip.settlementNotes || "");
    setIsSettleOpen(true);
  };

  const handleAddExpenseItem = () => {
    setSettlementExpenses([
      ...settlementExpenses,
      {
        date: new Date().toISOString().split("T")[0],
        category: "MEAL",
        merchantName: "",
        amount: "",
        notes: "",
      },
    ]);
  };

  const handleRemoveExpenseItem = (index: number) => {
    if (settlementExpenses.length <= 1) return;
    setSettlementExpenses(settlementExpenses.filter((_, i) => i !== index));
  };

  const handleExpenseChange = (index: number, field: string, value: any) => {
    const updated = [...settlementExpenses];
    updated[index][field] = value;
    setSettlementExpenses(updated);
  };

  const totalSettlementActual = settlementExpenses.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0
  );

  const handleSubmitSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip) return;

    if (totalSettlementActual <= 0) {
      alert("Total realisasi pengeluaran harus lebih besar dari Rp 0");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/trips/${selectedTrip.id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenses: settlementExpenses,
          settlementNotes,
        }),
      });

      if (res.ok) {
        setIsSettleOpen(false);
        loadTrips();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal mengirim laporan realisasi");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileShell user={session}>
      <div className="bg-slate-50 min-h-full pb-8">
        {/* Header */}
        <div
          className="text-white px-5 pt-5 pb-8 rounded-b-[28px] shadow-md transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor || theme.primaryColor}, #0f172a)`,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => router.push("/employee")}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold tracking-wider uppercase text-white/90">
              Perjalanan Dinas (SPPD)
            </span>
            <div className="w-7" />
          </div>

          <h1 className="text-xl font-black">Tugas Dinas Luar Kota</h1>
          <p className="text-[11px] text-white/80 mt-0.5">
            Ajukan permohonan dinas, pantau uang saku harian, dan laporkan realisasi biaya (settlement).
          </p>

          <button
            onClick={() => setIsRequestOpen(true)}
            className="w-full mt-4 py-3 rounded-2xl bg-white text-slate-900 font-extrabold text-xs tracking-wider uppercase shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Ajukan Tugas Dinas</span>
          </button>
        </div>

        {/* Trips List */}
        <div className="px-4 mt-5 space-y-3">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
            Daftar Penugasan SPPD
          </h2>

          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Memuat data perjalanan dinas...
            </div>
          ) : trips.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              <Plane className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-600">Belum Ada Perjalanan Dinas</p>
              <p className="text-[11px] mt-1">Tekan tombol "Ajukan Tugas Dinas" untuk mengajukan perjalanan dinas baru.</p>
            </div>
          ) : (
            trips.map((trip) => {
              const statusCfg = TRIP_STATUSES[trip.status as keyof typeof TRIP_STATUSES] || {
                label: trip.status,
                color: "bg-slate-100 text-slate-700 border-slate-200",
              };
              const settleCfg = TRIP_SETTLEMENT_STATUSES[trip.settlementStatus as keyof typeof TRIP_SETTLEMENT_STATUSES];

              return (
                <div
                  key={trip.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {trip.tripNumber}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {trip.durationDays} Hari
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mt-1">{trip.purpose}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>
                      {trip.origin} ➔ <strong>{trip.destination}</strong>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl">
                    <div>
                      <span className="text-[10px] block text-slate-400">Jadwal</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(trip.startDate).toLocaleDateString("id-ID")} - {new Date(trip.endDate).toLocaleDateString("id-ID")}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] block text-slate-400">Uang Muka Diminta</span>
                      <span className="font-bold font-mono text-slate-900">
                        {formatRupiah(trip.cashAdvance)}
                      </span>
                    </div>
                  </div>

                  {/* Settlement Action Button if Approved / Disbursed */}
                  {(trip.status === "APPROVED" || trip.status === "DISBURSED" || trip.status === "COMPLETED") && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${settleCfg?.color || "bg-slate-100 text-slate-600"}`}>
                        {settleCfg?.label || trip.settlementStatus}
                      </span>
                      <button
                        onClick={() => openSettlementModal(trip)}
                        className="px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center space-x-1"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>{trip.settlementStatus === "SETTLED" ? "Lihat Realisasi" : "Lapor Realisasi Biaya"}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal: Ajukan SPPD Baru */}
        {isRequestOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center space-x-2">
                  <Plane className="w-4 h-4 text-blue-600" />
                  <h3 className="font-black text-slate-900 text-sm">Pengajuan Perjalanan Dinas</h3>
                </div>
                <button
                  onClick={() => setIsRequestOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRequestTrip} className="p-5 overflow-y-auto space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Maksud / Tujuan Dinas *</label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Contoh: Kunjungan Klien & Instalasi Perangkat"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kota Keberangkatan</label>
                    <input
                      type="text"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kota Tujuan *</label>
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Contoh: Bandung"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tanggal Berangkat</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tanggal Kembali</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      required
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between text-blue-950">
                  <span>Durasi: <strong>{computedDuration} Hari</strong></span>
                  <span>Uang Saku: <strong>{formatRupiah(computedPerDiem)}</strong></span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Moda Transportasi</label>
                    <select
                      value={transportType}
                      onChange={(e) => setTransportType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    >
                      {TRANSPORT_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Hotel / Penginapan</label>
                    <input
                      type="text"
                      value={accommodation}
                      onChange={(e) => setAccommodation(e.target.value)}
                      placeholder="Hotel / Mess Klien"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Uang Muka yang Diajukan (Cash Advance Rp)</label>
                  <input
                    type="number"
                    value={cashAdvance}
                    onChange={(e) => setCashAdvance(Number(e.target.value))}
                    className="w-full px-3 py-2 font-mono font-bold text-blue-700 rounded-xl border border-slate-200"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Mencakup tiket, akomodasi hotel, dan uang saku selama penugasan.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsRequestOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center space-x-1.5 shadow-md shadow-blue-600/25 disabled:opacity-50"
                  >
                    <Plane className="w-4 h-4" />
                    <span>Kirim Permohonan SPPD</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Lapor Realisasi Biaya (Settlement) */}
        {isSettleOpen && selectedTrip && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Pertanggungjawaban Biaya (Settlement)</h3>
                  <p className="text-[10px] font-mono text-slate-500">{selectedTrip.tripNumber} • {selectedTrip.destination}</p>
                </div>
                <button
                  onClick={() => setIsSettleOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitSettlement} className="p-5 overflow-y-auto space-y-4 text-xs">
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-950 flex items-center justify-between">
                  <span>Uang Muka yang Diterima:</span>
                  <span className="font-mono font-bold text-sm">
                    {formatRupiah(selectedTrip.disbursedCashAdvance || selectedTrip.cashAdvance)}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Rincian Pengeluaran Aktual</span>
                    <button
                      type="button"
                      onClick={handleAddExpenseItem}
                      className="text-blue-600 font-bold text-[11px] hover:underline flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Item</span>
                    </button>
                  </div>

                  {settlementExpenses.map((exp, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 relative">
                      {settlementExpenses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveExpenseItem(idx)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-rose-600 text-[10px] font-bold"
                        >
                          ✕ Hapus
                        </button>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Tanggal</label>
                          <input
                            type="date"
                            value={exp.date}
                            onChange={(e) => handleExpenseChange(idx, "date", e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Nominal (Rp) *</label>
                          <input
                            type="number"
                            value={exp.amount}
                            onChange={(e) => handleExpenseChange(idx, "amount", e.target.value)}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 font-mono font-bold text-blue-700 rounded-lg border border-slate-200 bg-white"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Deskripsi / Vendor</label>
                        <input
                          type="text"
                          value={exp.merchantName}
                          onChange={(e) => handleExpenseChange(idx, "merchantName", e.target.value)}
                          placeholder="Contoh: Tiket Kereta Argo Parahyangan"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Calculated Balance Preview */}
                  {(() => {
                    const balanceInfo = calculateSettlementBalance(
                      selectedTrip.disbursedCashAdvance || selectedTrip.cashAdvance,
                      totalSettlementActual
                    );

                    return (
                      <div className="p-3.5 bg-indigo-50 rounded-2xl border border-indigo-200 space-y-1.5 text-indigo-950">
                        <div className="flex justify-between items-center text-xs">
                          <span>Total Pengeluaran Realisasi:</span>
                          <span className="font-mono font-bold">{formatRupiah(totalSettlementActual)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs pt-1 border-t border-indigo-200/50">
                          <span className="font-bold">Status Selisih Kas:</span>
                          <span className="font-bold font-mono">
                            {balanceInfo.type === "REFUND_TO_COMPANY" ? (
                              <span className="text-emerald-700">Lebih Bayar (+{balanceInfo.formattedBalance})</span>
                            ) : balanceInfo.type === "REIMBURSE_TO_EMPLOYEE" ? (
                              <span className="text-rose-700">Kurang Bayar (-{balanceInfo.formattedBalance})</span>
                            ) : (
                              <span>Pas (Rp 0)</span>
                            )}
                          </span>
                        </div>
                        <p className="text-[10px] text-indigo-800/80 mt-0.5">{balanceInfo.statusDescription}</p>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catatan Laporan Realisasi</label>
                  <textarea
                    value={settlementNotes}
                    onChange={(e) => setSettlementNotes(e.target.value)}
                    placeholder="Catatan kendala atau rincian tambahan..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsSettleOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center space-x-1.5 shadow-md shadow-blue-600/25 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Kirim Laporan Realisasi</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
