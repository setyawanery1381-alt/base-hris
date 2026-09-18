"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  Building,
  MapPin,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";

export default function AdminEmployeesPage() {
  const [session, setSession] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "password123",
    employeeIdNumber: "",
    gender: "MALE",
    phone: "",
    employmentStatus: "PROBATION",
    employmentType: "FULL_TIME",
    roleName: "EMPLOYEE",
  });

  const loadEmployees = async () => {
    try {
      const [authRes, empRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch(`/api/v1/employees?search=${encodeURIComponent(search)}`),
      ]);
      if (authRes.ok) {
        const auth = await authRes.json();
        setSession(auth.user);
      }
      if (empRes.ok) {
        const data = await empRes.json();
        setEmployees(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [search]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");
    setFormSuccess("");

    try {
      const res = await fetch("/api/v1/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Gagal membuat data karyawan.");
        setFormLoading(false);
        return;
      }

      setFormSuccess("Karyawan baru berhasil didaftarkan dan saldo cuti telah diinisialisasi!");
      loadEmployees();
      setTimeout(() => {
        setIsAddModalOpen(false);
        setFormSuccess("");
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          password: "password123",
          employeeIdNumber: "",
          gender: "MALE",
          phone: "",
          employmentStatus: "PROBATION",
          employmentType: "FULL_TIME",
          roleName: "EMPLOYEE",
        });
      }, 1200);
    } catch (err: any) {
      setFormError("Terjadi gangguan saat menyimpan.");
    } finally {
      setFormLoading(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    if (statusFilter === "ALL") return true;
    return emp.employmentStatus === statusFilter;
  });

  return (
    <AdminShell user={session}>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              Manajemen Data Karyawan
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola profil, NIK, penempatan departemen, dan siklus karir karyawan ({session?.companyName}).
            </p>
          </div>

          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Karyawan Baru</span>
          </Button>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari NIK, nama, atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
            {["ALL", "PERMANENT", "PROBATION", "CONTRACT"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? "bg-primary text-white border-primary"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {st === "ALL" ? "Semua Status" : st}
              </button>
            ))}
          </div>
        </div>

        {/* Employees Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">NIK</th>
                  <th className="px-6 py-3.5">Nama Karyawan</th>
                  <th className="px-6 py-3.5">Departemen</th>
                  <th className="px-6 py-3.5">Jabatan</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Lokasi</th>
                  <th className="px-6 py-3.5">Tgl Gabung</th>
                  <th className="px-6 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                      Tidak ada data karyawan yang cocok dengan kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-700">
                        {emp.employeeIdNumber}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{emp.firstName} {emp.lastName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{emp.user?.email}</div>
                      </td>
                      <td className="px-6 py-4">{emp.department?.name || "Belum dialokasikan"}</td>
                      <td className="px-6 py-4">{emp.position?.name || "Staff"}</td>
                      <td className="px-6 py-4">
                        <Badge variant={emp.employmentStatus === "PERMANENT" ? "success" : "warning"}>
                          {emp.employmentStatus}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">{emp.location?.name || "Kantor Pusat"}</td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(emp.joinDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/employees/${emp.id}`}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors inline-flex items-center space-x-1"
                        >
                          <span>Detail</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Employee Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Tambah Karyawan Baru"
          maxWidth="lg"
        >
          <form onSubmit={handleCreateEmployee} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{formSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nama Depan *"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="cth: Siti"
              />
              <Input
                label="Nama Belakang *"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="cth: Rahmawati"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="NIK / Employee ID *"
                required
                value={formData.employeeIdNumber}
                onChange={(e) => setFormData({ ...formData, employeeIdNumber: e.target.value })}
                placeholder="cth: KNY-004"
              />
              <Input
                label="Email Perusahaan *"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="cth: siti@kanaya.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Jenis Kelamin</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none"
                >
                  <option value="MALE">Laki-laki</option>
                  <option value="FEMALE">Perempuan</option>
                </select>
              </div>
              <Input
                label="No. Telepon / WhatsApp"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="cth: 08123456789"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status Kepegawaian</label>
                <select
                  value={formData.employmentStatus}
                  onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none"
                >
                  <option value="PROBATION">Masa Percobaan (Probation)</option>
                  <option value="PERMANENT">Karyawan Tetap (Permanent)</option>
                  <option value="CONTRACT">Kontrak (Contract)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Role Sistem</label>
                <select
                  value={formData.roleName}
                  onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none"
                >
                  <option value="EMPLOYEE">Karyawan (Mobile Self-Service)</option>
                  <option value="MANAGER">Manager (Approver)</option>
                  <option value="HR_ADMIN">HR Administrator</option>
                </select>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              * Password default sementara adalah: <strong className="text-slate-600 font-mono">password123</strong>. Saldo cuti tahunan akan otomatis dibuat sebanyak 12 hari.
            </p>

            <div className="pt-2 flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" isLoading={formLoading}>
                Simpan & Daftarkan
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminShell>
  );
}