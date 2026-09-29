"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  CalendarDays,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  MapPin,
  ChevronRight,
  Bell,
  Sparkles,
  Building2,
  Banknote,
  Award,
  Target,
  Receipt,
  Plane,
  Laptop,
  FileCheck,
  HelpCircle,
  Megaphone,
  CheckCircle2,
  Briefcase,
  Navigation,
  Camera,
  Eye,
  X,
} from "lucide-react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { AttendanceModal } from "@/components/employee/attendance-modal";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/layout/theme-provider";

export default function EmployeeMobileDashboard() {
  const router = useRouter();
  const { theme } = useTheme();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [todayData, setTodayData] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAttendModalOpen, setIsAttendModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"checkin" | "checkout">("checkin");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<{
    url: string;
    title: string;
    type?: string;
  } | null>(null);

  // Live digital clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      const [authRes, todayRes, annRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/attendance/today"),
        fetch("/api/v1/announcements"),
      ]);

      if (authRes.ok) {
        const authData = await authRes.json();
        setSessionUser(authData.user);
      }
      if (todayRes.ok) {
        const today = await todayRes.json();
        setTodayData(today);
      }
      if (annRes.ok) {
        const annData = await annRes.json();
        setAnnouncements(annData.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const attendance = todayData?.attendance;
  const isCheckedIn = Boolean(attendance?.checkInTime);
  const isCheckedOut = Boolean(attendance?.checkOutTime);
  const effectiveMode = todayData?.attendanceMode || "OFFICE";

  // Calculate live or finalized working duration
  let durationStr = "-";
  if (isCheckedIn && !isCheckedOut && attendance?.checkInTime) {
    const diffMs = Math.max(0, currentTime.getTime() - new Date(attendance.checkInTime).getTime());
    const hrs = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
    durationStr = hrs > 0 ? `${hrs}j ${mins}m` : `${mins}m ${secs}d`;
  } else if (isCheckedOut) {
    const totalMinutes = attendance?.workingDurationMinutes || todayData?.workingDurationMinutes || 0;
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    durationStr = `${hrs}j ${mins}m`;
  }

  const formattedTimeStr = currentTime.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const checkInTimeStr = attendance?.checkInTime
    ? new Date(attendance.checkInTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : null;

  const checkOutTimeStr = attendance?.checkOutTime
    ? new Date(attendance.checkOutTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <MobileShell
      user={sessionUser}
      pendingApprovalsCount={0}
      unreadNotificationsCount={1}
    >
      <div className="bg-slate-50 min-h-full">
        {/* Top Header Section */}
        <div
          className="text-white px-5 pt-5 pb-16 rounded-b-[32px] shadow-md relative transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor || theme.primaryColor}, #0f172a)`,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{ backgroundColor: theme.secondaryColor || "#ffffff" }}
              ></span>
              <span className="text-[11px] font-bold tracking-wider uppercase text-white/90">
                {theme.appName || sessionUser?.companyName || "Kanaya Solusindo"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {(sessionUser?.roles?.includes("HR_ADMIN") ||
                sessionUser?.roles?.includes("SUPER_ADMIN") ||
                sessionUser?.email?.includes("klien") ||
                sessionUser?.email?.includes("hr@")) && (
                <button
                  onClick={() => router.push("/admin/dashboard")}
                  className="px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white text-[11px] font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5 text-white" />
                  <span>Admin Trial ↗</span>
                </button>
              )}
              <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm text-white/80 hover:text-white">
                <Bell className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3.5">
            <Avatar name={sessionUser?.name || "Rian Pratama"} size="lg" className="border-2 border-white/30" />
            <div className="truncate">
              <h1 className="text-lg font-black tracking-tight text-white flex items-center space-x-1.5">
                <span>Halo, {sessionUser?.name?.split(" ")[0] || "Rian"}</span>
                <span>👋</span>
              </h1>
              <p className="text-xs text-white/80 font-medium truncate">
                Senior Frontend Engineer • Tech
              </p>
              <p className="text-[10px] text-white/70 font-mono mt-0.5">
                ID: {sessionUser?.employeeNumber || "KNY-003"}
              </p>
            </div>
          </div>
        </div>

        {/* Floating GET TIME / Work Attendance Card */}
        <div className="px-4 -mt-10 mb-5 relative z-10">
          <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100">
            {/* Header: Mode Badge & Live Date */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-black text-slate-900 tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  GET TIME
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  • {currentTime.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}
                </span>
              </div>
              
              {/* Work Mode Badge */}
              <div
                className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                  effectiveMode === "FIELD"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : effectiveMode === "HYBRID"
                    ? "bg-sky-50 text-sky-700 border-sky-200"
                    : "bg-indigo-50 text-indigo-700 border-indigo-200"
                }`}
              >
                {effectiveMode === "FIELD" ? (
                  <>
                    <Navigation className="w-3 h-3 text-emerald-600" />
                    <span>LAPANGAN (FIELD)</span>
                  </>
                ) : effectiveMode === "HYBRID" ? (
                  <>
                    <Laptop className="w-3 h-3 text-sky-600" />
                    <span>HYBRID WORK</span>
                  </>
                ) : (
                  <>
                    <Building2 className="w-3 h-3 text-indigo-600" />
                    <span>WFO / KANTOR</span>
                  </>
                )}
              </div>
            </div>

            {/* Attendance Status & Live Clock */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Waktu Server Real-Time
                </p>
                <p className="text-3xl font-black text-slate-800 font-mono tracking-tight mt-0.5">
                  {formattedTimeStr}
                </p>
                <p className="text-[11px] text-slate-500 flex items-center space-x-1 mt-1 font-medium">
                  <MapPin className="w-3 h-3" style={{ color: theme.primaryColor }} />
                  <span className="truncate max-w-[170px]">
                    {effectiveMode === "FIELD"
                      ? "Area Kerja Lapangan Dinamis"
                      : todayData?.officeLocation?.name || "Puri Indah Office"}
                  </span>
                </p>
              </div>

              <div className="text-right flex flex-col items-end">
                <span className="text-[10px] font-semibold text-slate-400 block mb-1">Status Kehadiran</span>
                {!isCheckedIn ? (
                  <Badge variant="neutral" className="font-bold text-[11px] px-2.5 py-1">Belum Check-In</Badge>
                ) : isCheckedOut ? (
                  <Badge variant="success" className="font-bold text-[11px] px-2.5 py-1">Sudah Check-Out</Badge>
                ) : (
                  <Badge variant="primary" className="font-bold text-[11px] px-2.5 py-1 animate-pulse">
                    Working (Aktif)
                  </Badge>
                )}
                <span className="text-[10px] text-slate-400 mt-1.5 font-medium">
                  {todayData?.isOffDay
                    ? "Off-Day (Libur)"
                    : todayData?.shift
                    ? `${todayData.shift.name} (${todayData.shift.startTime} - ${todayData.shift.endTime})`
                    : "Shift Reguler"}
                </span>
              </div>
            </div>

            {/* 3-Column Metrics: Masuk, Keluar, Durasi Kerja */}
            <div className="grid grid-cols-3 gap-2 py-3 px-3 rounded-2xl bg-slate-50 border border-slate-100 mb-4 text-center">
              <div className="border-r border-slate-200/70 pr-1">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Masuk</span>
                <span className="text-xs font-black text-slate-700 font-mono mt-0.5 block">
                  {checkInTimeStr || "--:--"}
                </span>
              </div>
              <div className="border-r border-slate-200/70 pr-1">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Keluar</span>
                <span className="text-xs font-black text-slate-700 font-mono mt-0.5 block">
                  {checkOutTimeStr || "--:--"}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Durasi Kerja</span>
                <span className={`text-xs font-black font-mono mt-0.5 block ${isCheckedIn && !isCheckedOut ? "text-emerald-600 animate-pulse" : "text-slate-700"}`}>
                  {durationStr}
                </span>
              </div>
            </div>

            {/* Primary Action Button */}
            {!isCheckedIn ? (
              <button
                onClick={() => {
                  setModalType("checkin");
                  setIsAttendModalOpen(true);
                }}
                style={{
                  backgroundColor: theme.primaryColor,
                  boxShadow: `0 10px 25px -5px ${theme.primaryColor}50`,
                }}
                className="w-full py-3.5 rounded-2xl text-white font-black text-xs tracking-wider uppercase shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-[0.98] cursor-pointer"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>GET TIME • CHECK IN (ABSEN MASUK)</span>
              </button>
            ) : !isCheckedOut ? (
              <button
                onClick={() => {
                  setModalType("checkout");
                  setIsAttendModalOpen(true);
                }}
                className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-rose-700/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                <span>GET TIME • CHECK OUT (SELESAI KERJA)</span>
              </button>
            ) : (
              <div className="w-full py-3 px-4 rounded-2xl bg-slate-100/90 text-slate-600 font-bold text-xs flex items-center justify-center space-x-2 border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Absensi kerja hari ini telah lengkap</span>
              </div>
            )}

            {/* Bukti Foto Kehadiran Hari Ini (Selfie & Area) */}
            {isCheckedIn && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Camera className="w-3 h-3 text-indigo-500" />
                    Bukti Foto Kehadiran ({[attendance?.checkInPhotoUrl, attendance?.checkInAreaPhotoUrl, attendance?.checkOutPhotoUrl, attendance?.checkOutAreaPhotoUrl].filter(Boolean).length})
                  </span>
                  <span className="text-[9px] text-indigo-600 font-semibold">Ketuk untuk perbesar</span>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {/* Checkin Selfie */}
                  {attendance?.checkInPhotoUrl && (
                    <div
                      onClick={() =>
                        setSelectedPhotoPreview({
                          url: attendance.checkInPhotoUrl,
                          title: "Selfie Check-In Masuk",
                          type: "CHECKIN_SELFIE",
                        })
                      }
                      className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 border-indigo-200 relative group cursor-pointer shadow-xs hover:border-indigo-500 transition-all"
                    >
                      <img
                        src={attendance.checkInPhotoUrl}
                        alt="Checkin Selfie"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[8px] font-bold text-center py-0.5 truncate px-0.5">
                        In Selfie
                      </div>
                    </div>
                  )}

                  {/* Checkin Area */}
                  {attendance?.checkInAreaPhotoUrl && (
                    <div
                      onClick={() =>
                        setSelectedPhotoPreview({
                          url: attendance.checkInAreaPhotoUrl,
                          title: "Foto Area Check-In",
                          type: "CHECKIN_AREA",
                        })
                      }
                      className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 border-sky-200 relative group cursor-pointer shadow-xs hover:border-sky-500 transition-all"
                    >
                      <img
                        src={attendance.checkInAreaPhotoUrl}
                        alt="Checkin Area"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[8px] font-bold text-center py-0.5 truncate px-0.5">
                        In Area
                      </div>
                    </div>
                  )}

                  {/* Checkout Selfie */}
                  {attendance?.checkOutPhotoUrl && (
                    <div
                      onClick={() =>
                        setSelectedPhotoPreview({
                          url: attendance.checkOutPhotoUrl,
                          title: "Selfie Check-Out Keluar",
                          type: "CHECKOUT_SELFIE",
                        })
                      }
                      className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 border-rose-200 relative group cursor-pointer shadow-xs hover:border-rose-500 transition-all"
                    >
                      <img
                        src={attendance.checkOutPhotoUrl}
                        alt="Checkout Selfie"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[8px] font-bold text-center py-0.5 truncate px-0.5">
                        Out Selfie
                      </div>
                    </div>
                  )}

                  {/* Checkout Area */}
                  {attendance?.checkOutAreaPhotoUrl && (
                    <div
                      onClick={() =>
                        setSelectedPhotoPreview({
                          url: attendance.checkOutAreaPhotoUrl,
                          title: "Foto Area Check-Out",
                          type: "CHECKOUT_AREA",
                        })
                      }
                      className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 border-amber-200 relative group cursor-pointer shadow-xs hover:border-amber-500 transition-all"
                    >
                      <img
                        src={attendance.checkOutAreaPhotoUrl}
                        alt="Checkout Area"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[8px] font-bold text-center py-0.5 truncate px-0.5">
                        Out Area
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Admin / Trial Portal Switcher Banner */}
        {(sessionUser?.roles?.includes("HR_ADMIN") ||
          sessionUser?.roles?.includes("SUPER_ADMIN") ||
          sessionUser?.email?.includes("klien") ||
          sessionUser?.email?.includes("hr@")) && (
          <div className="px-4 mb-5">
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-900/60 shadow-lg flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-xs text-white">Mode Administrator HR</span>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 text-[9px] font-bold tracking-wider uppercase">
                      Trial
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Uji coba kelola shift, kebijakan absensi & persetujuan
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1 shrink-0 cursor-pointer"
              >
                <span>Buka Admin</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions (Pro-Int Style Grid) */}
        <div className="px-4 mb-5">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 px-1">
            Menu Cepat
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
            {[
              {
                label: "Absensi",
                icon: CalendarCheck,
                color: "bg-primary/10 text-primary border-primary/20",
                onClick: () => {
                  router.push("/employee/attendance");
                },
              },
              {
                label: "Cuti",
                icon: CalendarDays,
                color: "bg-blue-50 text-blue-600 border-blue-200",
                onClick: () => {
                  router.push("/employee/leave");
                },
              },
              {
                label: "Izin",
                icon: FileText,
                color: "bg-amber-50 text-amber-600 border-amber-200",
                onClick: () => {
                  router.push("/employee/permission");
                },
              },
              {
                label: "Lembur",
                icon: Clock,
                color: "bg-purple-50 text-purple-600 border-purple-200",
                onClick: () => {
                  router.push("/employee/overtime");
                },
              },
              {
                label: "Slip Gaji",
                icon: Banknote,
                color: "bg-emerald-50 text-emerald-600 border-emerald-200",
                onClick: () => {
                  router.push("/employee/payslips");
                },
              },
              {
                label: "Kinerja/KPI",
                icon: Award,
                color: "bg-indigo-50 text-indigo-600 border-indigo-200",
                onClick: () => {
                  router.push("/employee/performance");
                },
              },
              {
                label: "Klaim/Reimburse",
                icon: Receipt,
                color: "bg-teal-50 text-teal-600 border-teal-200",
                onClick: () => {
                  router.push("/employee/claims");
                },
              },
              {
                label: "Dinas (SPPD)",
                icon: Plane,
                color: "bg-cyan-50 text-cyan-600 border-cyan-200",
                onClick: () => {
                  router.push("/employee/trips");
                },
              },
              {
                label: "Aset Saya",
                icon: Laptop,
                color: "bg-violet-50 text-violet-600 border-violet-200",
                onClick: () => {
                  router.push("/employee/assets");
                },
              },
              {
                label: "Surat Resmi",
                icon: FileCheck,
                color: "bg-blue-50 text-blue-600 border-blue-200",
                onClick: () => {
                  router.push("/employee/letters");
                },
              },
              {
                label: "HR Tiket",
                icon: HelpCircle,
                color: "bg-teal-50 text-teal-600 border-teal-200",
                onClick: () => {
                  router.push("/employee/services");
                },
              },
            ].map((action, i) => {
              const Icon = action.icon;
              return (
                <button
                  key={i}
                  onClick={action.onClick}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow transition-all active:scale-95 text-center group"
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border mb-1.5 ${action.color} group-hover:scale-105 transition-transform`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 group-hover:text-slate-900 truncate max-w-full">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Performance & KPI Banner */}
        <div className="px-4 mb-5">
          <div
            onClick={() => router.push("/employee/performance")}
            className="p-4 rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-md border border-indigo-800/40 flex items-center justify-between cursor-pointer hover:border-indigo-700 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold">Target & Penilaian Kinerja</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 text-[9px] font-bold">
                    Aktif
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Update progres KPI & isi lembar evaluasi mandiri semester ini
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-indigo-300 shrink-0" />
          </div>
        </div>

        {/* Summary Balance Cards */}
        <div className="px-4 mb-5 grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-4 text-white shadow-md">
            <span className="text-[11px] font-semibold text-blue-100 block">Cuti Tersisa</span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-black">8</span>
              <span className="text-xs font-bold text-blue-200">Hari</span>
            </div>
            <p className="text-[10px] text-blue-100/80 mt-2">Dari total 12 hari/tahun</p>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-4 text-white shadow-md">
            <span className="text-[11px] font-semibold text-amber-100 block">Pengajuan Pending</span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-black">1</span>
              <span className="text-xs font-bold text-amber-200">Menunggu</span>
            </div>
            <p className="text-[10px] text-amber-100/80 mt-2">Menunggu persetujuan Manager</p>
          </div>
        </div>

        {/* Upcoming Work Schedule */}
        <div className="px-4 mb-5">
          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">Jadwal Kerja Anda</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                WFO Regular
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <span className="font-semibold text-slate-700">08:30 - 17:30 WIB</span>
              <span className="text-slate-400">Toleransi 15 Menit</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Lokasi: Puri Indah Raya Blok U1, Kembangan, Jakarta Barat
            </p>
          </div>
        </div>

        {/* Company Announcements */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Megaphone className="w-3.5 h-3.5 text-indigo-600" />
              <span>Pengumuman Perusahaan</span>
            </span>
            <button
              onClick={() => router.push("/employee/announcements")}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-0.5 cursor-pointer"
            >
              <span>Lihat Semua</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {announcements.length > 0 ? (
            <div
              onClick={() => router.push("/employee/announcements")}
              className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm space-y-2 cursor-pointer hover:border-indigo-200 transition-all"
            >
              <div className="flex items-center justify-between">
                <Badge variant="primary" className="text-[10px]">
                  {announcements[0].category || "HR INFO"}
                </Badge>
                <span className="text-[10px] text-slate-400">
                  {new Date(announcements[0].date || announcements[0].createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                {announcements[0].title}
              </h4>
              <p className="text-[11px] text-slate-500 line-clamp-2">
                {announcements[0].content}
              </p>
            </div>
          ) : (
            <div
              onClick={() => router.push("/employee/announcements")}
              className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm space-y-2 cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Badge variant="primary" className="text-[10px]">HR INFO</Badge>
                <span className="text-[10px] text-slate-400">BASE HRIS</span>
              </div>
              <h4 className="text-xs font-bold text-slate-800">
                Pusat Informasi & Broadcast Resmi Perusahaan
              </h4>
              <p className="text-[11px] text-slate-500 line-clamp-2">
                Seluruh pengumuman resmi direksi, surat edaran, regulasi kantor, dan agenda kerja akan ditampilkan di kanal ini.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Real Attendance Action Modal */}
      <AttendanceModal
        isOpen={isAttendModalOpen}
        onClose={() => setIsAttendModalOpen(false)}
        type={modalType}
        policy={todayData?.policy}
        officeLocation={todayData?.officeLocation}
        todayRecord={attendance}
        onSuccess={loadData}
        attendanceMode={effectiveMode}
        employeeName={sessionUser?.name}
        employeeNumber={sessionUser?.employeeNumber}
      />

      {/* Photo Evidence Viewer Modal */}
      {selectedPhotoPreview && (
        <Modal
          isOpen={Boolean(selectedPhotoPreview)}
          onClose={() => setSelectedPhotoPreview(null)}
          title={selectedPhotoPreview.title}
          maxWidth="md"
        >
          <div className="space-y-3">
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 shadow-inner flex items-center justify-center">
              <img
                src={selectedPhotoPreview.url}
                alt={selectedPhotoPreview.title}
                className="w-full h-auto max-h-[65vh] object-contain mx-auto"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1.5 font-bold text-emerald-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Bukti Foto Terwatermark & Terverifikasi</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedPhotoPreview(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}
    </MobileShell>
  );
}