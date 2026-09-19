"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Building, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/layout/theme-provider";

export default function LoginPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState("employee@kanaya.com");
  const [password, setPassword] = useState("KanayaEmp#2026");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Gagal login.");
        setIsLoading(false);
        return;
      }

      // Fetch dynamic branding for the user's tenant
      if (data.user?.companyId) {
        const brandRes = await fetch(`/api/v1/tenant/branding`);
        if (brandRes.ok) {
          const brandingData = await brandRes.json();
          setTheme(brandingData);
        }
      }

      // Redirect according to role
      if (data.user.roles.includes("EMPLOYEE") && !data.user.roles.includes("HR_ADMIN") && !data.user.roles.includes("SUPER_ADMIN")) {
        router.push("/employee");
      } else {
        router.push("/admin/dashboard");
      }
      router.refresh();
    } catch (err: any) {
      setErrorMessage("Terjadi gangguan jaringan atau server.");
      setIsLoading(false);
    }
  };

  const setTestAccount = (userEmail: string, userPass: string = "KanayaEmp#2026") => {
    setEmail(userEmail);
    setPassword(userPass);
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        {/* Header with White-Label Branding */}
        <div className="bg-gradient-to-r from-teal-700 to-teal-900 px-8 pt-8 pb-7 text-white relative">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-white font-black text-xl">
              {theme.appName ? theme.appName.charAt(0) : "B"}
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{theme.appName}</h1>
              <p className="text-xs text-teal-200">Single Sign-On HR Portal</p>
            </div>
          </div>
          <p className="text-xs text-teal-100/80 leading-relaxed mt-2">
            Masuk untuk mengakses layanan absensi, cuti, slip gaji, dan portal kepegawaian.
          </p>
        </div>

        {/* Login Form */}
        <div className="p-8">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                label="Email Perusahaan"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.com"
              />
            </div>

            <div>
              <Input
                label="Kata Sandi"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              className="w-full py-2.5 text-sm font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-700/20"
              isLoading={isLoading}
            >
              <span>Masuk ke Akun</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          {/* Quick Demo Credentials Pill Bar */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            {/* Client Trial Quick Button */}
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setTestAccount("klien@demohris.com", "TrialClient#2026")}
                className="w-full p-2.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 hover:border-blue-400 hover:shadow-sm transition-all text-left flex items-center justify-between"
              >
                <div>
                  <span className="flex items-center space-x-1.5 font-bold text-blue-900 text-xs">
                    <span>🚀 Akun Klien Trial (Aman Dicoba)</span>
                  </span>
                  <span className="block text-[11px] text-blue-600 mt-0.5">
                    PT Demo Solusi Pratama • Data Terisolasi
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-xs">
                  Coba Demo
                </span>
              </button>
            </div>

            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              Akses Karyawan & Admin Terdaftar
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setTestAccount("employee@kanaya.com", "KanayaEmp#2026")}
                className="p-2 text-left rounded-xl bg-slate-50 border border-slate-200 hover:bg-teal-50 hover:border-teal-300 transition-colors"
              >
                <span className="block font-semibold text-slate-700">📱 Karyawan</span>
                <span className="block text-[10px] text-slate-400 truncate">Rian (Mobile App)</span>
              </button>

              <button
                type="button"
                onClick={() => setTestAccount("hr@kanaya.com", "KanayaHR#2026")}
                className="p-2 text-left rounded-xl bg-slate-50 border border-slate-200 hover:bg-teal-50 hover:border-teal-300 transition-colors"
              >
                <span className="block font-semibold text-slate-700">👔 HR Admin</span>
                <span className="block text-[10px] text-slate-400 truncate">Budi (Desktop Admin)</span>
              </button>

              <button
                type="button"
                onClick={() => setTestAccount("manager@kanaya.com", "KanayaMgr#2026")}
                className="p-2 text-left rounded-xl bg-slate-50 border border-slate-200 hover:bg-teal-50 hover:border-teal-300 transition-colors"
              >
                <span className="block font-semibold text-slate-700">✍️ Manager</span>
                <span className="block text-[10px] text-slate-400 truncate">Dewi (Approver)</span>
              </button>

              <button
                type="button"
                onClick={() => setTestAccount("hr@abc.com", "AbcPerkasa#2026")}
                className="p-2 text-left rounded-xl bg-slate-50 border border-slate-200 hover:bg-teal-50 hover:border-teal-300 transition-colors"
              >
                <span className="block font-semibold text-slate-700">🏢 Tenant 2 (ABC)</span>
                <span className="block text-[10px] text-slate-400 truncate">Ahmad (Isolasi Data)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-8 py-3 text-center border-t border-slate-100 flex items-center justify-center space-x-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>Tenant Data Isolation Enforced (company_id)</span>
        </div>
      </div>
    </div>
  );
}