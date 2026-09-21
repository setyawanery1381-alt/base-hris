"use client";

import React, { useState, useEffect } from "react";
import {
  HelpCircle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Send,
  User,
  Building2,
  Sparkles,
  ChevronRight,
  X,
  FileText,
  UserCheck,
  Calendar,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Avatar } from "@/components/ui/avatar";
import {
  SERVICE_CATEGORIES,
  SERVICE_STATUSES,
  SERVICE_PRIORITIES,
} from "@/lib/letters-service-engine";

export default function AdminServicesPage() {
  const [session, setSession] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalTickets: 0,
    submittedCount: 0,
    inProgressCount: 0,
    resolvedCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal / Handling State
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [assignedToInput, setAssignedToInput] = useState("");
  const [resolutionInput, setResolutionInput] = useState("");

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const [authRes, ticketsRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch(`/api/v1/services?status=${statusFilter}&category=${categoryFilter}&priority=${priorityFilter}`),
      ]);

      if (authRes.ok) {
        const authData = await authRes.json();
        setSession(authData.user);
      }
      if (ticketsRes.ok) {
        const data = await ticketsRes.json();
        setTickets(data.data || []);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, categoryFilter, priorityFilter]);

  const openTicketModal = async (ticket: any) => {
    setSelectedTicket(ticket);
    setAssignedToInput(ticket.assignedTo || session?.name || "Tim HR Admin");
    setResolutionInput(ticket.resolutionNotes || "");
    setReplyMessage("");
    setIsDetailModalOpen(true);

    // Fetch full ticket details with all comments
    try {
      const res = await fetch(`/api/v1/services/${ticket.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/services/${selectedTicket.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyMessage.trim() }),
      });

      if (res.ok) {
        setReplyMessage("");
        // Reload ticket comments
        const tRes = await fetch(`/api/v1/services/${selectedTicket.id}`);
        if (tRes.ok) {
          const tData = await tRes.json();
          setSelectedTicket(tData.data);
        }
        fetchTickets();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal mengirim tanggapan");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTicket) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/services/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          assignedTo: assignedToInput,
          resolutionNotes: resolutionInput,
        }),
      });

      if (res.ok) {
        setIsDetailModalOpen(false);
        fetchTickets();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal mengubah status tiket");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const num = (t.ticketNumber || "").toLowerCase();
    const sub = (t.subject || "").toLowerCase();
    const emp = `${t.employee?.firstName || ""} ${t.employee?.lastName || ""}`.toLowerCase();
    return num.includes(q) || sub.includes(q) || emp.includes(q);
  });

  return (
    <AdminShell user={session}>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-teal-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-teal-200 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pusat Layanan Karyawan & Bantuan HR</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              HR Service Desk & Tiket
            </h1>
            <p className="text-sm text-teal-100/90 mt-1 max-w-2xl">
              Tangani permohonan surat keterangan, konsultasi BPJS, perubahan data pribadi, dan komplain karyawan dalam satu alur tiket terpadu.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => fetchTickets()}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Antrean</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tiket</span>
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-3xl font-black text-slate-900">{summary.totalTickets}</span>
              <span className="text-xs text-slate-500">Tiket</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Akumulasi permohonan layanan</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Menunggu Respon</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-3xl font-black text-amber-600">{summary.submittedCount}</span>
              <span className="text-xs text-slate-500">Tiket Baru</span>
            </div>
            <p className="text-[11px] text-amber-600 font-semibold mt-1">Belum ditanggapi oleh HR</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Sedang Diproses</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-3xl font-black text-blue-600">{summary.inProgressCount}</span>
              <span className="text-xs text-slate-500">Aktif</span>
            </div>
            <p className="text-[11px] text-blue-600 font-semibold mt-1">Dalam penanganan staf HR</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Selesai (Resolved)</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-3">
              <span className="text-3xl font-black text-emerald-700">{summary.resolvedCount}</span>
              <span className="text-xs text-slate-500">Tiket</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">Permohonan tuntas</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor tiket, judul permohonan, atau nama karyawan..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="ALL">Semua Kategori</option>
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="ALL">Semua Prioritas</option>
                <option value="LOW">Rendah</option>
                <option value="MEDIUM">Normal</option>
                <option value="HIGH">Penting</option>
                <option value="URGENT">Mendesak</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 border-t border-slate-100 pt-3">
            {[
              { id: "ALL", label: "Semua Status" },
              { id: "SUBMITTED", label: "Menunggu Respon" },
              { id: "IN_PROGRESS", label: "Sedang Diproses" },
              { id: "RESOLVED", label: "Selesai" },
              { id: "CLOSED", label: "Ditutup" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-teal-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Nomor & Tanggal</th>
                  <th className="px-5 py-3.5">Karyawan</th>
                  <th className="px-5 py-3.5">Kategori & Subjek</th>
                  <th className="px-5 py-3.5 text-center">Prioritas</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5">Staf Penangan</th>
                  <th className="px-5 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                      Memuat antrean tiket layanan...
                    </td>
                  </tr>
                ) : filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      <HelpCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      Tidak ada tiket layanan yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => {
                    const statusCfg = SERVICE_STATUSES[ticket.status as keyof typeof SERVICE_STATUSES] || {
                      label: ticket.status,
                      color: "bg-slate-100 text-slate-700 border-slate-200",
                    };
                    const priorityCfg = SERVICE_PRIORITIES[ticket.priority as keyof typeof SERVICE_PRIORITIES] || {
                      label: ticket.priority,
                      color: "bg-slate-100 text-slate-700 border-slate-200",
                    };
                    const catCfg = SERVICE_CATEGORIES.find((c) => c.id === ticket.category);

                    return (
                      <tr key={ticket.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4">
                          <span className="font-mono font-bold text-teal-800 text-[11px]">
                            {ticket.ticketNumber}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {new Date(ticket.createdAt).toLocaleDateString("id-ID")}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center space-x-2.5">
                            <Avatar
                              name={`${ticket.employee?.firstName || ""} ${ticket.employee?.lastName || ""}`}
                              photoUrl={ticket.employee?.photoUrl}
                              size="sm"
                            />
                            <div>
                              <p className="font-bold text-slate-900">
                                {ticket.employee?.firstName} {ticket.employee?.lastName}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {ticket.employee?.department?.name || "Karyawan"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 max-w-[240px]">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border mb-1 ${catCfg?.badgeColor || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                            {catCfg?.label || ticket.category}
                          </span>
                          <p className="font-bold text-slate-900 truncate" title={ticket.subject}>
                            {ticket.subject}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate" title={ticket.description}>
                            {ticket.description}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${priorityCfg.color}`}>
                            {priorityCfg.label}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {ticket.assignedTo ? (
                            <span className="font-semibold text-slate-800 flex items-center space-x-1">
                              <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                              <span>{ticket.assignedTo}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Belum ditetapkan</span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => openTicketModal(ticket)}
                            className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs transition-colors flex items-center space-x-1 mx-auto cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Buka Tiket</span>
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
      </div>

      {/* Ticket Handling & Chat Drawer Modal */}
      {isDetailModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {selectedTicket.ticketNumber}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500 font-semibold">
                    {new Date(selectedTicket.createdAt).toLocaleDateString("id-ID")}
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-1">{selectedTicket.subject}</h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Employee & Category Info */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Avatar
                    name={`${selectedTicket.employee?.firstName || ""} ${selectedTicket.employee?.lastName || ""}`}
                    photoUrl={selectedTicket.employee?.photoUrl}
                    size="sm"
                  />
                  <div>
                    <p className="font-bold text-slate-900">
                      {selectedTicket.employee?.firstName} {selectedTicket.employee?.lastName}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {selectedTicket.employee?.employeeIdNumber} • {selectedTicket.employee?.department?.name || "Karyawan"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Kategori</span>
                  <span className="font-bold text-slate-800">
                    {SERVICE_CATEGORIES.find((c) => c.id === selectedTicket.category)?.label || selectedTicket.category}
                  </span>
                </div>
              </div>

              {/* Description by Employee */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Rincian Permohonan Karyawan</span>
                <p className="text-slate-800 leading-relaxed text-xs whitespace-pre-wrap">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Chat Thread */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Percakapan & Catatan Tindak Lanjut ({selectedTicket.comments?.length || 0})
                </h4>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                    selectedTicket.comments.map((comment: any) => (
                      <div
                        key={comment.id}
                        className={`p-3 rounded-2xl text-xs max-w-[85%] ${
                          comment.authorRole === "HR"
                            ? "ml-auto bg-teal-50 border border-teal-100 text-teal-950"
                            : "mr-auto bg-slate-100 text-slate-900"
                        }`}
                      >
                        <div className="flex items-center justify-between space-x-4 mb-1">
                          <strong className="text-[11px] font-bold">
                            {comment.authorRole === "HR" ? "🛡️ HR Response" : "👤 Karyawan"}
                          </strong>
                          <span className="text-[9px] text-slate-400">
                            {new Date(comment.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="leading-relaxed">{comment.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400 italic">
                      Belum ada tanggapan dalam tiket ini.
                    </div>
                  )}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendReply} className="flex items-center space-x-2 pt-2">
                  <input
                    type="text"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Tulis tanggapan atau instruksi untuk karyawan..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={actionLoading || !replyMessage.trim()}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center space-x-1 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim</span>
                  </button>
                </form>
              </div>

              {/* Assignment & Resolution Fields */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-3 pt-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Staf Penangan (PIC HR)</label>
                  <input
                    type="text"
                    value={assignedToInput}
                    onChange={(e) => setAssignedToInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Catatan Resolusi Tiket</label>
                  <input
                    type="text"
                    value={resolutionInput}
                    onChange={(e) => setResolutionInput(e.target.value)}
                    placeholder="Contoh: Surat SKK telah dikirim ke email staf"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs"
              >
                Tutup
              </button>

              {selectedTicket.status === "SUBMITTED" && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus("IN_PROGRESS")}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Mulai Proses</span>
                </button>
              )}

              {selectedTicket.status !== "RESOLVED" && selectedTicket.status !== "CLOSED" && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus("RESOLVED")}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Tandai Selesai (Resolve)</span>
                </button>
              )}

              {selectedTicket.status === "RESOLVED" && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus("CLOSED")}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs flex items-center space-x-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Tutup Tiket (Close)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
