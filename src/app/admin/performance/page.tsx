"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import {
  Award,
  Target,
  TrendingUp,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ChevronRight,
  BarChart3,
  Layers,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminPerformanceDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [cycles, setCycles] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [authRes, cyclesRes, reviewsRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/performance/cycles"),
        fetch("/api/v1/performance/reviews"),
      ]);

      if (authRes.ok) setSession((await authRes.json()).user);
      if (cyclesRes.ok) setCycles((await cyclesRes.json()).cycles || []);
      if (reviewsRes.ok) setReviews((await reviewsRes.json()).reviews || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeCycle = cycles.find((c) => c.status === "ACTIVE") || cycles[0];
  const totalReviews = reviews.length;
  const selfCompleted = reviews.filter((r) => r.selfScore !== null).length;
  const managerCompleted = reviews.filter((r) => r.managerScore !== null).length;
  const fullyCompleted = reviews.filter((r) => r.status === "COMPLETED").length;

  const validScores = reviews
    .map((r) => r.finalScore || r.managerScore || r.selfScore)
    .filter((s) => s != null && !isNaN(s));
  const avgScore =
    validScores.length > 0
      ? Number((validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2))
      : 0;

  const gradeCounts = {
    A: reviews.filter((r) => r.finalGrade === "A").length,
    B: reviews.filter((r) => r.finalGrade === "B").length,
    C: reviews.filter((r) => r.finalGrade === "C").length,
    D: reviews.filter((r) => r.finalGrade === "D").length,
    E: reviews.filter((r) => r.finalGrade === "E").length,
  };

  return (
    <AdminShell user={session}>
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2.5">
              <Award className="w-7 h-7 text-indigo-600" />
              <span>Manajemen Kinerja & KPI (Performance)</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Pantau pencapaian KPI karyawan, evaluasi kinerja 360°, dan distribusi rating perusahaan.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push("/admin/performance/cycles")}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-2"
            >
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Kelola Periode</span>
            </button>
            <button
              onClick={() => router.push("/admin/performance/kpis")}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-2"
            >
              <Target className="w-4 h-4" />
              <span>Library KPI & Target</span>
            </button>
          </div>
        </div>

        {/* Active Cycle Banner */}
        {activeCycle ? (
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-[10px] font-bold uppercase tracking-wider border border-indigo-400/30">
                  Periode Aktif
                </span>
                <span className="text-xs text-indigo-200">
                  Tenggat Evaluasi:{" "}
                  {new Date(activeCycle.managerReviewDeadline || activeCycle.endDate).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <h2 className="text-xl font-black">{activeCycle.name}</h2>
              <p className="text-xs text-slate-300 max-w-xl">
                {activeCycle.description ||
                  "Evaluasi pencapaian target semester dan penilaian kompetensi seluruh divisi."}
              </p>
            </div>
            <div className="flex items-center space-x-3 shrink-0">
              <button
                onClick={() => router.push(`/admin/performance/reviews?cycleId=${activeCycle.id}`)}
                className="px-4 py-2.5 bg-white text-indigo-950 font-bold rounded-xl text-xs hover:bg-indigo-50 shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Lihat Evaluasi Karyawan</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <p className="text-xs font-semibold text-amber-800">
                Belum ada periode penilaian aktif. Buat periode penilaian baru untuk memulai evaluasi.
              </p>
            </div>
            <button
              onClick={() => router.push("/admin/performance/cycles")}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              + Buat Periode
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Review Karyawan
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-800">{totalReviews}</div>
              <div className="text-[11px] text-slate-500 mt-1">Karyawan terdaftar evaluasi</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Rata-rata Skor
              </span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-800">
                {avgScore > 0 ? avgScore : "-"} <span className="text-sm font-normal text-slate-400">/ 5.0</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Skala 1.0 - 5.0 seluruh divisi</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Evaluasi Mandiri (Self)
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-800">
                {totalReviews > 0 ? Math.round((selfCompleted / totalReviews) * 100) : 0}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {selfCompleted} dari {totalReviews} karyawan mengisi
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Evaluasi Manajer
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-800">
                {totalReviews > 0 ? Math.round((managerCompleted / totalReviews) * 100) : 0}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {managerCompleted} dari {totalReviews} selesai dievaluasi
              </div>
            </div>
          </div>
        </div>

        {/* Rating Distribution & Fast Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bell Curve / Grade Distribution */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Distribusi Nilai & Grade Kinerja</h3>
                <p className="text-xs text-slate-500">Sebaran peringkat hasil evaluasi kinerja perusahaan</p>
              </div>
              <BarChart3 className="w-5 h-5 text-slate-400" />
            </div>

            <div className="space-y-3 pt-2">
              {[
                { grade: "A", label: "Istimewa (Outstanding)", min: "≥ 4.50", count: gradeCounts.A, color: "bg-emerald-500", text: "text-emerald-700" },
                { grade: "B", label: "Melebihi Target (Exceeds)", min: "3.75 - 4.49", count: gradeCounts.B, color: "bg-blue-500", text: "text-blue-700" },
                { grade: "C", label: "Memenuhi Target (Meets)", min: "3.00 - 3.74", count: gradeCounts.C, color: "bg-teal-500", text: "text-teal-700" },
                { grade: "D", label: "Perlu Perbaikan (Needs Impr.)", min: "2.00 - 2.99", count: gradeCounts.D, color: "bg-amber-500", text: "text-amber-700" },
                { grade: "E", label: "Kurang Memuaskan (Unsat.)", min: "< 2.00", count: gradeCounts.E, color: "bg-rose-500", text: "text-rose-700" },
              ].map((item) => {
                const percent = totalReviews > 0 ? Math.round((item.count / totalReviews) * 100) : 0;
                return (
                  <div key={item.grade} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className={`font-black w-6 text-center ${item.text}`}>Grade {item.grade}</span>
                        <span className="font-medium text-slate-700">{item.label}</span>
                        <span className="text-[11px] text-slate-400">({item.min})</span>
                      </div>
                      <div className="font-bold text-slate-800">
                        {item.count} orang <span className="text-slate-400 font-normal">({percent}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} transition-all duration-500 rounded-full`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Module Navigation */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Modul Kinerja & KPI</h3>
              <p className="text-xs text-slate-500">Pintasan menu manajemen performa</p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => router.push("/admin/performance/cycles")}
                className="w-full p-3.5 rounded-xl border border-slate-100 hover:border-indigo-200 bg-slate-50/50 hover:bg-indigo-50/30 flex items-center justify-between text-left transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Periode Penilaian</h4>
                    <p className="text-[11px] text-slate-500">Atur jadwal & deadline evaluasi</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
              </button>

              <button
                onClick={() => router.push("/admin/performance/kpis")}
                className="w-full p-3.5 rounded-xl border border-slate-100 hover:border-indigo-200 bg-slate-50/50 hover:bg-indigo-50/30 flex items-center justify-between text-left transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Master KPI & Kompetensi</h4>
                    <p className="text-[11px] text-slate-500">Library indikator kinerja & bobot</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
              </button>

              <button
                onClick={() => router.push("/admin/performance/reviews")}
                className="w-full p-3.5 rounded-xl border border-slate-100 hover:border-indigo-200 bg-slate-50/50 hover:bg-indigo-50/30 flex items-center justify-between text-left transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Evaluasi Karyawan</h4>
                    <p className="text-[11px] text-slate-500">Lembar penilaian & rekomendasi karir</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Recent Performance Reviews Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Daftar Evaluasi Kinerja Karyawan</h3>
              <p className="text-xs text-slate-500">Status terkini pengisian lembar evaluasi</p>
            </div>
            <button
              onClick={() => router.push("/admin/performance/reviews")}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
            >
              <span>Semua Evaluasi</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Karyawan</th>
                  <th className="py-3 px-4">Departemen / Jabatan</th>
                  <th className="py-3 px-4">Penilai (Manager)</th>
                  <th className="py-3 px-4">Status Review</th>
                  <th className="py-3 px-4 text-center">Skor Mandiri</th>
                  <th className="py-3 px-4 text-center">Skor Manajer</th>
                  <th className="py-3 px-4 text-center">Grade Final</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reviews.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Belum ada data evaluasi kinerja.
                    </td>
                  </tr>
                ) : (
                  reviews.slice(0, 8).map((rev) => (
                    <tr key={rev.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {rev.employee?.firstName} {rev.employee?.lastName}
                        <span className="block text-[10px] font-mono text-slate-400 font-normal">
                          {rev.employee?.employeeIdNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {rev.employee?.department?.name || "-"}
                        <span className="block text-[10px] text-slate-400">
                          {rev.employee?.position?.name || "-"}
                        </span>
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
                            : "Self Assessment"}
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
                            {rev.finalGrade}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => router.push(`/admin/performance/reviews?id=${rev.id}`)}
                          className="px-2.5 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
