"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  ArrowRight,
  Search,
  Building2,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export default function PublicCareersPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/recruitment/jobs?status=PUBLISHED")
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs || []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const departments = Array.from(new Set(jobs.map((j) => j.department?.name).filter(Boolean)));

  const filteredJobs = jobs.filter((j) => {
    const matchesDept = selectedDept === "ALL" || j.department?.name === selectedDept;
    const matchesSearch =
      j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDept && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navbar */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
              B
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-slate-900">BASE HRIS</span>
              <span className="text-[10px] text-slate-400 block -mt-0.5">Portal Karir & Rekrutmen</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push("/login")}
              className="text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
            >
              Login Karyawan
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-indigo-900 via-indigo-950 to-slate-900 text-white py-16 px-6 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-4 relative z-10">
          <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/20 inline-block">
            🚀 Peluang Karir Terbuka
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Bangun Masa Depan Anda Bersama Tim Kami
          </h1>
          <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Kami membuka kesempatan bagi talenta terbaik untuk berkembang, berinovasi, dan memberikan dampak nyata bersama ekosistem teknologi modern.
          </p>
        </div>
      </section>

      {/* Search & Filter Bar */}
      <section className="max-w-5xl mx-auto px-6 -mt-7 relative z-20">
        <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-xl border border-slate-200/80 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari posisi atau keahlian..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          <div className="sm:w-56">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">Semua Departemen</option>
              {departments.map((dept: any) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Job Listings */}
      <main className="max-w-5xl mx-auto px-6 py-12 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            Daftar Lowongan Tersedia ({filteredJobs.length})
          </h2>
          <span className="text-xs text-slate-400">Pembaruan harian</span>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
            <Briefcase className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold text-sm text-slate-600">Tidak ada lowongan ditemukan.</p>
            <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau filter departemen.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => router.push(`/careers/${job.id}`)}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                      {job.department?.name || "General"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {job.experienceLevel} Level
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {job.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{job.location || "Jakarta"}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{job.employmentType}</span>
                    </span>
                    {job.minSalary && job.maxSalary && (
                      <span className="flex items-center space-x-1 font-semibold text-slate-700">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          Rp {(job.minSalary / 1000000).toFixed(0)} - {(job.maxSalary / 1000000).toFixed(0)} jt / bln
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                <button className="px-4 py-2 bg-indigo-50 group-hover:bg-indigo-600 text-indigo-700 group-hover:text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1 self-end sm:self-center shrink-0">
                  <span>Lihat Detail & Lamar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
