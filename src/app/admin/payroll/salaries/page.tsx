"use client";
import React, { useState, useEffect } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import {
  CreditCard,
  Search,
  Edit2,
  ArrowLeft,
  Building2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function AdminPayrollSalariesPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    basicSalary: 0,
    paymentType: "MONTHLY",
    taxStatus: "TK/0",
    bankName: "BCA",
    bankAccountNumber: "",
    bankAccountHolder: "",
    npwp: "",
    bpjsKesehatanNumber: "",
    bpjsKetenagakerjaanNumber: "",
    components: [] as Array<{ salaryComponentId: string; amount: number }>,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    try {
      const [authRes, profRes, compRes, deptRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/payroll/profiles"),
        fetch("/api/v1/payroll/components?activeOnly=true"),
        fetch("/api/v1/organization?type=departments"),
      ]);

      if (authRes.ok) setSession((await authRes.json()).user);
      if (profRes.ok) setProfiles((await profRes.json()).profiles || []);
      if (compRes.ok) setComponents((await compRes.json()).components || []);
      if (deptRes.ok) setDepartments((await deptRes.json()).departments || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenEdit = (profile: any) => {
    setEditingProfile(profile);

    // Map existing components
    const assigned = (profile.components || []).map((c: any) => ({
      salaryComponentId: c.salaryComponentId || c.component?.id,
      amount: c.amount || 0,
    }));

    setFormData({
      basicSalary: profile.basicSalary || 0,
      paymentType: profile.paymentType || "MONTHLY",
      taxStatus: profile.taxStatus || "TK/0",
      bankName: profile.bankName || "BCA",
      bankAccountNumber: profile.bankAccountNumber === "-" ? "" : profile.bankAccountNumber,
      bankAccountHolder: profile.bankAccountHolder || profile.name,
      npwp: profile.npwp === "-" ? "" : profile.npwp,
      bpjsKesehatanNumber: profile.bpjsKesehatanNumber === "-" ? "" : profile.bpjsKesehatanNumber,
      bpjsKetenagakerjaanNumber:
        profile.bpjsKetenagakerjaanNumber === "-" ? "" : profile.bpjsKetenagakerjaanNumber,
      components: assigned,
    });
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleComponentChange = (compId: string, amount: number) => {
    setFormData((prev) => {
      const existing = prev.components.filter((c) => c.salaryComponentId !== compId);
      if (amount > 0) {
        existing.push({ salaryComponentId: compId, amount });
      }
      return { ...prev, components: existing };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/v1/payroll/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: editingProfile.employeeId,
          ...formData,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan profil gaji");
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const matchDept = selectedDept === "ALL" || p.department === selectedDept;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.employeeIdNumber.toLowerCase().includes(search.toLowerCase());
    return matchDept && matchSearch;
  });

  return (
    <AdminShell user={session}>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
              <button
                onClick={() => router.push("/admin/payroll")}
                className="hover:text-slate-800 flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Dashboard Payroll</span>
              </button>
              <span>/</span>
              <span className="font-semibold text-slate-800">Gaji Karyawan</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2.5">
              <CreditCard className="w-7 h-7 text-indigo-600" />
              <span>Profil Gaji & Rekening Karyawan</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Konfigurasi gaji pokok, status PTKP pajak, nomor rekening bank, dan tunjangan rutin per karyawan.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="p-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">Semua Departemen</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari karyawan atau NIK..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-100 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Karyawan</th>
                  <th className="py-3 px-4">Departemen / Posisi</th>
                  <th className="py-3 px-4 text-right">Gaji Pokok</th>
                  <th className="py-3 px-4 text-right">Tunjangan Rutin</th>
                  <th className="py-3 px-4 text-center">Status PTKP</th>
                  <th className="py-3 px-4">Rekening Bank</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Tidak ada data gaji karyawan ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredProfiles.map((p) => {
                    const totalAllowances = (p.components || []).reduce(
                      (acc: number, c: any) => acc + (c.amount || 0),
                      0
                    );

                    return (
                      <tr key={p.employeeId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <div className="font-mono text-[11px] text-slate-400">
                            {p.employeeIdNumber}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 font-medium">{p.department}</div>
                          <div className="text-[11px] text-slate-400">{p.position}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-900">
                          Rp {p.basicSalary.toLocaleString("id-ID")}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-indigo-600">
                          Rp {totalAllowances.toLocaleString("id-ID")}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge variant="primary" className="font-bold">
                            {p.taxStatus}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">
                            {p.bankName} - {p.bankAccountNumber}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            a.n. {p.bankAccountHolder}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs flex items-center space-x-1 mx-auto transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit Profil</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Profile Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Edit Profil Gaji: ${editingProfile?.name}`}
        >
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-700 block">Informasi Pegawai:</span>
              <p className="text-slate-600">
                {editingProfile?.name} • NIK: {editingProfile?.employeeIdNumber}
              </p>
              <p className="text-slate-500">
                {editingProfile?.department} • {editingProfile?.position}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Gaji Pokok (IDR) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.basicSalary}
                  onChange={(e) =>
                    setFormData({ ...formData, basicSalary: Number(e.target.value) })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status PTKP Pajak <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.taxStatus}
                  onChange={(e) => setFormData({ ...formData, taxStatus: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <optgroup label="Kategori TER A">
                    <option value="TK/0">TK/0 (Tidak Kawin, 0 Tanggungan)</option>
                    <option value="TK/1">TK/1 (Tidak Kawin, 1 Tanggungan)</option>
                    <option value="K/0">K/0 (Kawin, 0 Tanggungan)</option>
                  </optgroup>
                  <optgroup label="Kategori TER B">
                    <option value="TK/2">TK/2 (Tidak Kawin, 2 Tanggungan)</option>
                    <option value="TK/3">TK/3 (Tidak Kawin, 3 Tanggungan)</option>
                    <option value="K/1">K/1 (Kawin, 1 Tanggungan)</option>
                    <option value="K/2">K/2 (Kawin, 2 Tanggungan)</option>
                  </optgroup>
                  <optgroup label="Kategori TER C">
                    <option value="K/3">K/3 (Kawin, 3 Tanggungan)</option>
                  </optgroup>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Informasi Rekening Bank & Identitas
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Nama Bank
                  </label>
                  <select
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="BCA">BCA (Bank Central Asia)</option>
                    <option value="MANDIRI">Bank Mandiri</option>
                    <option value="BRI">BRI (Bank Rakyat Indonesia)</option>
                    <option value="BNI">BNI (Bank Negara Indonesia)</option>
                    <option value="CIMB">CIMB Niaga</option>
                    <option value="PERMATA">Bank Permata</option>
                    <option value="BSI">Bank Syariah Indonesia (BSI)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Nomor Rekening
                  </label>
                  <Input
                    placeholder="Contoh: 1234567890"
                    value={formData.bankAccountNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, bankAccountNumber: e.target.value })
                    }
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Nama Pemilik Rekening
                  </label>
                  <Input
                    placeholder="Sesuai buku tabungan"
                    value={formData.bankAccountHolder}
                    onChange={(e) =>
                      setFormData({ ...formData, bankAccountHolder: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">NPWP</label>
                  <Input
                    placeholder="15 atau 16 digit NPWP"
                    value={formData.npwp}
                    onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    No. BPJS Kesehatan
                  </label>
                  <Input
                    placeholder="13 digit kartu BPJS Kes"
                    value={formData.bpjsKesehatanNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, bpjsKesehatanNumber: e.target.value })
                    }
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    No. BPJS Ketenagakerjaan
                  </label>
                  <Input
                    placeholder="11 digit kartu BPJS TK"
                    value={formData.bpjsKetenagakerjaanNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, bpjsKetenagakerjaanNumber: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Recurring Allowances */}
            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Tunjangan Rutin Karyawan
              </h4>
              <p className="text-[11px] text-slate-400 mb-3">
                Nominal tunjangan bulanan yang akan otomatis ditambahkan setiap proses payroll.
              </p>

              <div className="space-y-2.5">
                {components
                  .filter((c) => c.type === "EARNING" && c.code !== "BASIC_SALARY")
                  .map((comp) => {
                    const assigned = formData.components.find(
                      (c) => c.salaryComponentId === comp.id
                    );
                    const amount = assigned ? assigned.amount : 0;

                    return (
                      <div
                        key={comp.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50"
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            {comp.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {comp.code} • {comp.category}
                          </span>
                        </div>
                        <div className="w-40">
                          <Input
                            type="number"
                            min="0"
                            step="10000"
                            placeholder="Rp 0"
                            value={amount || ""}
                            onChange={(e) =>
                              handleComponentChange(comp.id, Number(e.target.value))
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Profil Gaji"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminShell>
  );
}
