"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, ShieldCheck, Eye, EyeOff, Sparkles, Building2 } from "lucide-react";
import { useTheme } from "@/components/layout/theme-provider";

export default function LoginPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Silakan masukkan email dan kata sandi Anda.");
      return;
    }

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
        setErrorMessage(data.error || "Email atau kata sandi tidak valid.");
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

      // Redirect langsung ke dashboard karyawan terlebih dahulu (/employee)
      router.push("/employee");
      router.refresh();
    } catch (err: any) {
      setErrorMessage("Terjadi gangguan jaringan atau server. Silakan coba lagi.");
      setIsLoading(false);
    }
  };

  const setDemoAccount = () => {
    setEmail("klien@demohris.com");
    setPassword("TrialClient#2026");
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Ambient Background Glows */}
      <div
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
        style={{ background: theme.primaryColor || "#4f46e5" }}
      />
      <div
        className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full blur-3xl opacity-15 pointer-events-none transition-all duration-700"
        style={{ background: theme.secondaryColor || "#818cf8" }}
      />

      {/* Subtle Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#fff 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-slate-950/60 overflow-hidden border border-slate-100 relative z-10 text-slate-900 transition-all">
        {/* Dynamic Header */}
        <div
          className="px-8 pt-9 pb-8 text-white relative overflow-hidden transition-all duration-500"
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor || "#4f46e5"} 0%, ${
              theme.secondaryColor || "#3730a3"
            } 100%)`,
          }}
        >
          {/* Subtle overlay texture */}
          <div className="absolute inset-0 bg-black/10 mix-blend-overlay pointer-events-none" />

          <div className="relative z-10">
            {/* Top Brand Identity */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {theme.logoUrl ? (
                  <img
                    src={theme.logoUrl}
                    alt={theme.appName}
                    className="w-11 h-11 rounded-2xl object-cover bg-white/10 p-1 backdrop-blur-md border border-white/25 shadow-sm"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/30 text-white font-black text-xl shadow-sm">
                    {theme.appName ? theme.appName.charAt(0) : "K"}
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
                    {theme.appName || "BASE HRIS"}
                  </h1>
                  <p className="text-xs text-white/80 font-medium">
                    {theme.companyName || "Human Resource Portal"}
                  </p>
                </div>
              </div>

              <div className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] font-semibold text-white tracking-wide uppercase">
                Single Sign-On
              </div>
            </div>

            <p className="text-xs text-white/85 leading-relaxed font-normal">
              Masuk dengan akun resmi Anda untuk mengakses absensi, cuti, slip gaji, dan administrasi kepegawaian.
            </p>
          </div>
        </div>

        {/* Login Form Body */}
        <div className="p-8">
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start space-x-2.5 animate-in fade-in slide-in-from-top-1">
              <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0 mt-1"></span>
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Perusahaan
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@perusahaan.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Lupa sandi?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center pt-1 pb-1">
              <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
                />
                <span>Ingat saya di perangkat ini</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                background: `linear-gradient(135deg, ${theme.primaryColor || "#4f46e5"}, ${
                  theme.secondaryColor || "#4338ca"
                })`,
              }}
              className="w-full py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-md hover:shadow-lg hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi Akses...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Akun</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Client Trial Quick Demo (Safe & Isolated) */}
          <div className="mt-7 pt-5 border-t border-slate-100">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    Akses Klien Trial (Demo)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Eksplorasi fitur • Data terisolasi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={setDemoAccount}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-xs cursor-pointer"
              >
                Coba Demo
              </button>
            </div>
          </div>
        </div>

        {/* Card Footer with Security Badges */}
        <div className="bg-slate-50/80 px-8 py-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium text-slate-500">256-Bit SSL Enkripsi</span>
          </div>
          <span className="text-slate-300">•</span>
          <div className="flex items-center space-x-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-500">Multi-Tenant Isolated</span>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-slate-800 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold mb-2">Bantuan Lupa Kata Sandi</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Untuk alasan keamanan dan perlindungan data kepegawaian, pengaturan ulang kata sandi dilakukan secara terpusat oleh Departemen HR atau IT Administrator perusahaan Anda.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 mb-4">
              Silakan hubungi HR Admin atau kirimkan permohonan ke email resmi HR perusahaan Anda.
            </div>
            <button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Mengerti & Tutup
            </button>
          </div>
        </div>
      )}

      {/* Brand Footer Info */}
      <div className="mt-6 text-center text-xs text-slate-500 relative z-10">
        <p>{theme.footerText || "Powered by BASE HRIS Platform"}</p>
      </div>
    </div>
  );
}