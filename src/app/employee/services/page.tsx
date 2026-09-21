"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  HelpCircle,
  Plus,
  Search,
  MessageSquare,
  Send,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  X,
  FileText,
  Building2,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { useTheme } from "@/components/layout/theme-provider";
import {
  SERVICE_CATEGORIES,
  SERVICE_STATUSES,
  SERVICE_PRIORITIES,
  formatIndonesianDate,
} from "@/lib/letters-service-engine";

export default function EmployeeServicesPage() {
  const { theme } = useTheme();
  const [session, setSession] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL");

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("EMPLOYMENT_LETTER");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newSubject, setNewSubject] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  // Ticket Detail & Chat Drawer State
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const [authRes, ticketsRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/services"),
      ]);

      if (authRes.ok) {
        const authData = await authRes.json();
        setSession(authData.user);
      }
      if (ticketsRes.ok) {
        const data = await ticketsRes.json();
        setTickets(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (isChatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments, isChatOpen]);

  const handleOpenTicket = async (ticket: any) => {
    setSelectedTicket(ticket);
    setComments(ticket.comments || []);
    setIsChatOpen(true);

    try {
      const res = await fetch(`/api/v1/services/${ticket.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.data);
        setComments(data.data.comments || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket) return;

    setSendLoading(true);
    try {
      const res = await fetch(`/api/v1/services/${selectedTicket.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data.data]);
        setNewMessage("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSendLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (!newSubject.trim() || !newDescription.trim()) {
      setCreateError("Subjek dan rincian permohonan wajib diisi");
      return;
    }

    setCreateSubmitting(true);
    try {
      const res = await fetch("/api/v1/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newCategory,
          priority: newPriority,
          subject: newSubject,
          description: newDescription,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat tiket");
      }

      setIsCreateOpen(false);
      setNewSubject("");
      setNewDescription("");
      setNewCategory("EMPLOYMENT_LETTER");
      setNewPriority("MEDIUM");
      fetchTickets();
    } catch (err: any) {
      setCreateError(err.message || "Gagal membuat tiket");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "ACTIVE") return t.status === "SUBMITTED" || t.status === "IN_REVIEW" || t.status === "IN_PROGRESS";
    if (activeTab === "RESOLVED") return t.status === "RESOLVED" || t.status === "CLOSED";
    return true;
  });

  return (
    <MobileShell user={session}>
      <div className="bg-slate-50 min-h-full pb-20">
        {/* Header */}
        <div
          className="text-white p-5 rounded-b-3xl shadow-md transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor || theme.primaryColor}, #0f172a)`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
                <HelpCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-black">HR Service Desk</h1>
                <p className="text-[11px] text-white/80">Layanan tiket & konsultasi kepegawaian</p>
              </div>
            </div>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tiket Baru</span>
            </button>
          </div>
        </div>

        {/* Tab Filter */}
        <div className="p-4 space-y-3">
          <div className="flex rounded-xl bg-slate-200/70 p-1 text-xs font-bold text-slate-600">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                activeTab === "ALL" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
              }`}
            >
              Semua ({tickets.length})
            </button>
            <button
              onClick={() => setActiveTab("ACTIVE")}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                activeTab === "ACTIVE" ? "bg-white text-indigo-600 shadow-xs" : "hover:text-slate-900"
              }`}
            >
              Diproses ({tickets.filter((t) => ["SUBMITTED", "IN_REVIEW", "IN_PROGRESS"].includes(t.status)).length})
            </button>
            <button
              onClick={() => setActiveTab("RESOLVED")}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                activeTab === "RESOLVED" ? "bg-white text-emerald-600 shadow-xs" : "hover:text-slate-900"
              }`}
            >
              Selesai ({tickets.filter((t) => ["RESOLVED", "CLOSED"].includes(t.status)).length})
            </button>
          </div>

          {/* Ticket Cards List */}
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600 mb-2" />
              <p className="text-xs text-slate-500">Memuat tiket Anda...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="py-14 text-center bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Belum Ada Tiket</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Ajukan pertanyaan, permohonan surat, atau kendala BPJS Anda langsung kepada tim HR.
              </p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center space-x-1 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Tiket Permohonan</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => {
                const statusInfo =
                  SERVICE_STATUSES[ticket.status as keyof typeof SERVICE_STATUSES] || {
                    label: ticket.status,
                    color: "bg-slate-100 text-slate-700",
                  };
                const categoryInfo =
                  SERVICE_CATEGORIES.find((c) => c.id === ticket.category) || {
                    label: ticket.category,
                  };
                const priorityInfo =
                  SERVICE_PRIORITIES[ticket.priority as keyof typeof SERVICE_PRIORITIES] || {
                    label: ticket.priority,
                    color: "bg-slate-100 text-slate-600",
                  };

                return (
                  <div
                    key={ticket.id}
                    onClick={() => handleOpenTicket(ticket)}
                    className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all active:scale-[0.99] cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        {ticket.ticketNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {ticket.subject}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                        {ticket.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-medium text-slate-600">{categoryInfo.label}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-indigo-600 font-bold">
                        <MessageSquare className="w-3 h-3" />
                        <span>{ticket.comments?.length || 0} Balasan</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Buat Tiket Baru */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Buat Tiket Permohonan</h3>
                    <p className="text-[11px] text-slate-500">Tim HR akan meninjau dan merespon segera</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-3.5">
                {createError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Kategori Layanan
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {SERVICE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tingkat Prioritas
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="LOW">Rendah (Low)</option>
                    <option value="MEDIUM">Normal (Medium)</option>
                    <option value="HIGH">Penting (High)</option>
                    <option value="URGENT">Mendesak (Urgent)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Subjek Tiket <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Permohonan SK Kerja untuk Pengajuan Visa"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Rincian Kebutuhan / Pertanyaan <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Tuliskan detail permohonan Anda, tujuan penggunaan surat, atau kendala BPJS..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={createSubmitting}
                    className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl shadow-md disabled:opacity-50"
                  >
                    {createSubmitting ? "Mengirim..." : "Kirim Tiket"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Chat Thread & Rincian Tiket */}
        {isChatOpen && selectedTicket && (
          <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-right">
            {/* Header Drawer */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-xs text-indigo-300">
                      {selectedTicket.ticketNumber}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 font-medium">
                      {SERVICE_STATUSES[selectedTicket.status as keyof typeof SERVICE_STATUSES]?.label || selectedTicket.status}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold truncate max-w-[200px] text-white">
                    {selectedTicket.subject}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Content Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {/* Original Ticket Box */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-700">Permohonan Awal</span>
                  <span>{formatIndonesianDate(selectedTicket.createdAt)}</span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed">
                  {selectedTicket.description}
                </p>
                {selectedTicket.assignedTo && (
                  <div className="pt-2 border-t border-slate-100 flex items-center space-x-1.5 text-[10px] text-indigo-600 font-medium">
                    <User className="w-3 h-3" />
                    <span>Ditangani oleh: <strong>{selectedTicket.assignedTo}</strong></span>
                  </div>
                )}
                {selectedTicket.resolutionNotes && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                    <div className="font-bold flex items-center space-x-1 mb-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Catatan Penyelesaian HR:</span>
                    </div>
                    <p className="text-[11px]">{selectedTicket.resolutionNotes}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center my-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full">
                  Percakapan Layanan
                </span>
              </div>

              {/* Messages Thread */}
              {comments.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Belum ada pesan tindak lanjut. Tim HR akan segera merespon tiket Anda.
                </div>
              ) : (
                comments.map((c) => {
                  const isMe = c.authorRole === "EMPLOYEE";
                  return (
                    <div
                      key={c.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center space-x-1.5 mb-1 px-1 text-[10px] text-slate-400">
                        <span className="font-bold text-slate-600">
                          {isMe ? "Anda" : c.authorName || "HR Admin"}
                        </span>
                        {!isMe && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold">
                            HR
                          </span>
                        )}
                        <span>•</span>
                        <span>{formatIndonesianDate(c.createdAt)}</span>
                      </div>
                      <div
                        className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed shadow-xs ${
                          isMe
                            ? "bg-indigo-600 text-white rounded-tr-xs"
                            : "bg-white text-slate-800 border border-slate-200 rounded-tl-xs"
                        }`}
                      >
                        {c.message}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Bar */}
            {selectedTicket.status !== "CLOSED" ? (
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2"
              >
                <input
                  type="text"
                  placeholder="Ketik pesan atau balasan ke tim HR..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="submit"
                  disabled={sendLoading || !newMessage.trim()}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md disabled:opacity-40 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="p-3 bg-slate-100 border-t border-slate-200 text-center text-xs text-slate-500 font-medium">
                Tiket ini telah ditutup. Silakan buat tiket baru jika ada kebutuhan lainnya.
              </div>
            )}
          </div>
        )}
      </div>
    </MobileShell>
  );
}
