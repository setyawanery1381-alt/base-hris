"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { useTheme } from "@/components/layout/theme-provider";
import {
  Banknote,
  ArrowLeft,
  Printer,
  ShieldCheck,
  Building2,
  Calendar,
  CreditCard,
  User,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function EmployeePayslipDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const payslipId = params?.id as string;

  const [session, setSession] = useState<any>(null);
  const [payslip, setPayslip] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((r) => r.json())
      .then((d) => setSession(d.user))
      .catch(console.error);

    if (payslipId) {
      fetch(`/api/v1/payroll/payslips?id=${payslipId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.payslip) setPayslip(d.payslip);
          setIsLoading(false);
        })
        .catch((e) => {
          console.error(e);
          setIsLoading(false);
        });
    }
  }, [payslipId]);

  if (isLoading) {
    return (
      <MobileShell user={session}>
        <div className="p-8 text-center text-xs text-slate-400">Memuat slip gaji...</div>
      </MobileShell>
    );
  }

  if (!payslip) {
    return (
      <MobileShell user={session}>
        <div className="p-8 text-center text-xs text-slate-500 space-y-3">
          <p>Slip gaji tidak ditemukan atau belum diterbitkan.</p>
          <button
            onClick={() => router.push("/employee/payslips")}
            className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700 text-xs"
          >
            Kembali
          </button>
        </div>
      </MobileShell>
    );
  }

  const emp = payslip.employee;
  const company = payslip.company;
  const period = payslip.period;
  const earnings = (payslip.items || []).filter((i: any) => i.type === "EARNING");
  const deductions = (payslip.items || []).filter((i: any) => i.type === "DEDUCTION");
  const benefits = (payslip.items || []).filter((i: any) => i.type === "BENEFIT");

  const totalEarnings = earnings.reduce((acc: number, i: any) => acc + i.amount, 0);
  const totalDeductions = deductions.reduce((acc: number, i: any) => acc + i.amount, 0);

  return (
    <MobileShell user={session}>
      <div className="bg-slate-50 min-h-full pb-10 print:bg-white print:p-0">
        {/* Sticky Action Bar */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between print:hidden">
          <button
            onClick={() => router.push("/employee/payslips")}
            className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Daftar Slip</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>

        {/* Payslip Document Card */}
        <div className="p-4 print:p-0">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-5 print:border-none print:shadow-none print:p-0">
            {/* Document Header */}
            <div className="text-center pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-primary text-white font-black text-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                {company?.branding?.appName?.charAt(0) || "B"}
              </div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                {company?.name || "BASE HRIS"}
              </h2>
              <h1 className="text-base font-black text-slate-900 mt-1">
                SLIP GAJI KARYAWAN
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {period?.name || `Bulan ${payslip.periodMonth}/${payslip.periodYear}`}
              </p>
              <div className="mt-2 inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 tracking-wider">
                RAHASIA & PRIBADI (CONFIDENTIAL)
              </div>
            </div>

            {/* Employee Metadata Grid */}
            <div className="bg-slate-50 rounded-2xl p-3.5 text-xs text-slate-700 space-y-2 border border-slate-100">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">NAMA KARYAWAN</span>
                  <span className="font-bold text-slate-900">
                    {emp?.firstName} {emp?.lastName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">NOMOR INDUK (NIK)</span>
                  <span className="font-mono font-bold text-slate-900">
                    {emp?.employeeIdNumber}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">DEPARTEMEN / JABATAN</span>
                  <span className="font-medium text-slate-800">
                    {emp?.department?.name || "-"} • {emp?.position?.name || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">STATUS PAJAK (PTKP)</span>
                  <span className="font-bold text-indigo-600">
                    {payslip.taxCategory || emp?.salaryProfile?.taxStatus || "TK/0"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 block font-semibold">REKENING PEMBAYARAN</span>
                  <span className="font-medium text-slate-800">
                    {emp?.salaryProfile?.bankName || emp?.personalData?.bankName || "BCA"} -{" "}
                    {emp?.salaryProfile?.bankAccountNumber || emp?.personalData?.bankAccountNumber || "-"} (a.n.{" "}
                    {emp?.salaryProfile?.bankAccountHolder || `${emp?.firstName} ${emp?.lastName}`})
                  </span>
                </div>
              </div>
            </div>

            {/* Section 1: PENERIMAAN (Earnings) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-emerald-100">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  1. PENERIMAAN (EARNINGS)
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                {earnings.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-1">
                    <span className="text-slate-700">
                      {item.componentName}
                      {item.description && (
                        <span className="text-[10px] text-slate-400 block">
                          {item.description}
                        </span>
                      )}
                    </span>
                    <span className="font-bold text-slate-900">
                      Rp {item.amount.toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 font-black text-slate-900">
                  <span>Total Penerimaan</span>
                  <span className="text-emerald-600">
                    Rp {totalEarnings.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: POTONGAN (Deductions) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-rose-100">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                  2. POTONGAN (DEDUCTIONS)
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                {deductions.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-1">
                    <span className="text-slate-700">
                      {item.componentName}
                      {item.description && (
                        <span className="text-[10px] text-slate-400 block">
                          {item.description}
                        </span>
                      )}
                    </span>
                    <span className="font-bold text-rose-600">
                      -Rp {item.amount.toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 font-black text-slate-900">
                  <span>Total Potongan</span>
                  <span className="text-rose-600">
                    -Rp {totalDeductions.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

            {/* Net Take-Home Pay Box */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-4 text-white shadow-md flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider block">
                  GAJI BERSIH (TAKE-HOME PAY)
                </span>
                <span className="text-xs text-white/80">Jumlah ditransfer ke rekening</span>
              </div>
              <span className="text-xl font-black tracking-tight">
                Rp {payslip.netSalary.toLocaleString("id-ID")}
              </span>
            </div>

            {/* Section 3: MANFAAT PERUSAHAAN (Benefits) */}
            {benefits.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  3. KONTRIBUSI / BENEFIT PERUSAHAAN (NON-TUNAI)
                </span>
                <div className="space-y-1 text-xs text-slate-600">
                  {benefits.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between py-0.5">
                      <span>{item.componentName}</span>
                      <span className="font-medium text-blue-600">
                        Rp {item.amount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Signoff */}
            <div className="pt-4 border-t border-slate-100 text-center text-[10px] text-slate-400">
              <p>Dokumen ini diterbitkan secara elektronik oleh sistem {theme.appName || "BASE HRIS"}.</p>
              <p className="mt-0.5">Tidak memerlukan tanda tangan basah.</p>
            </div>
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
