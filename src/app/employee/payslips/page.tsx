"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { useTheme } from "@/components/layout/theme-provider";
import {
  Banknote,
  Calendar,
  ChevronRight,
  ArrowLeft,
  FileText,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function EmployeePayslipsListPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [session, setSession] = useState<any>(null);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [authRes, payRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/payroll/payslips?scope=mine"),
      ]);

      if (authRes.ok) setSession((await authRes.json()).user);
      if (payRes.ok) setPayslips((await payRes.json()).payslips || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <MobileShell user={session}>
      <div className="bg-slate-50 min-h-full pb-8">
        {/* Header */}
        <div
          className="text-white p-5 rounded-b-[32px] shadow-md transition-all duration-300 relative"
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor || theme.primaryColor}, #0f172a)`,
          }}
        >
          <div className="flex items-center space-x-2 text-white/80 mb-2">
            <button
              onClick={() => router.push("/employee")}
              className="p-1 rounded-full hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold">Beranda</span>
          </div>

          <h1 className="text-lg font-black tracking-tight flex items-center space-x-2">
            <Banknote className="w-5 h-5 text-emerald-300" />
            <span>Slip Gaji Digital</span>
          </h1>
          <p className="text-[11px] text-white/80 mt-0.5">
            Riwayat penerimaan upah, potongan pajak PPh 21, dan iuran BPJS.
          </p>
        </div>

        {/* Content List */}
        <div className="p-4 space-y-3">
          {payslips.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-xs mt-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Belum Ada Slip Gaji</h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Slip gaji akan muncul di sini setelah diterbitkan oleh bagian HR / Finance perusahaan.
              </p>
            </div>
          ) : (
            payslips.map((p) => {
              const monthNames = [
                "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                "Juli", "Agustus", "September", "Oktober", "November", "Desember"
              ];
              const periodLabel = p.period?.name || `Gaji ${monthNames[p.periodMonth - 1]} ${p.periodYear}`;

              return (
                <div
                  key={p.id}
                  onClick={() => router.push(`/employee/payslips/${p.id}`)}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <Banknote className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xs text-slate-900 group-hover:text-emerald-600 transition-colors">
                          {periodLabel}
                        </h3>
                        <span className="text-[10px] text-slate-400">
                          {p.publishedAt
                            ? new Date(p.publishedAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "Terbit"}
                        </span>
                      </div>
                    </div>

                    <Badge variant="success" className="text-[10px]">
                      {p.status === "PAID" ? "DIBAYAR" : "TERBIT"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Take-Home Pay</span>
                      <span className="text-base font-black text-slate-900 tracking-tight">
                        Rp {p.netSalary.toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 text-xs font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                      <span>Lihat Slip</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
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
