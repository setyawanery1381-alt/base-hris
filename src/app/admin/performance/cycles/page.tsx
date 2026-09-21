"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import {
  Calendar,
  Plus,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Users,
  AlertCircle,
  MoreVertical,
  Layers,
} from "lucide-react";

export default function AdminPerformanceCyclesPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [cycles, setCycles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "Penilaian Kinerja Semester 1 2026",
    cycleType: "SEMI_ANNUAL",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    selfReviewDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    managerReviewDeadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    description: "Evaluasi pencapaian target kerja dan kompetensi karyawan semester ini.",
    autoProvision: true,
  });

  const loadData = async () => {
    try {
      const [authRes, cyclesRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/performance/cycles"),
      ]);

      if (authRes.ok) setSession((await authRes.json()).user);
      if (cyclesRes.ok) setCycles((await cyclesRes.json()).cycles || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/performance/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal membuat periode");
      }
    } catch (e: any) {
      alert(e.message || "Gagal membuat periode");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch("/api/v1/performance/cycles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AdminShell user={session}>
      <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
        {/* Back and Header */}
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
                <Calendar className="w-6 h-6 text-indigo-600" />
                <span>Periode Penilaian Kinerja (Cycles)</span>
              </h1>
              <p className="text-xs text-slate-500">
                Atur jadwal siklus evaluasi, tenggat waktu mandiri & manajer, serta inisialisasi penilaian.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-2 cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Periode Baru</span>
          </button>
        </div>

        {/* Cycles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cycles.length === 0 ? (
            <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-sm">Belum ada periode penilaian kinerja.</p>
              <p className="text-xs text-slate-400 mt-1">
                Klik tombol "Tambah Periode Baru" di atas untuk membuat siklus evaluasi pertama.
              </p>
            </div>
          ) : (
            cycles.map((c) => {
              const stats = c.stats || {};
              const completion = stats.completionRate || 0;

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          c.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : c.status === "COMPLETED"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {c.status}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {c.cycleType}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-black text-slate-800">{c.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {c.description || "Periode evaluasi kinerja berkala."}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Durasi Periode:</span>
                        <span className="font-semibold">
                          {new Date(c.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} -{" "}
                          {new Date(c.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Batas Mandiri:</span>
                        <span className="font-semibold text-amber-700">
                          {new Date(c.selfReviewDeadline).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Batas Manajer:</span>
                        <span className="font-semibold text-indigo-700">
                          {new Date(c.managerReviewDeadline).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-500">Progres Evaluasi</span>
                        <span className="text-indigo-600">{completion}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${completion}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                        <span>{stats.selfSubmitted || 0} Mandiri</span>
                        <span>{stats.managerSubmitted || 0} Manajer</span>
                        <span>{stats.completed || 0} Final</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <select
                        value={c.status}
                        onChange={(e) => handleUpdateStatus(c.id, e.target.value)}
                        className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium"
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="IN_REVIEW">IN_REVIEW</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </div>

                    <button
                      onClick={() => router.push(`/admin/performance/reviews?cycleId=${c.id}`)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors"
                    >
                      Buka Evaluasi ({stats.totalReviews || 0})
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Create Cycle */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-800 text-base flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <span>Tambah Periode Penilaian Baru</span>
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Periode</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-xs font-semibold"
                    placeholder="e.g. Penilaian Kinerja Semester 2 2026"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tipe Periode</label>
                    <select
                      value={formData.cycleType}
                      onChange={(e) => setFormData({ ...formData, cycleType: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                    >
                      <option value="SEMI_ANNUAL">Semester (6 Bulan)</option>
                      <option value="ANNUAL">Tahunan (Annual)</option>
                      <option value="QUARTERLY">Kuartal (3 Bulan)</option>
                      <option value="MONTHLY">Bulanan (Monthly)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tanggal Mulai</label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tanggal Selesai</label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Batas Review Mandiri</label>
                    <input
                      type="date"
                      required
                      value={formData.selfReviewDeadline}
                      onChange={(e) => setFormData({ ...formData, selfReviewDeadline: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Batas Review Manajer</label>
                  <input
                    type="date"
                    required
                    value={formData.managerReviewDeadline}
                    onChange={(e) => setFormData({ ...formData, managerReviewDeadline: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Keterangan / Instruksi</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                    placeholder="Instruksi bagi karyawan dan manajer..."
                  />
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-2xl flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="autoProvision"
                    checked={formData.autoProvision}
                    onChange={(e) => setFormData({ ...formData, autoProvision: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <label htmlFor="autoProvision" className="text-[11px] text-indigo-900 font-semibold cursor-pointer">
                    Otomatis generate lembar evaluasi & KPI standar untuk seluruh karyawan aktif
                  </label>
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
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold disabled:opacity-50"
                  >
                    {isSubmitting ? "Memproses..." : "Simpan & Buat Periode"}
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
