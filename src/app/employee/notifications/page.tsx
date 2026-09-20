"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  ArrowLeft,
  Trash2,
  CheckCircle2,
  Clock,
  CalendarDays,
  FileText,
  Briefcase,
  ChevronRight,
  Info,
} from "lucide-react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { useTheme } from "@/components/layout/theme-provider";

export default function EmployeeNotificationsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [session, setSession] = useState<any>(null);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [meRes, notifRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch(`/api/v1/notifications?category=${categoryFilter}`),
      ]);
      if (meRes.ok) setSession((await meRes.json()).user);
      if (notifRes.ok) {
        const data = await notifRes.json();
        setNotifs(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter]);

  const markAllRead = async () => {
    await fetch("/api/v1/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    loadData();
  };

  const markSingleRead = async (id: string, refModule?: string) => {
    await fetch("/api/v1/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (refModule === "LEAVE") router.push("/employee/leave");
    else if (refModule === "PERMISSION") router.push("/employee/permission");
    else if (refModule === "OVERTIME") router.push("/employee/overtime");
    else if (refModule === "APPROVAL") router.push("/employee/approval");
    else if (refModule === "ATTENDANCE") router.push("/employee/attendance");
    else loadData();
  };

  const clearRead = async () => {
    if (!confirm("Hapus semua notifikasi yang sudah dibaca?")) return;
    await fetch("/api/v1/notifications?clearAllRead=true", { method: "DELETE" });
    loadData();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "APPROVAL":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case "ATTENDANCE":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "HR":
        return <FileText className="w-4 h-4 text-amber-600" />;
      default:
        return <Info className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <MobileShell user={session}>
      <div className="bg-slate-50 min-h-full pb-10">
        {/* Header */}
        <div
          className="text-white p-5 rounded-b-3xl shadow-md transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor || theme.primaryColor}, #0f172a)`,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => router.push("/employee")}
              className="flex items-center space-x-1.5 text-xs text-white/80 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
            <div className="flex items-center space-x-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center space-x-1 text-[11px] font-bold cursor-pointer transition-all"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Tandai Baca</span>
                </button>
              )}
              <button
                onClick={clearRead}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white cursor-pointer transition-all"
                title="Bersihkan dibaca"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <h1 className="text-lg font-black tracking-tight flex items-center space-x-2">
            <span>Pusat Notifikasi</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">
                {unreadCount} Baru
              </span>
            )}
          </h1>
          <p className="text-[11px] text-white/80">
            Pembaruan status persetujuan, permohonan, absensi, dan kebijakan HR.
          </p>

          {/* Category Chips */}
          <div className="flex items-center space-x-1.5 mt-3.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: "ALL", label: "Semua" },
              { id: "APPROVAL", label: "Persetujuan" },
              { id: "ATTENDANCE", label: "Absensi" },
              { id: "HR", label: "Info HR" },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setCategoryFilter(chip.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                  categoryFilter === chip.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "bg-white/10 text-white/80 hover:bg-white/20"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-2.5">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Memuat notifikasi...
            </div>
          ) : notifs.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-slate-400 text-xs">
              <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-sm">Tidak Ada Notifikasi</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Semua notifikasi dan informasi terbaru telah Anda lihat.
              </p>
            </div>
          ) : (
            notifs.map((n: any) => (
              <div
                key={n.id}
                onClick={() => markSingleRead(n.id, n.referenceModule)}
                className={`p-4 rounded-2xl border text-xs transition-all cursor-pointer shadow-xs hover:border-slate-300 ${
                  !n.isRead
                    ? "bg-blue-50/50 border-blue-200"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      {getCategoryIcon(n.category)}
                    </div>
                    <span className="font-bold text-slate-900 text-xs">{n.title}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
                    )}
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(n.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <p className="text-slate-600 text-[11px] leading-relaxed pl-8">
                  {n.message}
                </p>

                {n.referenceModule && (
                  <div className="pl-8 pt-2 flex items-center justify-end text-[10px] font-bold text-primary">
                    <span>Lihat Detail Permohonan</span>
                    <ChevronRight className="w-3 h-3 ml-0.5" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </MobileShell>
  );
}
