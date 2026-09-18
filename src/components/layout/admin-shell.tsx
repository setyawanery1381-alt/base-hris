"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  CalendarCheck,
  CalendarDays,
  Clock,
  Building2,
  Settings,
  ShieldAlert,
  LogOut,
  LayoutDashboard,
  Layers,
  FileSpreadsheet,
  Palette,
  CheckCircle2,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { useTheme } from "./theme-provider";
import { Avatar } from "../ui/avatar";

interface AdminShellProps {
  children: React.ReactNode;
  user: any;
}

export const AdminShell: React.FC<AdminShellProps> = ({ children, user }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const navGroups = [
    {
      title: "CORE HR",
      items: [
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Data Karyawan", href: "/admin/employees", icon: Users },
        { label: "Absensi & Kehadiran", href: "/admin/attendance", icon: CalendarCheck },
        { label: "Cuti & Izin", href: "/admin/leave", icon: CalendarDays },
        { label: "Lembur (Overtime)", href: "/admin/overtime", icon: Clock },
      ],
    },
    {
      title: "PERUSAHAAN",
      items: [
        { label: "Struktur Organisasi", href: "/admin/organization", icon: Building2 },
        { label: "Approval Center", href: "/admin/approvals", icon: CheckCircle2 },
        { label: "Laporan & Rekap", href: "/admin/reports", icon: FileSpreadsheet },
      ],
    },
    {
      title: "SISTEM & WHITE-LABEL",
      items: [
        { label: "Branding & Tema", href: "/admin/settings/branding", icon: Palette },
        { label: "Pengaturan Tenant", href: "/admin/settings", icon: Settings },
        { label: "Audit Log", href: "/admin/audit", icon: ShieldAlert },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } transition-all duration-300 bg-white border-r border-slate-200 flex flex-col z-30 sticky top-0 h-screen`}
      >
        {/* Branding Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 bg-slate-50/50">
          {sidebarOpen ? (
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0">
                {theme.appName.charAt(0)}
              </div>
              <div className="truncate">
                <h2 className="text-sm font-bold text-slate-800 truncate leading-tight">
                  {theme.appName}
                </h2>
                <p className="text-[11px] text-slate-500 truncate">{theme.companyName}</p>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-black text-lg shadow-sm mx-auto">
              {theme.appName.charAt(0)}
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {sidebarOpen && (
                <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">
                  {group.title}
                </p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-white shadow-sm font-semibold"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    } ${!sidebarOpen && "justify-center px-0"}`}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <Avatar name={user?.name || "Admin"} size="sm" />
              {sidebarOpen && (
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-800 truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user?.roles?.[0]}</p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button
                onClick={handleLogout}
                title="Keluar"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              🏢 {user?.companyName || "PT Kanaya Multi Solusindo"}
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-medium text-slate-500">
              Role: <strong className="text-slate-700">{user?.roles?.[0] || "HR_ADMIN"}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/employee"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-primary text-primary hover:bg-primary/5 transition-colors flex items-center space-x-1.5"
            >
              <span>📱 Buka Mobile App</span>
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>

        {/* Footer */}
        <footer className="px-8 py-4 border-t border-slate-200 bg-white text-xs text-slate-400 flex justify-between items-center">
          <span>{theme.footerText}</span>
          <span>Version 1.0 (Multi-Tenant SaaS)</span>
        </footer>
      </div>
    </div>
  );
};