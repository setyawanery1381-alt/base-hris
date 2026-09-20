"use client";
import React, { useState, useEffect } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import {
  Landmark,
  Download,
  Calendar,
  CreditCard,
  ArrowLeft,
  FileSpreadsheet,
  CheckCircle2,
  Copy,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter, useSearchParams } from "next/navigation";

function DisbursalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRunId = searchParams.get("runId");

  const [session, setSession] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<string>("BCA");
  const [disbursalPreview, setDisbursalPreview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [authRes, runsRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/payroll/runs"),
      ]);

      if (authRes.ok) setSession((await authRes.json()).user);
      if (runsRes.ok) {
        const runList = (await runsRes.json()).runs || [];
        setRuns(runList);

        const targetId = initialRunId || (runList.length > 0 ? runList[0].id : "");
        setSelectedRunId(targetId);
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

  useEffect(() => {
    if (selectedRunId) {
      fetch(`/api/v1/payroll/disbursal?runId=${selectedRunId}&format=${selectedFormat}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setDisbursalPreview(d);
          else setDisbursalPreview(null);
        })
        .catch(console.error);
    }
  }, [selectedRunId, selectedFormat]);

  const handleDownload = () => {
    if (!selectedRunId) return;
    const url = `/api/v1/payroll/disbursal?runId=${selectedRunId}&format=${selectedFormat}&download=true`;
    window.open(url, "_blank");
  };

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
              <span className="font-semibold text-slate-800">Disbursal Bank</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2.5">
              <Landmark className="w-7 h-7 text-amber-600" />
              <span>Ekspor Disbursal Bank (Batch Payroll)</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Hasilkan file transfer massal siap unggah untuk portal perbankan BCA, Mandiri MCM, BRI, dan BNI.
            </p>
          </div>
        </div>

        {/* Configuration Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Run Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Pilih Batch / Periode Payroll
              </label>
              <select
                value={selectedRunId}
                onChange={(e) => setSelectedRunId(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                {runs.length === 0 && <option value="">Belum ada batch payroll</option>}
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.period?.name} ({r.totalEmployees} Karyawan - Rp{" "}
                    {r.totalNetPay.toLocaleString("id-ID")})
                  </option>
                ))}
              </select>
            </div>

            {/* Bank Format Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Pilih Format Bank
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: "BCA", name: "BCA Payroll (.txt)" },
                  { id: "MANDIRI", name: "Mandiri MCM (.csv)" },
                  { id: "BRI", name: "BRI Direct (.csv)" },
                  { id: "BNI", name: "BNI Direct (.csv)" },
                  { id: "GENERIC_CSV", name: "Rekap Lengkap (.csv)" },
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedFormat(b.id)}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left ${
                      selectedFormat === b.id
                        ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Disbursal Summary & Download Card */}
        {disbursalPreview && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {disbursalPreview.file?.fileName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Total: {disbursalPreview.totalEmployees} Transaksi Transfer • Nominal:{" "}
                    <span className="font-black text-slate-900">
                      Rp {disbursalPreview.totalAmount.toLocaleString("id-ID")}
                    </span>
                  </p>
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-700/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File ({selectedFormat})</span>
              </button>
            </div>

            {/* Content Preview Box */}
            <div className="bg-slate-950 rounded-2xl p-5 shadow-inner text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 text-[11px] text-slate-400">
                <span>Pratinjau Format File:</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(disbursalPreview.file?.content || "");
                    alert("Konten disalin ke clipboard!");
                  }}
                  className="hover:text-white flex items-center space-x-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Teks</span>
                </button>
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed text-emerald-400">
                {disbursalPreview.file?.content}
              </pre>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

export default function AdminPayrollDisbursalPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat modul disbursal...</div>}>
      <DisbursalContent />
    </React.Suspense>
  );
}
