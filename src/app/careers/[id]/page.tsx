"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  ArrowLeft,
  CheckCircle2,
  Send,
  Sparkles,
  FileText,
  User,
  Mail,
  Phone,
  Linkedin,
  Building2,
} from "lucide-react";

export default function PublicJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;

  const [job, setJob] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    currentCompany: "",
    currentSalary: 0,
    expectedSalary: 10000000,
    noticePeriodDays: 30,
    linkedinUrl: "",
    portfolioUrl: "",
    resumeUrl: "",
    notes: "",
  });

  useEffect(() => {
    if (!jobId) return;
    fetch(`/api/v1/recruitment/jobs?id=${jobId}`)
      .then((r) => r.json())
      .then((d) => setJob(d.job))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [jobId]);

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/recruitment/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: job.companyId,
          jobPostingId: job.id,
          ...formData,
        }),
      });

      if (res.ok) {
        setIsSubmitted(true);
      } else {
        const err = await res.json();
        alert(err.error || "Gagal mengirimkan lamaran");
      }
    } catch (e: any) {
      alert(e.message || "Gagal mengirimkan lamaran");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-xs">
        Memuat detail lowongan...
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center p-6">
        <Briefcase className="w-12 h-12 text-slate-300 mb-3" />
        <h2 className="text-base font-bold text-slate-800">Lowongan tidak ditemukan</h2>
        <button
          onClick={() => router.push("/careers")}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
        >
          Kembali ke Portal Karir
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      {/* Navbar */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push("/careers")}
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Semua Lowongan</span>
          </button>
          <span className="text-xs font-bold text-slate-400">BASE HRIS Career</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Job Description & Qualifications */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                {job.department?.name || "General"}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {job.employmentType}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{job.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1 pb-3 border-b border-slate-100">
              <span className="flex items-center space-x-1">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{job.location || "Jakarta"}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Briefcase className="w-4 h-4 text-slate-400" />
                <span>Level: {job.experienceLevel}</span>
              </span>
              {job.minSalary && job.maxSalary && (
                <span className="flex items-center space-x-1 font-bold text-slate-800">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>
                    Rp {(job.minSalary / 1000000).toFixed(0)} - {(job.maxSalary / 1000000).toFixed(0)} jt / bln
                  </span>
                </span>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Deskripsi Pekerjaan & Tanggung Jawab
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {job.description}
              </p>
            </div>

            {/* Requirements */}
            <div className="space-y-2 pt-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Kualifikasi & Persyaratan
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {job.requirements}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Application Form */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md sticky top-24 space-y-4">
            {isSubmitted ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-base font-black text-slate-800">Lamaran Anda Terkirim!</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Terima kasih telah melamar posisi {job.title}. Tim HR kami akan meninjau profil Anda dan menghubungi via email / WhatsApp.
                </p>
                <button
                  onClick={() => router.push("/careers")}
                  className="mt-2 w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                >
                  Lihat Posisi Lainnya
                </button>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-black text-slate-900">Formulir Lamaran Kerja</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Lengkapi data Anda untuk posisi ini.</p>
                </div>

                <form onSubmit={handleSubmitApplication} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                      placeholder="e.g. Setyawan Ery"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Email *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                        placeholder="nama@email.com"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Nomor WhatsApp *</label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                        placeholder="081234567890"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Kantor Saat Ini</label>
                      <input
                        type="text"
                        value={formData.currentCompany}
                        onChange={(e) => setFormData({ ...formData, currentCompany: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                        placeholder="Perusahaan terakhir"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Ekspektasi Gaji (Rp)</label>
                      <input
                        type="number"
                        value={formData.expectedSalary}
                        onChange={(e) => setFormData({ ...formData, expectedSalary: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Link CV / Resume (Google Drive / DropBox) *
                    </label>
                    <input
                      type="url"
                      required
                      value={formData.resumeUrl}
                      onChange={(e) => setFormData({ ...formData, resumeUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none font-mono text-[11px]"
                      placeholder="https://drive.google.com/file/..."
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">LinkedIn / Portfolio URL</label>
                    <input
                      type="url"
                      value={formData.portfolioUrl}
                      onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none font-mono text-[11px]"
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                      placeholder="Hal menarik tentang pengalaman Anda..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-98 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? "Mengirimkan..." : "Kirimkan Lamaran"}</span>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
