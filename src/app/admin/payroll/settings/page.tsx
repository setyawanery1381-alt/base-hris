"use client";
import React, { useState, useEffect } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import {
  Settings,
  ShieldCheck,
  TrendingUp,
  Save,
  ArrowLeft,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function AdminPayrollSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    bpjsKesCompanyRate: 4.0,
    bpjsKesEmployeeRate: 1.0,
    bpjsKesMaxCap: 12000000,
    bpjsTkJkkRate: 0.24,
    bpjsTkJkmRate: 0.30,
    bpjsTkJhtCompanyRate: 3.7,
    bpjsTkJhtEmployeeRate: 2.0,
    bpjsTkJpCompanyRate: 2.0,
    bpjsTkJpEmployeeRate: 1.0,
    bpjsTkJpMaxCap: 10042300,
    pph21Method: "TER_2024",
  });

  const loadData = async () => {
    try {
      const [authRes, setRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/payroll/settings"),
      ]);

      if (authRes.ok) setSession((await authRes.json()).user);
      if (setRes.ok) {
        const s = (await setRes.json()).settings;
        setSettings(s);
        if (s) {
          setFormData({
            bpjsKesCompanyRate: s.bpjsKesCompanyRate ?? 4.0,
            bpjsKesEmployeeRate: s.bpjsKesEmployeeRate ?? 1.0,
            bpjsKesMaxCap: s.bpjsKesMaxCap ?? 12000000,
            bpjsTkJkkRate: s.bpjsTkJkkRate ?? 0.24,
            bpjsTkJkmRate: s.bpjsTkJkmRate ?? 0.30,
            bpjsTkJhtCompanyRate: s.bpjsTkJhtCompanyRate ?? 3.7,
            bpjsTkJhtEmployeeRate: s.bpjsTkJhtEmployeeRate ?? 2.0,
            bpjsTkJpCompanyRate: s.bpjsTkJpCompanyRate ?? 2.0,
            bpjsTkJpEmployeeRate: s.bpjsTkJpEmployeeRate ?? 1.0,
            bpjsTkJpMaxCap: s.bpjsTkJpMaxCap ?? 10042300,
            pph21Method: s.pph21Method || "TER_2024",
          });
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
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg("");

    try {
      const res = await fetch("/api/v1/payroll/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan pengaturan");

      setSuccessMsg("Pengaturan BPJS & PPh 21 berhasil diperbarui!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell user={session}>
      <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
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
            <span className="font-semibold text-slate-800">Pengaturan BPJS & Pajak</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2.5">
            <Settings className="w-7 h-7 text-slate-700" />
            <span>Pengaturan Regulasi BPJS & PPh 21</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Konfigurasi tarif resmi ketenagakerjaan, kesehatan, dan metode pemotongan pajak penghasilan karyawan.
          </p>
        </div>

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* BPJS Kesehatan Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">BPJS Kesehatan</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tarif Perusahaan (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.bpjsKesCompanyRate}
                  onChange={(e) =>
                    setFormData({ ...formData, bpjsKesCompanyRate: Number(e.target.value) })
                  }
                  required
                />
                <span className="text-[10px] text-slate-400">Standar: 4.0%</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tarif Karyawan (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.bpjsKesEmployeeRate}
                  onChange={(e) =>
                    setFormData({ ...formData, bpjsKesEmployeeRate: Number(e.target.value) })
                  }
                  required
                />
                <span className="text-[10px] text-slate-400">Standar: 1.0%</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Batas Maksimal Upah (Cap)
                </label>
                <Input
                  type="number"
                  value={formData.bpjsKesMaxCap}
                  onChange={(e) =>
                    setFormData({ ...formData, bpjsKesMaxCap: Number(e.target.value) })
                  }
                  required
                />
                <span className="text-[10px] text-slate-400">Standar: Rp 12.000.000</span>
              </div>
            </div>
          </div>

          {/* BPJS Ketenagakerjaan Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">BPJS Ketenagakerjaan</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  JKK (Kecelakaan Kerja) %
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.bpjsTkJkkRate}
                  onChange={(e) =>
                    setFormData({ ...formData, bpjsTkJkkRate: Number(e.target.value) })
                  }
                  required
                />
                <span className="text-[10px] text-slate-400">
                  Ditanggung perusahaan (0.24% - 1.74%)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  JKM (Kematian) %
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.bpjsTkJkmRate}
                  onChange={(e) =>
                    setFormData({ ...formData, bpjsTkJkmRate: Number(e.target.value) })
                  }
                  required
                />
                <span className="text-[10px] text-slate-400">
                  Ditanggung perusahaan (Standar: 0.30%)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  JHT Perusahaan (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.bpjsTkJhtCompanyRate}
                  onChange={(e) =>
                    setFormData({ ...formData, bpjsTkJhtCompanyRate: Number(e.target.value) })
                  }
                  required
                />
                <span className="text-[10px] text-slate-400">Standar: 3.7%</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  JHT Karyawan (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.bpjsTkJhtEmployeeRate}
                  onChange={(e) =>
                    setFormData({ ...formData, bpjsTkJhtEmployeeRate: Number(e.target.value) })
                  }
                  required
                />
                <span className="text-[10px] text-slate-400">Standar: 2.0%</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  JP (Pensiun) Perusahaan (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.bpjsTkJpCompanyRate}
                  onChange={(e) =>
                    setFormData({ ...formData, bpjsTkJpCompanyRate: Number(e.target.value) })
                  }
                  required
                />
                <span className="text-[10px] text-slate-400">Standar: 2.0%</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  JP (Pensiun) Karyawan (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.bpjsTkJpEmployeeRate}
                  onChange={(e) =>
                    setFormData({ ...formData, bpjsTkJpEmployeeRate: Number(e.target.value) })
                  }
                  required
                />
                <span className="text-[10px] text-slate-400">Standar: 1.0%</span>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Batas Maksimal Upah JP (Cap)
                </label>
                <Input
                  type="number"
                  value={formData.bpjsTkJpMaxCap}
                  onChange={(e) =>
                    setFormData({ ...formData, bpjsTkJpMaxCap: Number(e.target.value) })
                  }
                  required
                />
                <span className="text-[10px] text-slate-400">
                  Standar Cap JP 2024/2025: Rp 10.042.300
                </span>
              </div>
            </div>
          </div>

          {/* PPh 21 Method Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Pajak Penghasilan (PPh Pasal 21)
              </h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Metode Perhitungan Pajak
              </label>
              <select
                value={formData.pph21Method}
                onChange={(e) => setFormData({ ...formData, pph21Method: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="TER_2024">
                  PPh 21 TER 2024 (PP 58/2023 & PMK 168/2023) - Standar Resmi
                </option>
                <option value="GROSS">Gross (Pajak ditanggung Karyawan)</option>
                <option value="GROSS_UP">Gross-Up (Tunjangan Pajak oleh Perusahaan)</option>
                <option value="NETT">Nett (Pajak ditanggung Perusahaan)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                Skema TER 2024 mengelompokkan karyawan ke Kategori A, B, atau C berdasarkan status PTKP dan menerapkan tarif efektif bulanan secara otomatis.
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-slate-900/20 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Menyimpan..." : "Simpan Konfigurasi"}</span>
            </button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
