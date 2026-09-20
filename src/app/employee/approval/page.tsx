"use client";
import React, { useState, useEffect } from "react";
import { CheckSquare, Check, X, CheckCircle2 } from "lucide-react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/layout/theme-provider";

export default function EmployeeMobileApprovalPage() {
  const { theme } = useTheme();
  const [session, setSession] = useState<any>(null);
  const [approvals, setApprovals] = useState<any>({ leaves: [], overtimes: [] });
  const [feedback, setFeedback] = useState("");

  const load = async () => {
    try {
      const [meRes, apprRes] = await Promise.all([fetch("/api/v1/auth/me"), fetch("/api/v1/approvals")]);
      if (meRes.ok) setSession((await meRes.json()).user);
      if (apprRes.ok) setApprovals(await apprRes.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (module: string, id: string, action: string) => {
    try {
      const url = module === "LEAVE" ? `/api/v1/leave/${id}/action` : "/api/v1/overtime";
      const payload = module === "LEAVE" ? { action } : { id, action };
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        setFeedback(`Permohonan berhasil di-${action === "APPROVE" ? "setujui" : "tolak"}!`);
        load();
        setTimeout(() => setFeedback(""), 3000);
      }
    } catch (e) { console.error(e); }
  };

  const total = (approvals.leaves?.length || 0) + (approvals.overtimes?.length || 0);

  return (
    <MobileShell user={session}>
      <div className="bg-slate-50 min-h-full">
        <div
          className="text-white p-5 rounded-b-3xl shadow-md transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor || theme.primaryColor}, #0f172a)`,
          }}
        >
          <h1 className="text-lg font-black">Approval Inbox (Persetujuan)</h1>
          <p className="text-[11px] text-white/80">Tinjau permohonan bawahan atau tim Anda ({total} menunggu).</p>
        </div>

        <div className="p-4 space-y-3">
          {feedback && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{feedback}</span>
            </div>
          )}

          {total === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-slate-700">Tidak ada pengajuan pending!</p>
              <p className="text-[11px]">Semua permohonan tim telah diselesaikan.</p>
            </div>
          ) : (
            approvals.leaves?.map((l: any) => (
              <div key={l.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <Badge variant="primary" className="text-[10px]">CUTI TAHUNAN</Badge>
                  <span className="font-bold text-slate-800 font-mono">{l.durationDays} Hari</span>
                </div>
                <p className="font-bold text-slate-900 text-sm">{l.employee?.firstName} {l.employee?.lastName}</p>
                <p className="text-slate-500 text-[11px]">Alasan: {l.reason}</p>
                <div className="flex space-x-2 pt-2 border-t border-slate-100">
                  <button onClick={() => handleAction("LEAVE", l.id, "APPROVE")} className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center space-x-1"><Check className="w-3.5 h-3.5" /><span>Setujui</span></button>
                  <button onClick={() => handleAction("LEAVE", l.id, "REJECT")} className="flex-1 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center justify-center space-x-1"><X className="w-3.5 h-3.5" /><span>Tolak</span></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </MobileShell>
  );
}
