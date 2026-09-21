"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { useTheme } from "@/components/layout/theme-provider";
import {
  Award,
  Target,
  TrendingUp,
  Star,
  CheckCircle2,
  Clock,
  ChevronRight,
  ArrowLeft,
  Plus,
  Edit3,
  Calendar,
  Sparkles,
} from "lucide-react";

export default function EmployeePerformancePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"GOALS" | "SELF_ASSESSMENT" | "SCORECARD">("GOALS");

  const [goals, setGoals] = useState<any[]>([]);
  const [activeReview, setActiveReview] = useState<any>(null);
  const [activeCycle, setActiveCycle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check-in modal
  const [checkInGoal, setCheckInGoal] = useState<any>(null);
  const [checkInValue, setCheckInValue] = useState<number>(0);
  const [checkInNotes, setCheckInNotes] = useState<string>("");
  const [isUpdatingCheckIn, setIsUpdatingCheckIn] = useState(false);

  // Self assessment state
  const [selfRatings, setSelfRatings] = useState<Record<string, { rating: number; notes: string }>>({});
  const [selfSummary, setSelfSummary] = useState<string>("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const loadData = async () => {
    try {
      const [authRes, goalsRes, reviewsRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/performance/goals"),
        fetch("/api/v1/performance/reviews?scope=mine"),
      ]);

      if (authRes.ok) setSession((await authRes.json()).user);
      if (goalsRes.ok) setGoals((await goalsRes.json()).goals || []);

      if (reviewsRes.ok) {
        const revData = (await reviewsRes.json()).reviews || [];
        if (revData.length > 0) {
          const rev = revData[0];
          setActiveReview(rev);
          setActiveCycle(rev.cycle);

          // Populate initial self ratings if existing
          const initialMap: Record<string, { rating: number; notes: string }> = {};
          rev.items?.forEach((item: any) => {
            initialMap[item.id] = {
              rating: item.selfRating || 4,
              notes: item.selfNotes || "",
            };
          });
          setSelfRatings(initialMap);
          setSelfSummary(rev.selfSummary || "");
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

  const handleUpdateCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInGoal) return;
    setIsUpdatingCheckIn(true);
    try {
      const res = await fetch("/api/v1/performance/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId: checkInGoal.id,
          newValue: Number(checkInValue),
          notes: checkInNotes,
        }),
      });

      if (res.ok) {
        setCheckInGoal(null);
        await loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingCheckIn(false);
    }
  };

  const handleSubmitSelfReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReview) return;
    setIsSubmittingReview(true);
    try {
      const itemsPayload = Object.keys(selfRatings).map((itemId) => ({
        id: itemId,
        selfRating: selfRatings[itemId].rating,
        selfNotes: selfRatings[itemId].notes,
      }));

      const res = await fetch("/api/v1/performance/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT_SELF",
          reviewId: activeReview.id,
          selfSummary,
          items: itemsPayload,
        }),
      });

      if (res.ok) {
        alert("Evaluasi mandiri berhasil dikirimkan ke atasan!");
        await loadData();
        setActiveTab("SCORECARD");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <MobileShell user={session}>
      <div className="bg-slate-50 min-h-full pb-8">
        {/* Header */}
        <div
          className="text-white p-5 rounded-b-3xl shadow-md transition-all duration-300 relative"
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor || theme.primaryColor}, #0f172a)`,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => router.push("/employee")}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
              Kinerja & KPI Karyawan
            </span>
            <div className="w-7"></div>
          </div>

          <div className="flex items-center space-x-3 mt-2">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black">Target & Penilaian Kinerja</h1>
              <p className="text-[11px] text-white/80">
                {activeCycle ? activeCycle.name : "Periode Evaluasi Aktif"}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="p-4">
          <div className="bg-white p-1 rounded-2xl border border-slate-200 flex shadow-xs">
            <button
              onClick={() => setActiveTab("GOALS")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
                activeTab === "GOALS"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Target & KPI</span>
            </button>
            <button
              onClick={() => setActiveTab("SELF_ASSESSMENT")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
                activeTab === "SELF_ASSESSMENT"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Evaluasi Diri</span>
            </button>
            <button
              onClick={() => setActiveTab("SCORECARD")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
                activeTab === "SCORECARD"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Rapor Kinerja</span>
            </button>
          </div>
        </div>

        {/* TAB 1: GOALS & KPI */}
        {activeTab === "GOALS" && (
          <div className="px-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Daftar Target & KPI ({goals.length})
              </h2>
              <span className="text-[10px] text-slate-400 font-semibold">
                Bobot Total: {goals.reduce((a, b) => a + (b.weight || 0), 0)}%
              </span>
            </div>

            {goals.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
                <Target className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold">Belum ada target KPI yang ditetapkan.</p>
              </div>
            ) : (
              goals.map((g) => {
                const percent = g.targetValue > 0 ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100)) : 100;
                return (
                  <div
                    key={g.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5 max-w-[75%]">
                        <div className="flex items-center space-x-1.5">
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-bold">
                            {g.category}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Bobot: {g.weight}%
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-800">{g.title}</h3>
                        {g.description && (
                          <p className="text-[11px] text-slate-500">{g.description}</p>
                        )}
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          g.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {g.status === "COMPLETED" ? "Tercapai" : "Berjalan"}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-500">
                          Tercapai: {g.currentValue} / {g.targetValue} {g.metricUnit === "PERCENTAGE" ? "%" : ""}
                        </span>
                        <span className="text-indigo-600">{percent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        {g.checkIns && g.checkIns.length > 0
                          ? `Update: ${new Date(g.checkIns[0].createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`
                          : "Belum pernah check-in"}
                      </span>
                      <button
                        onClick={() => {
                          setCheckInGoal(g);
                          setCheckInValue(g.currentValue);
                          setCheckInNotes("");
                        }}
                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        Update Progres
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: SELF ASSESSMENT FORM */}
        {activeTab === "SELF_ASSESSMENT" && (
          <div className="px-4 space-y-4">
            {!activeReview ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
                <p className="text-xs font-semibold">Lembar evaluasi diri belum tersedia untuk periode ini.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitSelfReview} className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-2xl text-xs space-y-1">
                  <div className="font-bold text-indigo-950 flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Petunjuk Evaluasi Mandiri</span>
                  </div>
                  <p className="text-indigo-800 text-[11px] leading-relaxed">
                    Berikan penilaian yang jujur dan objektif terhadap pencapaian Anda pada setiap kriteria (1 = Kurang, 5 = Istimewa). Catatan Anda akan dibahas bersama atasan.
                  </p>
                </div>

                <div className="space-y-3">
                  {activeReview.items?.map((item: any, idx: number) => {
                    const current = selfRatings[item.id] || { rating: 4, notes: "" };
                    return (
                      <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              Kriteria {idx + 1} • Bobot {item.weight}%
                            </span>
                            <h4 className="text-xs font-bold text-slate-800 mt-0.5">{item.title}</h4>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                            {item.category}
                          </span>
                        </div>

                        {/* 1 - 5 Rating selector */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                            Nilai Diri Anda:
                          </label>
                          <div className="flex items-center space-x-2">
                            {[1, 2, 3, 4, 5].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() =>
                                  setSelfRatings({
                                    ...selfRatings,
                                    [item.id]: { ...current, rating: num },
                                  })
                                }
                                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                                  current.rating === num
                                    ? "bg-indigo-600 text-white shadow-md scale-105"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                {num} ★
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Bukti Pencapaian / Catatan Diri:
                          </label>
                          <textarea
                            rows={2}
                            value={current.notes}
                            onChange={(e) =>
                              setSelfRatings({
                                ...selfRatings,
                                [item.id]: { ...current, notes: e.target.value },
                              })
                            }
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                            placeholder="Tuliskan pencapaian konkrit terkait kriteria ini..."
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Overall reflection */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Refleksi & Rangkuman Pencapaian Anda (Self-Summary):
                  </label>
                  <textarea
                    rows={3}
                    value={selfSummary}
                    onChange={(e) => setSelfSummary(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="Ceritakan milestone terbesar, tantangan yang berhasil diselesaikan, dan aspirasi karir..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  style={{ backgroundColor: theme.primaryColor }}
                  className="w-full py-3.5 rounded-2xl text-white font-extrabold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingReview ? "Mengirimkan..." : "Kirimkan Evaluasi ke Atasan"}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: SCORECARD */}
        {activeTab === "SCORECARD" && (
          <div className="px-4 space-y-4">
            {!activeReview ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
                <p className="text-xs font-semibold">Rapor kinerja belum tersedia.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Scorecard Hero */}
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl text-center space-y-3">
                  <span className="px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-[10px] font-bold uppercase tracking-wider border border-white/10 inline-block">
                    {activeReview.cycle?.name || "Penilaian Kinerja"}
                  </span>

                  <div>
                    <div className="text-4xl font-black text-white">
                      {activeReview.finalGrade ? `Grade ${activeReview.finalGrade}` : "Sedang Dinilai"}
                    </div>
                    <div className="text-sm font-semibold text-indigo-300 mt-1">
                      {activeReview.finalScore
                        ? `Skor Akhir: ${activeReview.finalScore} / 5.0`
                        : "Menunggu penyelesaian review dari manajer & HR"}
                    </div>
                  </div>

                  <div className="flex justify-center items-center space-x-4 pt-2 text-xs border-t border-white/10">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Evaluasi Mandiri</span>
                      <span className="font-bold text-white">
                        {activeReview.selfScore ? `${activeReview.selfScore} / 5` : "-"}
                      </span>
                    </div>
                    <div className="h-6 w-px bg-white/10"></div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Evaluasi Manajer</span>
                      <span className="font-bold text-white">
                        {activeReview.managerScore ? `${activeReview.managerScore} / 5` : "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Manager Feedback */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Ulasan & Masukan Pembinaan dari Manajer</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl italic">
                    "{activeReview.managerSummary || "Menunggu evaluasi dan catatan pembinaan dari manajer."}"
                  </p>

                  {(activeReview.promotionRecommended || activeReview.salaryIncreaseRecommended) && (
                    <div className="pt-2 flex flex-wrap gap-2">
                      {activeReview.promotionRecommended && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          ✓ Rekomendasi Promosi
                        </span>
                      )}
                      {activeReview.salaryIncreaseRecommended && (
                        <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                          ✓ Rekomendasi Kenaikan Gaji
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Detailed Ratings List */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Rincian Kriteria Penilaian
                  </h3>
                  <div className="divide-y divide-slate-100 text-xs">
                    {activeReview.items?.map((item: any) => (
                      <div key={item.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800">{item.title}</div>
                          <div className="text-[10px] text-slate-400">Bobot {item.weight}%</div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-indigo-600">
                            {item.managerRating ? `${item.managerRating} ★` : item.selfRating ? `${item.selfRating} ★ (Self)` : "-"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Check-In Modal */}
        {checkInGoal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="font-bold text-sm text-slate-800">Update Progres Target</h3>
                <button
                  onClick={() => setCheckInGoal(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateCheckIn} className="space-y-3 text-xs">
                <div>
                  <span className="font-bold text-slate-800">{checkInGoal.title}</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    Target: {checkInGoal.targetValue} {checkInGoal.metricUnit === "PERCENTAGE" ? "%" : ""}
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Capaian Saat Ini ({checkInGoal.metricUnit === "PERCENTAGE" ? "%" : "Qty"}):
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={checkInValue}
                    onChange={(e) => setCheckInValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catatan Capaian / Kendala:</label>
                  <textarea
                    rows={2}
                    value={checkInNotes}
                    onChange={(e) => setCheckInNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-xs"
                    placeholder="Progres yang sudah dicapai minggu ini..."
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCheckInGoal(null)}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl font-bold text-slate-600"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingCheckIn}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl disabled:opacity-50"
                  >
                    {isUpdatingCheckIn ? "Menyimpan..." : "Simpan Progres"}
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
