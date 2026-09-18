"use client";
import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Check,
  X,
  User,
  ShieldCheck,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

export default function AdminLeavePage() {
  const [session, setSession] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"requests" | "balances" | "policies">("requests");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const loadData = async () => {
    try {
      const [authRes, leaveRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/leave"),
      ]);
      if (authRes.ok) {
        const auth = await authRes.json();
        setSession(auth.user);
      }
      if (leaveRes.ok) {
        const data = await leaveRes.json();
        setRequests(data.requests || []);
        setBalances(data.balances || []);
        setLeaveTypes(data.leaveTypes || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
    setActionLoadingId(id);
    setFeedbackMsg("");
    try {
      const res = await fetch(`/api/v1/leave/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setFeedbackMsg(`Pengajuan cuti berhasil di-${action === "APPROVE" ? "setujui" : "tolak"}!`);
        loadData();
        setTimeout(() => setFeedbackMsg(""), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filterStatus === "ALL") return true;
    return r.status === filterStatus;
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;

  return (
    <AdminShell user={session}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              Manajemen Cuti & Izin Karyawan
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review permohonan cuti, pantau saldo cuti tahunan, dan atur kebijakan cuti tenant ({session?.companyName}).
            </p>
          </div>
        </div>

        {feedbackMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center space-x-2 animate-fade-in">
            <CheckCircle className="w-4 h-4" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Menunggu Review</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-3xl font-black text-slate-800 mt-2">{pendingCount}</p>
            <p className="text-[11px] text-amber-600 font-semibold mt-1">Perlu tindakan HR / Manager</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Cuti Disetujui</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-3xl font-black text-slate-800 mt-2">{approvedCount}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">Telah disetujui & terpotong saldo</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Total Pengajuan</span>
              <CalendarDays className="w-4 h-4 text-primary" />
            </div>
            <p className="text-3xl font-black text-slate-800 mt-2">{requests.length}</p>
            <p className="text-[11px] text-slate-500 font-semibold mt-1">Tahun Berjalan 2026</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 flex space-x-6 text-xs font-bold text-slate-400">
          {[
            { id: "requests", label: `Daftar Pengajuan Cuti (${requests.length})` },
            { id: "balances", label: `Saldo Cuti Karyawan (${balances.length})` },
            { id: "policies", label: `Jenis & Kebijakan Cuti (${leaveTypes.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 transition-colors ${
                activeTab === tab.id
                  ? "text-primary border-b-2 border-primary font-extrabold"
                  : "hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: REQUESTS */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex items-center space-x-2">
              {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                    filterStatus === st
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {st === "ALL" ? "Semua Status" : st}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5">Karyawan</th>
                      <th className="px-6 py-3.5">Jenis Cuti</th>
                      <th className="px-6 py-3.5">Tanggal Pelaksanaan</th>
                      <th className="px-6 py-3.5">Durasi</th>
                      <th className="px-6 py-3.5">Alasan</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Aksi Persetujuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                          Tidak ada pengajuan cuti dengan status ini.
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">
                              {req.employee?.firstName} {req.employee?.lastName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              NIK: {req.employee?.employeeIdNumber} • {req.employee?.department?.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-800">
                            {req.leaveType?.name}
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-700">
                            {new Date(req.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} - {new Date(req.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800">
                            {req.durationDays} Hari ({req.dayType})
                          </td>
                          <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                            {req.reason}
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              variant={
                                req.status === "APPROVED"
                                  ? "success"
                                  : req.status === "PENDING"
                                  ? "warning"
                                  : "danger"
                              }
                            >
                              {req.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {req.status === "PENDING" ? (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleAction(req.id, "APPROVE")}
                                  disabled={actionLoadingId === req.id}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 transition-colors disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Setujui</span>
                                </button>
                                <button
                                  onClick={() => handleAction(req.id, "REJECT")}
                                  disabled={actionLoadingId === req.id}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-1 transition-colors disabled:opacity-50"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Tolak</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">Selesai</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BALANCES */}
        {activeTab === "balances" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Karyawan</th>
                    <th className="px-6 py-3.5">Jenis Cuti</th>
                    <th className="px-6 py-3.5">Hak Cuti</th>
                    <th className="px-6 py-3.5">Terpakai</th>
                    <th className="px-6 py-3.5">Sisa Saldo</th>
                    <th className="px-6 py-3.5">Tahun Periode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {balances.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">
                          {b.employee?.firstName} {b.employee?.lastName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          NIK: {b.employee?.employeeIdNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">{b.leaveType?.name}</td>
                      <td className="px-6 py-4">{b.entitlement} Hari</td>
                      <td className="px-6 py-4 text-rose-600 font-semibold">{b.used} Hari</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 font-extrabold text-xs border border-teal-200">
                          {b.remaining} Hari Sisa
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono">{b.year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: POLICIES */}
        {activeTab === "policies" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {leaveTypes.map((lt) => (
              <div key={lt.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm">{lt.name}</h3>
                  <Badge variant="primary">Aktif</Badge>
                </div>
                <div className="flex items-baseline space-x-2 pt-2">
                  <span className="text-2xl font-black text-slate-900">{lt.defaultEntitlement}</span>
                  <span className="text-xs text-slate-500 font-semibold">Hari / Tahun</span>
                </div>
                <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                  {lt.requiresAttachment ? "Wajib lampiran surat dokter" : "Cuti standar tanpa syarat surat"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}