"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, CheckSquare, Bell, MoreHorizontal } from "lucide-react";
import { useTheme } from "./theme-provider";

interface MobileShellProps {
  children: React.ReactNode;
  user?: any;
  pendingApprovalsCount?: number;
  unreadNotificationsCount?: number;
}

export const MobileShell: React.FC<MobileShellProps> = ({
  children,
  user,
  pendingApprovalsCount = 0,
  unreadNotificationsCount = 0,
}) => {
  const pathname = usePathname();
  const { theme } = useTheme();

  const navItems = [
    { label: "HOME", href: "/employee", icon: Home },
    { label: "ME", href: "/employee/me", icon: User },
    {
      label: "APPROVAL",
      href: "/employee/approval",
      icon: CheckSquare,
      badge: pendingApprovalsCount,
    },
    {
      label: "NOTIFIKASI",
      href: "/employee/notifications",
      icon: Bell,
      badge: unreadNotificationsCount,
    },
    { label: "MORE", href: "/employee/more", icon: MoreHorizontal },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center py-0 sm:py-6">
      <div className="w-full sm:max-w-[420px] bg-white min-h-screen sm:min-h-[860px] sm:max-h-[920px] sm:rounded-[36px] sm:shadow-2xl sm:border-[8px] sm:border-slate-800 flex flex-col relative overflow-hidden">
        {/* Mobile Status Bar Simulation for Desktop */}
        <div className="hidden sm:flex justify-between items-center px-6 pt-3 pb-1 text-xs font-semibold text-slate-800 bg-white z-20">
          <span>09:41</span>
          <div className="w-20 h-4 bg-slate-900 rounded-full mx-auto -mt-1"></div>
          <div className="flex items-center space-x-1.5 text-slate-700 text-[10px]">
            <span>5G</span>
            <span>100%</span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <main className="flex-1 overflow-y-auto pb-24 scrollbar-none">
          {children}
        </main>

        {/* Bottom Navigation Bar (Pro-Int Inspired) */}
        <nav className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 z-30 flex items-center justify-around shadow-lg">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/employee"
                ? pathname === "/employee"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                style={{ color: isActive ? theme.primaryColor : undefined }}
                className={`flex flex-col items-center justify-center py-1 px-3 relative transition-all duration-150 ${
                  isActive
                    ? "font-bold scale-105"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
                  {Boolean(item.badge && item.badge > 0) && (
                    <span className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-wider mt-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};