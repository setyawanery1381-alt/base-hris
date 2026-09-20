"use client";
import React, { useState, useEffect } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import {
  Layers,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  ArrowLeft,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function AdminPayrollComponentsPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [components, setComponents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "EARNING",
    category: "FIXED_ALLOWANCE",
    isTaxable: true,
    isBpjsSubject: true,
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    try {
      const [authRes, compRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/payroll/components"),
      ]);

      if (authRes.ok) setSession((await authRes.json()).user);
      if (compRes.ok) setComponents((await compRes.json()).components || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingComponent(null);
    setFormData({
      name: "",
      code: "",
      type: "EARNING",
      category: "FIXED_ALLOWANCE",
      isTaxable: true,
      isBpjsSubject: true,
      isActive: true,
    });
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (comp: any) => {
    setEditingComponent(comp);
    setFormData({
      name: comp.name,
      code: comp.code,
      type: comp.type,
      category: comp.category,
      isTaxable: comp.isTaxable,
      isBpjsSubject: comp.isBpjsSubject,
      isActive: comp.isActive,
    });
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const url = "/api/v1/payroll/components";
      const method = editingComponent ? "PUT" : "POST";
      const payload = editingComponent
        ? { id: editingComponent.id, ...formData }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan komponen gaji");
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus komponen gaji "${name}"?`)) return;

    try {
      const res = await fetch(`/api/v1/payroll/components?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadData();
      } else {
        const d = await res.json();
        alert(d.error || "Gagal menghapus komponen");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredComponents = components.filter((c) => {
    const matchType = typeFilter === "ALL" || c.type === typeFilter;
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
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
              <span className="font-semibold text-slate-800">Komponen Gaji</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2.5">
              <Layers className="w-7 h-7 text-blue-600" />
              <span>Master Komponen Gaji</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Kelola daftar tunjangan, potongan, dan benefit perusahaan yang dapat ditetapkan ke karyawan.
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-700/20 flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Komponen</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {["ALL", "EARNING", "DEDUCTION", "BENEFIT"].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  typeFilter === t
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t === "ALL"
                  ? "Semua Tipe"
                  : t === "EARNING"
                  ? "Penerimaan (Earning)"
                  : t === "DEDUCTION"
                  ? "Potongan (Deduction)"
                  : "Benefit Perusahaan"}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama atau kode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-100 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Nama Komponen</th>
                  <th className="py-3 px-4">Kode</th>
                  <th className="py-3 px-4 text-center">Tipe</th>
                  <th className="py-3 px-4 text-center">Kategori</th>
                  <th className="py-3 px-4 text-center">Objek PPh 21</th>
                  <th className="py-3 px-4 text-center">Objek BPJS</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredComponents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Tidak ada komponen gaji ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredComponents.map((comp) => (
                    <tr key={comp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {comp.name}
                        {comp.isDefault && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-500 font-normal">
                            Bawaan
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {comp.code}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          variant={
                            comp.type === "EARNING"
                              ? "success"
                              : comp.type === "DEDUCTION"
                              ? "danger"
                              : "primary"
                          }
                        >
                          {comp.type === "EARNING"
                            ? "Penerimaan"
                            : comp.type === "DEDUCTION"
                            ? "Potongan"
                            : "Benefit"}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                        {comp.category}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {comp.isTaxable ? (
                          <span className="text-emerald-600 font-bold">Ya</span>
                        ) : (
                          <span className="text-slate-400">Tidak</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {comp.isBpjsSubject ? (
                          <span className="text-blue-600 font-bold">Ya</span>
                        ) : (
                          <span className="text-slate-400">Tidak</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={comp.isActive ? "success" : "neutral"}>
                          {comp.isActive ? "AKTIF" : "NONAKTIF"}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleOpenEditModal(comp)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit Komponen"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!comp.isDefault && (
                            <button
                              onClick={() => handleDelete(comp.id, comp.name)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Hapus Komponen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingComponent ? "Edit Komponen Gaji" : "Tambah Komponen Gaji Baru"}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Komponen <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Contoh: Tunjangan Komunikasi"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kode Komponen <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Contoh: ALLOWANCE_COMMUNICATION"
                value={formData.code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                  })
                }
                disabled={Boolean(editingComponent)}
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Gunakan huruf kapital dan garis bawah (underscore). Tidak dapat diubah setelah dibuat.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipe</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="EARNING">Penerimaan (Earning)</option>
                  <option value="DEDUCTION">Potongan (Deduction)</option>
                  <option value="BENEFIT">Benefit Perusahaan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="BASIC">Gaji Pokok</option>
                  <option value="FIXED_ALLOWANCE">Tunjangan Tetap</option>
                  <option value="VARIABLE_ALLOWANCE">Tunjangan Tidak Tetap</option>
                  <option value="DEDUCTION">Potongan</option>
                  <option value="BENEFIT">Benefit</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isTaxable}
                  onChange={(e) => setFormData({ ...formData, isTaxable: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold">Dikenakan Pajak PPh 21</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isBpjsSubject}
                  onChange={(e) => setFormData({ ...formData, isBpjsSubject: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold">Masuk Dasar Perhitungan BPJS</span>
              </label>

              {editingComponent && (
                <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold">Status Komponen Aktif</span>
                </label>
              )}
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
                {isSubmitting ? "Menyimpan..." : "Simpan Komponen"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminShell>
  );
}
