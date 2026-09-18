"use client";
import React, { useState, useEffect } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { MobileShell } from "@/components/layout/mobile-shell";

export default function EmployeeNotificationsPage() {
  const [session, setSession] = useState<any>(null);
  const [notifs, setNotifs] = useState<any[]>([]);

  const load = async () => {
    try {
      const [meRes, notifRes] = await Promise.all([fetch("/api/v1/auth/me"), fetch("/api/v1/notifications")]);
      if (meRes.ok) setSession((await meRes.json()).user);
      if (notifRes.ok) setNotifs((await notifRes.json()).notifications || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    await fetch("/api/v1/notifications", { method: "PUT" });
    load();
  };

  return (
    <MobileShell user={session}>
      <div className="bg-slate-50 min-h-full">
        <div className="bg-gradient-to-r from-teal-700 to-slate-900 text-white p-5 rounded-b-3xl shadow-md flex justify-between items-center">
          <div>
            <h1 className="text-lg font-black">Notifikasi In-App</h1>
            <p className="text-[11px] text-teal-200">Pembaruan status pengajuan & info HR.</p>
          </div>
          <button onClick={markAllRead} className="p-2 rounded-xl bg-white/10 text-teal-200 hover:text-white flex items-center space-x-1 text-xs font-bold">
            <CheckCheck className="w-4 h-4" />
            <span>Tandai Baca</span>
          </button>
        </div>

        <div className="p-4 space-y-2.5">
          {notifs.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-slate-400 text-xs">
              <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">Belum ada notifikasi baru</p>
            </div>
          ) : (
            notifs.map((n: any) => (
              <div key={n.id} className={`p-4 rounded-2xl border text-xs transition-colors ${!n.isRead ? "bg-teal-50/70 border-teal-200" : "bg-white border-slate-200"}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-900 text-xs">{n.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{new Date(n.createdAt).toLocaleDateString("id-ID")}</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">{n.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </MobileShell>
  );
}
