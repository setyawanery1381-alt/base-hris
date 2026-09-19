"use client";
import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Smartphone, Monitor, RefreshCw, ChevronDown, X, Sparkles } from "lucide-react";

export const ViewportSwitcher: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const isMobileView = pathname.startsWith("/employee");

  if (isDismissed) {
    return (
      <button
        onClick={() => setIsDismissed(false)}
        title="Buka Demo Switcher"
        className="fixed bottom-3 right-3 z-50 w-8 h-8 rounded-full bg-slate-900/80 text-teal-400 hover:bg-slate-900 flex items-center justify-center shadow-lg border border-slate-700/60 backdrop-blur-sm transition-transform active:scale-90"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    );
  }

  const switchAccount = async (email: string, pass: string) => {
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user.roles.includes("EMPLOYEE")) {
          router.push("/employee");
        } else {
          router.push("/admin/dashboard");
        }
        setIsOpen(false);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed bottom-3 right-3 z-50">
      {isOpen && (
        <div className="mb-2 p-3.5 bg-white rounded-2xl shadow-2xl border border-slate-200 w-72 max-w-[calc(100vw-24px)] text-xs space-y-3 animate-fade-in">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-800 flex items-center space-x-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-teal-600" />
              <span>Demo & Role Switcher</span>
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Viewport Toggle */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Pindah Mode Tampilan</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  router.push("/employee");
                  setIsOpen(false);
                }}
                className={`flex items-center justify-center space-x-1 py-1.5 rounded-xl border text-xs font-semibold ${
                  isMobileView
                    ? "bg-primary text-white border-primary"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile (Pro-Int)</span>
              </button>
              <button
                onClick={() => {
                  router.push("/admin/dashboard");
                  setIsOpen(false);
                }}
                className={`flex items-center justify-center space-x-1 py-1.5 rounded-xl border text-xs font-semibold ${
                  !isMobileView
                    ? "bg-primary text-white border-primary"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop HR</span>
              </button>
            </div>
          </div>

          {/* Fast Switch User */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">
              Ganti Akun & Tenant (1-Click)
            </p>
            <div className="space-y-1">
              {/* Client Trial Account */}
              <button
                onClick={() => switchAccount("klien@demohris.com", "TrialClient#2026")}
                className="w-full text-left px-2.5 py-1.5 rounded-xl bg-blue-50/80 hover:bg-blue-100 border border-blue-200 flex items-center justify-between transition-colors"
              >
                <div>
                  <p className="font-bold text-blue-900 flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>Klien Trial (Demo Bebas)</span>
                  </p>
                  <p className="text-[10px] text-blue-600">PT Demo Solusi (Isolasi Aman)</p>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-white px-1.5 py-0.5 rounded shadow-xs">
                  Trial
                </span>
              </button>

              <button
                onClick={() => switchAccount("employee@kanaya.com", "KanayaEmp#2026")}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-800">Rian Pratama</p>
                  <p className="text-[10px] text-slate-500">Employee • Kanaya Solusindo</p>
                </div>
                <span className="text-[10px] font-bold text-teal-600">Mobile</span>
              </button>

              <button
                onClick={() => switchAccount("hr@kanaya.com", "KanayaHR#2026")}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-800">Budi Santoso</p>
                  <p className="text-[10px] text-slate-500">HR Admin • Kanaya Solusindo</p>
                </div>
                <span className="text-[10px] font-bold text-blue-600">Admin</span>
              </button>

              <button
                onClick={() => switchAccount("manager@kanaya.com", "KanayaMgr#2026")}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-800">Dewi Sartika</p>
                  <p className="text-[10px] text-slate-500">Manager (Approver) • Kanaya</p>
                </div>
                <span className="text-[10px] font-bold text-purple-600">Approver</span>
              </button>

              <button
                onClick={() => switchAccount("hr@abc.com", "AbcPerkasa#2026")}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 flex items-center justify-between border-t border-slate-100 pt-1.5"
              >
                <div>
                  <p className="font-semibold text-slate-800">Ahmad Yani</p>
                  <p className="text-[10px] text-slate-500">HR Admin • PT ABC Perkasa (Tenant 2)</p>
                </div>
                <span className="text-[10px] font-bold text-indigo-600">Tenant 2</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setIsDismissed(true)}
              className="text-[10px] text-slate-400 hover:text-slate-600 underline"
            >
              Sembunyikan tombol ini
            </button>
          </div>
        </div>
      )}

      {/* Floating Button: Compact on Mobile, Pill on Desktop */}
      <div className="flex items-center space-x-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-1.5 bg-slate-900/90 hover:bg-slate-900 text-white px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-full shadow-2xl text-xs font-semibold border border-slate-700/80 backdrop-blur-sm active:scale-95 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span className="hidden sm:inline">Demo Switcher</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        <button
          onClick={() => setIsDismissed(true)}
          title="Tutup Switcher"
          className="p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] border border-slate-700"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};