"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import {
  Briefcase,
  Users,
  UserCheck,
  Calendar,
  Send,
  Plus,
  ChevronRight,
  Filter,
  Star,
  ArrowUpRight,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { PIPELINE_STAGES } from "@/lib/recruitment-constants";

export default function AdminRecruitmentDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [authRes, jobsRes, candidatesRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/recruitment/jobs"),
        fetch("/api/v1/recruitment/candidates"),
      ]);

      if (authRes.ok) setSession((await authRes.json()).user);
      if (jobsRes.ok) setJobs((await jobsRes.json()).jobs || []);
      if (candidatesRes.ok) setCandidates((await candidatesRes.json()).candidates || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdvanceStage = async (candidateId: string, currentStage: string) => {
    const stageOrder = ["APPLIED", "SCREENING", "INTERVIEW_HR", "INTERVIEW_USER", "OFFERING", "HIRED"];
    const currentIndex = stageOrder.indexOf(currentStage);
    if (currentIndex < stageOrder.length - 1) {
      const nextStage = stageOrder[currentIndex + 1];
      try {
        const res = await fetch("/api/v1/recruitment/candidates", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: candidateId, stage: nextStage }),
        });
        if (res.ok) {
          await loadData();
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    if (selectedJobId !== "ALL" && c.jobPostingId !== selectedJobId) return false;
    return true;
  });

  const activeJobs = jobs.filter((j) => j.status === "PUBLISHED");
  const totalApplied = candidates.length;
  const inInterview = candidates.filter((c) => ["INTERVIEW_HR", "INTERVIEW_USER"].includes(c.stage)).length;
  const inOffering = candidates.filter((c) => c.stage === "OFFERING").length;
  const totalHired = candidates.filter((c) => c.stage === "HIRED").length;

  const kanbanColumns = [
    { id: "APPLIED", label: "Lamaran Masuk", color: "border-slate-300 bg-slate-50" },
    { id: "SCREENING", label: "Screening CV", color: "border-amber-300 bg-amber-50/50" },
    { id: "INTERVIEW_HR", label: "Wawancara HR", color: "border-blue-300 bg-blue-50/50" },
    { id: "INTERVIEW_USER", label: "Wawancara User", color: "border-purple-300 bg-purple-50/50" },
    { id: "OFFERING", label: "Offering Letter", color: "border-teal-300 bg-teal-50/50" },
    { id: "HIRED", label: "Diterima (Hired)", color: "border-emerald-300 bg-emerald-50/50" },
  ];

  return (
    <AdminShell user={session}>
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2.5">
              <Briefcase className="w-7 h-7 text-indigo-600" />
              <span>Rekrutmen & ATS (Applicant Tracking System)</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Kelola lowongan kerja, pipeline seleksi pelamar, wawancara, dan konversi ke karyawan.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => window.open("/careers", "_blank")}
              className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
            >
              <ExternalLink className="w-4 h-4 text-slate-500" />
              <span>Portal Karir Publik ↗</span>
            </button>
            <button
              onClick={() => router.push("/admin/recruitment/jobs")}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Pasang Lowongan</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Lowongan Aktif
            </span>
            <div className="text-2xl font-black text-slate-800 mt-2">{activeJobs.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Dari total {jobs.length} posisi</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Pelamar
            </span>
            <div className="text-2xl font-black text-slate-800 mt-2">{totalApplied}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Seluruh lowongan</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Proses Wawancara
            </span>
            <div className="text-2xl font-black text-blue-600 mt-2">{inInterview}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Tahap HR & User</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Offering Letter
            </span>
            <div className="text-2xl font-black text-teal-600 mt-2">{inOffering}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Menunggu konfirmasi</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs col-span-2 lg:col-span-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Diterima (Hired)
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-2">{totalHired}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Siap / sedang onboarding</div>
          </div>
        </div>

        {/* Quick Links & Funnel Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Filter Posisi:</span>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="ALL">Semua Lowongan ({candidates.length} Pelamar)</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j._count?.candidates || 0})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => router.push("/admin/recruitment/candidates")}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
            >
              <span>Database Semua Pelamar</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={() => router.push("/admin/recruitment/onboarding")}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
            >
              <span>Onboarding Karyawan Baru</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ATS Kanban Pipeline */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Pipeline Seleksi Pelamar (Kanban Funnel)
            </h2>
            <span className="text-xs text-slate-400">
              Klik tanda panah (→) pada kartu untuk memajukan tahap pelamar
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
            {kanbanColumns.map((col) => {
              const colCandidates = filteredCandidates.filter((c) => c.stage === col.id);

              return (
                <div
                  key={col.id}
                  className={`rounded-2xl border p-3 flex flex-col min-h-[460px] ${col.color}`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-800">{col.label}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white text-slate-700 font-black text-[10px] shadow-2xs">
                      {colCandidates.length}
                    </span>
                  </div>

                  {/* Cards List */}
                  <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[500px]">
                    {colCandidates.length === 0 ? (
                      <div className="h-32 flex items-center justify-center text-[11px] text-slate-400 italic">
                        Kosong
                      </div>
                    ) : (
                      colCandidates.map((cand) => (
                        <div
                          key={cand.id}
                          className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all space-y-2 group"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-xs text-slate-800 group-hover:text-indigo-600 transition-colors">
                                {cand.fullName}
                              </h4>
                              <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                                {cand.jobPosting?.title || "Pelamar"}
                              </p>
                            </div>
                            {cand.rating && (
                              <span className="flex items-center text-[10px] font-bold text-amber-600">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400 mr-0.5" />
                                {cand.rating}
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-500 space-y-0.5">
                            {cand.currentCompany && (
                              <div>🏢 {cand.currentCompany}</div>
                            )}
                            {cand.expectedSalary && (
                              <div>💰 Rp {(cand.expectedSalary / 1000000).toFixed(1)} jt/bln</div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <button
                              onClick={() => router.push(`/admin/recruitment/candidates?id=${cand.id}`)}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                            >
                              Detail
                            </button>

                            {col.id !== "HIRED" && (
                              <button
                                onClick={() => handleAdvanceStage(cand.id, cand.stage)}
                                title="Lanjut ke tahap berikutnya"
                                className="p-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors cursor-pointer text-[10px] font-bold flex items-center space-x-0.5"
                              >
                                <span>Lanjut</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
