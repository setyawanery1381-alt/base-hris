"use client";
import React, { useState, useEffect } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";

export default function AdminAuditPage() {
  const [session, setSession] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const [meRes, audRes] = await Promise.all([fetch("/api/v1/auth/me"), fetch("/api/v1/audit")]);
      if (meRes.ok) setSession((await meRes.json()).user);
      if (audRes.ok) setLogs((await audRes.json()).logs || []);
    }
    load();
  }, []);

  return (
    <AdminShell user={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Audit Log Platform & Keamanan</h1>
          <p className="text-xs text-slate-500 mt-0.5">Rekam jejak aktivitas seluruh pengguna demi kepatuhan ISO/keamanan data (PRD Section 36).</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Waktu</th>
                <th className="px-6 py-3.5">Aktor / Pengguna</th>
                <th className="px-6 py-3.5">Modul</th>
                <th className="px-6 py-3.5">Aksi</th>
                <th className="px-6 py-3.5">ID Rekaman</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Belum ada audit log.</td></tr>
              ) : (
                logs.map((l: any) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-slate-500">{new Date(l.createdAt).toLocaleString("id-ID")}</td>
                    <td className="px-6 py-3.5 font-bold text-slate-900">{l.user?.name || "Sistem"}</td>
                    <td className="px-6 py-3.5 font-bold text-primary">{l.module}</td>
                    <td className="px-6 py-3.5"><Badge variant={l.action.includes("APPROVE") ? "success" : l.action.includes("CREATE") ? "info" : "neutral"}>{l.action}</Badge></td>
                    <td className="px-6 py-3.5 font-mono text-slate-400 truncate max-w-xs">{l.recordId || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
