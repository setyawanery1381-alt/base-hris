"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import {
  Target,
  Plus,
  ArrowLeft,
  Trash2,
  Edit2,
  CheckCircle2,
  Layers,
  Building2,
  Percent,
  Search,
} from "lucide-react";

export default function AdminPerformanceKpisPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    departmentId: "",
    category: "KPI",
    measurementUnit: "PERCENTAGE",
    targetValue: 100,
    weight: 20,
    description: "",
  });

  const loadData = async () => {
    try {
      const [authRes, kpisRes, deptsRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/performance/kpis"),
        fetch("/api/v1/departments"),
      ]);

      if (authRes.ok) setSession((await authRes.json()).user);
      if (kpisRes.ok) setTemplates((await kpisRes.json()).templates || []);
      if (deptsRes.ok) setDepartments((await deptsRes.json()).departments || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      departmentId: "",
      category: "KPI",
      measurementUnit: "PERCENTAGE",
      targetValue: 100,
      weight: 20,
      description: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (tpl: any) => {
    setEditingTemplate(tpl);
    setFormData({
      name: tpl.name,
      departmentId: tpl.departmentId || "",
      category: tpl.category,
      measurementUnit: tpl.measurementUnit,
      targetValue: tpl.targetValue,
      weight: tpl.weight,
      description: tpl.description || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = "/api/v1/performance/kpis";
      const method = editingTemplate ? "PUT" : "POST";
      const payload = editingTemplate ? { ...formData, id: editingTemplate.id } : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menyimpan KPI template");
      }
    } catch (e: any) {
      alert(e.message || "Gagal menyimpan KPI template");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus indikator KPI ini?")) return;
    try {
      const res = await fetch(`/api/v1/performance/kpis?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesCat = selectedCategory === "ALL" || t.category === selectedCategory;
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <AdminShell user={session}>
      <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push("/admin/performance")}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center space-x-2">
                <Target className="w-6 h-6 text-indigo-600" />
                <span>Master KPI & Kompetensi (Library)</span>
              </h1>
              <p className="text-xs text-slate-500">
                Katalog indikator pencapaian target kerja, kompetensi korporat, dan bobot penilaian.
              </p>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-2 cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Indikator KPI</span>
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {["ALL", "KPI", "OKR", "COMPETENCY", "BEHAVIOR", "LEADERSHIP"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat === "ALL"
                  ? "Semua Kategori"
                  : cat === "COMPETENCY"
                  ? "Kompetensi"
                  : cat === "BEHAVIOR"
                  ? "Perilaku & Etika"
                  : cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari KPI / indikator..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>
        </div>

        {/* Templates Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Nama Indikator / KPI</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Departemen</th>
                  <th className="py-3 px-4 text-center">Satuan Ukur</th>
                  <th className="py-3 px-4 text-center">Target Nilai</th>
                  <th className="py-3 px-4 text-center">Bobot Standar</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Tidak ada KPI ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredTemplates.map((tpl) => (
                    <tr key={tpl.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{tpl.name}</div>
                        {tpl.description && (
                          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                            {tpl.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tpl.category === "KPI"
                              ? "bg-blue-100 text-blue-800"
                              : tpl.category === "BEHAVIOR"
                              ? "bg-teal-100 text-teal-800"
                              : tpl.category === "COMPETENCY"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {tpl.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {tpl.department ? (
                          <span className="font-semibold">{tpl.department.name}</span>
                        ) : (
                          <span className="text-slate-400 italic">Semua Departemen</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-600 font-mono text-[11px]">
                        {tpl.measurementUnit}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                        {tpl.targetValue}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-black text-xs">
                          {tpl.weight}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => openEditModal(tpl)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(tpl.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Form */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-800 text-base flex items-center space-x-2">
                  <Target className="w-5 h-5 text-indigo-600" />
                  <span>{editingTemplate ? "Edit Indikator KPI" : "Tambah Indikator KPI Baru"}</span>
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Indikator / Metrik</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-xs"
                    placeholder="e.g. Ketepatan Waktu Pengiriman Proyek (SLA)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kategori</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                    >
                      <option value="KPI">KPI (Key Performance Indicator)</option>
                      <option value="OKR">OKR (Objective & Key Results)</option>
                      <option value="COMPETENCY">Kompetensi Teknis</option>
                      <option value="BEHAVIOR">Perilaku & Core Values</option>
                      <option value="LEADERSHIP">Kepemimpinan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Departemen</label>
                    <select
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                    >
                      <option value="">Semua Departemen</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Satuan Ukur</label>
                    <select
                      value={formData.measurementUnit}
                      onChange={(e) => setFormData({ ...formData, measurementUnit: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                    >
                      <option value="PERCENTAGE">Persen (%)</option>
                      <option value="RATING_5">Rating 1 - 5</option>
                      <option value="NUMBER">Angka (Qty)</option>
                      <option value="CURRENCY_IDR">Rupiah (IDR)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Target Nilai</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.targetValue}
                      onChange={(e) => setFormData({ ...formData, targetValue: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bobot (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Keterangan / Definisi Metrik</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                    placeholder="Petunjuk penilaian dan definisi target..."
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                  >
                    Simpan Indikator
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
