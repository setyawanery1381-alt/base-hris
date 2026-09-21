"use client";

import React, { useState, useEffect } from "react";
import {
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Banknote,
  Eye,
  AlertCircle,
  FileSpreadsheet,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
  DollarSign,
  Building2,
  X,
  CreditCard,
  Calendar,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  CLAIM_CATEGORIES,
  CLAIM_STATUSES,
  formatRupiah,
} from "@/lib/claims-assets-engine";

export default function AdminClaimsPage() {
  const [session, setSession] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalClaims: 0,
    pendingCount: 0,
    totalAmount: 0,
    approvedAmount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Active Claim
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Action Form states
  const [approvedAmountInput, setApprovedAmountInput] = useState<number>(0);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [paymentRefInput, setPaymentRefInput] = useState("");

  const fetchClaims = async () => {
    setIsLoading(true);
    try {
      const [authRes, claimsRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch(`/api/v1/claims?status=${statusFilter}&category=${categoryFilter}`),
      ]);

      if (authRes.ok) {
        const authData = await authRes.json();
        setSession(authData.user);
      }

      if (claimsRes.ok) {
        const data = await claimsRes.json();
        setClaims(data.data || []);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [statusFilter, categoryFilter]);

  const openClaimModal = (claim: any) => {
    setSelectedClaim(claim);
    setApprovedAmountInput(claim.approvedAmount || claim.totalAmount);
    setRejectionReasonInput("");
    setPaymentRefInput(`TRF-${Date.now().toString().slice(-6)}`);
    setIsDetailModalOpen(true);
  };

  const handleClaimAction = async (action: "APPROVE" | "REJECT" | "PAY") => {
    if (!selectedClaim) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/claims/${selectedClaim.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          approvedAmount: approvedAmountInput,
          rejectionReason: rejectionReasonInput,
          paymentReference: paymentRefInput,
        }),
      });

      if (res.ok) {
        setIsDetailModalOpen(false);
        fetchClaims();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal memproses aksi klaim");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredClaims = claims.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const empName = `${c.employee?.firstName || ""} ${c.employee?.lastName || ""}`.toLowerCase();
    const claimNum = (c.claimNumber || "").toLowerCase();
    const title = (c.title || "").toLowerCase();
    return empName.includes(q) || claimNum.includes(q) || title.includes(q);
  });

  return (
    <AdminShell user={session}>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-950 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Operasional & Keuangan Karyawan</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Klaim & Reimbursement
            </h1>
            <p className="text-sm text-emerald-100/90 mt-1 max-w-2xl">
              Verifikasi kuitansi multi-item, kelola persetujuan klaim medis, transportasi, lembur, dan pencairan pembayaran karyawan.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => fetchClaims()}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Klaim Masuk</span>
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-3xl font-black text-slate-900">{summary.totalClaims}</span>
              <span className="text-xs text-slate-500">Berkas</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Seluruh pengajuan periode berjalan</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Menunggu Review</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-3xl font-black text-amber-600">{summary.pendingCount}</span>
              <span className="text-xs text-slate-500">Perlu Diproses</span>
            </div>
            <p className="text-[11px] text-amber-600 font-semibold mt-1">Prioritas persetujuan HR & Manager</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Nominal Disetujui</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-emerald-700">{formatRupiah(summary.approvedAmount)}</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">Disetujui / siap dicairkan</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Diajukan</span>
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-800">{formatRupiah(summary.totalAmount)}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Akumulasi pengajuan kotor</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor klaim, nama karyawan, atau judul pengeluaran..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Category Dropdown */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="ALL">Semua Kategori</option>
                {CLAIM_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1 border-t border-slate-100 pt-3">
            {[
              { id: "ALL", label: "Semua Status" },
              { id: "PENDING", label: "Menunggu Review" },
              { id: "APPROVED", label: "Disetujui" },
              { id: "PAID", label: "Sudah Dicairkan" },
              { id: "REJECTED", label: "Ditolak" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Claims Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Nomor & Tanggal</th>
                  <th className="px-5 py-3.5">Karyawan</th>
                  <th className="px-5 py-3.5">Kategori & Judul</th>
                  <th className="px-5 py-3.5 text-right">Total Diajukan</th>
                  <th className="px-5 py-3.5 text-right">Disetujui</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                      Memuat data klaim reimbursement...
                    </td>
                  </tr>
                ) : filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      Tidak ada klaim reimbursement yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((claim) => {
                    const statusCfg = CLAIM_STATUSES[claim.status as keyof typeof CLAIM_STATUSES] || {
                      label: claim.status,
                      color: "bg-slate-100 text-slate-700 border-slate-200",
                    };
                    const catCfg = CLAIM_CATEGORIES.find((c) => c.id === claim.category) || {
                      label: claim.category,
                      badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
                    };

                    return (
                      <tr key={claim.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900 font-mono text-[11px]">
                            {claim.claimNumber}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(claim.submissionDate || claim.createdAt).toLocaleDateString("id-ID")}</span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center space-x-2.5">
                            <Avatar
                              name={`${claim.employee?.firstName || ""} ${claim.employee?.lastName || ""}`}
                              photoUrl={claim.employee?.photoUrl}
                              size="sm"
                            />
                            <div>
                              <p className="font-bold text-slate-900">
                                {claim.employee?.firstName} {claim.employee?.lastName}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {claim.employee?.department?.name || "Divisi Operasional"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 max-w-[200px]">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border mb-1 ${catCfg.badgeColor}`}>
                            {catCfg.label}
                          </span>
                          <p className="font-semibold text-slate-800 truncate" title={claim.title}>
                            {claim.title}
                          </p>
                          <span className="text-[10px] text-slate-400 block">
                            {claim.items?.length || 1} Kuitansi / Struk
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right font-mono font-bold text-slate-800">
                          {formatRupiah(claim.totalAmount)}
                        </td>

                        <td className="px-5 py-4 text-right font-mono font-bold text-emerald-700">
                          {claim.approvedAmount !== null && claim.approvedAmount !== undefined
                            ? formatRupiah(claim.approvedAmount)
                            : "-"}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => openClaimModal(claim)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold text-xs transition-colors flex items-center space-x-1.5 mx-auto cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detail</span>
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

      {/* Review & Detail Modal */}
      {isDetailModalOpen && selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {selectedClaim.claimNumber}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500 font-semibold">
                    {new Date(selectedClaim.submissionDate || selectedClaim.createdAt).toLocaleDateString("id-ID")}
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {selectedClaim.title}
                </h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Employee & Bank Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Pemohon</span>
                  <div className="flex items-center space-x-2.5 mt-1">
                    <Avatar
                      name={`${selectedClaim.employee?.firstName || ""} ${selectedClaim.employee?.lastName || ""}`}
                      photoUrl={selectedClaim.employee?.photoUrl}
                      size="sm"
                    />
                    <div>
                      <p className="font-bold text-slate-800">
                        {selectedClaim.employee?.firstName} {selectedClaim.employee?.lastName}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {selectedClaim.employee?.employeeIdNumber} • {selectedClaim.employee?.department?.name || "Karyawan"}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Rekening Pencairan</span>
                  <div className="mt-1">
                    <p className="font-bold text-slate-800">
                      {selectedClaim.bankName || "BCA"} - {selectedClaim.bankAccountNumber || "Rekening Payroll"}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      a/n {selectedClaim.bankAccountHolder || `${selectedClaim.employee?.firstName} ${selectedClaim.employee?.lastName}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-800 text-sm">Rincian Kuitansi & Nota</h4>
                  <span className="text-slate-400 font-semibold text-[11px]">
                    Total Diajukan: <strong className="text-slate-900 font-mono">{formatRupiah(selectedClaim.totalAmount)}</strong>
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  {selectedClaim.items && selectedClaim.items.length > 0 ? (
                    selectedClaim.items.map((item: any, idx: number) => (
                      <div key={item.id || idx} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                        <div className="space-y-0.5 max-w-[320px]">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 text-xs">
                              {item.merchantName || item.description || `Item #${idx + 1}`}
                            </span>
                            {item.receiptNumber && (
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                No: {item.receiptNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">{item.description}</p>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {new Date(item.date).toLocaleDateString("id-ID")} • Kategori: {item.category}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-bold font-mono text-sm text-slate-900 block">
                            {formatRupiah(item.amount)}
                          </span>
                          {item.receiptUrl && (
                            <a
                              href={item.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-bold text-emerald-600 hover:underline inline-flex items-center space-x-0.5 mt-0.5"
                            >
                              <span>Lihat Bukti Foto</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400">
                      Tidak ada rincian kuitansi tersimpan.
                    </div>
                  )}
                </div>
              </div>

              {/* Status History & Notes */}
              {selectedClaim.rejectionReason && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800">
                  <span className="font-bold block mb-0.5">Alasan Penolakan:</span>
                  <p>{selectedClaim.rejectionReason}</p>
                </div>
              )}

              {selectedClaim.status === "PAID" && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                  <span className="font-bold block mb-0.5">Bukti Pencairan Keuangan:</span>
                  <p className="font-mono">
                    Lunas dicairkan pada {new Date(selectedClaim.paidAt).toLocaleDateString("id-ID")} • Ref: {selectedClaim.paymentReference}
                  </p>
                </div>
              )}

              {/* Action Form Inputs for Approver */}
              {selectedClaim.status === "PENDING" && (
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nominal yang Disetujui (Dapat disesuaikan jika ada diskon/pemotongan):
                    </label>
                    <input
                      type="number"
                      value={approvedAmountInput}
                      onChange={(e) => setApprovedAmountInput(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Alasan Penolakan (Hanya diisi jika klaim ditolak):
                    </label>
                    <textarea
                      value={rejectionReasonInput}
                      onChange={(e) => setRejectionReasonInput(e.target.value)}
                      placeholder="Tulis alasan jika menolak pengajuan klaim ini..."
                      rows={2}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              )}

              {selectedClaim.status === "APPROVED" && (
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Referensi Transfer Bank / No. Bukti Pencairan Kasir:
                    </label>
                    <input
                      type="text"
                      value={paymentRefInput}
                      onChange={(e) => setPaymentRefInput(e.target.value)}
                      placeholder="Contoh: TRF-BCA-889102"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2.5">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs"
              >
                Tutup
              </button>

              {selectedClaim.status === "PENDING" && (
                <>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleClaimAction("REJECT")}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Tolak Klaim</span>
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() => handleClaimAction("APPROVE")}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm shadow-emerald-600/25 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Setujui Klaim ({formatRupiah(approvedAmountInput)})</span>
                  </button>
                </>
              )}

              {selectedClaim.status === "APPROVED" && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleClaimAction("PAY")}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm shadow-emerald-600/25 cursor-pointer disabled:opacity-50"
                >
                  <Banknote className="w-4 h-4" />
                  <span>Tandai Sudah Dicairkan (Lunas)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
