"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import {
  Banknote,
  TrendingUp,
  ShieldCheck,
  Calculator,
  Users,
  CreditCard,
  Layers,
  Landmark,
  ArrowUpRight,
  Clock,
  Calendar,
  ChevronRight,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminPayrollDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [authRes, runsRes, periodsRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/payroll/runs"),
        fetch("/api/v1/payroll/periods"),
      ]);

      if (authRes.ok) setSession((await authRes.json()).user);
      if (runsRes.ok) setRuns((await runsRes.json()).runs || []);
      if (periodsRes.ok) setPeriods((await periodsRes.json()).periods || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalDisbursed = runs.reduce((acc, r) => acc + (r.totalNetPay || 0), 0);
  const totalTax = runs.reduce((acc, r) => acc + (r.totalPph21 || 0), 0);
  const totalBpjs = runs.reduce(
    (acc, r) => acc + (r.totalCompanyBpjs || 0) + (r.totalEmployeeBpjs || 0),
    0
  );
  const totalEmployees = runs[0]?.totalEmployees || 0;

  return (
    <AdminShell user={session}>
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2.5">
              <Banknote className="w-7 h-7 text-emerald-600" />
              <span>Dashboard Penggajian & Kompensasi</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Ringkasan pemrosesan gaji, potongan PPh 21 TER, BPJS Kesehatan & Ketenagakerjaan.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push("/admin/payroll/runs")}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-700/20 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Calculator className="w-4 h-4" />
              <span>Hitung / Proses Payroll</span>
            </button>
            <button
              onClick={() => router.push("/admin/payroll/disbursal")}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-xs flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Landmark className="w-4 h-4 text-slate-600" />
              <span>Ekspor Disbursal Bank</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Gaji Bersih (Disbursal)
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                Rp {totalDisbursed.toLocaleString("id-ID")}
              </span>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span>Akumulasi semua periode</span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total PPh 21 (TER 2024)
              </span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                Rp {totalTax.toLocaleString("id-ID")}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Potongan pajak sesuai PP 58/2023</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Iuran BPJS
              </span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                Rp {totalBpjs.toLocaleString("id-ID")}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">BPJS Kes & Ketenagakerjaan</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Karyawan Terproses
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {totalEmployees} <span className="text-sm font-semibold text-slate-400">Orang</span>
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Pada periode terbaru</p>
            </div>
          </div>
        </div>

        {/* Quick Nav Modules Grid */}
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
            Modul Manajemen Penggajian
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: "Komponen Gaji",
                desc: "Atur gaji pokok, tunjangan tetap/variabel & potongan.",
                href: "/admin/payroll/components",
                icon: Layers,
                color: "text-blue-600 bg-blue-50 border-blue-100",
              },
              {
                title: "Profil Gaji Karyawan",
                desc: "Kelola nominal gaji, status PTKP & nomor rekening.",
                href: "/admin/payroll/salaries",
                icon: CreditCard,
                color: "text-indigo-600 bg-indigo-50 border-indigo-100",
              },
              {
                title: "Proses Payroll (Kalkulasi)",
                desc: "Hitung otomatis lembur, mangkir, BPJS & PPh 21.",
                href: "/admin/payroll/runs",
                icon: Calculator,
                color: "text-emerald-600 bg-emerald-50 border-emerald-100",
              },
              {
                title: "Disbursal & Ekspor Bank",
                desc: "Download file transfer massal (BCA, Mandiri, BRI, BNI).",
                href: "/admin/payroll/disbursal",
                icon: Landmark,
                color: "text-amber-600 bg-amber-50 border-amber-100",
              },
            ].map((mod, i) => {
              const Icon = mod.icon;
              return (
                <div
                  key={i}
                  onClick={() => router.push(mod.href)}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${mod.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {mod.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Payroll Runs Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Riwayat Proses Payroll</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar batch penggajian yang telah diproses atau dalam proses kalkulasi.
              </p>
            </div>
            <button
              onClick={() => router.push("/admin/payroll/runs")}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
            >
              <span>Lihat Semua</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-100 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Nama Periode</th>
                  <th className="py-3 px-4">Tanggal Proses</th>
                  <th className="py-3 px-4 text-center">Jumlah Karyawan</th>
                  <th className="py-3 px-4 text-right">Total Take-Home Pay</th>
                  <th className="py-3 px-4 text-right">PPh 21 TER</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Belum ada proses payroll yang dijalankan. Silakan klik{" "}
                      <span
                        onClick={() => router.push("/admin/payroll/runs")}
                        className="text-emerald-600 font-bold underline cursor-pointer"
                      >
                        Hitung Payroll
                      </span>{" "}
                      untuk memulai.
                    </td>
                  </tr>
                ) : (
                  runs.slice(0, 5).map((run) => (
                    <tr key={run.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {run.period?.name || "Periode"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(run.runDate).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {run.totalEmployees} Orang
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        Rp {run.totalNetPay.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-blue-600">
                        Rp {run.totalPph21.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          variant={
                            run.status === "PAID"
                              ? "success"
                              : run.status === "CONFIRMED"
                              ? "primary"
                              : "warning"
                          }
                        >
                          {run.status === "PAID"
                            ? "DIBAYARKAN"
                            : run.status === "CONFIRMED"
                            ? "DISETUJUI"
                            : "DRAFT"}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => router.push(`/admin/payroll/runs?id=${run.id}`)}
                          className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors"
                        >
                          Detail
                        </button>
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
