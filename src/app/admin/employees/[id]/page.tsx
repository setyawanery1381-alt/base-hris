"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Briefcase,
  CreditCard,
  History,
  CalendarDays,
  ShieldCheck,
  Building,
  Mail,
  Phone,
  Edit,
  Save,
  CheckCircle,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [session, setSession] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "timeline" | "leave">("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [meRes, empRes] = await Promise.all([
          fetch("/api/v1/auth/me"),
          fetch(`/api/v1/employees/${id}`),
        ]);
        if (meRes.ok) {
          const me = await meRes.json();
          setSession(me.user);
        }
        if (empRes.ok) {
          const emp = await empRes.json();
          setEmployee(emp.data);
          setEditForm({
            firstName: emp.data.firstName,
            lastName: emp.data.lastName,
            phone: emp.data.personalData?.phone || "",
            address: emp.data.personalData?.address || "",
            bankName: emp.data.personalData?.bankName || "",
            bankAccountNumber: emp.data.personalData?.bankAccountNumber || "",
            employmentStatus: emp.data.employmentStatus,
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/v1/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const data = await res.json();
        setEmployee(data.data);
        setIsEditing(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <AdminShell user={session}>
        <div className="p-12 text-center text-slate-400">Memuat data karyawan...</div>
      </AdminShell>
    );
  }

  if (!employee) {
    return (
      <AdminShell user={session}>
        <div className="p-12 text-center text-slate-400">
          <p className="text-sm font-bold text-slate-700">Karyawan tidak ditemukan</p>
          <Link href="/admin/employees" className="text-xs text-primary font-bold mt-2 inline-block">
            Kembali ke Daftar Karyawan
          </Link>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell user={session}>
      <div className="space-y-6">
        {/* Top Navigation Back */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/employees"
            className="inline-flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Direktori Karyawan</span>
          </Link>

          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1.5"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Profil</span>
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                Batal
              </Button>
              <Button onClick={handleSave} size="sm" className="flex items-center space-x-1.5">
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Perubahan</span>
              </Button>
            </div>
          )}
        </div>

        {saveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>Data karyawan berhasil diperbarui!</span>
          </div>
        )}

        {/* Profile Card Header */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <Avatar name={`${employee.firstName} ${employee.lastName}`} size="xl" className="shadow-md" />
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-black text-slate-900">
                  {employee.firstName} {employee.lastName}
                </h1>
                <Badge variant={employee.employmentStatus === "PERMANENT" ? "success" : "warning"}>
                  {employee.employmentStatus}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {employee.position?.name || "Staff"} • {employee.department?.name || "Departemen"}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  NIK: {employee.employeeIdNumber}
                </span>
                <span>•</span>
                <span>{employee.user?.email}</span>
                <span>•</span>
                <span>Gabung: {new Date(employee.joinDate).toLocaleDateString("id-ID")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="border-b border-slate-200 flex space-x-6 text-xs font-bold text-slate-400">
          {[
            { id: "profile", label: "Profil & Informasi Lengkap" },
            { id: "timeline", label: "Timeline Karir & Mutasi" },
            { id: "leave", label: "Saldo Cuti & Kehadiran" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 transition-colors relative ${
                activeTab === tab.id
                  ? "text-primary border-b-2 border-primary"
                  : "hover:text-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Profile */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center space-x-2">
                <User className="w-4 h-4 text-primary" />
                <span>Data Pribadi</span>
              </h3>

              {!isEditing ? (
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block">Jenis Kelamin</span>
                    <p className="font-bold text-slate-800">{employee.personalData?.gender === "MALE" ? "Laki-laki" : "Perempuan"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">No. Telepon</span>
                    <p className="font-bold text-slate-800">{employee.personalData?.phone || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 font-semibold block">Alamat</span>
                    <p className="font-bold text-slate-800">{employee.personalData?.address || "-"}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    label="Nama Depan"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  />
                  <Input
                    label="Nama Belakang"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  />
                  <Input
                    label="No. Telepon"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                  <Input
                    label="Alamat"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <span>Data Bank & Pajak</span>
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block">Nama Bank</span>
                  <p className="font-bold text-slate-800">{employee.personalData?.bankName || "BCA"}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">No. Rekening</span>
                  <p className="font-mono font-bold text-slate-800">{employee.personalData?.bankAccountNumber || "-"}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">NPWP</span>
                  <p className="font-mono font-bold text-slate-800">{employee.personalData?.npwp || "-"}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">BPJS Kesehatan</span>
                  <p className="font-mono font-bold text-slate-800">{employee.personalData?.bpjsKesehatan || "-"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Timeline */}
        {activeTab === "timeline" && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center space-x-2">
              <History className="w-4 h-4 text-primary" />
              <span>Rekam Jejak & Timeline Karir (PRD Section 13)</span>
            </h3>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-primary/20">
              {employee.timeline?.map((ev: any, i: number) => (
                <div key={i} className="relative">
                  <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-primary border-2 border-white shadow-sm"></div>
                  <div className="text-xs font-bold text-primary">
                    {new Date(ev.eventDate).toLocaleDateString("id-ID", { year: "numeric", month: "long" })}
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mt-1">{ev.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{ev.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Leave & Balances */}
        {activeTab === "leave" && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center space-x-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <span>Saldo Cuti Aktif ({new Date().getFullYear()})</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {employee.leaveBalances?.map((bal: any) => (
                <div key={bal.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-700">{bal.leaveType?.name}</h4>
                  <div className="flex items-baseline space-x-2 mt-2">
                    <span className="text-2xl font-black text-slate-900">{bal.remaining}</span>
                    <span className="text-xs text-slate-500">Hari Sisa</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-200">
                    <span>Hak: {bal.entitlement}</span>
                    <span>Terpakai: {bal.used}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}