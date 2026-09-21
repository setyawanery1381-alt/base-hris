"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import {
  Award,
  ArrowLeft,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  User,
  Star,
  FileCheck,
  ChevronRight,
  ShieldCheck,
  Search,
} from "lucide-react";

function AdminPerformanceReviewsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCycleId = searchParams.get("cycleId") || "";
  const initialReviewId = searchParams.get("id") || "";

  const [session, setSession] = useState<any>(null);
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>(initialCycleId);
  const [reviews, setReviews] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeReviewDetail, setActiveReviewDetail] = useState<any>(null);
  const [activeGoals, setActiveGoals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const loadData = async () => {
    try {
      const [authRes, cyclesRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/performance/cycles"),
      ]);

      if (authRes.ok) setSession((await authRes.json()).user);
      if (cyclesRes.ok) {
        const cData = (await cyclesRes.json()).cycles || [];
        setCycles(cData);
        if (!selectedCycleId && cData.length > 0) {
          setSelectedCycleId(cData[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadReviews = async () => {
    try {
      const url = selectedCycleId
        ? `/api/v1/performance/reviews?cycleId=${selectedCycleId}`
        : "/api/v1/performance/reviews";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);

        if (initialReviewId && !activeReviewDetail) {
          openReviewDetail(initialReviewId);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [selectedCycleId]);

  const openReviewDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/performance/reviews?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveReviewDetail(data.review);
        setActiveGoals(data.goals || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFinalize = async (id: string) => {
    setIsFinalizing(true);
    try {
      const res = await fetch("/api/v1/performance/reviews", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: id, status: "COMPLETED" }),
      });
      if (res.ok) {
        await openReviewDetail(id);
        await loadReviews();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFinalizing(false);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    const matchesStatus = selectedStatus === "ALL" || r.status === selectedStatus;
    const name = `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.toLowerCase();
    const idNum = (r.employee?.employeeIdNumber || "").toLowerCase();
    const dept = (r.employee?.department?.name || "").toLowerCase();
    const matchesSearch =
      name.includes(searchTerm.toLowerCase()) ||
      idNum.includes(searchTerm.toLowerCase()) ||
      dept.includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <AdminShell user={session}>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
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
                <Award className="w-6 h-6 text-indigo-600" />
                <span>Evaluasi Kinerja Karyawan</span>
              </h1>
              <p className="text-xs text-slate-500">
                Pemeriksaan lembar penilaian mandiri, feedback manajer, scoring bobot, dan finalisasi HR.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500">Periode:</span>
            <select
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 shadow-xs focus:outline-none"
            >
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: "ALL", label: "Semua Status" },
              { id: "SELF_ASSESSMENT", label: "Self Review" },
              { id: "MANAGER_ASSESSMENT", label: "Review Manajer" },
              { id: "HR_REVIEW", label: "Persetujuan HR" },
              { id: "COMPLETED", label: "Selesai (Final)" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedStatus === st.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari karyawan / dept..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>
        </div>

        {/* Reviews Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Karyawan</th>
                  <th className="py-3 px-4">Departemen & Jabatan</th>
                  <th className="py-3 px-4">Penilai (Manager)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Skor Mandiri</th>
                  <th className="py-3 px-4 text-center">Skor Manajer</th>
                  <th className="py-3 px-4 text-center">Grade Final</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReviews.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      Tidak ada evaluasi ditemukan untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredReviews.map((rev) => (
                    <tr key={rev.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">
                          {rev.employee?.firstName} {rev.employee?.lastName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {rev.employee?.employeeIdNumber}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div>{rev.employee?.department?.name || "-"}</div>
                        <div className="text-[10px] text-slate-400">
                          {rev.employee?.position?.name || "-"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {rev.reviewer
                          ? `${rev.reviewer.firstName} ${rev.reviewer.lastName}`
                          : "HR Admin"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rev.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : rev.status === "HR_REVIEW"
                              ? "bg-purple-100 text-purple-800"
                              : rev.status === "MANAGER_ASSESSMENT"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {rev.status === "COMPLETED"
                            ? "Selesai"
                            : rev.status === "HR_REVIEW"
                            ? "Review HR"
                            : rev.status === "MANAGER_ASSESSMENT"
                            ? "Review Manajer"
                            : "Mandiri"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                        {rev.selfScore ? `${rev.selfScore} / 5` : "-"}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                        {rev.managerScore ? `${rev.managerScore} / 5` : "-"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {rev.finalGrade ? (
                          <span
                            className={`px-2.5 py-0.5 rounded-md font-black text-xs ${
                              rev.finalGrade === "A"
                                ? "bg-emerald-100 text-emerald-800"
                                : rev.finalGrade === "B"
                                ? "bg-blue-100 text-blue-800"
                                : rev.finalGrade === "C"
                                ? "bg-teal-100 text-teal-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            Grade {rev.finalGrade}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openReviewDetail(rev.id)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                        >
                          Buka Rapor
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Modal / Scorecard Drawer */}
        {activeReviewDetail && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        activeReviewDetail.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-indigo-100 text-indigo-800"
                      }`}
                    >
                      {activeReviewDetail.status}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {activeReviewDetail.cycle?.name}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900">
                    {activeReviewDetail.employee?.firstName} {activeReviewDetail.employee?.lastName}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {activeReviewDetail.employee?.department?.name || "-"} •{" "}
                    {activeReviewDetail.employee?.position?.name || "-"} (ID:{" "}
                    {activeReviewDetail.employee?.employeeIdNumber})
                  </p>
                </div>

                <button
                  onClick={() => setActiveReviewDetail(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Overall Scorecard Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                    Hasil Penilaian Akhir
                  </span>
                  <div className="text-2xl font-black mt-1 flex items-center space-x-2">
                    <span>
                      {activeReviewDetail.finalScore
                        ? `${activeReviewDetail.finalScore} / 5.0`
                        : "Menunggu Penilaian"}
                    </span>
                    {activeReviewDetail.finalGrade && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-sm border border-emerald-400/30">
                        Grade {activeReviewDetail.finalGrade}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Skor Mandiri: {activeReviewDetail.selfScore || "-"} / 5.0 • Skor Manajer:{" "}
                    {activeReviewDetail.managerScore || "-"} / 5.0
                  </p>
                </div>

                {activeReviewDetail.status !== "COMPLETED" && (
                  <button
                    onClick={() => handleFinalize(activeReviewDetail.id)}
                    disabled={isFinalizing}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isFinalizing ? "Memproses..." : "Finalisasi & Setujui Rapor"}</span>
                  </button>
                )}
              </div>

              {/* Target & KPI Pencapaian Summary */}
              {activeGoals.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span>Target & KPI Periode Ini</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeGoals.map((g) => {
                      const percent = g.targetValue > 0 ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100)) : 100;
                      return (
                        <div key={g.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-xs text-slate-800">{g.title}</span>
                            <span className="text-[11px] font-bold text-indigo-600">{percent}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full"
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Tercapai: {g.currentValue} / {g.targetValue}</span>
                            <span className="font-semibold text-slate-600">Bobot {g.weight}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Review Items Matrix */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span>Rincian Indikator & Penilaian Kompetensi</span>
                </h3>

                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  {activeReviewDetail.items?.map((item: any) => (
                    <div key={item.id} className="p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800">{item.title}</span>
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold">
                            {item.category}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-indigo-700">Bobot {item.weight}%</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-100 text-slate-700 space-y-1">
                          <div className="flex justify-between font-bold text-[11px] text-blue-900">
                            <span>Nilai Mandiri:</span>
                            <span>{item.selfRating ? `${item.selfRating} / 5.0` : "Belum diisi"}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 italic">
                            "{item.selfNotes || "Tidak ada catatan evaluasi diri."}"
                          </p>
                        </div>

                        <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 text-slate-700 space-y-1">
                          <div className="flex justify-between font-bold text-[11px] text-emerald-900">
                            <span>Nilai Manajer:</span>
                            <span>{item.managerRating ? `${item.managerRating} / 5.0` : "Belum dinilai"}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 italic">
                            "{item.managerNotes || "Tidak ada catatan manajer."}"
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reflections and Recommendations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800">Refleksi Karyawan (Self-Summary)</h4>
                  <p className="text-slate-600 leading-relaxed">
                    {activeReviewDetail.selfSummary || "Belum ada rangkuman evaluasi mandiri."}
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800">Catatan & Ulasan Manajer</h4>
                  <p className="text-slate-600 leading-relaxed">
                    {activeReviewDetail.managerSummary || "Belum ada catatan pembinaan manajer."}
                  </p>
                  {(activeReviewDetail.promotionRecommended ||
                    activeReviewDetail.salaryIncreaseRecommended) && (
                    <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-2">
                      {activeReviewDetail.promotionRecommended && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          ✓ Rekomendasi Promosi Jabatan
                        </span>
                      )}
                      {activeReviewDetail.salaryIncreaseRecommended && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                          ✓ Rekomendasi Kenaikan Gaji
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveReviewDetail(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Tutup Rapor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

export default function AdminPerformanceReviewsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat data evaluasi...</div>}>
      <AdminPerformanceReviewsContent />
    </Suspense>
  );
}
