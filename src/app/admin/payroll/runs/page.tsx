"use client";
import React, { useState, useEffect } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import {
  Calculator,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  Search,
  Eye,
  Send,
  Download,
  Plus,
  Landmark,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";

function RunsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRunId = searchParams.get("id");

  const [session, setSession] = useState<any>(null);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [currentRun, setCurrentRun] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [searchEmployee, setSearchEmployee] = useState("");

  // Create Period Modal
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [periodFormData, setPeriodFormData] = useState({
    name: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0],
    cutOffStartDate: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 21).toISOString().split("T")[0],
    cutOffEndDate: new Date(new Date().getFullYear(), new Date().getMonth(), 20).toISOString().split("T")[0],
    paymentDate: new Date(new Date().getFullYear(), new Date().getMonth(), 25).toISOString().split("T")[0],
  });

  // Payslip Detail Modal
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);

  const loadData = async (runIdToLoad?: string) => {
    try {
      const [authRes, periodsRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/payroll/periods"),
      ]);

      if (authRes.ok) setSession((await authRes.json()).user);
      if (periodsRes.ok) {
        const periodList = (await periodsRes.json()).periods || [];
        setPeriods(periodList);

        if (periodList.length > 0 && !selectedPeriodId) {
          setSelectedPeriodId(periodList[0].id);
        }
      }

      const targetRunId = runIdToLoad || initialRunId;
      if (targetRunId) {
        const runRes = await fetch(`/api/v1/payroll/runs?id=${targetRunId}`);
        if (runRes.ok) {
          const runData = (await runRes.json()).run;
          setCurrentRun(runData);
          if (runData?.periodId) setSelectedPeriodId(runData.periodId);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [initialRunId]);

  // When period changes, load corresponding run if exists
  useEffect(() => {
    if (selectedPeriodId) {
      fetch(`/api/v1/payroll/runs?periodId=${selectedPeriodId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.runs && d.runs.length > 0) {
            // Load latest run for this period
            fetch(`/api/v1/payroll/runs?id=${d.runs[0].id}`)
              .then((r) => r.json())
              .then((rd) => setCurrentRun(rd.run));
          } else {
            setCurrentRun(null);
          }
        })
        .catch(console.error);
    }
  }, [selectedPeriodId]);

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/payroll/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(periodFormData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat periode");

      setIsPeriodModalOpen(false);
      await loadData();
      setSelectedPeriodId(data.period.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCalculatePayroll = async () => {
    let targetPeriodId = selectedPeriodId;
    if (!targetPeriodId) {
      if (periods.length > 0) {
        targetPeriodId = periods[0].id;
        setSelectedPeriodId(targetPeriodId);
      } else {
        setIsPeriodModalOpen(true);
        return;
      }
    }

    setIsCalculating(true);
    try {
      const res = await fetch("/api/v1/payroll/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId: targetPeriodId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses payroll");

      // Reload full run with payslips
      const runRes = await fetch(`/api/v1/payroll/runs?id=${data.run.id}`);
      if (runRes.ok) {
        setCurrentRun((await runRes.json()).run);
      }
      alert(data.message || "Payroll berhasil dikalkulasi!");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleUpdateRunAction = async (action: "CONFIRM" | "PUBLISH" | "PAY") => {
    if (!currentRun) return;
    const confirmMsg =
      action === "PUBLISH"
        ? "Terbitkan slip gaji ke seluruh karyawan? Karyawan akan menerima notifikasi dan dapat melihat slip gaji di aplikasi mobile."
        : action === "PAY"
        ? "Tandai seluruh gaji periode ini telah dibayarkan?"
        : "Konfirmasi draft perhitungan ini?";

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch("/api/v1/payroll/runs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: currentRun.id, action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui status run");

      // Reload
      const runRes = await fetch(`/api/v1/payroll/runs?id=${currentRun.id}`);
      if (runRes.ok) {
        setCurrentRun((await runRes.json()).run);
      }
      alert(data.message || "Status berhasil diperbarui");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredPayslips = (currentRun?.payslips || []).filter((p: any) => {
    const name = `${p.employee?.firstName} ${p.employee?.lastName}`.toLowerCase();
    const nik = (p.employee?.employeeIdNumber || "").toLowerCase();
    const q = searchEmployee.toLowerCase();
    return name.includes(q) || nik.includes(q);
  });

  return (
    <AdminShell user={session}>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
              <button
                onClick={() => router.push("/admin/payroll")}
                className="hover:text-slate-800 flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Dashboard Payroll</span>
              </button>
              <span>/</span>
              <span className="font-semibold text-slate-800">Proses Payroll</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2.5">
              <Calculator className="w-7 h-7 text-emerald-600" />
              <span>Kalkulasi & Pemrosesan Payroll</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Pilih periode, jalankan kalkulasi otomatis terintegrasi lembur & absensi, review rincian per karyawan, dan terbitkan slip gaji.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsPeriodModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-xs flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Periode Baru</span>
            </button>
          </div>
        </div>

        {/* Period Selector Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Pilih Periode Penggajian
              </span>
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="mt-1 font-bold text-sm text-slate-900 bg-transparent border-0 focus:outline-none cursor-pointer"
              >
                {periods.length === 0 ? (
                  <option value="">Belum ada periode (Klik Buat Periode Baru)</option>
                ) : (
                  periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({new Date(p.cutOffStartDate).toLocaleDateString("id-ID")} s.d.{" "}
                      {new Date(p.cutOffEndDate).toLocaleDateString("id-ID")})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleCalculatePayroll}
              disabled={isCalculating}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-700/20 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Calculator className="w-4 h-4" />
              <span>{isCalculating ? "Menghitung..." : "Kalkulasi / Hitung Ulang"}</span>
            </button>

            {currentRun && (
              <button
                onClick={() => router.push(`/admin/payroll/disbursal?runId=${currentRun.id}`)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs flex items-center space-x-2 transition-all cursor-pointer"
              >
                <Landmark className="w-4 h-4" />
                <span>Ekspor Bank</span>
              </button>
            )}
          </div>
        </div>

        {/* Current Run Summary & Actions */}
        {currentRun ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 text-white shadow-xl border border-slate-700">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-white/10">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Hasil Kalkulasi
                    </span>
                    <Badge
                      variant={
                        currentRun.status === "PAID"
                          ? "success"
                          : currentRun.status === "CONFIRMED"
                          ? "primary"
                          : "warning"
                      }
                    >
                      {currentRun.status === "PAID"
                        ? "TELAH DIBAYARKAN"
                        : currentRun.status === "CONFIRMED"
                        ? "DISETUJUI / TERBIT"
                        : "DRAFT KALKULASI"}
                    </Badge>
                  </div>
                  <h2 className="text-xl font-black text-white mt-1">
                    {currentRun.period?.name}
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Diproses oleh: {currentRun.processedBy || "Sistem"} • {currentRun.totalEmployees} Karyawan
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  {currentRun.status === "DRAFT" && (
                    <button
                      onClick={() => handleUpdateRunAction("PUBLISH")}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Terbitkan Slip Gaji (Publish)</span>
                    </button>
                  )}

                  {currentRun.status === "CONFIRMED" && (
                    <button
                      onClick={() => handleUpdateRunAction("PAY")}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Tandai Selesai Dibayar (Paid)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Summary Numbers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">Total Gaji Pokok & Tunjangan</span>
                  <span className="text-lg font-black text-white">
                    Rp {currentRun.totalGrossPay.toLocaleString("id-ID")}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">Total Take-Home Pay (Net)</span>
                  <span className="text-lg font-black text-emerald-400">
                    Rp {currentRun.totalNetPay.toLocaleString("id-ID")}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">Total PPh 21 TER</span>
                  <span className="text-lg font-black text-blue-400">
                    Rp {currentRun.totalPph21.toLocaleString("id-ID")}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">Total Iuran BPJS</span>
                  <span className="text-lg font-black text-purple-400">
                    Rp {(currentRun.totalCompanyBpjs + currentRun.totalEmployeeBpjs).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

            {/* Payslips Breakdown Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Rincian Slip Gaji per Karyawan ({filteredPayslips.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Klik tombol Rincian untuk memeriksa komponen line-item, lembur, dan potongan.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari karyawan..."
                    value={searchEmployee}
                    onChange={(e) => setSearchEmployee(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Karyawan</th>
                      <th className="py-3 px-4 text-right">Gaji Pokok</th>
                      <th className="py-3 px-4 text-right">Tunjangan</th>
                      <th className="py-3 px-4 text-right">Upah Lembur</th>
                      <th className="py-3 px-4 text-right">Pot. Absen</th>
                      <th className="py-3 px-4 text-right">BPJS Karyawan</th>
                      <th className="py-3 px-4 text-right">PPh 21 TER</th>
                      <th className="py-3 px-4 text-right">Take-Home Pay</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPayslips.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            {p.employee?.firstName} {p.employee?.lastName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {p.employee?.employeeIdNumber} • {p.employee?.department?.name || "-"}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-800">
                          Rp {p.basicSalary.toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700">
                          Rp {p.totalAllowances.toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {p.overtimePay > 0 ? (
                            <div>
                              <span className="font-bold text-emerald-600 block">
                                +Rp {p.overtimePay.toLocaleString("id-ID")}
                              </span>
                              <span className="text-[9px] text-slate-400 font-semibold">
                                {p.overtimeHours} jam
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {p.attendanceDeduction > 0 ? (
                            <span className="font-bold text-rose-600">
                              -Rp {p.attendanceDeduction.toLocaleString("id-ID")}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700 font-medium">
                          -Rp {(p.bpjsKesEmployee + p.bpjsTkJhtEmployee + p.bpjsTkJpEmployee).toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {p.pph21 > 0 ? (
                            <div>
                              <span className="font-bold text-blue-600 block">
                                -Rp {p.pph21.toLocaleString("id-ID")}
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {p.taxCategory} ({p.taxRate}%)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">0 (0%)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-600 text-sm">
                          Rp {p.netSalary.toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant={
                              p.status === "PAID"
                                ? "success"
                                : p.status === "PUBLISHED"
                                ? "primary"
                                : "warning"
                            }
                          >
                            {p.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedPayslip(p);
                              setIsPayslipModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors"
                          >
                            Rincian
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <Calculator className="w-8 h-8" />
            </div>
            {periods.length === 0 ? (
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Belum Ada Periode Payroll
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
                  Buat periode penggajian (misal: Gaji September 2026) untuk mulai mengalkulasi absensi, lembur, BPJS, dan PPh 21 TER 2024.
                </p>
                <button
                  onClick={() => setIsPeriodModalOpen(true)}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-700/25 transition-all cursor-pointer inline-flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Periode Payroll Sekarang</span>
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Belum Ada Kalkulasi Payroll untuk Periode Ini
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
                  Klik tombol di bawah untuk mengalkulasi gaji seluruh karyawan secara otomatis berdasarkan kehadiran, cuti, lembur, BPJS, dan PPh 21 TER 2024.
                </p>
                <button
                  onClick={handleCalculatePayroll}
                  disabled={isCalculating}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-700/25 transition-all cursor-pointer inline-flex items-center space-x-2"
                >
                  <Calculator className="w-4 h-4" />
                  <span>{isCalculating ? "Menghitung..." : "Mulai Kalkulasi Sekarang"}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal Create Period */}
        <Modal
          isOpen={isPeriodModalOpen}
          onClose={() => setIsPeriodModalOpen(false)}
          title="Buat Periode Payroll Baru"
        >
          <form onSubmit={handleCreatePeriod} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Periode</label>
              <Input
                placeholder="Contoh: Gaji Oktober 2026"
                value={periodFormData.name}
                onChange={(e) =>
                  setPeriodFormData({ ...periodFormData, name: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bulan (1-12)</label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={periodFormData.month}
                  onChange={(e) =>
                    setPeriodFormData({ ...periodFormData, month: Number(e.target.value) })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tahun</label>
                <Input
                  type="number"
                  min="2020"
                  max="2035"
                  value={periodFormData.year}
                  onChange={(e) =>
                    setPeriodFormData({ ...periodFormData, year: Number(e.target.value) })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cut-off Mulai
                </label>
                <Input
                  type="date"
                  value={periodFormData.cutOffStartDate}
                  onChange={(e) =>
                    setPeriodFormData({ ...periodFormData, cutOffStartDate: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cut-off Selesai
                </label>
                <Input
                  type="date"
                  value={periodFormData.cutOffEndDate}
                  onChange={(e) =>
                    setPeriodFormData({ ...periodFormData, cutOffEndDate: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tanggal Pembayaran (Disbursal)
              </label>
              <Input
                type="date"
                value={periodFormData.paymentDate}
                onChange={(e) =>
                  setPeriodFormData({ ...periodFormData, paymentDate: e.target.value })
                }
                required
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsPeriodModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan Periode</Button>
            </div>
          </form>
        </Modal>

        {/* Modal Payslip Breakdown */}
        <Modal
          isOpen={isPayslipModalOpen}
          onClose={() => setIsPayslipModalOpen(false)}
          title={`Rincian Slip Gaji: ${selectedPayslip?.employee?.firstName} ${selectedPayslip?.employee?.lastName}`}
        >
          {selectedPayslip && (
            <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">
                    {selectedPayslip.employee?.firstName} {selectedPayslip.employee?.lastName}
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    NIK: {selectedPayslip.employee?.employeeIdNumber}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Take-Home Pay</span>
                  <span className="text-base font-black text-emerald-600">
                    Rp {selectedPayslip.netSalary.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {/* Earnings */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 text-emerald-700">
                  Penerimaan (Earnings)
                </h4>
                <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-100 text-xs">
                  {(selectedPayslip.items || [])
                    .filter((i: any) => i.type === "EARNING")
                    .map((item: any, idx: number) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-800">{item.componentName}</span>
                          {item.description && (
                            <span className="text-[10px] text-slate-400 block">
                              {item.description}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-slate-900">
                          Rp {item.amount.toLocaleString("id-ID")}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Deductions */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 text-rose-700">
                  Potongan (Deductions)
                </h4>
                <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-100 text-xs">
                  {(selectedPayslip.items || [])
                    .filter((i: any) => i.type === "DEDUCTION")
                    .map((item: any, idx: number) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-800">{item.componentName}</span>
                          {item.description && (
                            <span className="text-[10px] text-slate-400 block">
                              {item.description}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-rose-600">
                          -Rp {item.amount.toLocaleString("id-ID")}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Benefits */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 text-blue-700">
                  Manfaat Perusahaan (Company Benefits)
                </h4>
                <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-100 text-xs">
                  {(selectedPayslip.items || [])
                    .filter((i: any) => i.type === "BENEFIT")
                    .map((item: any, idx: number) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{item.componentName}</span>
                        <span className="font-bold text-blue-600">
                          Rp {item.amount.toLocaleString("id-ID")}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                <Button variant="outline" onClick={() => setIsPayslipModalOpen(false)}>
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminShell>
  );
}

export default function AdminPayrollRunsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat modul payroll...</div>}>
      <RunsContent />
    </React.Suspense>
  );
}
