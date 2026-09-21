"use client";

import React, { useState, useEffect } from "react";
import {
  Megaphone,
  Search,
  Filter,
  Pin,
  Calendar,
  User,
  Users,
  Building2,
  MapPin,
  Plus,
  Trash2,
  Edit,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_PRIORITIES,
  formatIndonesianDate,
} from "@/lib/letters-service-engine";

export default function AdminAnnouncementsPage() {
  const [session, setSession] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "GENERAL",
    priority: "NORMAL",
    target: "ALL",
    targetDepartmentId: "",
    targetLocationId: "",
    imageUrl: "",
    isPinned: false,
    content: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Edit Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: "",
    category: "GENERAL",
    priority: "NORMAL",
    target: "ALL",
    targetDepartmentId: "",
    targetLocationId: "",
    imageUrl: "",
    isPinned: false,
    content: "",
  });

  // Delete Modal
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Expanded cards tracker
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      let url = "/api/v1/announcements";
      if (categoryFilter !== "ALL") {
        url += `?category=${categoryFilter}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrgData = async () => {
    try {
      const [orgRes, authRes] = await Promise.all([
        fetch("/api/v1/organization"),
        fetch("/api/v1/auth/me"),
      ]);
      if (orgRes.ok) {
        const data = await orgRes.json();
        setDepartments(data.departments || []);
        setLocations(data.locations || []);
      }
      if (authRes.ok) {
        const authData = await authRes.json();
        setSession(authData.user);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [categoryFilter]);

  useEffect(() => {
    fetchOrgData();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formData.title.trim() || !formData.content.trim()) {
      setFormError("Judul dan isi pengumuman wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mempublikasikan pengumuman");
      }

      setIsCreateOpen(false);
      setFormData({
        title: "",
        category: "GENERAL",
        priority: "NORMAL",
        target: "ALL",
        targetDepartmentId: "",
        targetLocationId: "",
        imageUrl: "",
        isPinned: false,
        content: "",
      });
      fetchAnnouncements();
    } catch (err: any) {
      setFormError(err.message || "Terjadi kesalahan sistem");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/announcements/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memperbarui pengumuman");
      }

      setIsEditOpen(false);
      setEditingId(null);
      fetchAnnouncements();
    } catch (err: any) {
      alert(err.message || "Gagal memperbarui pengumuman");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePin = async (announcement: any) => {
    try {
      const updatedPinned = !announcement.isPinned;
      const res = await fetch(`/api/v1/announcements/${announcement.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...announcement,
          isPinned: updatedPinned,
        }),
      });

      if (res.ok) {
        setAnnouncements((prev) =>
          prev.map((item) =>
            item.id === announcement.id ? { ...item, isPinned: updatedPinned } : item
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/announcements/${deleteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAnnouncements((prev) => prev.filter((item) => item.id !== deleteId));
        setDeleteId(null);
      } else {
        const d = await res.json();
        alert(d.error || "Gagal menghapus pengumuman");
      }
    } catch (e: any) {
      alert(e.message || "Gagal menghapus pengumuman");
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = (item: any) => {
    setEditingId(item.id);
    setEditFormData({
      title: item.title,
      category: item.category || "GENERAL",
      priority: item.priority || "NORMAL",
      target: item.target || "ALL",
      targetDepartmentId: item.targetDepartmentId || "",
      targetLocationId: item.targetLocationId || "",
      imageUrl: item.imageUrl || "",
      isPinned: Boolean(item.isPinned),
      content: item.content,
    });
    setIsEditOpen(true);
  };

  // Filter announcements by query & priority
  const filteredAnnouncements = announcements.filter((item) => {
    const matchQuery =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.authorName && item.authorName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchPriority = priorityFilter === "ALL" || item.priority === priorityFilter;

    return matchQuery && matchPriority;
  });

  // Calculate stats
  const totalCount = announcements.length;
  const pinnedCount = announcements.filter((a) => a.isPinned).length;
  const criticalCount = announcements.filter((a) => a.priority === "CRITICAL" || a.priority === "IMPORTANT").length;
  const policyCount = announcements.filter((a) => a.category === "POLICY_UPDATE").length;

  return (
    <AdminShell user={session}>
      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-100">
                <Megaphone className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Pengumuman & Broadcast Internal
                </h1>
                <p className="text-sm text-slate-500">
                  Publikasikan informasi resmi, edaran regulasi, dan kegiatan perusahaan ke karyawan
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setFormError("");
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-md shadow-indigo-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Pengumuman Baru</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Pengumuman</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalCount}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Tercatat di sistem</p>
            </div>
            <div className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-100">
              <Megaphone className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Disematkan (Pinned)</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{pinnedCount}</h3>
              <p className="text-xs text-amber-600/80 mt-0.5">Tampil prioritas teratas</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <Pin className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Regulasi & Kebijakan</p>
              <h3 className="text-2xl font-bold text-blue-600 mt-1">{policyCount}</h3>
              <p className="text-xs text-blue-600/80 mt-0.5">SOP & Keputusan Direksi</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Penting / Kritikal</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">{criticalCount}</h3>
              <p className="text-xs text-rose-600/80 mt-0.5">Broadcast mendesak</p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari pengumuman atau penulis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Kategori:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">Semua Kategori</option>
                {ANNOUNCEMENT_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Prioritas:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">Semua Prioritas</option>
                <option value="NORMAL">Biasa</option>
                <option value="IMPORTANT">Penting</option>
                <option value="CRITICAL">Kritikal</option>
              </select>
            </div>
          </div>
        </div>

        {/* Announcements List */}
        {isLoading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
            <p className="text-sm text-slate-500">Memuat data pengumuman...</p>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-3">
              <Megaphone className="w-7 h-7" />
            </div>
            <h4 className="text-base font-semibold text-slate-800">Belum ada pengumuman</h4>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
              {searchQuery || categoryFilter !== "ALL" || priorityFilter !== "ALL"
                ? "Tidak ada pengumuman yang sesuai dengan filter pencarian Anda."
                : "Klik tombol 'Buat Pengumuman Baru' untuk menyebarkan informasi atau edaran pertama ke karyawan."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map((item) => {
              const categoryConfig =
                ANNOUNCEMENT_CATEGORIES.find((c) => c.id === item.category) || {
                  label: item.category,
                  badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
                };
              const priorityConfig =
                ANNOUNCEMENT_PRIORITIES[item.priority as keyof typeof ANNOUNCEMENT_PRIORITIES] || {
                  label: item.priority,
                  color: "bg-slate-100 text-slate-600",
                };

              const deptName =
                departments.find((d) => d.id === item.targetDepartmentId)?.name || "Departemen";
              const locName =
                locations.find((l) => l.id === item.targetLocationId)?.name || "Lokasi Kantor";

              const isExpanded = Boolean(expandedCards[item.id]);

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border transition-all shadow-sm overflow-hidden ${
                    item.isPinned
                      ? "border-amber-300 ring-2 ring-amber-100 shadow-amber-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="p-6 space-y-4">
                    {/* Card Top Meta */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.isPinned && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-xs">
                            <Pin className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
                            Disematkan
                          </span>
                        )}

                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${categoryConfig.badgeColor}`}
                        >
                          {categoryConfig.label}
                        </span>

                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig.color}`}
                        >
                          {priorityConfig.label}
                        </span>

                        {/* Target badge */}
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          {item.target === "ALL" ? (
                            <>
                              <Users className="w-3 h-3" />
                              Semua Karyawan
                            </>
                          ) : item.target === "DEPARTMENT" ? (
                            <>
                              <Building2 className="w-3 h-3 text-indigo-500" />
                              Khusus Dept: {deptName}
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3 h-3 text-emerald-500" />
                              Khusus Lokasi: {locName}
                            </>
                          )}
                        </span>
                      </div>

                      {/* Top Right Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTogglePin(item)}
                          title={item.isPinned ? "Lepas Sematan (Unpin)" : "Sematkan di Atas (Pin)"}
                          className={`p-1.5 rounded-lg border text-xs font-medium transition-colors ${
                            item.isPinned
                              ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <Pin
                            className={`w-3.5 h-3.5 ${item.isPinned ? "fill-amber-600" : ""}`}
                          />
                        </button>

                        <button
                          onClick={() => openEditModal(item)}
                          title="Ubah Pengumuman"
                          className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeleteId(item.id)}
                          title="Hapus Pengumuman"
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Title & Author */}
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-snug">{item.title}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Dipublikasikan oleh: <strong className="text-slate-700">{item.authorName || "HR Admin"}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatIndonesianDate(item.date || item.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Optional Image Banner */}
                    {item.imageUrl && (
                      <div className="rounded-xl overflow-hidden max-h-64 border border-slate-100">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as any).style.display = "none";
                          }}
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                      {isExpanded
                        ? item.content
                        : item.content.length > 280
                        ? `${item.content.substring(0, 280)}...`
                        : item.content}
                    </div>

                    {/* Read more toggle if long */}
                    {item.content.length > 280 && (
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <span>Tampilkan Lebih Ringkas</span>
                            <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span>Baca Selengkapnya</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Buat Pengumuman Baru */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
              <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-600/30 border border-indigo-400/30">
                    <Megaphone className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Buat Pengumuman Perusahaan</h3>
                    <p className="text-xs text-indigo-200">Informasi akan disiarkan ke notifikasi karyawan</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Judul Pengumuman <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Surat Edaran Hari Libur Nasional Idul Fitri 1447 H"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      {ANNOUNCEMENT_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tingkat Prioritas</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="NORMAL">Biasa (Normal)</option>
                      <option value="IMPORTANT">Penting (Important)</option>
                      <option value="CRITICAL">Kritikal / Wajib Baca</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Target Penerima</label>
                    <select
                      value={formData.target}
                      onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="ALL">Semua Karyawan (Seluruh Perusahaan)</option>
                      <option value="DEPARTMENT">Khusus Departemen Tertentu</option>
                      <option value="LOCATION">Khusus Lokasi Cabang / Kantor Tertentu</option>
                    </select>
                  </div>

                  {formData.target === "DEPARTMENT" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Departemen</label>
                      <select
                        value={formData.targetDepartmentId}
                        onChange={(e) => setFormData({ ...formData, targetDepartmentId: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="">Pilih Departemen...</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.target === "LOCATION" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Lokasi Kantor</label>
                      <select
                        value={formData.targetLocationId}
                        onChange={(e) => setFormData({ ...formData, targetLocationId: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="">Pilih Lokasi...</option>
                        {locations.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name} ({l.city})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    URL Gambar Banner (Opsional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full text-sm px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                  <input
                    type="checkbox"
                    id="isPinned"
                    checked={formData.isPinned}
                    onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                  />
                  <label htmlFor="isPinned" className="text-xs font-medium text-slate-700 cursor-pointer">
                    Sematkan pengumuman ini di posisi paling atas (Pin to Top)
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Isi Pengumuman Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={6}
                    required
                    placeholder="Tulis rincian pesan, instruksi, jadwal pelaksanaan, atau arahan manajemen di sini..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full text-sm p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-100 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Mempublikasikan...</span>
                      </>
                    ) : (
                      <>
                        <Megaphone className="w-4 h-4" />
                        <span>Publikasikan Sekarang</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Edit Pengumuman */}
        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-600/30 border border-indigo-400/30">
                    <Edit className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Ubah Pengumuman</h3>
                    <p className="text-xs text-slate-400">Perbarui konten atau pengaturan publikasi</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Pengumuman</label>
                  <input
                    type="text"
                    required
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                    <select
                      value={editFormData.category}
                      onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {ANNOUNCEMENT_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Prioritas</label>
                    <select
                      value={editFormData.priority}
                      onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="NORMAL">Biasa (Normal)</option>
                      <option value="IMPORTANT">Penting (Important)</option>
                      <option value="CRITICAL">Kritikal</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                  <input
                    type="checkbox"
                    id="editIsPinned"
                    checked={editFormData.isPinned}
                    onChange={(e) => setEditFormData({ ...editFormData, isPinned: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                  />
                  <label htmlFor="editIsPinned" className="text-xs font-medium text-slate-700 cursor-pointer">
                    Sematkan di posisi teratas
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Isi Pengumuman</label>
                  <textarea
                    rows={6}
                    required
                    value={editFormData.content}
                    onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                    className="w-full text-sm p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-100 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Konfirmasi Hapus */}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Hapus Pengumuman?</h4>
                <p className="text-sm text-slate-500 mt-1">
                  Pengumuman yang dihapus tidak akan lagi muncul di portal karyawan dan tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors"
                >
                  {isDeleting ? "Menghapus..." : "Ya, Hapus Pengumuman"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
