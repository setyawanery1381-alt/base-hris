"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Building2, HelpCircle, LogOut, FileText, ChevronRight } from "lucide-react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { useTheme } from "@/components/layout/theme-provider";

export default function EmployeeMorePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    fetch("/api/v1/auth/me").then(r => r.json()).then(d => setSession(d.user));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <MobileShell user={session}>
      <div className="bg-slate-50 min-h-full">
        <div
          className="text-white p-5 rounded-b-3xl shadow-md transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor || theme.primaryColor}, #0f172a)`,
          }}
        >
          <h1 className="text-lg font-black">Menu Selengkapnya</h1>
          <p className="text-[11px] text-white/80">Layanan kepegawaian & konfigurasi akun.</p>
        </div>

        <div className="p-4 space-y-3 text-xs font-semibold text-slate-700">
          {(session?.roles?.includes("HR_ADMIN") ||
            session?.roles?.includes("SUPER_ADMIN") ||
            session?.email?.includes("klien") ||
            session?.email?.includes("hr@")) && (
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl border border-indigo-900/60 overflow-hidden shadow-sm">
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="w-full p-4 flex items-center justify-between text-left text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm">Dashboard HR Admin</span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-[10px] font-semibold">
                        Trial Portal
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Kelola shift, master karyawan, & kebijakan HR
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-indigo-300 shrink-0" />
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            <button onClick={() => alert("Pengumuman: Tidak ada pengumuman mendesak.")} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 text-left">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>Pengumuman Perusahaan</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button onClick={() => alert("Struktur Organisasi: Kanaya Multi Solusindo (Tech & HR).")} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 text-left">
              <div className="flex items-center space-x-3">
                <Building2 className="w-4 h-4 text-teal-600" />
                <span>Struktur Organisasi</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button onClick={() => alert("HR Service Desk: Hubungi hr@kanaya.com untuk tiket baru.")} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 text-left">
              <div className="flex items-center space-x-3">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>HR Service Desk (Tiket)</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <button onClick={handleLogout} className="w-full p-4 flex items-center justify-between text-rose-600 hover:bg-rose-50 text-left font-bold">
              <div className="flex items-center space-x-3">
                <LogOut className="w-4 h-4" />
                <span>Keluar dari Akun (Logout)</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
