"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import {
  Users,
  Briefcase,
  ArrowLeft,
  Filter,
  Search,
  ExternalLink,
  Calendar,
  DollarSign,
  Star,
  CheckCircle2,
  XCircle,
  FileText,
  UserCheck,
  Clock,
  Sparkles,
  Phone,
  Mail,
  Linkedin,
} from "lucide-react";
import { PIPELINE_STAGES } from "@/lib/recruitment-constants";

function AdminCandidatesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialJobId = searchParams.get("jobId") || "ALL";
  const initialCandidateId = searchParams.get("id") || "";

  const [session, setSession] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId);
  const [selectedStage, setSelectedStage] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeCandidateDetail, setActiveCandidateDetail] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal actions
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewStage, setInterviewStage] = useState("INTERVIEW_HR");
  const [interviewLink, setInterviewLink] = useState("https://meet.google.com/abc-defg-hij");

  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerSalary, setOfferSalary] = useState(10000000);
  const [offerStartDate, setOfferStartDate] = useState(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

  const [isHiring, setIsHiring] = useState(false);

  const loadData = async () => {
    try {
      const [authRes, jobsRes, candidatesRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/recruitment/jobs"),
        fetch("/api/v1/recruitment/candidates"),
      ]);

      if (authRes.ok) setSession((await authRes.json()).user);
      if (jobsRes.ok) setJobs((await jobsRes.json()).jobs || []);
      if (candidatesRes.ok) {
        const cData = (await candidatesRes.json()).candidates || [];
        setCandidates(cData);
        if (initialCandidateId && !activeCandidateDetail) {
          openCandidateDetail(initialCandidateId);
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

  const openCandidateDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/recruitment/candidates?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveCandidateDetail(data.candidate);
        setOfferSalary(data.candidate?.expectedSalary || 10000000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStage = async (id: string, stage: string) => {
    try {
      const res = await fetch("/api/v1/recruitment/candidates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, stage }),
      });
      if (res.ok) {
        await loadData();
        if (activeCandidateDetail?.id === id) {
          await openCandidateDetail(id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCandidateDetail) return;
    try {
      const res = await fetch("/api/v1/recruitment/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: activeCandidateDetail.id,
          stage: interviewStage,
          scheduledAt: new Date(interviewDate),
          locationType: "ONLINE_MEETING",
          meetingLink: interviewLink,
        }),
      });
      if (res.ok) {
        setIsInterviewModalOpen(false);
        await openCandidateDetail(activeCandidateDetail.id);
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCandidateDetail) return;
    try {
      const res = await fetch("/api/v1/recruitment/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: activeCandidateDetail.id,
          offeredPosition: activeCandidateDetail.jobPosting?.title || "Posisi",
          offeredSalary: Number(offerSalary),
          startDate: new Date(offerStartDate),
        }),
      });
      if (res.ok) {
        setIsOfferModalOpen(false);
        await openCandidateDetail(activeCandidateDetail.id);
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handle1ClickHire = async () => {
    if (!activeCandidateDetail) return;
    if (!confirm(`Konversi ${activeCandidateDetail.fullName} menjadi Karyawan Aktif sekarang?`)) return;

    setIsHiring(true);
    try {
      const res = await fetch("/api/v1/recruitment/hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: activeCandidateDetail.id,
          basicSalary: offerSalary,
          joinDate: offerStartDate,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`🎉 Sukses! Karyawan ${data.employee?.firstName} berhasil dibuat dengan ID: ${data.employeeNumber}. Akun login dan checklist onboarding telah aktif!`);
        await openCandidateDetail(activeCandidateDetail.id);
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal konversi karyawan");
      }
    } catch (e: any) {
      alert(e.message || "Gagal konversi karyawan");
    } finally {
      setIsHiring(false);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    const matchesJob = selectedJobId === "ALL" || c.jobPostingId === selectedJobId;
    const matchesStage = selectedStage === "ALL" || c.stage === selectedStage;
    const matchesSearch =
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.currentCompany && c.currentCompany.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesJob && matchesStage && matchesSearch;
  });

  return (
    <AdminShell user={session}>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
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
                <Users className="w-6 h-6 text-indigo-600" />
                <span>Database Seluruh Pelamar (Candidates)</span>
              </h1>
              <p className="text-xs text-slate-500">
                Pemeriksaan CV, penjadwalan wawancara, penawaran gaji, dan konversi 1-click ke karyawan.
              </p>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none"
            >
              <option value="ALL">Semua Lowongan</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>

            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none"
            >
              <option value="ALL">Semua Tahap</option>
              {PIPELINE_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama / email / kantor..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>
        </div>

        {/* Candidates Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Nama Pelamar</th>
                  <th className="py-3 px-4">Lowongan Yang Dilamar</th>
                  <th className="py-3 px-4">Pengalaman / Kantor</th>
                  <th className="py-3 px-4 text-center">Ekspektasi Gaji</th>
                  <th className="py-3 px-4 text-center">Tahap Seleksi</th>
                  <th className="py-3 px-4 text-center">Tanggal Melamar</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Tidak ada pelamar ditemukan untuk kriteria ini.
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((cand) => {
                    const stageConfig = PIPELINE_STAGES.find((s) => s.id === cand.stage);
                    return (
                      <tr key={cand.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">{cand.fullName}</div>
                          <div className="text-[10px] text-slate-400">{cand.email} • {cand.phone}</div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {cand.jobPosting?.title || "-"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {cand.currentCompany || "-"}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700">
                          {cand.expectedSalary
                            ? `Rp ${(cand.expectedSalary / 1000000).toFixed(1)} jt`
                            : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              stageConfig?.badgeColor || "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {stageConfig?.label || cand.stage}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-400">
                          {new Date(cand.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => openCandidateDetail(cand.id)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                          >
                            Buka Profil
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

        {/* Candidate Detail Modal / Drawer */}
        {activeCandidateDetail && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        activeCandidateDetail.stage === "HIRED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-indigo-100 text-indigo-800"
                      }`}
                    >
                      {activeCandidateDetail.stage}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Melamar: {activeCandidateDetail.jobPosting?.title}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900">{activeCandidateDetail.fullName}</h2>
                  <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center space-x-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{activeCandidateDetail.email}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{activeCandidateDetail.phone}</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveCandidateDetail(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* 1-Click Hire Banner if in OFFERING or ready */}
              {activeCandidateDetail.stage !== "HIRED" ? (
                <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 p-5 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <h4 className="font-bold text-sm">Konversi 1-Click Menjadi Karyawan</h4>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Buat akun login, terbitkan NIK karyawan, dan jalankan checklist onboarding.
                    </p>
                  </div>
                  <button
                    onClick={handle1ClickHire}
                    disabled={isHiring}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs shadow-md transition-all shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {isHiring ? "Memproses..." : "Terima & Jadikan Karyawan ↗"}
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="font-bold text-xs text-emerald-900">Kandidat Telah Diterima (Hired)</h4>
                      <p className="text-[11px] text-emerald-700">Karyawan aktif di sistem Base HRIS.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push("/admin/recruitment/onboarding")}
                    className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-2xs"
                  >
                    Lihat Onboarding
                  </button>
                </div>
              )}

              {/* Candidate Quick Stats */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Kantor Terakhir</span>
                  <span className="font-bold text-slate-800">{activeCandidateDetail.currentCompany || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Ekspektasi Gaji</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {activeCandidateDetail.expectedSalary
                      ? `Rp ${(activeCandidateDetail.expectedSalary / 1000000).toFixed(1)} jt`
                      : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Notice Period</span>
                  <span className="font-bold text-slate-800">
                    {activeCandidateDetail.noticePeriodDays || 30} Hari
                  </span>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                {activeCandidateDetail.resumeUrl && (
                  <a
                    href={activeCandidateDetail.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Lihat CV / Resume</span>
                  </a>
                )}
                {activeCandidateDetail.portfolioUrl && (
                  <a
                    href={activeCandidateDetail.portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Portfolio</span>
                  </a>
                )}

                <button
                  onClick={() => setIsInterviewModalOpen(true)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Jadwalkan Wawancara</span>
                </button>

                <button
                  onClick={() => setIsOfferModalOpen(true)}
                  className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Buat Offering Letter</span>
                </button>
              </div>

              {/* Interviews History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Riwayat Wawancara ({activeCandidateDetail.interviews?.length || 0})
                </h4>
                {activeCandidateDetail.interviews?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Belum ada sesi wawancara dijadwalkan.</p>
                ) : (
                  <div className="space-y-2">
                    {activeCandidateDetail.interviews.map((int: any) => (
                      <div key={int.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>{int.stage}</span>
                          <span className="text-indigo-600">
                            {new Date(int.scheduledAt).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {int.meetingLink && (
                          <div className="text-[11px] text-blue-600 truncate">
                            Link: <a href={int.meetingLink} target="_blank" rel="noreferrer">{int.meetingLink}</a>
                          </div>
                        )}
                        {int.feedbackNotes && (
                          <p className="text-slate-600 italic">"{int.feedbackNotes}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stage Switcher */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-500 font-semibold">Ubah Tahap:</span>
                  <select
                    value={activeCandidateDetail.stage}
                    onChange={(e) => handleUpdateStage(activeCandidateDetail.id, e.target.value)}
                    className="font-bold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700"
                  >
                    {PIPELINE_STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setActiveCandidateDetail(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Schedule Interview */}
        {isInterviewModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="font-bold text-sm text-slate-800">Jadwalkan Wawancara</h3>
                <button onClick={() => setIsInterviewModalOpen(false)} className="text-slate-400">✕</button>
              </div>

              <form onSubmit={handleScheduleInterview} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tahap Wawancara</label>
                  <select
                    value={interviewStage}
                    onChange={(e) => setInterviewStage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="INTERVIEW_HR">Wawancara HR (Culture & Fit)</option>
                    <option value="INTERVIEW_USER">Wawancara User (Teknis & Tim)</option>
                    <option value="TECHNICAL_TEST">Tes Teknis / Live Coding</option>
                    <option value="FINAL_INTERVIEW">Final Interview (Direksi / C-Level)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal & Jam</label>
                  <input
                    type="datetime-local"
                    required
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Link Pertemuan Online (Google Meet/Zoom)</label>
                  <input
                    type="text"
                    value={interviewLink}
                    onChange={(e) => setInterviewLink(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-[11px]"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsInterviewModalOpen(false)}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl font-bold text-slate-600"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
                  >
                    Kirim Jadwal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Job Offer */}
        {isOfferModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="font-bold text-sm text-slate-800">Terbitkan Offering Letter</h3>
                <button onClick={() => setIsOfferModalOpen(false)} className="text-slate-400">✕</button>
              </div>

              <form onSubmit={handleSendOffer} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gaji Pokok Ditawarkan (Rp / Bulan)</label>
                  <input
                    type="number"
                    required
                    value={offerSalary}
                    onChange={(e) => setOfferSalary(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Mulai Bekerja (Start Date)</label>
                  <input
                    type="date"
                    required
                    value={offerStartDate}
                    onChange={(e) => setOfferStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOfferModalOpen(false)}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl font-bold text-slate-600"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl"
                  >
                    Kirim Penawaran
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

export default function AdminRecruitmentCandidatesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat database pelamar...</div>}>
      <AdminCandidatesContent />
    </Suspense>
  );
}
