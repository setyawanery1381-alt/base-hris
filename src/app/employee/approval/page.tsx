"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  CalendarDays,
  FileText,
  Briefcase,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/layout/theme-provider";

export default function EmployeeMobileApprovalPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [session, setSession] = useState<any>(null);
  const [approvalData, setApprovalData] = useState<any>({ items: [], counts: { total: 0 } });
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  // Action Modal State
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: "APPROVE" | "REJECT";
    item: any | null;
    comments: string;
    submitting: boolean;
  }>({
    isOpen: false,
    type: "APPROVE",
    item: null,
    comments: "",
    submitting: false,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [meRes, apprRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch(`/api/v1/approvals?module=${moduleFilter}&scope=mine`),
      ]);
      if (meRes.ok) setSession((await meRes.json()).user);
      if (apprRes.ok) setApprovalData(await apprRes.json());
    } catch (e: any) {
      console.error(e);
      setError("Gagal memuat approval.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [moduleFilter]);

  const handleActionSubmit = async () => {
    if (!actionModal.item) return;
    setActionModal((prev) => ({ ...prev, submitting: true }));
    setError("");

    try {
      const res = await fetch(`/api/v1/approvals/${actionModal.item.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionModal.type,
          comments: actionModal.comments,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses persetujuan.");

      setFeedback(data.message || "Aksi persetujuan berhasil!");
      setActionModal({ isOpen: false, type: "APPROVE", item: null, comments: "", submitting: false });
      loadData();
      setTimeout(() => setFeedback(""), 3500);
    } catch (err: any) {
      setError(err.message);
      setActionModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const pendingItems = (approvalData.items || []).filter((i: any) => i.status === "PENDING");

  return (
    <MobileShell user={session}>
      <div className="bg-slate-50 min-h-full pb-10">
        {/* Header */}
        <div
          className="text-white p-5 rounded-b-3xl shadow-md transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor || theme.primaryColor}, #0f172a)`,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => router.push("/employee")}
              className="flex items-center space-x-1.5 text-xs text-white/80 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-bold">
              {pendingItems.length} Menunggu Tindakan
            </span>
          </div>
          <h1 className="text-lg font-black tracking-tight">Pusat Persetujuan Tim</h1>
          <p className="text-[11px] text-white/80">
            Tinjau dan proses permohonan bawahan/tim Anda (Cuti, Izin, Lembur).
          </p>

          {/* Module Filter Chips */}
          <div className="flex items-center space-x-1.5 mt-4 overflow-x-auto pb-1 text-xs">
            {[
              { id: "ALL", label: "Semua" },
              { id: "LEAVE", label: "Cuti" },
              { id: "PERMISSION", label: "Izin" },
              { id: "OVERTIME", label: "Lembur" },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setModuleFilter(chip.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                  moduleFilter === chip.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "bg-white/10 text-white/80 hover:bg-white/20"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-3">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {feedback && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{feedback}</span>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Memuat antrean persetujuan...
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-sm">Semua Antrean Bersih!</p>
              <p className="text-xs text-slate-400 mt-1">
                Tidak ada permohonan tim yang menunggu persetujuan Anda saat ini.
              </p>
            </div>
          ) : (
            pendingItems.map((item: any) => {
              const mod = item.referenceModule;
              const details = item.targetDetails;
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          mod === "LEAVE"
                            ? "bg-blue-100 text-blue-800"
                            : mod === "PERMISSION"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {mod === "LEAVE" ? "CUTI" : mod === "PERMISSION" ? "IZIN" : "LEMBUR"}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        Tahap {item.currentStepOrder} dari {item.totalSteps}
                      </span>
                    </div>
                    <Badge variant="warning">Menunggu</Badge>
                  </div>

                  <div>
                    <p className="font-bold text-slate-900 text-sm">{item.requester?.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {item.requester?.employee?.department?.name || "Dept"} • {item.requester?.employee?.position?.title || "Staff"}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="p-2.5 rounded-xl bg-slate-50 text-xs space-y-1">
                    {mod === "LEAVE" && details && (
                      <>
                        <p className="font-bold text-slate-800">
                          {details.leaveType?.name} ({details.durationDays} Hari)
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {new Date(details.startDate).toLocaleDateString("id-ID")} - {new Date(details.endDate).toLocaleDateString("id-ID")}
                        </p>
                      </>
                    )}
                    {mod === "PERMISSION" && details && (
                      <>
                        <p className="font-bold text-slate-800">
                          {details.typeDefinition?.name || details.permissionType} ({details.durationHours} Jam)
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {new Date(details.date).toLocaleDateString("id-ID")} ({details.startTime} - {details.endTime})
                        </p>
                      </>
                    )}
                    {mod === "OVERTIME" && details && (
                      <>
                        <p className="font-bold text-slate-800">
                          Lembur {details.durationHours || details.hours} Jam ({details.overtimeType === "HOLIDAY" ? "Hari Libur" : "Hari Kerja"})
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {new Date(details.date).toLocaleDateString("id-ID")} ({details.startTime} - {details.endTime})
                        </p>
                      </>
                    )}
                    {details?.reason && (
                      <p className="text-[11px] text-slate-600 italic pt-0.5">
                        Alasan: "{details.reason}"
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-1">
                    <button
                      onClick={() =>
                        setActionModal({
                          isOpen: true,
                          type: "APPROVE",
                          item,
                          comments: "",
                          submitting: false,
                        })
                      }
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-1 cursor-pointer shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Setujui</span>
                    </button>
                    <button
                      onClick={() =>
                        setActionModal({
                          isOpen: true,
                          type: "REJECT",
                          item,
                          comments: "",
                          submitting: false,
                        })
                      }
                      className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center space-x-1 cursor-pointer shadow-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Tolak</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Action Confirmation Modal */}
        {actionModal.isOpen && actionModal.item && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                  {actionModal.type === "APPROVE" ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Konfirmasi Persetujuan</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 text-rose-600" />
                      <span>Konfirmasi Penolakan</span>
                    </>
                  )}
                </h3>
                <button
                  onClick={() => setActionModal({ ...actionModal, isOpen: false })}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <p>
                  Pemohon: <strong>{actionModal.item.requester?.name}</strong>
                </p>
                <p>
                  Modul: <strong>{actionModal.item.referenceModule}</strong> (Tahap {actionModal.item.currentStepOrder} dari {actionModal.item.totalSteps})
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Komentar (Opsional):
                </label>
                <textarea
                  rows={2}
                  value={actionModal.comments}
                  onChange={(e) => setActionModal({ ...actionModal, comments: e.target.value })}
                  placeholder="Tulis catatan persetujuan..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex space-x-2 pt-1">
                <button
                  onClick={() => setActionModal({ ...actionModal, isOpen: false })}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100"
                >
                  Batal
                </button>
                <button
                  disabled={actionModal.submitting}
                  onClick={handleActionSubmit}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold text-white shadow-xs ${
                    actionModal.type === "APPROVE" ? "bg-emerald-600" : "bg-rose-600"
                  }`}
                >
                  {actionModal.submitting ? "Memproses..." : actionModal.type === "APPROVE" ? "Setujui" : "Tolak"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
