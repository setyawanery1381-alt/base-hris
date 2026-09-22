"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  Building,
  MapPin,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  ExternalLink,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileUp,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import {
  parseRawImportRows,
  ParsedEmployeeRow,
} from "@/lib/employee-import";

export default function AdminEmployeesPage() {
  const [session, setSession] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // Add Employee Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "password123",
    employeeIdNumber: "",
    gender: "MALE",
    phone: "",
    employmentStatus: "PROBATION",
    employmentType: "FULL_TIME",
    roleName: "EMPLOYEE",
  });

  // Bulk Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedEmployeeRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [importError, setImportError] = useState("");
  const [previewFilter, setPreviewFilter] = useState<"ALL" | "VALID" | "ERROR">("ALL");
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadEmployees = async () => {
    try {
      const [authRes, empRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch(`/api/v1/employees?search=${encodeURIComponent(search)}`),
      ]);
      if (authRes.ok) {
        const auth = await authRes.json();
        setSession(auth.user);
      }
      if (empRes.ok) {
        const data = await empRes.json();
        setEmployees(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [search]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");
    setFormSuccess("");

    try {
      const res = await fetch("/api/v1/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Gagal membuat data karyawan.");
        setFormLoading(false);
        return;
      }

      setFormSuccess("Karyawan baru berhasil didaftarkan dan saldo cuti telah diinisialisasi!");
      loadEmployees();
      setTimeout(() => {
        setIsAddModalOpen(false);
        setFormSuccess("");
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          password: "password123",
          employeeIdNumber: "",
          gender: "MALE",
          phone: "",
          employmentStatus: "PROBATION",
          employmentType: "FULL_TIME",
          roleName: "EMPLOYEE",
        });
      }, 1200);
    } catch (err: any) {
      setFormError("Terjadi gangguan saat menyimpan.");
    } finally {
      setFormLoading(false);
    }
  };

  // Bulk Import Handlers
  const handleDownloadTemplate = (format: "csv" | "xlsx") => {
    setIsTemplateDropdownOpen(false);
    window.open(`/api/v1/employees/import?format=${format}`, "_blank");
  };

  const processFile = async (file: File) => {
    setIsParsing(true);
    setImportError("");
    setImportResult(null);
    setImportFile(file);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error("File tidak memiliki lembar kerja (worksheet).");
      }
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<any>(worksheet);

      if (!rawRows || rawRows.length === 0) {
        setImportError("File kosong atau tidak memiliki baris data karyawan.");
        setParsedRows([]);
        return;
      }

      const parsed = parseRawImportRows(rawRows);

      // Compare with currently loaded database records
      const existingNiks = new Set(employees.map((emp) => emp.employeeIdNumber?.toUpperCase()));
      const existingEmails = new Set(employees.map((emp) => emp.user?.email?.toLowerCase()));

      const enriched = parsed.map((row) => {
        const additionalErrors = [...row.errors];
        if (row.employeeIdNumber && existingNiks.has(row.employeeIdNumber.toUpperCase())) {
          additionalErrors.push(`NIK '${row.employeeIdNumber}' sudah terdaftar dalam sistem`);
        }
        if (row.email && existingEmails.has(row.email.toLowerCase())) {
          additionalErrors.push(`Email '${row.email}' sudah terdaftar dalam sistem`);
        }
        return {
          ...row,
          errors: additionalErrors,
          isValid: additionalErrors.length === 0,
        };
      });

      setParsedRows(enriched);
    } catch (err: any) {
      console.error("Error parsing file:", err);
      setImportError("Gagal membaca file: " + (err.message || "Pastikan format file CSV atau Excel valid."));
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setImportError("Tidak ada baris data valid yang dapat diimpor.");
      return;
    }

    setIsSubmittingImport(true);
    setImportError("");

    try {
      const res = await fetch("/api/v1/employees/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employees: validRows }),
      });

      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error || "Gagal mengimpor data karyawan.");
        return;
      }

      setImportResult(data);
      await loadEmployees();
    } catch (err: any) {
      setImportError("Terjadi gangguan jaringan saat memproses impor.");
    } finally {
      setIsSubmittingImport(false);
    }
  };

  const resetImportState = () => {
    setImportFile(null);
    setParsedRows([]);
    setImportResult(null);
    setImportError("");
    setPreviewFilter("ALL");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
    resetImportState();
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const errorCount = parsedRows.length - validCount;

  const previewFilteredRows = parsedRows.filter((row) => {
    if (previewFilter === "VALID") return row.isValid;
    if (previewFilter === "ERROR") return !row.isValid;
    return true;
  });

  const filteredEmployees = employees.filter((emp) => {
    if (statusFilter === "ALL") return true;
    return emp.employmentStatus === statusFilter;
  });

  return (
    <AdminShell user={session}>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              Manajemen Data Karyawan
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola profil, NIK, penempatan departemen, dan siklus karir karyawan ({session?.companyName}).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download Template Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs py-2.5 px-3.5 rounded-xl shadow-sm flex items-center space-x-2 transition-all"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Unduh Template</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isTemplateDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-30 animate-fade-in">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Format Template
                  </div>
                  <button
                    onClick={() => handleDownloadTemplate("xlsx")}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center space-x-2.5 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div>Template Microsoft Excel</div>
                      <div className="text-[10px] text-slate-400 font-normal">Format .xlsx dengan styling kolom</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDownloadTemplate("csv")}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-2.5 transition-colors"
                  >
                    <Download className="w-4 h-4 text-blue-600" />
                    <div>
                      <div>Template CSV Standar</div>
                      <div className="text-[10px] text-slate-400 font-normal">Format .csv kompatibel multi-aplikasi</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Bulk Import Button */}
            <Button
              onClick={() => setIsImportModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md flex items-center space-x-2 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Import CSV / Excel</span>
            </Button>

            {/* Single Add Employee */}
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md flex items-center space-x-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Karyawan</span>
            </Button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari NIK, nama, atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
            {["ALL", "PERMANENT", "PROBATION", "CONTRACT"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? "bg-primary text-white border-primary"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {st === "ALL" ? "Semua Status" : st}
              </button>
            ))}
          </div>
        </div>

        {/* Employees Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">NIK</th>
                  <th className="px-6 py-3.5">Nama Karyawan</th>
                  <th className="px-6 py-3.5">Departemen</th>
                  <th className="px-6 py-3.5">Jabatan</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Lokasi</th>
                  <th className="px-6 py-3.5">Tgl Gabung</th>
                  <th className="px-6 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                      {isLoading ? "Memuat data karyawan..." : "Tidak ada data karyawan yang cocok dengan kriteria pencarian."}
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-700">
                        {emp.employeeIdNumber}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{emp.firstName} {emp.lastName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{emp.user?.email}</div>
                      </td>
                      <td className="px-6 py-4">{emp.department?.name || "Belum dialokasikan"}</td>
                      <td className="px-6 py-4">{emp.position?.name || "Staff"}</td>
                      <td className="px-6 py-4">
                        <Badge variant={emp.employmentStatus === "PERMANENT" ? "success" : "warning"}>
                          {emp.employmentStatus}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">{emp.location?.name || "Kantor Pusat"}</td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(emp.joinDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/employees/${emp.id}`}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors inline-flex items-center space-x-1"
                        >
                          <span>Detail</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* BULK IMPORT MODAL */}
        <Modal
          isOpen={isImportModalOpen}
          onClose={closeImportModal}
          title="Import Data Karyawan Masal (CSV / Excel)"
          maxWidth="5xl"
        >
          <div className="space-y-5">
            {/* SUCCESS BANNER */}
            {importResult && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-3">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900">
                      Proses Impor Berhasil Selesai!
                    </h4>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      {importResult.message}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                  <div className="bg-white p-3 rounded-xl border border-emerald-100 text-center">
                    <div className="text-xs text-slate-500 font-medium">Berhasil Diimpor</div>
                    <div className="text-xl font-black text-emerald-600">{importResult.importedCount}</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-emerald-100 text-center">
                    <div className="text-xs text-slate-500 font-medium">Gagal / Dilewati</div>
                    <div className="text-xl font-black text-rose-500">{importResult.rejectedCount}</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-emerald-100 text-center col-span-2 sm:col-span-1">
                    <div className="text-xs text-slate-500 font-medium">Status Akun & Cuti</div>
                    <div className="text-xs font-bold text-slate-700 mt-1">Otomatis Aktif</div>
                  </div>
                </div>

                {importResult.rejected && importResult.rejected.length > 0 && (
                  <div className="mt-3 p-3 bg-white rounded-xl border border-rose-100 text-xs">
                    <div className="font-bold text-rose-700 mb-1">Daftar Baris yang Dilewati:</div>
                    <ul className="list-disc pl-5 space-y-1 text-slate-600">
                      {importResult.rejected.map((rej: any, i: number) => (
                        <li key={i}>
                          Baris {rej.rowNumber} (NIK: {rej.nik}, {rej.email}): {rej.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2 flex justify-end space-x-2">
                  <Button
                    onClick={resetImportState}
                    variant="outline"
                    className="text-xs"
                  >
                    Import File Lain
                  </Button>
                  <Button
                    onClick={closeImportModal}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                  >
                    Selesai & Tutup
                  </Button>
                </div>
              </div>
            )}

            {/* ERROR BANNER */}
            {importError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start space-x-2.5">
                <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">{importError}</div>
              </div>
            )}

            {!importResult && (
              <>
                {/* UPLOAD DROPZONE */}
                {!importFile ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 transition-all rounded-2xl p-8 text-center cursor-pointer flex flex-col items-center justify-center space-y-3"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                      <FileUp className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Klik untuk memilih file atau seret file ke sini
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Mendukung format Microsoft Excel (.xlsx, .xls) atau Comma-Separated Values (.csv)
                      </p>
                    </div>
                    <div className="flex items-center space-x-3 pt-2">
                      <span className="text-[11px] bg-slate-100 text-slate-600 font-semibold px-2.5 py-1 rounded-lg">
                        Maksimal 500 karyawan / batch
                      </span>
                      <span className="text-[11px] bg-slate-100 text-slate-600 font-semibold px-2.5 py-1 rounded-lg">
                        Auto-generate Akun & Saldo Cuti
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{importFile.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {(importFile.size / 1024).toFixed(1)} KB • {parsedRows.length} baris data terbaca
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={resetImportState}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      Ganti File
                    </button>
                  </div>
                )}

                {/* HELPER GUIDE */}
                {!importFile && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="font-bold text-slate-700 flex items-center space-x-1.5">
                      <AlertCircle className="w-4 h-4 text-primary" />
                      <span>Petunjuk Penting Pengisian File Import:</span>
                    </div>
                    <ul className="list-disc pl-5 text-slate-600 space-y-1 text-[11px]">
                      <li>
                        Kolom Wajib: <strong>NIK Karyawan</strong>, <strong>Nama Depan</strong>, dan <strong>Email</strong>.
                      </li>
                      <li>
                        Format Tanggal Masuk: <strong>YYYY-MM-DD</strong> (cth: 2026-01-15) atau <strong>DD/MM/YYYY</strong>.
                      </li>
                      <li>
                        Status Karyawan: <strong>PERMANENT</strong> (Tetap), <strong>PROBATION</strong> (Percobaan), atau <strong>CONTRACT</strong> (Kontrak).
                      </li>
                      <li>
                        Sistem akan otomatis mengaitkan Departemen & Jabatan, menghash password default (<code className="bg-slate-200 px-1 rounded">password123</code>), serta menginisialisasi saldo cuti tahunan dan profil BPJS/Gaji.
                      </li>
                    </ul>
                    <div className="pt-1 flex items-center space-x-3 text-[11px]">
                      <span className="text-slate-500">Belum punya formatnya?</span>
                      <button
                        onClick={() => handleDownloadTemplate("xlsx")}
                        className="text-emerald-700 font-bold hover:underline flex items-center space-x-1"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Unduh Contoh Template Excel</span>
                      </button>
                      <button
                        onClick={() => handleDownloadTemplate("csv")}
                        className="text-blue-700 font-bold hover:underline flex items-center space-x-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh Template CSV</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* PREVIEW TABLE */}
                {parsedRows.length > 0 && (
                  <div className="space-y-3">
                    {/* Summary Tabs */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setPreviewFilter("ALL")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            previewFilter === "ALL"
                              ? "bg-slate-800 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          Semua ({parsedRows.length})
                        </button>
                        <button
                          onClick={() => setPreviewFilter("VALID")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                            previewFilter === "VALID"
                              ? "bg-emerald-600 text-white"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Siap Diimpor ({validCount})</span>
                        </button>
                        <button
                          onClick={() => setPreviewFilter("ERROR")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                            previewFilter === "ERROR"
                              ? "bg-rose-600 text-white"
                              : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Perlu Diperbaiki ({errorCount})</span>
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-500 font-medium">
                        {validCount > 0 ? (
                          <span className="text-emerald-700 font-semibold">
                            ✓ {validCount} karyawan siap disimpan ke database
                          </span>
                        ) : (
                          <span className="text-rose-600 font-semibold">
                            ⚠ Tidak ada data valid untuk diimpor
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Table Container */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 sticky top-0 z-10 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2.5">Status</th>
                            <th className="px-3 py-2.5">NIK</th>
                            <th className="px-3 py-2.5">Nama Karyawan</th>
                            <th className="px-3 py-2.5">Email</th>
                            <th className="px-3 py-2.5">Departemen & Jabatan</th>
                            <th className="px-3 py-2.5">Status Kerja</th>
                            <th className="px-3 py-2.5">Gaji Pokok</th>
                            <th className="px-3 py-2.5">Keterangan / Validasi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {previewFilteredRows.map((row) => (
                            <tr
                              key={row.rowNumber}
                              className={`transition-colors ${
                                row.isValid
                                  ? "hover:bg-emerald-50/40"
                                  : "bg-rose-50/40 hover:bg-rose-50/70"
                              }`}
                            >
                              <td className="px-3 py-2">
                                {row.isValid ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    Siap
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                    Error
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 font-mono font-bold text-slate-800">
                                {row.employeeIdNumber || "-"}
                              </td>
                              <td className="px-3 py-2">
                                <div className="font-bold text-slate-900">
                                  {row.firstName} {row.lastName}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {row.gender === "FEMALE" ? "Perempuan" : "Laki-laki"} • {row.phone || "-"}
                                </div>
                              </td>
                              <td className="px-3 py-2 font-mono text-slate-600">
                                {row.email || "-"}
                              </td>
                              <td className="px-3 py-2">
                                <div className="text-slate-800 font-semibold">{row.departmentName || "-"}</div>
                                <div className="text-[10px] text-slate-400">{row.positionName || "-"}</div>
                              </td>
                              <td className="px-3 py-2">
                                <Badge variant={row.employmentStatus === "PERMANENT" ? "success" : "warning"}>
                                  {row.employmentStatus}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 font-mono text-slate-700">
                                {row.basicSalary > 0
                                  ? `Rp ${row.basicSalary.toLocaleString("id-ID")}`
                                  : "-"}
                              </td>
                              <td className="px-3 py-2">
                                {row.isValid ? (
                                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center space-x-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Lengkap & Valid</span>
                                  </span>
                                ) : (
                                  <div className="space-y-0.5">
                                    {row.errors.map((err, i) => (
                                      <div key={i} className="text-[11px] text-rose-600 font-semibold flex items-center space-x-1">
                                        <XCircle className="w-3 h-3 flex-shrink-0" />
                                        <span>{err}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Bottom action buttons */}
                    <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                      <p className="text-[11px] text-slate-500">
                        {errorCount > 0 && (
                          <span className="text-amber-700 font-medium">
                            * Catatan: Baris dengan status Error akan otomatis dilewati. Hanya {validCount} baris valid yang akan disimpan.
                          </span>
                        )}
                      </p>

                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={closeImportModal}
                          disabled={isSubmittingImport}
                        >
                          Batal
                        </Button>
                        <Button
                          onClick={handleConfirmImport}
                          isLoading={isSubmittingImport}
                          disabled={validCount === 0 || isSubmittingImport}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md"
                        >
                          <span>Proses & Impor {validCount} Karyawan</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Modal>

        {/* SINGLE ADD EMPLOYEE MODAL */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Tambah Karyawan Baru"
          maxWidth="lg"
        >
          <form onSubmit={handleCreateEmployee} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{formSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nama Depan *"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="cth: Siti"
              />
              <Input
                label="Nama Belakang *"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="cth: Rahmawati"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="NIK / Employee ID *"
                required
                value={formData.employeeIdNumber}
                onChange={(e) => setFormData({ ...formData, employeeIdNumber: e.target.value })}
                placeholder="cth: KNY-004"
              />
              <Input
                label="Email Perusahaan *"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="cth: siti@kanaya.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Jenis Kelamin</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none"
                >
                  <option value="MALE">Laki-laki</option>
                  <option value="FEMALE">Perempuan</option>
                </select>
              </div>
              <Input
                label="No. Telepon / WhatsApp"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="cth: 08123456789"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status Kepegawaian</label>
                <select
                  value={formData.employmentStatus}
                  onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none"
                >
                  <option value="PROBATION">Masa Percobaan (Probation)</option>
                  <option value="PERMANENT">Karyawan Tetap (Permanent)</option>
                  <option value="CONTRACT">Kontrak (Contract)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Role Sistem</label>
                <select
                  value={formData.roleName}
                  onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none"
                >
                  <option value="EMPLOYEE">Karyawan (Mobile Self-Service)</option>
                  <option value="MANAGER">Manager (Approver)</option>
                  <option value="HR_ADMIN">HR Administrator</option>
                </select>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              * Password default sementara adalah: <strong className="text-slate-600 font-mono">password123</strong>. Saldo cuti tahunan akan otomatis dibuat sebanyak 12 hari.
            </p>

            <div className="pt-2 flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" isLoading={formLoading}>
                Simpan & Daftarkan
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminShell>
  );
}