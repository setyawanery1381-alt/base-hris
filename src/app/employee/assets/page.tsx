"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Laptop,
  ArrowLeft,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Cpu,
  Package,
  Sparkles,
  CheckCircle2,
  FileText,
  HelpCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { useTheme } from "@/components/layout/theme-provider";
import {
  ASSET_CATEGORIES,
  ASSET_CONDITIONS,
} from "@/lib/claims-assets-engine";

export default function EmployeeAssetsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [session, setSession] = useState<any>(null);
  const [myAssets, setMyAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [authRes, assetsRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/assets/my-assets"),
      ]);

      if (authRes.ok) {
        const authData = await authRes.json();
        setSession(authData.user);
      }
      if (assetsRes.ok) {
        const data = await assetsRes.json();
        setMyAssets(data.data || []);
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

  const handleReportIssue = (assetName: string, assetCode: string) => {
    alert(
      `Permintaan servis untuk perangkat ${assetName} (${assetCode}) telah dicatat.\nTim IT Support & HR akan segera menghubungi Anda.`
    );
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
              Aset Inventaris
            </span>
            <div className="w-7" />
          </div>

          <h1 className="text-xl font-black">Aset Kantor Saya</h1>
          <p className="text-[11px] text-white/80 mt-0.5">
            Daftar perangkat & inventaris perusahaan yang dipercayakan kepada Anda.
          </p>
        </div>

        {/* Count Banner */}
        <div className="px-4 -mt-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  {myAssets.length} Perangkat Aktif
                </span>
                <span className="text-[10px] text-slate-400">
                  Tercatat dalam Berita Acara Serah Terima (BAST)
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              Verified ✓
            </span>
          </div>
        </div>

        {/* Assets List */}
        <div className="px-4 mt-5 space-y-3">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
            Inventaris yang Dipegang
          </h2>

          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Memuat data aset inventaris...
            </div>
          ) : myAssets.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-600">Tidak Ada Aset yang Ditugaskan</p>
              <p className="text-[11px] mt-1">Saat ini belum ada inventaris kantor yang diserahterimakan kepada akun Anda.</p>
            </div>
          ) : (
            myAssets.map((item) => {
              const asset = item.asset;
              const catCfg = ASSET_CATEGORIES.find((c) => c.id === asset.category);
              const conditionCfg = ASSET_CONDITIONS[item.handoverCondition as keyof typeof ASSET_CONDITIONS] || {
                label: item.handoverCondition,
                color: "bg-slate-100 text-slate-700 border-slate-200",
              };

              return (
                <div
                  key={item.assignmentId}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                          {asset.assetCode}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {catCfg?.label || asset.category}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mt-1">{asset.name}</h3>
                      <p className="text-[11px] text-slate-500">
                        {asset.brand} {asset.model}
                      </p>
                    </div>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${conditionCfg.color}`}>
                      {conditionCfg.label}
                    </span>
                  </div>

                  {/* Hardware Details */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Nomor Seri Hardware (S/N):</span>
                      <strong className="font-mono text-slate-900">{asset.serialNumber || "-"}</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Tanggal Serah Terima:</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(item.assignedDate).toLocaleDateString("id-ID")}
                      </span>
                    </div>
                    {item.expectedReturnDate && (
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Batas Pengembalian:</span>
                        <span className="font-semibold text-amber-700">
                          {new Date(item.expectedReturnDate).toLocaleDateString("id-ID")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* BAST Notes */}
                  {item.handoverNotes && (
                    <p className="text-[11px] text-slate-500 italic bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      "{item.handoverNotes}"
                    </p>
                  )}

                  {/* Action */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>BAST Resmi Aktif</span>
                    </span>

                    <button
                      onClick={() => handleReportIssue(asset.name, asset.assetCode)}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs flex items-center space-x-1 transition-colors"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Lapor Kendala</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </MobileShell>
  );
}
