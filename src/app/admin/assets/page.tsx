"use client";

import React, { useState, useEffect } from "react";
import {
  Laptop,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  UserCheck,
  Calendar,
  Building2,
  Sparkles,
  ChevronRight,
  Eye,
  Trash2,
  Edit,
  X,
  ShieldCheck,
  FileCheck,
  Package,
  Cpu,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Avatar } from "@/components/ui/avatar";
import {
  ASSET_CATEGORIES,
  ASSET_CONDITIONS,
  ASSET_STATUSES,
  formatRupiah,
} from "@/lib/claims-assets-engine";

export default function AdminAssetsPage() {
  const [session, setSession] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalAssets: 0,
    assignedCount: 0,
    availableCount: 0,
    maintenanceCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Add Asset Form
  const [assetForm, setAssetForm] = useState({
    name: "",
    category: "LAPTOP",
    brand: "",
    model: "",
    serialNumber: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    purchasePrice: 15000000,
    warrantyExpiry: "",
    condition: "EXCELLENT",
    location: "Kantor Pusat Jakarta",
    notes: "",
  });

  // Assign Handover Form
  const [assignForm, setAssignForm] = useState({
    employeeId: "",
    expectedReturnDate: "",
    handoverCondition: "EXCELLENT",
    handoverNotes: "Perangkat diserahkan dalam kondisi lengkap beserta adaptor & tas laptop.",
  });

  // Return Handover Form
  const [returnForm, setReturnForm] = useState({
    returnCondition: "GOOD",
    returnNotes: "Perangkat dikembalikan dalam kondisi normal dan bersih.",
    newStatus: "AVAILABLE",
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [authRes, assetsRes, empRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch(`/api/v1/assets?status=${statusFilter}&category=${categoryFilter}&q=${encodeURIComponent(searchQuery)}`),
        fetch("/api/v1/employees"),
      ]);

      if (authRes.ok) {
        const authData = await authRes.json();
        setSession(authData.user);
      }
      if (assetsRes.ok) {
        const data = await assetsRes.json();
        setAssets(data.data || []);
        if (data.summary) setSummary(data.summary);
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
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, categoryFilter]);

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForm.name) {
      alert("Nama aset wajib diisi");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/v1/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assetForm),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setAssetForm({
          name: "",
          category: "LAPTOP",
          brand: "",
          model: "",
          serialNumber: "",
          purchaseDate: new Date().toISOString().split("T")[0],
          purchasePrice: 15000000,
          warrantyExpiry: "",
          condition: "EXCELLENT",
          location: "Kantor Pusat Jakarta",
          notes: "",
        });
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menambahkan aset");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !assignForm.employeeId) {
      alert("Pilih karyawan penerima aset");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/assets/${selectedAsset.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignForm),
      });

      if (res.ok) {
        setIsAssignModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal melakukan serah terima aset");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/assets/${selectedAsset.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(returnForm),
      });

      if (res.ok) {
        setIsReturnModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal memproses pengembalian aset");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredAssets = assets.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const code = (a.assetCode || "").toLowerCase();
    const name = (a.name || "").toLowerCase();
    const sn = (a.serialNumber || "").toLowerCase();
    const brand = (a.brand || "").toLowerCase();
    const activeHolder = a.assignments?.[0]?.employee;
    const empName = activeHolder ? `${activeHolder.firstName} ${activeHolder.lastName}`.toLowerCase() : "";
    return code.includes(q) || name.includes(q) || sn.includes(q) || brand.includes(q) || empName.includes(q);
  });

  return (
    <AdminShell user={session}>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Inventarisasi & Handover Perangkat</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Manajemen Aset Perusahaan
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Inventarisasi laptop, ponsel dinas, kendaraan, pantau serial number, lakukan serah terima fisik (BAST) dan verifikasi kondisi pengembalian.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Aset Baru</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Aset Terdata</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Laptop className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-3xl font-black text-slate-900">{summary.totalAssets}</span>
              <span className="text-xs text-slate-500">Unit</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Inventaris fisik aktif perusahaan</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Digunakan Karyawan</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-3xl font-black text-blue-600">{summary.assignedCount}</span>
              <span className="text-xs text-slate-500">Unit (Assigned)</span>
            </div>
            <p className="text-[11px] text-blue-600 font-semibold mt-1">Sedang dipinjam/dipegang staf</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Tersedia di Gudang</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-3xl font-black text-emerald-700">{summary.availableCount}</span>
              <span className="text-xs text-slate-500">Unit (Available)</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">Siap diserahkan ke karyawan baru</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Dalam Perbaikan</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-3xl font-black text-amber-600">{summary.maintenanceCount}</span>
              <span className="text-xs text-slate-500">Unit</span>
            </div>
            <p className="text-[11px] text-amber-600 font-semibold mt-1">Sedang diservis vendor</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kode aset, nama perangkat, nomor seri (S/N), atau nama pemegang..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="ALL">Semua Kategori</option>
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 border-t border-slate-100 pt-3">
            {[
              { id: "ALL", label: "Semua Status" },
              { id: "AVAILABLE", label: "Tersedia di Gudang" },
              { id: "ASSIGNED", label: "Sedang Digunakan" },
              { id: "IN_MAINTENANCE", label: "Dalam Perbaikan" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Asset Inventory Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Kode & Kategori</th>
                  <th className="px-5 py-3.5">Nama & Model</th>
                  <th className="px-5 py-3.5">Nomor Seri (S/N)</th>
                  <th className="px-5 py-3.5">Kondisi Fisik</th>
                  <th className="px-5 py-3.5">Status & Pemegang</th>
                  <th className="px-5 py-3.5 text-right">Nilai Pembelian</th>
                  <th className="px-5 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                      Memuat daftar inventaris aset...
                    </td>
                  </tr>
                ) : filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      <Laptop className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      Tidak ada aset perusahaan yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => {
                    const statusCfg = ASSET_STATUSES[asset.status as keyof typeof ASSET_STATUSES] || {
                      label: asset.status,
                      color: "bg-slate-100 text-slate-700 border-slate-200",
                    };
                    const conditionCfg = ASSET_CONDITIONS[asset.condition as keyof typeof ASSET_CONDITIONS] || {
                      label: asset.condition,
                      color: "bg-slate-100 text-slate-700 border-slate-200",
                    };
                    const catCfg = ASSET_CATEGORIES.find((c) => c.id === asset.category);
                    const activeHolder = asset.assignments?.[0]?.employee;

                    return (
                      <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-mono font-bold text-indigo-700 text-[11px]">
                            {asset.assetCode}
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {catCfg?.label || asset.category}
                          </span>
                        </td>

                        <td className="px-5 py-4 max-w-[200px]">
                          <p className="font-bold text-slate-900 truncate" title={asset.name}>
                            {asset.name}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {asset.brand} {asset.model}
                          </p>
                        </td>

                        <td className="px-5 py-4 font-mono text-[11px] text-slate-600">
                          {asset.serialNumber || "-"}
                        </td>

                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${conditionCfg.color}`}>
                            {conditionCfg.label}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border mb-1 ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                          {activeHolder ? (
                            <div className="flex items-center space-x-1.5 mt-0.5">
                              <Avatar
                                name={`${activeHolder.firstName} ${activeHolder.lastName}`}
                                photoUrl={activeHolder.photoUrl}
                                size="sm"
                              />
                              <span className="text-[11px] font-semibold text-slate-800 truncate max-w-[120px]">
                                {activeHolder.firstName} {activeHolder.lastName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 block">
                              Lokasi: {asset.location || "Kantor Pusat"}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-mono font-bold text-slate-800">
                          {asset.purchasePrice ? formatRupiah(asset.purchasePrice) : "-"}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {asset.status === "AVAILABLE" && (
                              <button
                                onClick={() => {
                                  setSelectedAsset(asset);
                                  setIsAssignModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors flex items-center space-x-1 cursor-pointer"
                                title="Serah Terima (BAST)"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Serahkan</span>
                              </button>
                            )}

                            {asset.status === "ASSIGNED" && (
                              <button
                                onClick={() => {
                                  setSelectedAsset(asset);
                                  setIsReturnModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs transition-colors flex items-center space-x-1 cursor-pointer"
                                title="Pengembalian Aset"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Kembalikan</span>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setSelectedAsset(asset);
                                setIsDetailModalOpen(true);
                              }}
                              className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-colors"
                              title="Riwayat & Detail"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Tambah Aset Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Registrasi Aset Baru</h3>
                  <p className="text-[11px] text-slate-500">Tambahkan barang inventaris kantor</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAsset} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Perangkat / Aset *</label>
                <input
                  type="text"
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  placeholder="Contoh: MacBook Pro 14 M3 Pro 18GB/512GB"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori Aset</label>
                  <select
                    value={assetForm.category}
                    onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {ASSET_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Brand / Pabrikan</label>
                  <input
                    type="text"
                    value={assetForm.brand}
                    onChange={(e) => setAssetForm({ ...assetForm, brand: e.target.value })}
                    placeholder="Contoh: Apple, Dell, Honda"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Model / Tipe</label>
                  <input
                    type="text"
                    value={assetForm.model}
                    onChange={(e) => setAssetForm({ ...assetForm, model: e.target.value })}
                    placeholder="Contoh: A2992 Space Black"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Seri Hardware (S/N)</label>
                  <input
                    type="text"
                    value={assetForm.serialNumber}
                    onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
                    placeholder="Contoh: C02X8891JH82"
                    className="w-full px-3 py-2 font-mono rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Pembelian</label>
                  <input
                    type="date"
                    value={assetForm.purchaseDate}
                    onChange={(e) => setAssetForm({ ...assetForm, purchaseDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Harga Beli (Rp)</label>
                  <input
                    type="number"
                    value={assetForm.purchasePrice}
                    onChange={(e) => setAssetForm({ ...assetForm, purchasePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 font-mono font-bold rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kondisi Aset Saat Ini</label>
                  <select
                    value={assetForm.condition}
                    onChange={(e) => setAssetForm({ ...assetForm, condition: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {Object.entries(ASSET_CONDITIONS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lokasi Penyimpanan</label>
                  <input
                    type="text"
                    value={assetForm.location}
                    onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Tambahan</label>
                <textarea
                  value={assetForm.notes}
                  onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
                  placeholder="Kelengkapan, garansi toko, atau riwayat pembelian..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2 -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
                >
                  <Package className="w-4 h-4" />
                  <span>Simpan ke Inventaris</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Serah Terima Aset (BAST) */}
      {isAssignModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Serah Terima Aset (BAST)</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{selectedAsset.assetCode} • {selectedAsset.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignAsset} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Karyawan Penerima *</label>
                <select
                  value={assignForm.employeeId}
                  onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 bg-white"
                  required
                >
                  <option value="">-- Pilih Karyawan --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employeeIdNumber} - {e.firstName} {e.lastName} ({e.department?.name || "Karyawan"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kondisi Fisik Saat Serah Terima</label>
                <select
                  value={assignForm.handoverCondition}
                  onChange={(e) => setAssignForm({ ...assignForm, handoverCondition: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="EXCELLENT">Sangat Baik (Mulus / Baru)</option>
                  <option value="GOOD">Baik (Berfungsi Normal)</option>
                  <option value="FAIR">Cukup (Ada Bekas Pemakaian Wajar)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Estimasi Tanggal Pengembalian (Opsional)</label>
                <input
                  type="date"
                  value={assignForm.expectedReturnDate}
                  onChange={(e) => setAssignForm({ ...assignForm, expectedReturnDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Berita Acara Serah Terima (BAST)</label>
                <textarea
                  value={assignForm.handoverNotes}
                  onChange={(e) => setAssignForm({ ...assignForm, handoverNotes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2 -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Konfirmasi Serah Terima</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Pengembalian Aset */}
      {isReturnModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Pengembalian Aset Kantor</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{selectedAsset.assetCode} • {selectedAsset.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReturnAsset} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                <span className="font-bold block">Peminjam Saat Ini:</span>
                <p>
                  {selectedAsset.assignments?.[0]?.employee?.firstName} {selectedAsset.assignments?.[0]?.employee?.lastName} (NIK: {selectedAsset.assignments?.[0]?.employee?.employeeIdNumber})
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cek Kondisi Fisik Saat Pengembalian</label>
                <select
                  value={returnForm.returnCondition}
                  onChange={(e) => setReturnForm({ ...returnForm, returnCondition: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="EXCELLENT">Sangat Baik (Seperti Semula)</option>
                  <option value="GOOD">Baik & Berfungsi Normal</option>
                  <option value="FAIR">Cukup (Ada Goresan Ringan)</option>
                  <option value="DAMAGED">Rusak / Ada Kerusakan Komponen</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Kondisi Pengembalian</label>
                <textarea
                  value={returnForm.returnNotes}
                  onChange={(e) => setReturnForm({ ...returnForm, returnNotes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2 -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm shadow-amber-600/25 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Proses Pengembalian</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detail & Riwayat Aset */}
      {isDetailModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  {selectedAsset.assetCode}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">{selectedAsset.name}</h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Spesifikasi Hardware</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedAsset.brand} {selectedAsset.model}</p>
                  <p className="font-mono text-slate-500 text-[11px]">S/N: {selectedAsset.serialNumber || "-"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Nilai Perolehan</span>
                  <p className="font-bold text-emerald-700 font-mono text-sm mt-0.5">
                    {selectedAsset.purchasePrice ? formatRupiah(selectedAsset.purchasePrice) : "-"}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Beli: {selectedAsset.purchaseDate ? new Date(selectedAsset.purchaseDate).toLocaleDateString("id-ID") : "-"}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-2">Riwayat Serah Terima & Peminjaman (BAST)</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  {selectedAsset.assignments && selectedAsset.assignments.length > 0 ? (
                    selectedAsset.assignments.map((as: any, idx: number) => (
                      <div key={as.id || idx} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <p className="font-bold text-slate-900">
                            {as.employee?.firstName} {as.employee?.lastName}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Diserahkan: {new Date(as.assignedDate).toLocaleDateString("id-ID")}
                            {as.returnDate ? ` • Dikembalikan: ${new Date(as.returnDate).toLocaleDateString("id-ID")}` : " (Sedang Memegang)"}
                          </p>
                          <p className="text-[11px] text-slate-600 mt-1 italic">
                            "{as.handoverNotes || as.returnNotes || "BAST Terverifikasi"}"
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${as.status === "ACTIVE" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          {as.status === "ACTIVE" ? "Aktif" : "Selesai"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400">
                      Belum ada riwayat peminjaman untuk aset ini.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
