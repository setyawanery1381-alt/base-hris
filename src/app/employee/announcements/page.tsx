"use client";

import React, { useState, useEffect } from "react";
import {
  Megaphone,
  Pin,
  Calendar,
  User,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  Building2,
  Tag,
  Share2,
} from "lucide-react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { useTheme } from "@/components/layout/theme-provider";
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_PRIORITIES,
  formatIndonesianDate,
} from "@/lib/letters-service-engine";

export default function EmployeeAnnouncementsPage() {
  const { theme } = useTheme();
  const [session, setSession] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      const [authRes, annRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch(`/api/v1/announcements${activeCategory !== "ALL" ? `?category=${activeCategory}` : ""}`),
      ]);

      if (authRes.ok) {
        const authData = await authRes.json();
        setSession(authData.user);
      }
      if (annRes.ok) {
        const data = await annRes.json();
        setAnnouncements(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [activeCategory]);

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <MobileShell user={session}>
      <div className="bg-slate-50 min-h-full pb-20">
        {/* Header */}
        <div
          className="text-white p-5 rounded-b-3xl shadow-md transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor || theme.primaryColor}, #0f172a)`,
          }}
        >
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black">Pengumuman Perusahaan</h1>
              <p className="text-[11px] text-white/80">Informasi resmi, regulasi & agenda kantor</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3">
          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            <button
              onClick={() => setActiveCategory("ALL")}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                activeCategory === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Semua ({announcements.length})
            </button>
            {ANNOUNCEMENT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Announcements Feed */}
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600 mb-2" />
              <p className="text-xs text-slate-500">Memuat pengumuman...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="py-14 text-center bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
                <Megaphone className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Tidak Ada Pengumuman</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Belum ada pengumuman untuk kategori ini. Informasi terbaru akan disiarkan di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((item) => {
                const categoryConfig =
                  ANNOUNCEMENT_CATEGORIES.find((c) => c.id === item.category) || {
                    label: item.category,
                    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
                  };
                const priorityConfig =
                  ANNOUNCEMENT_PRIORITIES[item.priority as keyof typeof ANNOUNCEMENT_PRIORITIES] || {
                    label: item.priority,
                    color: "bg-slate-100 text-slate-600",
                  };

                const isExpanded = Boolean(expandedCards[item.id]);

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                      item.isPinned
                        ? "border-amber-300 ring-2 ring-amber-100 shadow-sm"
                        : "border-slate-200/90 shadow-xs"
                    }`}
                  >
                    {/* Card Meta Top */}
                    <div className="p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.isPinned && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Pin className="w-3 h-3 fill-amber-600 text-amber-600" />
                              <span>Disematkan</span>
                            </span>
                          )}

                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${categoryConfig.badgeColor}`}
                          >
                            {categoryConfig.label}
                          </span>

                          {item.priority !== "NORMAL" && (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${priorityConfig.color}`}
                            >
                              {priorityConfig.label}
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] text-slate-400 font-medium">
                          {formatIndonesianDate(item.date || item.createdAt)}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {item.title}
                      </h3>

                      {/* Image Banner if available */}
                      {item.imageUrl && (
                        <div className="rounded-xl overflow-hidden max-h-48 border border-slate-100">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as any).style.display = "none";
                            }}
                          />
                        </div>
                      )}

                      {/* Content */}
                      <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                        {isExpanded
                          ? item.content
                          : item.content.length > 200
                          ? `${item.content.substring(0, 200)}...`
                          : item.content}
                      </div>

                      {/* Read more toggle */}
                      {item.content.length > 200 && (
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <span>Tampilkan Ringkas</span>
                              <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              <span>Baca Selengkapnya</span>
                              <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      )}

                      {/* Footer Info */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>Dari: <strong className="text-slate-600">{item.authorName || "HR Admin"}</strong></span>
                        </div>
                        <span className="text-slate-400">
                          {item.target === "ALL" ? "Semua Karyawan" : "Khusus Grup"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MobileShell>
  );
}
