"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Building2, HelpCircle, LogOut, FileText, ChevronRight } from "lucide-react";
import { MobileShell } from "@/components/layout/mobile-shell";

export default function EmployeeMorePage() {
  const router = useRouter();
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
        <div className="bg-gradient-to-r from-teal-700 to-slate-900 text-white p-5 rounded-b-3xl shadow-md">
          <h1 className="text-lg font-black">Menu Selengkapnya</h1>
          <p className="text-[11px] text-teal-200">Layanan kepegawaian & konfigurasi akun.</p>
        </div>

        <div className="p-4 space-y-3 text-xs font-semibold text-slate-700">
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
