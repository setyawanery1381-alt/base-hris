"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  CalendarCheck,
  CalendarDays,
  Clock,
  UserPlus,
  Settings,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  Palette,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboardPage() {
  const [session, setSession] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const [authRes, empRes] = await Promise.all([
          fetch("/api/v1/auth/me"),
          fetch("/api/v1/employees"),
        ]);
        if (authRes.ok) {
          const authData = await authRes.json();
          setSession(authData.user);
        }
        if (empRes.ok) {
          const empData = await empRes.json();
          setEmployees(empData.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.employmentStatus === "PERMANENT" || e.employmentStatus === "PROBATION").length;

  return (
    <AdminShell user={session}>
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-teal-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-teal-200 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Tenant White-Label Core</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              Selamat Datang di Portal HR {session?.companyName || "Kanaya Solusindo"}
            </h1>
            <p className="text-sm text-teal-100/90 mt-1 max-w-2xl">
              Kelola seluruh siklus hidup karyawan mulai dari kehadiran geofence, cuti berjenjang, hingga kustomisasi white-label dalam satu sistem terintegrasi.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/admin/employees"
              className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white text-xs font-bold shadow-md shadow-teal-500/25 flex items-center space-x-2 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Karyawan</span>
            </Link>
            <Link
              href="/admin/settings/branding"
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 flex items-center space-x-2 transition-colors"
            >
              <Palette className="w-4 h-4" />
              <span>Kustom Branding</span>
            </Link>
          </div>
        </div>

        {/* Key Metrics Stat Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Karyawan</span>
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-3xl font-black text-slate-900">{totalEmployees}</span>
              <span className="text-xs text-slate-500">Orang</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-2">
              {activeEmployees} Karyawan Aktif
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hadir Hari Ini</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-3xl font-black text-slate-900">1</span>
              <span className="text-xs text-slate-500">Tercatat</span>
            </div>
            <p className="text-[11px] text-teal-600 font-semibold mt-2">
              Geofence Radius 150m Valid
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cuti & Izin</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <CalendarDays className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-3xl font-black text-slate-900">1</span>
              <span className="text-xs text-slate-500">Pengajuan</span>
            </div>
            <p className="text-[11px] text-blue-600 font-semibold mt-2">
              Cuti Tahunan (2 Hari)
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Approval</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-3xl font-black text-slate-900">1</span>
              <span className="text-xs text-slate-500">Inbox</span>
            </div>
            <p className="text-[11px] text-amber-600 font-semibold mt-2">
              Menunggu Manager Review
            </p>
          </div>
        </div>

        {/* Employee Directory Preview Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Daftar Karyawan Aktif</h2>
              <p className="text-xs text-slate-500">Daftar staf di bawah tenant {session?.companyName}</p>
            </div>
            <Link
              href="/admin/employees"
              className="text-xs font-bold text-primary hover:underline flex items-center space-x-1"
            >
              <span>Lihat Semua Karyawan</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">NIK</th>
                  <th className="px-6 py-3">Nama Karyawan</th>
                  <th className="px-6 py-3">Departemen</th>
                  <th className="px-6 py-3">Jabatan</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Bergabung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-mono font-bold text-slate-700">
                      {emp.employeeIdNumber}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-slate-900">{emp.firstName} {emp.lastName}</div>
                      <div className="text-[11px] text-slate-400">{emp.user?.email}</div>
                    </td>
                    <td className="px-6 py-3.5">{emp.department?.name || "-"}</td>
                    <td className="px-6 py-3.5">{emp.position?.name || "-"}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant={emp.employmentStatus === "PERMANENT" ? "success" : "neutral"}>
                        {emp.employmentStatus}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">
                      {new Date(emp.joinDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}