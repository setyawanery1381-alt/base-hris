"use client";
import React, { useState, useEffect } from "react";
import {
  User,
  Briefcase,
  CreditCard,
  History,
  ShieldCheck,
  Building,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  Award,
} from "lucide-react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/layout/theme-provider";

export default function EmployeeMePage() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<"personal" | "employment" | "bank" | "timeline">("personal");
  const [employee, setEmployee] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const meRes = await fetch("/api/v1/auth/me");
        if (meRes.ok) {
          const meData = await meRes.json();
          setSession(meData.user);
          if (meData.user?.employeeId) {
            const empRes = await fetch(`/api/v1/employees/${meData.user.employeeId}`);
            if (empRes.ok) {
              const empData = await empRes.json();
              setEmployee(empData.data);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, []);

  const personal = employee?.personalData;

  return (
    <MobileShell user={session}>
      <div className="bg-slate-50 min-h-full">
        {/* Profile Card Header */}
        <div
          className="text-white px-5 pt-6 pb-6 rounded-b-3xl shadow-md text-center transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor || theme.primaryColor}, #0f172a)`,
          }}
        >
          <Avatar
            name={employee ? `${employee.firstName} ${employee.lastName}` : "Rian Pratama"}
            size="xl"
            className="mx-auto mb-3 border-4 border-white/20 shadow-lg"
          />
          <h1 className="text-base font-extrabold tracking-tight">
            {employee ? `${employee.firstName} ${employee.lastName}` : "Rian Pratama"}
          </h1>
          <p className="text-xs text-white/80 font-medium mt-0.5">
            {employee?.position?.name || "Senior Frontend Engineer"}
          </p>
          <div className="flex items-center justify-center space-x-2 mt-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 text-[10px] font-mono border border-white/10">
              NIK: {employee?.employeeIdNumber || "KNY-003"}
            </span>
            <Badge variant="success" className="text-[10px]">
              {employee?.employmentStatus || "PERMANENT"}
            </Badge>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="px-4 -mt-3 relative z-10">
          <div className="bg-white rounded-2xl p-1 shadow-sm border border-slate-200 flex text-xs font-bold text-slate-500">
            {[
              { id: "personal", label: "Pribadi", icon: User },
              { id: "employment", label: "Karir", icon: Briefcase },
              { id: "bank", label: "Bank/Pajak", icon: CreditCard },
              { id: "timeline", label: "Timeline", icon: History },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    backgroundColor: isActive ? theme.primaryColor : undefined,
                  }}
                  className={`flex-1 py-2 rounded-xl flex items-center justify-center space-x-1 transition-all ${
                    isActive
                      ? "text-white shadow-sm"
                      : "hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[11px]">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-4 space-y-3">
          {/* 1. PERSONAL DATA */}
          {activeTab === "personal" && (
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-teal-600" />
                <span>Informasi Pribadi</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block">Nama Lengkap</span>
                  <p className="font-semibold text-slate-800">{employee?.firstName} {employee?.lastName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block">Jenis Kelamin</span>
                  <p className="font-semibold text-slate-800">{personal?.gender === "MALE" ? "Laki-laki" : "Perempuan"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block">Tempat, Tgl Lahir</span>
                  <p className="font-semibold text-slate-800">
                    {personal?.birthPlace || "Surabaya"},{" "}
                    {personal?.birthDate ? new Date(personal.birthDate).toLocaleDateString("id-ID") : "05 Nov 1995"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block">No. Telepon</span>
                  <p className="font-semibold text-slate-800">{personal?.phone || "081377889900"}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-xs">
                <span className="text-[10px] font-semibold text-slate-400 block">Email Kantor</span>
                <p className="font-semibold text-slate-800">{employee?.user?.email || "employee@kanaya.com"}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 text-xs">
                <span className="text-[10px] font-semibold text-slate-400 block">Alamat Tempat Tinggal</span>
                <p className="font-semibold text-slate-800">{personal?.address || "Jl. Kebon Jeruk No. 5, Jakarta Barat"}</p>
              </div>
            </div>
          )}

          {/* 2. EMPLOYMENT DATA */}
          {activeTab === "employment" && (
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center space-x-1.5">
                <Briefcase className="w-3.5 h-3.5 text-teal-600" />
                <span>Data Kepegawaian</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block">Departemen</span>
                  <p className="font-semibold text-slate-800">{employee?.department?.name || "Software Engineering"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block">Jabatan</span>
                  <p className="font-semibold text-slate-800">{employee?.position?.name || "Senior Frontend Engineer"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block">Tanggal Bergabung</span>
                  <p className="font-semibold text-slate-800">
                    {employee?.joinDate ? new Date(employee.joinDate).toLocaleDateString("id-ID") : "15 Feb 2024"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block">Status Kontrak</span>
                  <Badge variant="success" className="text-[10px]">{employee?.employmentStatus || "PERMANENT"}</Badge>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block">Atasan Langsung (Manager)</span>
                  <p className="font-semibold text-slate-800">
                    {employee?.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : "Dewi Sartika"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block">Lokasi Kantor</span>
                  <p className="font-semibold text-slate-800">{employee?.location?.name || "Puri Indah Jakarta"}</p>
                </div>
              </div>
            </div>
          )}

          {/* 3. BANK & TAX */}
          {activeTab === "bank" && (
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center space-x-1.5">
                <CreditCard className="w-3.5 h-3.5 text-teal-600" />
                <span>Rekening Bank & Pajak</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block">Nama Bank</span>
                  <p className="font-semibold text-slate-800">{personal?.bankName || "BCA"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block">Nomor Rekening</span>
                  <p className="font-semibold text-slate-800 font-mono">{personal?.bankAccountNumber || "5270918273"}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-semibold text-slate-400 block">Nama Pemilik Rekening</span>
                  <p className="font-semibold text-slate-800">{personal?.bankAccountHolder || `${employee?.firstName} ${employee?.lastName}`}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block">NPWP</span>
                  <p className="font-semibold text-slate-800 font-mono">{personal?.npwp || "12.345.678.9-012.000"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block">BPJS Kesehatan</span>
                  <p className="font-semibold text-slate-800 font-mono">{personal?.bpjsKesehatan || "000123984712"}</p>
                </div>
              </div>
            </div>
          )}

          {/* 4. CAREER TIMELINE */}
          {activeTab === "timeline" && (
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center space-x-1.5">
                <History className="w-3.5 h-3.5 text-teal-600" />
                <span>Timeline Karir Karyawan</span>
              </h3>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-teal-200">
                {employee?.timeline && employee.timeline.length > 0 ? (
                  employee.timeline.map((event: any, idx: number) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-teal-600 border-2 border-white shadow-sm"></div>
                      <span className="text-[10px] font-bold text-teal-700 uppercase">
                        {new Date(event.eventDate).toLocaleDateString("id-ID", { year: "numeric", month: "short" })}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 mt-0.5">{event.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{event.description}</p>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="relative">
                      <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-teal-600 border-2 border-white shadow-sm"></div>
                      <span className="text-[10px] font-bold text-teal-700 uppercase">Feb 2025</span>
                      <h4 className="text-xs font-bold text-slate-800 mt-0.5">Promosi ke Senior Frontend Engineer</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Peningkatan grade kinerja dan apresiasi pengiriman Mobile HRIS</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-teal-400 border-2 border-white shadow-sm"></div>
                      <span className="text-[10px] font-bold text-teal-700 uppercase">Feb 2024</span>
                      <h4 className="text-xs font-bold text-slate-800 mt-0.5">Bergabung dengan Perusahaan</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Memulai posisi Frontend Engineer di Departemen Software Engineering</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </MobileShell>
  );
}