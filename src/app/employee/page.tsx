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
} from "lucide-react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { AttendanceModal } from "@/components/employee/attendance-modal";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function EmployeeMobileDashboard() {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [todayData, setTodayData] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAttendModalOpen, setIsAttendModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"checkin" | "checkout">("checkin");
  const [isLoading, setIsLoading] = useState(true);

  // Live digital clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      const [authRes, todayRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/attendance/today"),
      ]);

      if (authRes.ok) {
        const authData = await authRes.json();
        setSessionUser(authData.user);
      }
      if (todayRes.ok) {
        const today = await todayRes.json();
        setTodayData(today);
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
        <div className="bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 text-white px-5 pt-5 pb-16 rounded-b-[32px] shadow-md relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse"></span>
              <span className="text-[11px] font-bold tracking-wider uppercase text-teal-200">
                {sessionUser?.companyName || "Kanaya Solusindo"}
              </span>
            </div>
            <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm text-teal-100 hover:text-white">
              <Bell className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-center space-x-3.5">
            <Avatar name={sessionUser?.name || "Rian Pratama"} size="lg" className="border-2 border-white/30" />
            <div className="truncate">
              <h1 className="text-lg font-black tracking-tight text-white flex items-center space-x-1.5">
                <span>Halo, {sessionUser?.name?.split(" ")[0] || "Rian"}</span>
                <span>👋</span>
              </h1>
              <p className="text-xs text-teal-100/90 font-medium truncate">
                Senior Frontend Engineer • Tech
              </p>
              <p className="text-[10px] text-teal-300 font-mono mt-0.5">
                ID: {sessionUser?.employeeNumber || "KNY-003"}
              </p>
            </div>
          </div>
        </div>

        {/* Floating Attendance Card (Pro-Int Style) */}
        <div className="px-4 -mt-10 mb-5 relative z-10">
          <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">HARI INI</span>
                <span className="text-[10px] text-slate-400">
                  {currentTime.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-bold">
                <ShieldCheck className="w-3 h-3" />
                <span>Geofence GPS</span>
              </div>
            </div>

            {/* Attendance Status & Live Clock */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Server Time
                </p>
                <p className="text-2xl font-black text-slate-800 font-mono tracking-tight mt-0.5">
                  {formattedTimeStr}
                </p>
                <p className="text-[11px] text-slate-500 flex items-center space-x-1 mt-1">
                  <MapPin className="w-3 h-3 text-teal-600" />
                  <span className="truncate max-w-[170px]">
                    {todayData?.officeLocation?.name || "Puri Indah Office"}
                  </span>
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-semibold text-slate-400 block mb-1">Status Kehadiran</span>
                {!isCheckedIn ? (
                  <Badge variant="neutral" className="font-bold">Belum Absen</Badge>
                ) : isCheckedOut ? (
                  <Badge variant="success" className="font-bold">Sudah Check-Out</Badge>
                ) : (
                  <Badge variant="primary" className="font-bold animate-pulse">Working (In: {checkInTimeStr})</Badge>
                )}
                {isCheckedIn && (
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    Masuk: {checkInTimeStr} {checkOutTimeStr ? `| Keluar: ${checkOutTimeStr}` : ""}
                  </p>
                )}
              </div>
            </div>

            {/* Primary Action Button */}
            {!isCheckedIn ? (
              <button
                onClick={() => {
                  setModalType("checkin");
                  setIsAttendModalOpen(true);
                }}
                className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm tracking-wider uppercase shadow-lg shadow-teal-700/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
              >
                <CalendarCheck className="w-5 h-5" />
                <span>CHECK IN (ABSEN MASUK)</span>
              </button>
            ) : !isCheckedOut ? (
              <button
                onClick={() => {
                  setModalType("checkout");
                  setIsAttendModalOpen(true);
                }}
                className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm tracking-wider uppercase shadow-lg shadow-rose-700/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
              >
                <Clock className="w-5 h-5" />
                <span>CHECK OUT (SELESAI KERJA)</span>
              </button>
            ) : (
              <div className="w-full py-3 rounded-2xl bg-slate-100 text-slate-500 font-bold text-xs text-center border border-slate-200">
                ✓ Absensi hari ini telah lengkap
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions (Pro-Int Style Grid) */}
        <div className="px-4 mb-5">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 px-1">
            Menu Cepat
          </h2>
          <div className="grid grid-cols-4 gap-2.5">
            {[
              {
                label: "Absensi",
                icon: CalendarCheck,
                color: "bg-teal-50 text-teal-600 border-teal-200",
                onClick: () => {
                  setModalType(isCheckedIn && !isCheckedOut ? "checkout" : "checkin");
                  setIsAttendModalOpen(true);
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
                onClick: () => alert("Pengajuan Izin: Terlambat, Izin Keluar, Urusan Pribadi"),
              },
              {
                label: "Lembur",
                icon: Clock,
                color: "bg-purple-50 text-purple-600 border-purple-200",
                onClick: () => alert("Pengajuan Lembur: Masukkan jam mulai & jam selesai kerja"),
              },
            ].map((action, i) => {
              const Icon = action.icon;
              return (
                <button
                  key={i}
                  onClick={action.onClick}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow transition-all active:scale-95 text-center group"
                >
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border mb-1.5 ${action.color} group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900">
                    {action.label}
                  </span>
                </button>
              );
            })}
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
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Pengumuman Perusahaan
            </span>
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm space-y-2">
            <div className="flex items-center space-x-2">
              <Badge variant="primary" className="text-[10px]">HR INFO</Badge>
              <span className="text-[10px] text-slate-400">18 September 2026</span>
            </div>
            <h4 className="text-xs font-bold text-slate-800">
              Pembaruan Kebijakan Absensi & Geofencing SaaS BASE HRIS
            </h4>
            <p className="text-[11px] text-slate-500 line-clamp-2">
              Karyawan diwajibkan melakukan selfie verification dan memastikan GPS aktif dalam radius geofence kantor saat melakukan check-in.
            </p>
          </div>
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
      />
    </MobileShell>
  );
}