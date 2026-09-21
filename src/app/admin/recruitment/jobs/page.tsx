"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import {
  Briefcase,
  Plus,
  ArrowLeft,
  Calendar,
  Users,
  Building2,
  MapPin,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
} from "lucide-react";

export default function AdminRecruitmentJobsPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: "",
    departmentId: "",
    positionId: "",
    employmentType: "FULL_TIME",
    experienceLevel: "MID",
    location: "Jakarta (Hybrid)",
    minSalary: 8000000,
    maxSalary: 15000000,
    quota: 1,
    description: "",
    requirements: "",
    status: "PUBLISHED",
    deadlineDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });

  const loadData = async () => {
    try {
      const [authRes, jobsRes, deptsRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/recruitment/jobs"),
        fetch("/api/v1/departments"),
      ]);

      if (authRes.ok) setSession((await authRes.json()).user);
      if (jobsRes.ok) setJobs((await jobsRes.json()).jobs || []);
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
    setEditingJob(null);
    setFormData({
      title: "",
      departmentId: "",
      positionId: "",
      employmentType: "FULL_TIME",
      experienceLevel: "MID",
      location: "Jakarta (Hybrid)",
      minSalary: 8000000,
      maxSalary: 15000000,
      quota: 1,
      description: "Bertanggung jawab atas pengembangan fitur dan performa aplikasi.",
      requirements: "• Minimal 2 tahun pengalaman di bidang terkait.\n• Menguasai stack teknologi modern.\n• Kemampuan komunikasi dan kerja tim yang baik.",
      status: "PUBLISHED",
      deadlineDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (job: any) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      departmentId: job.departmentId || "",
      positionId: job.positionId || "",
      employmentType: job.employmentType,
      experienceLevel: job.experienceLevel,
      location: job.location || "Jakarta (Hybrid)",
      minSalary: job.minSalary || 0,
      maxSalary: job.maxSalary || 0,
      quota: job.quota || 1,
      description: job.description,
      requirements: job.requirements,
      status: job.status,
      deadlineDate: job.deadlineDate ? new Date(job.deadlineDate).toISOString().split("T")[0] : "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = "/api/v1/recruitment/jobs";
      const method = editingJob ? "PUT" : "POST";
      const payload = editingJob ? { ...formData, id: editingJob.id } : formData;

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
        alert(err.error || "Gagal menyimpan lowongan");
      }
    } catch (e: any) {
      alert(e.message || "Gagal menyimpan lowongan");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus lowongan pekerjaan ini?")) return;
    try {
      const res = await fetch(`/api/v1/recruitment/jobs?id=${id}`, { method: "DELETE" });
      if (res.ok) await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AdminShell user={session}>
      <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push("/admin/recruitment")}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center space-x-2">
                <Briefcase className="w-6 h-6 text-indigo-600" />
                <span>Manajemen Lowongan Pekerjaan</span>
              </h1>
              <p className="text-xs text-slate-500">
                Publikasikan lowongan kerja, tentukan kuota rekrutmen, dan atur kualifikasi kandidat.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.open("/careers", "_blank")}
              className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Lihat di Portal Karir</span>
            </button>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Pasang Lowongan Baru</span>
            </button>
          </div>
        </div>

        {/* Jobs Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Posisi / Judul Lowongan</th>
                  <th className="py-3 px-4">Departemen</th>
                  <th className="py-3 px-4">Tipe & Lokasi</th>
                  <th className="py-3 px-4 text-center">Rentang Gaji</th>
                  <th className="py-3 px-4 text-center">Pelamar</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Belum ada lowongan pekerjaan. Klik "Pasang Lowongan Baru" di atas.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        <div className="flex items-center space-x-2">
                          <span>{job.title}</span>
                          <span className="text-[10px] font-mono font-normal px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {job.quota} kuota
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                          Dipublikasikan: {new Date(job.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {job.department?.name || "General"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div>{job.employmentType}</div>
                        <div className="text-[10px] text-slate-400">{job.location}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-700">
                        {job.minSalary && job.maxSalary
                          ? `Rp ${(job.minSalary / 1000000).toFixed(0)} - ${(job.maxSalary / 1000000).toFixed(0)} jt`
                          : "Kompetitif"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs">
                          {job._count?.candidates || 0} orang
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            job.status === "PUBLISHED"
                              ? "bg-emerald-100 text-emerald-800"
                              : job.status === "DRAFT"
                              ? "bg-slate-100 text-slate-700"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => openEditModal(job)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(job.id)}
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

        {/* Modal Create/Edit */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-800 text-base flex items-center space-x-2">
                  <Briefcase className="w-5 h-5 text-indigo-600" />
                  <span>{editingJob ? "Edit Lowongan Pekerjaan" : "Pasang Lowongan Baru"}</span>
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
                  <label className="block font-bold text-slate-700 mb-1">Judul Lowongan</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-xs"
                    placeholder="e.g. Senior Frontend Engineer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Departemen</label>
                    <select
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                    >
                      <option value="">Pilih Departemen</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tipe Pekerjaan</label>
                    <select
                      value={formData.employmentType}
                      onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                    >
                      <option value="FULL_TIME">Full-Time (Tetap/PKWT)</option>
                      <option value="CONTRACT">Contract (Kontrak)</option>
                      <option value="INTERN">Internship (Magang)</option>
                      <option value="PART_TIME">Part-Time</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Level Pengalaman</label>
                    <select
                      value={formData.experienceLevel}
                      onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                    >
                      <option value="ENTRY">Entry / Fresh Grad</option>
                      <option value="MID">Mid-Level (1-3 thn)</option>
                      <option value="SENIOR">Senior (3-5+ thn)</option>
                      <option value="LEAD">Lead / Manager</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Lokasi Kerja</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                      placeholder="e.g. Jakarta (Hybrid)"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kuota Penerimaan</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.quota}
                      onChange={(e) => setFormData({ ...formData, quota: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Rentang Gaji Minimum (Rp)</label>
                    <input
                      type="number"
                      value={formData.minSalary}
                      onChange={(e) => setFormData({ ...formData, minSalary: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Rentang Gaji Maksimum (Rp)</label>
                    <input
                      type="number"
                      value={formData.maxSalary}
                      onChange={(e) => setFormData({ ...formData, maxSalary: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Deskripsi Pekerjaan & Tanggung Jawab</label>
                  <textarea
                    rows={3}
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                    placeholder="Uraian tugas dan tanggung jawab..."
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kualifikasi & Persyaratan</label>
                  <textarea
                    rows={3}
                    required
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                    placeholder="Keahlian teknis, pengalaman, pendidikan..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Status Publikasi</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none font-bold"
                    >
                      <option value="PUBLISHED">PUBLISHED (Aktif di Karir)</option>
                      <option value="DRAFT">DRAFT (Internal Saja)</option>
                      <option value="CLOSED">CLOSED (Ditutup)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Batas Akhir Pendaftaran</label>
                    <input
                      type="date"
                      value={formData.deadlineDate}
                      onChange={(e) => setFormData({ ...formData, deadlineDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
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
                    Simpan Lowongan
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
