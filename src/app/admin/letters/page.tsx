"use client";

import React, { useState, useEffect } from "react";
import {
  FileCheck,
  Plus,
  Search,
  Filter,
  Printer,
  Calendar,
  Building2,
  Sparkles,
  ChevronRight,
  Eye,
  Trash2,
  X,
  FileText,
  UserCheck,
  Award,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Avatar } from "@/components/ui/avatar";
import {
  LETTER_TYPES,
  formatIndonesianDate,
} from "@/lib/letters-service-engine";

export default function AdminLettersPage() {
  const [session, setSession] = useState<any>(null);
  const [letters, setLetters] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ totalLetters: 0, publishedCount: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<any>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    employeeId: "",
    type: "SK_AKTIF_KERJA",
    title: "Surat Keterangan Kerja Aktif",
    purpose: "Pengajuan Visa & Keperluan Administrasi Perbankan",
    effectiveDate: new Date().toISOString().split("T")[0],
    validUntil: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
    signerName: "Hendra Setiawan, S.H., M.M.",
    signerPosition: "Head of Human Capital & Operations",
    signerNik: "NIK-HC-001",
    monthlySalary: 15000000,
    spReason: "Pelanggaran absensi dan ketidakhadiran tanpa izin selama 3 hari berturut-turut",
    lastWorkingDay: new Date().toISOString().split("T")[0],
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [authRes, lettersRes, empRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch(`/api/v1/letters?type=${typeFilter}`),
        fetch("/api/v1/employees"),
      ]);

      if (authRes.ok) {
        const authData = await authRes.json();
        setSession(authData.user);
      }
      if (lettersRes.ok) {
        const data = await lettersRes.json();
        setLetters(data.data || []);
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
  }, [typeFilter]);

  const handleTypeChange = (newType: string) => {
    let newTitle = "Surat Keterangan Kerja Aktif";
    let newPurpose = "Pengajuan Visa & Administrasi Perbankan";

    if (newType === "SK_PENGHASILAN") {
      newTitle = "Surat Keterangan Penghasilan & Gaji";
      newPurpose = "Pengajuan Fasilitas Kredit Pemilikan Rumah (KPR)";
    } else if (newType === "SURAT_PERINGATAN_1") {
      newTitle = "Surat Peringatan Pertama (SP 1)";
      newPurpose = "Pembinaan Kedisiplinan & Kepatuhan Jam Kerja";
    } else if (newType === "SURAT_PERINGATAN_2") {
      newTitle = "Surat Peringatan Kedua (SP 2)";
      newPurpose = "Tindakan Disipliner Pengulangan Kesalahan Kerja";
    } else if (newType === "SURAT_PERINGATAN_3") {
      newTitle = "Surat Peringatan Ketiga (SP 3 / Terakhir)";
      newPurpose = "Peringatan Terakhir Pelanggaran Berat";
    } else if (newType === "PAKLARING") {
      newTitle = "Surat Pengalaman Kerja (Certificate of Employment)";
      newPurpose = "Bukti Berakhirnya Hubungan Kerja & Rekomendasi Karir";
    }

    setCreateForm({
      ...createForm,
      type: newType,
      title: newTitle,
      purpose: newPurpose,
    });
  };

  const handleCreateLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.employeeId || !createForm.title) {
      alert("Pilih karyawan dan pastikan judul surat terisi");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/v1/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          contentData: {
            monthlySalary: createForm.monthlySalary,
            spReason: createForm.spReason,
            lastWorkingDay: createForm.lastWorkingDay,
          },
        }),
      });

      if (res.ok) {
        setIsCreateModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menerbitkan surat resmi");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openPrintModal = async (letter: any) => {
    setSelectedLetter(letter);
    setIsPrintModalOpen(true);
    try {
      const res = await fetch(`/api/v1/letters/${letter.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedLetter(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredLetters = letters.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const num = (l.letterNumber || "").toLowerCase();
    const title = (l.title || "").toLowerCase();
    const emp = `${l.employee?.firstName || ""} ${l.employee?.lastName || ""}`.toLowerCase();
    return num.includes(q) || title.includes(q) || emp.includes(q);
  });

  return (
    <AdminShell user={session}>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Dokumen Hukum Kepegawaian & Ketenagakerjaan</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Surat Resmi & Paklaring Generator
            </h1>
            <p className="text-sm text-blue-100/90 mt-1 max-w-2xl">
              Terbitkan Surat Keterangan Kerja Aktif (SKK), Surat Keterangan Penghasilan KPR, Surat Peringatan (SP 1-3), dan Paklaring berstempel resmi dengan QR Code verifikasi.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Terbitkan Surat Baru</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Surat Terbit</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <FileCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-3xl font-black text-slate-900">{summary.totalLetters}</span>
              <span className="text-xs text-slate-500">Dokumen</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Arsip surat resmi kepegawaian</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Surat Kerja Aktif (SKK)</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-3xl font-black text-emerald-700">
                {letters.filter((l) => l.type === "SK_AKTIF_KERJA").length}
              </span>
              <span className="text-xs text-slate-500">Berkas</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">Untuk visa, bank, atau dinas</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">SK Penghasilan KPR</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-3xl font-black text-indigo-700">
                {letters.filter((l) => l.type === "SK_PENGHASILAN").length}
              </span>
              <span className="text-xs text-slate-500">Berkas</span>
            </div>
            <p className="text-[11px] text-indigo-600 font-semibold mt-1">Verifikasi slip gaji perbankan</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Paklaring & SP</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-3xl font-black text-purple-700">
                {letters.filter((l) => l.type.includes("PERINGATAN") || l.type === "PAKLARING").length}
              </span>
              <span className="text-xs text-slate-500">Dokumen</span>
            </div>
            <p className="text-[11px] text-purple-600 font-semibold mt-1">Sertifikat kerja & kedisiplinan</p>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor surat resmi, nama karyawan, atau tujuan surat..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="ALL">Semua Jenis Surat</option>
                {LETTER_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Letters Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Nomor Surat Resmi</th>
                  <th className="px-5 py-3.5">Karyawan Penerima</th>
                  <th className="px-5 py-3.5">Jenis Dokumen</th>
                  <th className="px-5 py-3.5">Keperluan & Judul</th>
                  <th className="px-5 py-3.5">Penandatangan</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                      Memuat daftar surat resmi...
                    </td>
                  </tr>
                ) : filteredLetters.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      <FileCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      Tidak ada dokumen surat resmi yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredLetters.map((letter) => {
                    const typeCfg = LETTER_TYPES.find((t) => t.id === letter.type);

                    return (
                      <tr key={letter.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4">
                          <span className="font-mono font-bold text-blue-800 text-[11px]">
                            {letter.letterNumber}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {formatIndonesianDate(letter.issuedDate || letter.createdAt)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center space-x-2.5">
                            <Avatar
                              name={`${letter.employee?.firstName || ""} ${letter.employee?.lastName || ""}`}
                              photoUrl={letter.employee?.photoUrl}
                              size="sm"
                            />
                            <div>
                              <p className="font-bold text-slate-900">
                                {letter.employee?.firstName} {letter.employee?.lastName}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {letter.employee?.employeeIdNumber} • {letter.employee?.position?.name || "Karyawan"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${typeCfg?.badgeColor || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                            {typeCfg?.label || letter.type}
                          </span>
                        </td>

                        <td className="px-5 py-4 max-w-[220px]">
                          <p className="font-bold text-slate-900 truncate" title={letter.title}>
                            {letter.title}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate" title={letter.purpose}>
                            {letter.purpose}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          <span className="font-bold block text-slate-900">{letter.signerName}</span>
                          <span className="text-[10px] text-slate-500">{letter.signerPosition}</span>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Terbit Resmi ✓
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => openPrintModal(letter)}
                            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors flex items-center space-x-1 mx-auto cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak / PDF</span>
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
      </div>

      {/* Modal: Terbitkan Surat Baru */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Terbitkan Surat Resmi Perusahaan</h3>
                  <p className="text-[11px] text-slate-500">Generator dokumen hukum & administrasi karyawan</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLetter} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Karyawan Penerima *</label>
                <select
                  value={createForm.employeeId}
                  onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white"
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
                <label className="block font-bold text-slate-700 mb-1">Jenis Dokumen Surat Resmi *</label>
                <select
                  value={createForm.type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {LETTER_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Judul Dokumen</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tujuan / Keperluan Surat</label>
                <input
                  type="text"
                  value={createForm.purpose}
                  onChange={(e) => setCreateForm({ ...createForm, purpose: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Dynamic Extra fields based on Letter Type */}
              {createForm.type === "SK_PENGHASILAN" && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <label className="block font-bold text-emerald-950 mb-1">Total Penghasilan Gaji Pokok + Tunjangan Tetap (Rp)</label>
                  <input
                    type="number"
                    value={createForm.monthlySalary}
                    onChange={(e) => setCreateForm({ ...createForm, monthlySalary: Number(e.target.value) })}
                    className="w-full px-3 py-2 font-mono font-bold rounded-lg border border-emerald-300 bg-white text-emerald-800"
                  />
                </div>
              )}

              {createForm.type.includes("PERINGATAN") && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <label className="block font-bold text-amber-950 mb-1">Uraian Pelanggaran Kedisiplinan</label>
                  <textarea
                    value={createForm.spReason}
                    onChange={(e) => setCreateForm({ ...createForm, spReason: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-slate-800"
                  />
                  <p className="text-[10px] text-amber-800 mt-1">
                    *Surat Peringatan berlaku selama 6 (enam) bulan sejak tanggal ditetapkan sesuai UU Ketenagakerjaan.
                  </p>
                </div>
              )}

              {createForm.type === "PAKLARING" && (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <label className="block font-bold text-purple-950 mb-1">Hari Terakhir Kerja (Last Working Day)</label>
                  <input
                    type="date"
                    value={createForm.lastWorkingDay}
                    onChange={(e) => setCreateForm({ ...createForm, lastWorkingDay: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-purple-300 bg-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Penandatangan</label>
                  <input
                    type="text"
                    value={createForm.signerName}
                    onChange={(e) => setCreateForm({ ...createForm, signerName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jabatan Penandatangan</label>
                  <input
                    type="text"
                    value={createForm.signerPosition}
                    onChange={(e) => setCreateForm({ ...createForm, signerPosition: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2 -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm shadow-blue-600/25 cursor-pointer disabled:opacity-50"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Terbitkan Dokumen Resmi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cetak Surat Resmi Berstempel & QR Code */}
      {isPrintModalOpen && selectedLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
              <div className="flex items-center space-x-2">
                <Printer className="w-4 h-4 text-slate-600" />
                <span className="font-bold text-sm text-slate-800">Pratinjau Surat Resmi Kepegawaian</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Unduh PDF</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Letter Sheet */}
            <div className="p-10 overflow-y-auto text-slate-900 bg-white font-serif leading-relaxed text-xs">
              {/* Kop Surat Perusahaan */}
              <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center font-sans">
                <h2 className="text-xl font-black tracking-wider uppercase">
                  {selectedLetter.company?.name || session?.companyName || "PT KANAYA MULTI SOLUSINDO"}
                </h2>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Gedung Sentra Niaga Lantai 8, Jalan Puri Indah Raya Blok U1, Jakarta Barat 11610
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  Telp: (021) 5830-8899 • Email: hrd@kanaya.com • www.kanaya.com
                </p>
              </div>

              {/* Title & Letter Number */}
              <div className="text-center mb-6 font-sans">
                <h3 className="text-base font-bold underline uppercase tracking-wide">
                  {selectedLetter.title}
                </h3>
                <p className="font-mono text-xs font-bold text-slate-700 mt-1">
                  Nomor: {selectedLetter.letterNumber}
                </p>
              </div>

              {/* Letter Body */}
              <div className="space-y-4 font-sans text-xs text-slate-800 leading-relaxed">
                <p>
                  Yang bertanda tangan di bawah ini:
                </p>

                <div className="pl-6 space-y-1">
                  <div className="grid grid-cols-4">
                    <span className="font-bold">Nama</span>
                    <span className="col-span-3">: {selectedLetter.signerName}</span>
                  </div>
                  <div className="grid grid-cols-4">
                    <span className="font-bold">Jabatan</span>
                    <span className="col-span-3">: {selectedLetter.signerPosition}</span>
                  </div>
                  <div className="grid grid-cols-4">
                    <span className="font-bold">Perusahaan</span>
                    <span className="col-span-3">: {selectedLetter.company?.name || "PT Kanaya Multi Solusindo"}</span>
                  </div>
                </div>

                <p>
                  Dengan ini menerangkan dengan sesungguhnya bahwa:
                </p>

                <div className="pl-6 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="grid grid-cols-4">
                    <span className="font-bold">Nama Lengkap</span>
                    <span className="col-span-3 font-bold">: {selectedLetter.employee?.firstName} {selectedLetter.employee?.lastName}</span>
                  </div>
                  <div className="grid grid-cols-4">
                    <span className="font-bold">Nomor Induk Karyawan</span>
                    <span className="col-span-3 font-mono">: {selectedLetter.employee?.employeeIdNumber}</span>
                  </div>
                  <div className="grid grid-cols-4">
                    <span className="font-bold">Jabatan</span>
                    <span className="col-span-3">: {selectedLetter.employee?.position?.name || "Staff"}</span>
                  </div>
                  <div className="grid grid-cols-4">
                    <span className="font-bold">Departemen / Divisi</span>
                    <span className="col-span-3">: {selectedLetter.employee?.department?.name || "Operasional"}</span>
                  </div>
                  <div className="grid grid-cols-4">
                    <span className="font-bold">Tanggal Mulai Bekerja</span>
                    <span className="col-span-3">: {formatIndonesianDate(selectedLetter.employee?.joinDate)}</span>
                  </div>
                </div>

                {/* Specific Body Paragraph based on Letter Type */}
                {selectedLetter.type === "SK_AKTIF_KERJA" && (
                  <p>
                    Benar adalah karyawan tetap kami yang masih aktif bekerja dan memiliki kinerja serta loyalitas yang baik hingga surat keterangan ini diterbitkan. Surat keterangan ini diberikan atas permintaan yang bersangkutan untuk keperluan <strong>{selectedLetter.purpose}</strong>.
                  </p>
                )}

                {selectedLetter.type === "SK_PENGHASILAN" && (
                  <div className="space-y-2">
                    <p>
                      Menerangkan bahwa karyawan tersebut di atas memperoleh penghasilan tetap bulanan dari perusahaan kami untuk keperluan <strong>{selectedLetter.purpose}</strong>.
                    </p>
                    <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 font-mono text-center">
                      <span className="text-[11px] block font-semibold text-slate-500">Penghasilan Tetap Bulanan (Gross):</span>
                      <span className="text-base font-bold text-slate-900">
                        {(() => {
                          try {
                            const c = JSON.parse(selectedLetter.contentData || "{}");
                            return c.monthlySalary ? `Rp ${new Intl.NumberFormat("id-ID").format(c.monthlySalary)}` : "Rp 15.000.000";
                          } catch {
                            return "Rp 15.000.000";
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                )}

                {selectedLetter.type.includes("PERINGATAN") && (
                  <div className="space-y-2">
                    <p>
                      Berdasarkan hasil evaluasi kedisiplinan kerja, karyawan yang bersangkutan telah melakukan pelanggaran berupa:
                    </p>
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-950 font-semibold italic">
                      "{(() => {
                        try {
                          const c = JSON.parse(selectedLetter.contentData || "{}");
                          return c.spReason || "Pelanggaran tata tertib kerja perusahaan";
                        } catch {
                          return "Pelanggaran tata tertib kerja";
                        }
                      })()}"
                    </div>
                    <p>
                      Surat Peringatan ini berlaku selama 6 (enam) bulan terhitung sejak tanggal diterbitkan. Apabila dalam kurun waktu tersebut karyawan kembali melakukan pelanggaran, maka perusahaan berhak memberikan sanksi lanjutan yang lebih tegas sesuai peraturan perundang-undangan ketenagakerjaan yang berlaku.
                    </p>
                  </div>
                )}

                {selectedLetter.type === "PAKLARING" && (
                  <p>
                    Telah bekerja dengan baik pada perusahaan kami hingga hari kerja terakhir. Perusahaan mengucapkan terima kasih yang sebesar-besarnya atas dedikasi dan kontribusi positif yang telah diberikan selama masa kerja, dan kami mendoakan kesuksesan yang lebih baik dalam karir selanjutnya.
                  </p>
                )}

                <p>
                  Demikian surat ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
                </p>
              </div>

              {/* Tanda Tangan, QR Code & Stempel */}
              <div className="grid grid-cols-2 gap-8 font-sans text-xs mt-12 pt-4">
                {/* QR Code Verification */}
                <div className="border border-slate-200 p-3 rounded-xl bg-slate-50 flex items-center space-x-3 self-center">
                  <div className="w-16 h-16 bg-white border border-slate-300 rounded-lg p-1 flex items-center justify-center shrink-0">
                    <QrCode className="w-12 h-12 text-slate-800" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-700 block uppercase">Verifikasi Keaslian</span>
                    <span className="text-[9px] text-slate-500 font-mono block">
                      Kode: {selectedLetter.qrCodeVerification || "VERIF-VALID"}
                    </span>
                    <span className="text-[9px] text-emerald-700 font-bold block mt-0.5">
                      ✓ Dokumen Sah Terdaftar di Sistem BASE HRIS
                    </span>
                  </div>
                </div>

                {/* Signature Box */}
                <div className="text-center">
                  <p className="font-semibold">Jakarta, {formatIndonesianDate(selectedLetter.issuedDate || selectedLetter.createdAt)}</p>
                  <p className="font-semibold text-[11px] text-slate-600">{selectedLetter.company?.name || "PT KANAYA MULTI SOLUSINDO"}</p>
                  <div className="h-20 flex items-center justify-center relative">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-blue-600/40 flex items-center justify-center text-[10px] font-bold text-blue-800/60 uppercase rotate-[-12deg]">
                      STEMPEL HRD
                    </div>
                  </div>
                  <p className="font-bold underline">{selectedLetter.signerName}</p>
                  <p className="text-[10px] text-slate-500">{selectedLetter.signerPosition}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
