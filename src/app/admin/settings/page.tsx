"use client";
import React, { useState, useEffect } from "react";
import { Settings, Clock, CheckCircle } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminSettingsPage() {
  const [session, setSession] = useState<any>(null);
  const [policy, setPolicy] = useState<any>({
    name: "Kebijakan Kantor Utama",
    workStartTime: "08:30",
    workEndTime: "17:30",
    lateToleranceMinutes: 15,
    geofenceRadiusMeters: 150,
    isSelfieRequired: true,
    isGpsRequired: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/v1/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.company?.attendancePolicies?.[0]) setPolicy(data.company.attendancePolicies[0]);
      }
      const meRes = await fetch("/api/v1/auth/me");
      if (meRes.ok) setSession((await meRes.json()).user);
    }
    load();
  }, []);

  const handleSave = async (e: any) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy }),
      });
      if (res.ok) {
        setFeedback("Kebijakan absensi berhasil disimpan!");
        setTimeout(() => setFeedback(""), 3000);
      }
    } catch (e) { console.error(e); }
    finally { setIsSaving(false); }
  };

  return (
    <AdminShell user={session}>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Pengaturan Tenant & Kebijakan Absensi</h1>
          <p className="text-xs text-slate-500 mt-0.5">Konfigurasi jam masuk/pulang, toleransi terlambat, dan aturan geofence GPS (PRD Section 15 & 38).</p>
        </div>

        {feedback && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Jam Masuk Kerja (WIB)" value={policy.workStartTime} onChange={(e) => setPolicy({ ...policy, workStartTime: e.target.value })} />
              <Input label="Jam Pulang Kerja (WIB)" value={policy.workEndTime} onChange={(e) => setPolicy({ ...policy, workEndTime: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Toleransi Terlambat (Menit)" type="number" value={String(policy.lateToleranceMinutes)} onChange={(e) => setPolicy({ ...policy, lateToleranceMinutes: Number(e.target.value) })} />
              <Input label="Radius Geofence GPS (Meter)" type="number" value={String(policy.geofenceRadiusMeters)} onChange={(e) => setPolicy({ ...policy, geofenceRadiusMeters: Number(e.target.value) })} />
            </div>
            <div className="space-y-3 pt-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" checked={policy.isSelfieRequired} onChange={(e) => setPolicy({ ...policy, isSelfieRequired: e.target.checked })} className="w-4 h-4 text-primary rounded border-slate-300" />
                <span className="text-xs font-bold text-slate-700">Wajibkan Verifikasi Foto Selfie Saat Absen</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" checked={policy.isGpsRequired} onChange={(e) => setPolicy({ ...policy, isGpsRequired: e.target.checked })} className="w-4 h-4 text-primary rounded border-slate-300" />
                <span className="text-xs font-bold text-slate-700">Wajibkan Validasi Koordinat GPS di Dalam Geofence Kantor</span>
              </label>
            </div>
            <div className="pt-3">
              <Button type="submit" isLoading={isSaving} className="font-bold">Simpan Kebijakan Absensi</Button>
            </div>
          </form>
        </div>
      </div>
    </AdminShell>
  );
}
