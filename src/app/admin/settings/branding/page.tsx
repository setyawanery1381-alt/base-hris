"use client";
import React, { useState, useEffect } from "react";
import { Palette, CheckCircle, Smartphone, Monitor, Save, Sparkles } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/layout/theme-provider";

export default function BrandingSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [session, setSession] = useState<any>(null);
  const [appName, setAppName] = useState(theme.appName);
  const [primaryColor, setPrimaryColor] = useState(theme.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(theme.secondaryColor);
  const [footerText, setFooterText] = useState(theme.footerText);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/v1/auth/me");
      if (res.ok) {
        const data = await res.json();
        setSession(data.user);
        if (data.branding) {
          setAppName(data.branding.appName);
          setPrimaryColor(data.branding.primaryColor);
          setSecondaryColor(data.branding.secondaryColor);
          setFooterText(data.branding.footerText);
        }
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg("");

    try {
      const res = await fetch("/api/v1/tenant/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName,
          primaryColor,
          secondaryColor,
          footerText,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setTheme({
          appName,
          companyName: session?.companyName || "Kanaya Solusindo",
          primaryColor,
          secondaryColor,
          footerText,
        });
        setSuccessMsg("Branding berhasil disimpan! Warna dan identitas aplikasi telah diperbarui.");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const presetColors = [
    { name: "Teal Emerald", primary: "#0d9488", secondary: "#14b8a6" },
    { name: "Classic Navy Blue", primary: "#1e40af", secondary: "#3b82f6" },
    { name: "Indigo Purple", primary: "#4f46e5", secondary: "#818cf8" },
    { name: "Ruby Crimson", primary: "#be123c", secondary: "#f43f5e" },
    { name: "Slate Charcoal", primary: "#334155", secondary: "#64748b" },
  ];

  return (
    <AdminShell user={session}>
      <div className="space-y-6 max-w-5xl">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>White-Label Customization Engine</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Kustomisasi White-Label & Tema Tenant
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ubah nama aplikasi, palet warna brand, dan identitas visual tanpa mengubah kode sumber (PRD Section 6).
          </p>
        </div>

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Settings Form */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <form onSubmit={handleSave} className="space-y-5">
              <Input
                label="Nama Aplikasi (White-Label)"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="cth: ABC Employee Hub"
                helperText="Nama ini akan tampil di mobile app header, browser title, dan notifikasi."
              />

              {/* Color Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Pilihan Palet Warna Siap Pakai
                </label>
                <div className="flex flex-wrap gap-2">
                  {presetColors.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setPrimaryColor(p.primary);
                        setSecondaryColor(p.secondary);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium flex items-center space-x-2 hover:bg-slate-50"
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.primary }}></span>
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Warna Utama (Primary Color)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200"
                    />
                    <span className="font-mono text-xs font-bold text-slate-700">{primaryColor}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Warna Sekunder (Secondary)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200"
                    />
                    <span className="font-mono text-xs font-bold text-slate-700">{secondaryColor}</span>
                  </div>
                </div>
              </div>

              <Input
                label="Footer Text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="© 2026 PT Perusahaan Anda"
              />

              <div className="pt-3">
                <Button type="submit" isLoading={isSaving} className="w-full py-2.5 font-bold shadow-md">
                  Simpan & Terapkan Perubahan
                </Button>
              </div>
            </form>
          </div>

          {/* Live Mobile Viewport Preview */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <span className="text-xs font-bold text-slate-500 mb-2 flex items-center space-x-1">
              <Smartphone className="w-4 h-4 text-teal-600" />
              <span>Live Preview Branding Mobile</span>
            </span>

            <div className="w-[260px] bg-slate-900 rounded-[32px] p-2.5 shadow-2xl border-[5px] border-slate-800">
              <div className="w-full bg-white rounded-[24px] overflow-hidden text-[10px] flex flex-col h-[460px]">
                {/* Simulated Header */}
                <div
                  className="p-3 text-white transition-colors"
                  style={{ backgroundColor: primaryColor }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-black text-xs">{appName}</span>
                    <span className="w-2 h-2 rounded-full bg-white/40"></span>
                  </div>
                  <p className="opacity-90 font-bold">Halo, Rian Pratama 👋</p>
                  <p className="opacity-70 text-[8px]">Senior Frontend Engineer</p>
                </div>

                {/* Simulated Content */}
                <div className="p-3 flex-1 bg-slate-50 space-y-2">
                  <div className="bg-white p-2.5 rounded-xl shadow-xs border border-slate-100">
                    <div className="flex justify-between text-[8px] text-slate-400">
                      <span>HARI INI</span>
                      <span>09:18 WIB</span>
                    </div>
                    <button
                      type="button"
                      className="w-full mt-2 py-1.5 rounded-lg text-white font-bold text-[9px] shadow-sm transition-colors"
                      style={{ backgroundColor: primaryColor }}
                    >
                      CHECK IN
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div
                      className="p-2 rounded-xl text-white font-bold text-[8px]"
                      style={{ backgroundColor: secondaryColor }}
                    >
                      Cuti: 8 Hari
                    </div>
                    <div className="p-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-[8px]">
                      1 Pending
                    </div>
                  </div>
                </div>

                {/* Simulated Bottom Bar */}
                <div className="p-2 bg-white border-t border-slate-100 flex justify-around text-slate-400">
                  <span className="font-bold" style={{ color: primaryColor }}>Home</span>
                  <span>Me</span>
                  <span>Approval</span>
                  <span>More</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}