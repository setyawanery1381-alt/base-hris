"use client";
import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Smartphone, Monitor, RefreshCw, ChevronDown, Check } from "lucide-react";

export const ViewportSwitcher: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const isMobileView = pathname.startsWith("/employee");

  const switchAccount = async (email: string) => {
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: email.startsWith("super") ? "admin123" : "password123" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user.roles.includes("EMPLOYEE")) {
          router.push("/employee");
        } else {
          router.push("/admin/dashboard");
        }
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div className="mb-2 p-3 bg-white rounded-2xl shadow-2xl border border-slate-200 w-72 text-xs space-y-3 animate-fade-in">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-800">Demo Environment Control</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">
              MULTI-TENANT
            </span>
          </div>

          {/* View Toggle */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Tampilan (Viewport)</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  router.push("/employee");
                  setIsOpen(false);
                }}
                className={`flex items-center justify-center space-x-1 py-1.5 rounded-lg border text-xs font-semibold ${
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
                className={`flex items-center justify-center space-x-1 py-1.5 rounded-lg border text-xs font-semibold ${
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
              <button
                onClick={() => switchAccount("employee@kanaya.com")}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-800">Rian Pratama</p>
                  <p className="text-[10px] text-slate-500">Employee • Kanaya Solusindo</p>
                </div>
                <span className="text-[10px] font-bold text-teal-600">Mobile</span>
              </button>

              <button
                onClick={() => switchAccount("manager@kanaya.com")}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-800">Dewi Sartika</p>
                  <p className="text-[10px] text-slate-500">Manager (Approver) • Kanaya</p>
                </div>
                <span className="text-[10px] font-bold text-blue-600">Admin</span>
              </button>

              <button
                onClick={() => switchAccount("hr@kanaya.com")}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-800">Budi Santoso</p>
                  <p className="text-[10px] text-slate-500">HR Admin • Kanaya Solusindo</p>
                </div>
                <span className="text-[10px] font-bold text-blue-600">Admin</span>
              </button>

              <button
                onClick={() => switchAccount("hr@abc.com")}
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
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-slate-900 text-white px-3.5 py-2 rounded-full shadow-2xl hover:bg-slate-800 text-xs font-semibold border border-slate-700 transition-all"
      >
        <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
        <span>Demo Switcher</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
};