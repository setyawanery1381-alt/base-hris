"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Receipt,
  Plus,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Banknote,
  Camera,
  Upload,
  ChevronRight,
  Sparkles,
  DollarSign,
  CreditCard,
  FileText,
  X,
} from "lucide-react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { useTheme } from "@/components/layout/theme-provider";
import {
  CLAIM_CATEGORIES,
  CLAIM_STATUSES,
  formatRupiah,
  calculateClaimTotal,
} from "@/lib/claims-assets-engine";

export default function EmployeeClaimsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [session, setSession] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("TRANSPORT");
  const [formDescription, setFormDescription] = useState("");
  const [bankName, setBankName] = useState("BCA");
  const [bankAccount, setBankAccount] = useState("");
  const [bankHolder, setBankHolder] = useState("");

  // Items in claim
  const [items, setItems] = useState<any[]>([
    {
      date: new Date().toISOString().split("T")[0],
      category: "TRANSPORT",
      merchantName: "",
      receiptNumber: "",
      amount: "",
      description: "",
      receiptUrl: "",
    },
  ]);

  const loadClaims = async () => {
    setIsLoading(true);
    try {
      const [authRes, claimsRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/claims"),
      ]);

      if (authRes.ok) {
        const authData = await authRes.json();
        setSession(authData.user);
        setBankHolder(authData.user?.name || "");
      }
      if (claimsRes.ok) {
        const data = await claimsRes.json();
        setClaims(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, []);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        date: new Date().toISOString().split("T")[0],
        category: formCategory,
        merchantName: "",
        receiptNumber: "",
        amount: "",
        description: "",
        receiptUrl: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        handleItemChange(index, "receiptUrl", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const totalCalculated = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert("Tuliskan judul pengajuan klaim");
      return;
    }

    if (totalCalculated <= 0) {
      alert("Total klaim harus lebih besar dari Rp 0");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          category: formCategory,
          description: formDescription,
          bankName,
          bankAccountNumber: bankAccount,
          bankAccountHolder: bankHolder,
          items: items.map((it) => ({
            ...it,
            amount: Number(it.amount) || 0,
          })),
        }),
      });

      if (res.ok) {
        setIsFormOpen(false);
        setFormTitle("");
        setFormDescription("");
        setItems([
          {
            date: new Date().toISOString().split("T")[0],
            category: "TRANSPORT",
            merchantName: "",
            receiptNumber: "",
            amount: "",
            description: "",
            receiptUrl: "",
          },
        ]);
        loadClaims();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal mengirim klaim");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const pendingClaims = claims.filter((c) => c.status === "PENDING");
  const paidClaims = claims.filter((c) => c.status === "PAID");
  const totalPaidAmount = paidClaims.reduce((sum, c) => sum + (c.approvedAmount || c.totalAmount), 0);

  return (
    <MobileShell user={session}>
      <div className="bg-slate-50 min-h-full pb-8">
        {/* Header Gradient */}
        <div
          className="text-white px-5 pt-5 pb-8 rounded-b-[28px] shadow-md transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor || theme.primaryColor}, #0f172a)`,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => router.push("/employee")}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold tracking-wider uppercase text-white/90">
              Klaim & Reimbursement
            </span>
            <div className="w-7" />
          </div>

          <h1 className="text-xl font-black">Penggantian Biaya</h1>
          <p className="text-[11px] text-white/80 mt-0.5">
            Ajukan klaim kuitansi dinas & pantau status pencairan langsung.
          </p>

          <button
            onClick={() => setIsFormOpen(true)}
            className="w-full mt-4 py-3 rounded-2xl bg-white text-slate-900 font-extrabold text-xs tracking-wider uppercase shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Ajukan Klaim Baru</span>
          </button>
        </div>

        {/* Summary Mini Cards */}
        <div className="px-4 -mt-4">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-[10px] font-bold text-amber-600 block uppercase">Menunggu Review</span>
              <span className="text-lg font-black text-slate-900 mt-0.5 block">{pendingClaims.length} Pengajuan</span>
              <span className="text-[10px] text-slate-400">Sedang diproses HR</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-[10px] font-bold text-emerald-600 block uppercase">Sudah Dicairkan</span>
              <span className="text-sm font-black text-emerald-700 font-mono mt-0.5 block truncate">
                {formatRupiah(totalPaidAmount)}
              </span>
              <span className="text-[10px] text-slate-400">{paidClaims.length} Klaim Lunas</span>
            </div>
          </div>
        </div>

        {/* Claims History List */}
        <div className="px-4 mt-5 space-y-3">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
            Riwayat Pengajuan
          </h2>

          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Memuat data riwayat klaim...
            </div>
          ) : claims.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-600">Belum Ada Pengajuan Klaim</p>
              <p className="text-[11px] mt-1">Tekan tombol "Ajukan Klaim Baru" untuk mengunggah kuitansi pengeluaran.</p>
            </div>
          ) : (
            claims.map((claim) => {
              const statusCfg = CLAIM_STATUSES[claim.status as keyof typeof CLAIM_STATUSES] || {
                label: claim.status,
                color: "bg-slate-100 text-slate-700 border-slate-200",
              };
              const catCfg = CLAIM_CATEGORIES.find((c) => c.id === claim.category);

              return (
                <div
                  key={claim.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {claim.claimNumber}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(claim.submissionDate || claim.createdAt).toLocaleDateString("id-ID")}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mt-1">{claim.title}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${catCfg?.badgeColor || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                        {catCfg?.label || claim.category}
                      </span>
                      <span className="text-[11px] text-slate-500 ml-2">
                        {claim.items?.length || 1} Nota
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-bold font-mono text-slate-900 block text-sm">
                        {formatRupiah(claim.totalAmount)}
                      </span>
                      {claim.approvedAmount && claim.status === "APPROVED" && (
                        <span className="text-[10px] text-emerald-600 font-bold block">
                          Disetujui: {formatRupiah(claim.approvedAmount)}
                        </span>
                      )}
                    </div>
                  </div>

                  {claim.rejectionReason && (
                    <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-[11px]">
                      <span className="font-bold">Alasan Ditolak: </span>
                      {claim.rejectionReason}
                    </div>
                  )}

                  {claim.status === "PAID" && (
                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-[11px] flex items-center justify-between">
                      <span>Ref Transfer: <strong>{claim.paymentReference}</strong></span>
                      <span className="text-[10px] font-bold">Lunas Cair ✓</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal / Sheet Form Pengajuan Baru */}
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center space-x-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-black text-slate-900 text-sm">Form Pengajuan Reimbursement</h3>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitClaim} className="p-5 overflow-y-auto space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Judul Pengajuan *</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Contoh: Kuitansi Rawat Jalan & Resep Dokter"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori Klaim</label>
                  <select
                    value={formCategory}
                    onChange={(e) => {
                      setFormCategory(e.target.value);
                      const updated = items.map((it) => ({ ...it, category: e.target.value }));
                      setItems(updated);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {CLAIM_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Items Container */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Daftar Kuitansi / Struk ({items.length})</span>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-emerald-600 font-bold text-[11px] hover:underline flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Nota</span>
                    </button>
                  </div>

                  {items.map((item, index) => (
                    <div key={index} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 relative">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-rose-600 text-[10px] font-bold"
                        >
                          ✕ Hapus
                        </button>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Tanggal Struk</label>
                          <input
                            type="date"
                            value={item.date}
                            onChange={(e) => handleItemChange(index, "date", e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Nominal (Rp) *</label>
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) => handleItemChange(index, "amount", e.target.value)}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 font-mono font-bold rounded-lg border border-slate-200 bg-white text-emerald-700"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Nama Vendor / Toko</label>
                          <input
                            type="text"
                            value={item.merchantName}
                            onChange={(e) => handleItemChange(index, "merchantName", e.target.value)}
                            placeholder="Contoh: Apotek Kimia Farma"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">No. Kuitansi / Resep</label>
                          <input
                            type="text"
                            value={item.receiptNumber}
                            onChange={(e) => handleItemChange(index, "receiptNumber", e.target.value)}
                            placeholder="INV-001"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Upload Foto Struk / Bukti Nota</label>
                        <div className="flex items-center space-x-2">
                          <label className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer text-[11px] font-semibold">
                            <Camera className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{item.receiptUrl ? "Ganti Foto" : "Foto / Ambil File"}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload(index, e)}
                            />
                          </label>
                          {item.receiptUrl && (
                            <span className="text-[10px] text-emerald-600 font-bold">✓ Foto Terunggah</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between text-emerald-950">
                    <span className="font-bold">Total Nilai Pengajuan:</span>
                    <span className="font-mono font-black text-sm text-emerald-800">
                      {formatRupiah(totalCalculated)}
                    </span>
                  </div>
                </div>

                {/* Bank Account Details */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-700 block">Informasi Rekening Pencairan</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Bank</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">No. Rekening</label>
                      <input
                        type="text"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        placeholder="Contoh: 1234567890"
                        className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/25 disabled:opacity-50"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Kirim Pengajuan Klaim</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
