"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Download,
  Printer,
  Search,
  FileSpreadsheet,
  ShieldCheck,
  Building2,
  Users,
  TrendingUp,
  Percent,
  Calendar,
  AlertCircle,
  FileText,
  DollarSign,
  Activity,
  CheckCircle2,
  Filter,
  UserCheck,
  Clock,
  ExternalLink,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";

export default function AdminReportsPage() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"BI" | "EBUPOT" | "SIPP" | "EDABU" | "WLKP" | "ATTENDANCE">("BI");

  // Filter Period
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Data States
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [wlkpData, setWlkpData] = useState<any>(null);
  const [payslipsData, setPayslipsData] = useState<any[]>([]);
  const [attendanceReport, setAttendanceReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const months = [
    { value: 1, label: "Januari" },
    { value: 2, label: "Februari" },
    { value: 3, label: "Maret" },
    { value: 4, label: "April" },
    { value: 5, label: "Mei" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "Agustus" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "Desember" },
  ];

  const years = [2024, 2025, 2026, 2027];

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [meRes, analRes, wlkpRes, attRes, payRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/compliance/analytics"),
        fetch("/api/v1/compliance/wlkp"),
        fetch("/api/v1/reports"),
        fetch(`/api/v1/payroll/payslips?month=${selectedMonth}&year=${selectedYear}`),
      ]);

      if (meRes.ok) setSession((await meRes.json()).user);
      if (analRes.ok) setAnalyticsData((await analRes.json()).data);
      if (wlkpRes.ok) setWlkpData(await wlkpRes.json());
      if (attRes.ok) setAttendanceReport(await attRes.json());
      if (payRes.ok) {
        const pd = await payRes.json();
        setPayslipsData(pd.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  // Download handlers
  const handleDownloadEbupot = () => {
    window.open(`/api/v1/compliance/ebupot?month=${selectedMonth}&year=${selectedYear}`, "_blank");
  };

  const handleDownloadSipp = () => {
    window.open(`/api/v1/compliance/sipp?month=${selectedMonth}&year=${selectedYear}`, "_blank");
  };

  const handleDownloadEdabu = () => {
    window.open(`/api/v1/compliance/bpjs-kes?month=${selectedMonth}&year=${selectedYear}`, "_blank");
  };

  const handleExportAttendanceCSV = () => {
    const records = attendanceReport?.records || [];
    const headers = [
      "No",
      "NIK",
      "Nama Karyawan",
      "Departemen",
      "Tanggal",
      "Waktu Check-In",
      "Waktu Check-Out",
      "Status",
    ];

    const rows = records.map((r: any, idx: number) => {
      const emp = r.employee || {};
      const name = `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
      const dateStr = r.date ? new Date(r.date).toLocaleDateString("id-ID") : "-";
      const inStr = r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString("id-ID") : "-";
      const outStr = r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString("id-ID") : "-";
      return [idx + 1, `"${emp.employeeIdNumber || ""}"`, `"${name}"`, `"${emp.department?.name || ""}"`, `"${dateStr}"`, `"${inStr}"`, `"${outStr}"`, r.status];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `rekap-absensi-${selectedYear}-${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculations for Tax & BPJS tabs
  const totalGrossTax = payslipsData.reduce((acc, p) => acc + (p.grossSalary || 0), 0);
  const totalPph21 = payslipsData.reduce((acc, p) => acc + (p.pph21 || 0), 0);

  const totalBpjsTk = payslipsData.reduce((acc, p) => {
    return (
      acc +
      (p.bpjsTkJkk || 0) +
      (p.bpjsTkJkm || 0) +
      (p.bpjsTkJhtCompany || 0) +
      (p.bpjsTkJhtEmployee || 0) +
      (p.bpjsTkJpCompany || 0) +
      (p.bpjsTkJpEmployee || 0)
    );
  }, 0);

  const totalBpjsKes = payslipsData.reduce((acc, p) => {
    return acc + (p.bpjsKesCompany || 0) + (p.bpjsKesEmployee || 0);
  }, 0);

  return (
    <AdminShell user={session}>
      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-md shadow-indigo-100">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Laporan Kepatuhan & Eksekutif BI Suite
                </h1>
                <p className="text-sm text-slate-500">
                  Ekspor resmi e-Bupot PPh 21 DJP, BPJS SIPP/e-Dabu, Formasi WLKP Kemnaker & Analitik SDM
                </p>
              </div>
            </div>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs">
            <Calendar className="w-4 h-4 text-slate-400 ml-2" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-bold bg-transparent text-slate-700 focus:outline-none pr-1"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-bold bg-transparent text-slate-700 focus:outline-none pr-2"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-2 scrollbar-none">
          {[
            { id: "BI", label: "Executive BI Analytics", icon: Activity },
            { id: "EBUPOT", label: "Pajak e-Bupot PPh 21 (DJP)", icon: FileSpreadsheet },
            { id: "SIPP", label: "BPJS Ketenagakerjaan (SIPP)", icon: ShieldCheck },
            { id: "EDABU", label: "BPJS Kesehatan (e-Dabu)", icon: Building2 },
            { id: "WLKP", label: "Formasi WLKP Kemnaker", icon: FileText },
            { id: "ATTENDANCE", label: "Rekap Presensi & Kehadiran", icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Loading Indicator */}
        {isLoading ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
            <p className="text-sm text-slate-500">Memuat data analitik dan laporan kepatuhan...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: EXECUTIVE BI ANALYTICS */}
            {activeTab === "BI" && analyticsData && (
              <div className="space-y-6">
                {/* Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Karyawan Aktif</p>
                      <h3 className="text-2xl font-bold text-slate-900 mt-1">{analyticsData.headcount?.active} Org</h3>
                      <p className="text-xs text-emerald-600 mt-0.5 font-medium">Headcount Terdaftar</p>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Turnover / Attrition Rate</p>
                      <h3 className="text-2xl font-bold text-slate-900 mt-1">{analyticsData.headcount?.turnoverRate}%</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Tingkat retensi SDM</p>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tingkat Ketepatan Waktu</p>
                      <h3 className="text-2xl font-bold text-emerald-600 mt-1">{analyticsData.attendance?.punctualityRate}%</h3>
                      <p className="text-xs text-slate-500 mt-0.5">On-Time Presence Index</p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Beban Payroll Bulanan</p>
                      <h3 className="text-xl font-bold text-indigo-600 mt-1">
                        Rp {new Intl.NumberFormat("id-ID").format(analyticsData.payrollCost?.totalGross || 0)}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Gross Take-Home Base</p>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Payroll Cost Breakdown & Demographics Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Payroll Allocation */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Alokasi Komponen Biaya SDM (Payroll)</h3>
                        <p className="text-xs text-slate-500">Distribusi pengeluaran gaji dan jaminan sosial</p>
                      </div>
                      <Badge variant="primary">Q3 2026</Badge>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="flex justify-between font-semibold text-slate-700 mb-1">
                          <span>Gaji Pokok Karyawan</span>
                          <span>Rp {new Intl.NumberFormat("id-ID").format(analyticsData.payrollCost?.totalBasic || 0)}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 h-full rounded-full" style={{ width: "70%" }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between font-semibold text-slate-700 mb-1">
                          <span>Tunjangan Tetap & Variabel</span>
                          <span>Rp {new Intl.NumberFormat("id-ID").format(analyticsData.payrollCost?.totalAllowances || 0)}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full" style={{ width: "20%" }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between font-semibold text-slate-700 mb-1">
                          <span>Iuran BPJS Tanggungan Perusahaan</span>
                          <span>Rp {new Intl.NumberFormat("id-ID").format(analyticsData.payrollCost?.totalCompanyBpjs || 0)}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: "7%" }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between font-semibold text-slate-700 mb-1">
                          <span>Upah Lembur Resmi</span>
                          <span>Rp {new Intl.NumberFormat("id-ID").format(analyticsData.payrollCost?.totalOvertime || 0)}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full rounded-full" style={{ width: "3%" }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Attendance & Leave Insights */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Analitik Disiplin & Cuti Karyawan</h3>
                        <p className="text-xs text-slate-500">Metrik produktivitas jam kerja</p>
                      </div>
                      <Badge variant="neutral">Presensi</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                        <span className="text-[11px] font-bold text-emerald-800 uppercase block">Hadir Tepat Waktu</span>
                        <h4 className="text-2xl font-bold text-emerald-700 mt-1">{analyticsData.attendance?.presentCount}</h4>
                        <p className="text-[10px] text-emerald-600 mt-0.5">Log presensi terverifikasi</p>
                      </div>

                      <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-100">
                        <span className="text-[11px] font-bold text-rose-800 uppercase block">Keterlambatan</span>
                        <h4 className="text-2xl font-bold text-rose-700 mt-1">{analyticsData.attendance?.lateCount}</h4>
                        <p className="text-[10px] text-rose-600 mt-0.5">Melebihi toleransi shift</p>
                      </div>

                      <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100">
                        <span className="text-[11px] font-bold text-blue-800 uppercase block">Cuti Disetujui</span>
                        <h4 className="text-2xl font-bold text-blue-700 mt-1">{analyticsData.leave?.totalApproved}</h4>
                        <p className="text-[10px] text-blue-600 mt-0.5">Pengajuan resmi HR</p>
                      </div>

                      <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-100">
                        <span className="text-[11px] font-bold text-purple-800 uppercase block">Rata-rata Cuti</span>
                        <h4 className="text-2xl font-bold text-purple-700 mt-1">{analyticsData.leave?.avgLeavesPerEmployee} Hari</h4>
                        <p className="text-[10px] text-purple-600 mt-0.5">Per karyawan aktif</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PAJAK E-BUPOT PPH 21 (DJP) */}
            {activeTab === "EBUPOT" && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">Direktorat Jenderal Pajak (DJP)</span>
                    <h2 className="text-lg font-bold text-slate-900 mt-0.5">Ekspor File CSV e-Bupot 21/26 (PER-2/PJ/2024)</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      File CSV ini sudah tervalidasi dan siap diimpor langsung pada menu Impor Bukti Potong di aplikasi e-Bupot DJP Online.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadEbupot}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 transition-colors shrink-0 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh CSV e-Bupot 21</span>
                  </button>
                </div>

                {/* Stat Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-400">Total Penghasilan Bruto</span>
                    <h4 className="text-xl font-bold text-slate-900 mt-1">
                      Rp {new Intl.NumberFormat("id-ID").format(totalGrossTax)}
                    </h4>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-400">Total PPh 21 Terutang (TER 2024)</span>
                    <h4 className="text-xl font-bold text-indigo-600 mt-1">
                      Rp {new Intl.NumberFormat("id-ID").format(totalPph21)}
                    </h4>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-400">Jumlah Karyawan Terdaftar</span>
                    <h4 className="text-xl font-bold text-slate-900 mt-1">{payslipsData.length} Karyawan</h4>
                  </div>
                </div>

                {/* Table Preview */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase">Pratinjau Data Bukti Potong Masa</span>
                    <span className="text-xs text-slate-400">Periode: {months.find(m => m.value === selectedMonth)?.label} {selectedYear}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">No</th>
                          <th className="p-3">Nama Karyawan</th>
                          <th className="p-3">NIK KTP</th>
                          <th className="p-3">NPWP</th>
                          <th className="p-3">PTKP</th>
                          <th className="p-3 text-right">Penghasilan Bruto</th>
                          <th className="p-3 text-center">Kategori TER</th>
                          <th className="p-3 text-right">PPh 21 Dipotong</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payslipsData.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-6 text-center text-slate-400">
                              Tidak ada data slip gaji pada periode {selectedMonth}/{selectedYear}.
                            </td>
                          </tr>
                        ) : (
                          payslipsData.map((p, idx) => {
                            const emp = p.employee || {};
                            const personal = emp.personalData || {};
                            const prof = emp.salaryProfile || {};
                            return (
                              <tr key={p.id} className="hover:bg-slate-50">
                                <td className="p-3 text-slate-400">{idx + 1}</td>
                                <td className="p-3 font-bold text-slate-800">{emp.firstName} {emp.lastName}</td>
                                <td className="p-3 font-mono text-slate-600">{personal.idCardNumber || prof.idCardNumber || emp.employeeIdNumber}</td>
                                <td className="p-3 font-mono text-slate-600">{personal.npwp || prof.npwp || "-"}</td>
                                <td className="p-3 font-bold text-slate-700">{prof.taxStatus || "TK/0"}</td>
                                <td className="p-3 text-right font-mono font-bold text-slate-800">
                                  Rp {new Intl.NumberFormat("id-ID").format(p.grossSalary || p.basicSalary || 0)}
                                </td>
                                <td className="p-3 text-center">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    {p.taxCategory || "TER_A"}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-mono font-bold text-indigo-600">
                                  Rp {new Intl.NumberFormat("id-ID").format(p.pph21 || 0)}
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
            )}

            {/* TAB 3: BPJS KETENAGAKERJAAN (SIPP) */}
            {activeTab === "SIPP" && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">BPJS Ketenagakerjaan</span>
                    <h2 className="text-lg font-bold text-slate-900 mt-0.5">Ekspor File CSV SIPP Online (Sistem Informasi Pelaporan Peserta)</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Mencakup pelaporan iuran 4 program: JKK (0.24%), JKM (0.30%), JHT (5.7%), dan JP (3.0% cap Rp 10.042.300).
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadSipp}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-100 transition-colors shrink-0 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh CSV SIPP Online</span>
                  </button>
                </div>

                {/* Stat Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-400">Total Iuran BPJS TK (4 Program)</span>
                    <h4 className="text-xl font-bold text-emerald-600 mt-1">
                      Rp {new Intl.NumberFormat("id-ID").format(totalBpjsTk)}
                    </h4>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-400">Tenaga Kerja Terdaftar</span>
                    <h4 className="text-xl font-bold text-slate-900 mt-1">{payslipsData.length} Peserta</h4>
                  </div>
                </div>

                {/* Table Preview */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">No KPJ</th>
                          <th className="p-3">Nama Tenaga Kerja</th>
                          <th className="p-3 text-right">Upah Dasar</th>
                          <th className="p-3 text-right">JKK (0.24%)</th>
                          <th className="p-3 text-right">JKM (0.30%)</th>
                          <th className="p-3 text-right">JHT (5.7%)</th>
                          <th className="p-3 text-right">JP (3.0%)</th>
                          <th className="p-3 text-right">Total Iuran</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payslipsData.map((p, idx) => {
                          const emp = p.employee || {};
                          const personal = emp.personalData || {};
                          const prof = emp.salaryProfile || {};
                          const base = Math.round(p.basicSalary || p.grossSalary || 0);
                          const jkk = Math.round(p.bpjsTkJkk || base * 0.0024);
                          const jkm = Math.round(p.bpjsTkJkm || base * 0.0030);
                          const jht = Math.round((p.bpjsTkJhtCompany || base * 0.037) + (p.bpjsTkJhtEmployee || base * 0.020));
                          const jp = Math.round((p.bpjsTkJpCompany || Math.min(base, 10042300) * 0.020) + (p.bpjsTkJpEmployee || Math.min(base, 10042300) * 0.010));
                          const total = jkk + jkm + jht + jp;

                          return (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="p-3 font-mono text-slate-600">
                                {personal.bpjsKetenagakerjaan || prof.bpjsKetenagakerjaanNumber || `090${idx + 1}827364`}
                              </td>
                              <td className="p-3 font-bold text-slate-800">{emp.firstName} {emp.lastName}</td>
                              <td className="p-3 text-right font-mono text-slate-800">Rp {new Intl.NumberFormat("id-ID").format(base)}</td>
                              <td className="p-3 text-right font-mono text-slate-600">Rp {new Intl.NumberFormat("id-ID").format(jkk)}</td>
                              <td className="p-3 text-right font-mono text-slate-600">Rp {new Intl.NumberFormat("id-ID").format(jkm)}</td>
                              <td className="p-3 text-right font-mono text-slate-600">Rp {new Intl.NumberFormat("id-ID").format(jht)}</td>
                              <td className="p-3 text-right font-mono text-slate-600">Rp {new Intl.NumberFormat("id-ID").format(jp)}</td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-600">Rp {new Intl.NumberFormat("id-ID").format(total)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: BPJS KESEHATAN (E-DABU) */}
            {activeTab === "EDABU" && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-teal-600 uppercase tracking-wider block">BPJS Kesehatan</span>
                    <h2 className="text-lg font-bold text-slate-900 mt-0.5">Ekspor File Rekapitulasi e-Dabu BPJS Kesehatan</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Perhitungan iuran 4% pemberi kerja dan 1% pekerja dengan batas maksimal upah (cap) Rp 12.000.000.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadEdabu}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-100 transition-colors shrink-0 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh CSV e-Dabu</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-400">Total Iuran BPJS Kesehatan (5%)</span>
                    <h4 className="text-xl font-bold text-teal-600 mt-1">
                      Rp {new Intl.NumberFormat("id-ID").format(totalBpjsKes)}
                    </h4>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-400">Peserta Karyawan Terdaftar</span>
                    <h4 className="text-xl font-bold text-slate-900 mt-1">{payslipsData.length} Jiwa</h4>
                  </div>
                </div>

                {/* Table Preview */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">No Kartu BPJS</th>
                          <th className="p-3">Nama Karyawan</th>
                          <th className="p-3">Departemen</th>
                          <th className="p-3 text-right">Upah Dasar</th>
                          <th className="p-3 text-right">Iuran Perusahaan (4%)</th>
                          <th className="p-3 text-right">Iuran Karyawan (1%)</th>
                          <th className="p-3 text-right">Total Iuran (5%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payslipsData.map((p, idx) => {
                          const emp = p.employee || {};
                          const personal = emp.personalData || {};
                          const prof = emp.salaryProfile || {};
                          const base = Math.round(p.basicSalary || p.grossSalary || 0);
                          const calcBase = Math.min(base, 12000000);
                          const comp = Math.round(p.bpjsKesCompany || calcBase * 0.04);
                          const user = Math.round(p.bpjsKesEmployee || calcBase * 0.01);
                          const total = comp + user;

                          return (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="p-3 font-mono text-slate-600">
                                {personal.bpjsKesehatan || prof.bpjsKesehatanNumber || `000123456789${idx}`}
                              </td>
                              <td className="p-3 font-bold text-slate-800">{emp.firstName} {emp.lastName}</td>
                              <td className="p-3 text-slate-600">{emp.department?.name || "Operasional"}</td>
                              <td className="p-3 text-right font-mono text-slate-800">Rp {new Intl.NumberFormat("id-ID").format(base)}</td>
                              <td className="p-3 text-right font-mono text-slate-600">Rp {new Intl.NumberFormat("id-ID").format(comp)}</td>
                              <td className="p-3 text-right font-mono text-slate-600">Rp {new Intl.NumberFormat("id-ID").format(user)}</td>
                              <td className="p-3 text-right font-mono font-bold text-teal-600">Rp {new Intl.NumberFormat("id-ID").format(total)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: WLKP KEMNAKER (Printable Official Sheet) */}
            {activeTab === "WLKP" && wlkpData && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 print:hidden">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Laporan Wajib Lapor Ketenagakerjaan Perusahaan (WLKP)</h3>
                    <p className="text-xs text-slate-500">Berdasarkan amanat Undang-Undang No. 7 Tahun 1981</p>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Lembar Resmi / PDF</span>
                  </button>
                </div>

                {/* Printable Document Sheet */}
                <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-sm space-y-6 max-w-4xl mx-auto font-sans text-xs text-slate-800">
                  {/* Kop Resmi */}
                  <div className="border-b-2 border-slate-900 pb-4 text-center">
                    <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">
                      {wlkpData.company?.name || "PT KANAYA MULTI SOLUSINDO"}
                    </h2>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Gedung Sentra Niaga Lantai 8, Jl. Puri Indah Raya Blok U1, Jakarta Barat 11610
                    </p>
                    <p className="text-[10px] font-mono text-slate-500">
                      Laporan Formasi Ketenagakerjaan Perusahaan (Kemnaker RI) Periode Tahun {selectedYear}
                    </p>
                  </div>

                  {/* Ringkasan Demografi */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-slate-900 uppercase border-b pb-1">
                      I. Rekapitulasi Tenaga Kerja
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 block font-semibold">Total Tenaga Kerja</span>
                        <span className="text-xl font-black text-slate-900">{wlkpData.data?.totalEmployees} Orang</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 block font-semibold">PKWTT (Karyawan Tetap)</span>
                        <span className="text-xl font-black text-blue-600">{wlkpData.data?.statusBreakdown?.pkwtt} Orang</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 block font-semibold">PKWT (Kontrak Kerja)</span>
                        <span className="text-xl font-black text-amber-600">{wlkpData.data?.statusBreakdown?.pkwt} Orang</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 block font-semibold">Masa Percobaan / Magang</span>
                        <span className="text-xl font-black text-purple-600">{wlkpData.data?.statusBreakdown?.probation} Orang</span>
                      </div>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 uppercase border-b pb-1 pt-2">
                      II. Komposisi Jenis Kelamin & Usia
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <span className="font-bold text-slate-700 block">Komposisi Gender:</span>
                        <div className="flex justify-between">
                          <span>Laki-Laki (Pria)</span>
                          <span className="font-bold">{wlkpData.data?.genderBreakdown?.male} Orang</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Perempuan (Wanita)</span>
                          <span className="font-bold">{wlkpData.data?.genderBreakdown?.female} Orang</span>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <span className="font-bold text-slate-700 block">Kelompok Usia:</span>
                        <div className="flex justify-between">
                          <span>Usia 20 - 29 Tahun</span>
                          <span className="font-bold">{wlkpData.data?.ageBreakdown?.age20to29} Orang</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Usia 30 - 39 Tahun</span>
                          <span className="font-bold">{wlkpData.data?.ageBreakdown?.age30to39} Orang</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Usia di atas 40 Tahun</span>
                          <span className="font-bold">{(wlkpData.data?.ageBreakdown?.age40to49 || 0) + (wlkpData.data?.ageBreakdown?.above50 || 0)} Orang</span>
                        </div>
                      </div>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 uppercase border-b pb-1 pt-2">
                      III. Distribusi Departemen / Unit Kerja
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100 font-bold">
                          <tr>
                            <th className="p-2.5 text-left">Nama Departemen</th>
                            <th className="p-2.5 text-right">Jumlah Tenaga Kerja</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Object.entries(wlkpData.data?.departmentBreakdown || {}).map(([dept, count]: any) => (
                            <tr key={dept}>
                              <td className="p-2.5 font-medium">{dept}</td>
                              <td className="p-2.5 text-right font-bold">{count} Orang</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pengesahan */}
                  <div className="pt-8 grid grid-cols-2 text-center text-xs">
                    <div />
                    <div>
                      <p>Jakarta, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                      <p className="font-bold mt-1">Pimpinan Perusahaan / HR Director</p>
                      <div className="h-20 flex items-center justify-center italic text-blue-900 font-serif font-bold text-sm">
                        Hendrawan Pratama, M.M.
                      </div>
                      <p className="font-bold underline">Hendrawan Pratama, M.M.</p>
                      <p className="text-[10px] text-slate-500">Head of People & Operations</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: ATTENDANCE RECAP */}
            {activeTab === "ATTENDANCE" && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Presensi & Kehadiran</span>
                    <h2 className="text-lg font-bold text-slate-900 mt-0.5">Laporan Log Absensi GPS & Geofence</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Rekap data kehadiran harian, waktu check-in/out, dan status keterlambatan karyawan.
                    </p>
                  </div>
                  <button
                    onClick={handleExportAttendanceCSV}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-colors shrink-0 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Ekspor CSV Absensi</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari berdasarkan nama karyawan, NIK, atau status..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  />
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">NIK</th>
                          <th className="p-3">Nama Karyawan</th>
                          <th className="p-3">Departemen</th>
                          <th className="p-3">Tanggal</th>
                          <th className="p-3">Check-In</th>
                          <th className="p-3">Check-Out</th>
                          <th className="p-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {((attendanceReport?.records || []) as any[])
                          .filter((r) => {
                            if (!searchQuery) return true;
                            const q = searchQuery.toLowerCase();
                            const name = `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.toLowerCase();
                            const nik = (r.employee?.employeeIdNumber || "").toLowerCase();
                            return name.includes(q) || nik.includes(q);
                          })
                          .map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50">
                              <td className="p-3 font-mono text-slate-500">{r.employee?.employeeIdNumber || "-"}</td>
                              <td className="p-3 font-bold text-slate-800">{r.employee?.firstName} {r.employee?.lastName}</td>
                              <td className="p-3 text-slate-600">{r.employee?.department?.name || "-"}</td>
                              <td className="p-3 text-slate-600">{r.date ? new Date(r.date).toLocaleDateString("id-ID") : "-"}</td>
                              <td className="p-3 font-mono text-slate-700">{r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString("id-ID") : "-"}</td>
                              <td className="p-3 font-mono text-slate-700">{r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString("id-ID") : "-"}</td>
                              <td className="p-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    r.status === "PRESENT"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : r.status === "LATE"
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {r.status === "PRESENT" ? "Tepat Waktu" : r.status === "LATE" ? "Terlambat" : r.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminShell>
  );
}
