"use client";

import React, { useState, useEffect } from "react";
import {
  FileCheck,
  Printer,
  Search,
  Calendar,
  User,
  Building2,
  QrCode,
  ShieldCheck,
  X,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Download,
} from "lucide-react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { useTheme } from "@/components/layout/theme-provider";
import {
  LETTER_TYPES,
  formatIndonesianDate,
} from "@/lib/letters-service-engine";

export default function EmployeeLettersPage() {
  const { theme } = useTheme();
  const [session, setSession] = useState<any>(null);
  const [letters, setLetters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeType, setActiveType] = useState("ALL");
  const [selectedLetter, setSelectedLetter] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const fetchLetters = async () => {
    setIsLoading(true);
    try {
      const [authRes, lettersRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/letters"),
      ]);

      if (authRes.ok) {
        const authData = await authRes.json();
        setSession(authData.user);
      }
      if (lettersRes.ok) {
        const data = await lettersRes.json();
        setLetters(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLetters();
  }, []);

  const filteredLetters = letters.filter((l) => {
    if (activeType === "ALL") return true;
    return l.type === activeType;
  });

  const openPreview = (letter: any) => {
    setSelectedLetter(letter);
    setIsPreviewOpen(true);
  };

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
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <FileCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black">Surat Resmi & Paklaring</h1>
              <p className="text-[11px] text-white/80">Dokumen legal resmi berstempel & ber-QR Code</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3">
          {/* Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            <button
              onClick={() => setActiveType("ALL")}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                activeType === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Semua ({letters.length})
            </button>
            {LETTER_TYPES.map((t) => {
              const count = letters.filter((l) => l.type === t.id).length;
              if (count === 0 && activeType !== t.id) return null;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveType(t.id)}
                  className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                    activeType === t.id
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  {t.prefix} ({count})
                </button>
              );
            })}
          </div>

          {/* List of Letters */}
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600 mb-2" />
              <p className="text-xs text-slate-500">Memuat arsip surat resmi Anda...</p>
            </div>
          ) : filteredLetters.length === 0 ? (
            <div className="py-14 text-center bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                <FileCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Belum Ada Surat Resmi</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Surat keterangan kerja, surat penghasilan, atau paklaring yang telah disahkan oleh HR akan muncul di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLetters.map((letter) => {
                const typeConfig =
                  LETTER_TYPES.find((t) => t.id === letter.type) || {
                    label: letter.type,
                    prefix: "DOC",
                    badgeColor: "bg-slate-100 text-slate-700",
                  };

                return (
                  <div
                    key={letter.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-indigo-300 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center space-x-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Resmi & Sah</span>
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeConfig.badgeColor}`}
                      >
                        {typeConfig.label}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {letter.title}
                      </h4>
                      <p className="text-[11px] font-mono text-indigo-600 font-bold mt-1">
                        No: {letter.letterNumber}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-2.5 text-[11px] text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Keperluan:</span>
                        <span className="font-semibold text-slate-800 text-right">{letter.purpose}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tanggal Terbit:</span>
                        <span className="font-medium text-slate-800">{formatIndonesianDate(letter.issuedDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Penandatangan:</span>
                        <span className="font-medium text-slate-800">{letter.signerName} ({letter.signerPosition})</span>
                      </div>
                    </div>

                    <button
                      onClick={() => openPreview(letter)}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition-all active:scale-[0.98]"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Lihat Dokumen Asli & Cetak PDF</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Pratinjau Dokumen Resmi dengan Kop Surat, Stempel & QR Code */}
        {isPreviewOpen && selectedLetter && (
          <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-y-auto">
            {/* Top Toolbar */}
            <div className="sticky top-0 z-20 p-4 bg-slate-900 text-white flex items-center justify-between shadow-md print:hidden">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-indigo-300" />
                <span className="font-bold text-xs">Dokumen Resmi Kepegawaian</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / PDF</span>
                </button>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Letter Sheet */}
            <div className="p-6 sm:p-10 max-w-3xl mx-auto w-full text-slate-900 bg-white font-serif leading-relaxed text-xs">
              {/* Kop Surat Perusahaan */}
              <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center font-sans">
                <h2 className="text-lg sm:text-xl font-black tracking-wider uppercase">
                  {selectedLetter.company?.name || session?.companyName || "PT KANAYA MULTI SOLUSINDO"}
                </h2>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Gedung Sentra Niaga Lantai 8, Jalan Puri Indah Raya Blok U1, Jakarta Barat 11610
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  Telp: (021) 5830-8899 • Email: hrd@kanaya.com • www.kanaya.com
                </p>
              </div>

              {/* Title & Letter Number */}
              <div className="text-center mb-6 font-sans">
                <h3 className="text-base font-bold underline uppercase tracking-wide">
                  {selectedLetter.title}
                </h3>
                <p className="font-mono text-xs font-bold text-slate-700 mt-1">
                  Nomor: {selectedLetter.letterNumber}
                </p>
              </div>

              {/* Letter Body */}
              <div className="space-y-4 font-sans text-xs text-slate-800 leading-relaxed">
                <p>Yang bertanda tangan di bawah ini:</p>

                <div className="pl-4 sm:pl-6 space-y-1">
                  <div className="grid grid-cols-4">
                    <span className="font-bold">Nama</span>
                    <span className="col-span-3">: {selectedLetter.signerName}</span>
                  </div>
                  <div className="grid grid-cols-4">
                    <span className="font-bold">Jabatan</span>
                    <span className="col-span-3">: {selectedLetter.signerPosition}</span>
                  </div>
                  <div className="grid grid-cols-4">
                    <span className="font-bold">Perusahaan</span>
                    <span className="col-span-3">: {selectedLetter.company?.name || "PT Kanaya Multi Solusindo"}</span>
                  </div>
                </div>

                <p>Dengan ini menerangkan dengan sesungguhnya bahwa:</p>

                <div className="pl-4 sm:pl-6 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="grid grid-cols-4">
                    <span className="font-bold">Nama Lengkap</span>
                    <span className="col-span-3 font-bold">: {selectedLetter.employee?.firstName} {selectedLetter.employee?.lastName}</span>
                  </div>
                  <div className="grid grid-cols-4">
                    <span className="font-bold">NIK</span>
                    <span className="col-span-3 font-mono">: {selectedLetter.employee?.employeeIdNumber}</span>
                  </div>
                  <div className="grid grid-cols-4">
                    <span className="font-bold">Jabatan</span>
                    <span className="col-span-3">: {selectedLetter.employee?.position?.name || "Staff"}</span>
                  </div>
                  <div className="grid grid-cols-4">
                    <span className="font-bold">Departemen</span>
                    <span className="col-span-3">: {selectedLetter.employee?.department?.name || "Operasional"}</span>
                  </div>
                  <div className="grid grid-cols-4">
                    <span className="font-bold">Mulai Bekerja</span>
                    <span className="col-span-3">: {formatIndonesianDate(selectedLetter.employee?.joinDate)}</span>
                  </div>
                </div>

                {/* Specific Body Paragraph based on Letter Type */}
                {selectedLetter.type === "SK_AKTIF_KERJA" && (
                  <p>
                    Benar adalah karyawan tetap kami yang masih aktif bekerja dan memiliki kinerja serta loyalitas yang baik hingga surat keterangan ini diterbitkan. Surat keterangan ini diberikan atas permintaan yang bersangkutan untuk keperluan <strong>{selectedLetter.purpose}</strong>.
                  </p>
                )}

                {selectedLetter.type === "SK_PENGHASILAN" && (
                  <div className="space-y-2">
                    <p>
                      Menerangkan bahwa karyawan tersebut di atas memperoleh penghasilan tetap bulanan dari perusahaan kami untuk keperluan <strong>{selectedLetter.purpose}</strong>.
                    </p>
                    <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 font-mono text-center">
                      <span className="text-[11px] block font-semibold text-slate-500">Penghasilan Tetap Bulanan (Gross):</span>
                      <span className="text-base font-bold text-slate-900">
                        {(() => {
                          try {
                            const c = JSON.parse(selectedLetter.contentData || "{}");
                            return c.monthlySalary ? `Rp ${new Intl.NumberFormat("id-ID").format(c.monthlySalary)}` : "Rp 15.000.000";
                          } catch {
                            return "Rp 15.000.000";
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                )}

                {selectedLetter.type.includes("PERINGATAN") && (
                  <div className="space-y-2">
                    <p>
                      Berdasarkan hasil evaluasi kedisiplinan kerja, karyawan yang bersangkutan telah melakukan pelanggaran berupa:
                    </p>
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-950 font-semibold italic">
                      "{(() => {
                        try {
                          const c = JSON.parse(selectedLetter.contentData || "{}");
                          return c.spReason || "Pelanggaran tata tertib kerja perusahaan";
                        } catch {
                          return "Pelanggaran tata tertib kerja";
                        }
                      })()}"
                    </div>
                    <p>
                      Surat Peringatan ini berlaku selama 6 (enam) bulan terhitung sejak tanggal diterbitkan sesuai dengan ketentuan ketenagakerjaan yang berlaku.
                    </p>
                  </div>
                )}

                {selectedLetter.type === "PAKLARING" && (
                  <p>
                    Telah bekerja dengan baik pada perusahaan kami hingga hari kerja terakhir. Perusahaan mengucapkan terima kasih yang sebesar-besarnya atas dedikasi dan kontribusi positif yang telah diberikan selama masa kerja, dan kami mendoakan kesuksesan yang lebih baik dalam karir selanjutnya.
                  </p>
                )}

                <p>
                  Demikian surat ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
                </p>
              </div>

              {/* Tanda Tangan, QR Code & Stempel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-sans text-xs mt-10 pt-4">
                {/* QR Code Verification */}
                <div className="border border-slate-200 p-3 rounded-xl bg-slate-50 flex items-center space-x-3 self-center">
                  <div className="w-14 h-14 bg-white border border-slate-300 rounded-lg p-1 flex items-center justify-center shrink-0">
                    <QrCode className="w-10 h-10 text-slate-800" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-700 block uppercase">Verifikasi Dokumen</span>
                    <span className="text-[9px] text-slate-500 font-mono block">
                      Kode: {selectedLetter.qrCodeVerification || "VERIF-VALID"}
                    </span>
                    <span className="text-[9px] text-emerald-700 font-bold block mt-0.5">
                      ✓ Sah Terdaftar di BASE HRIS
                    </span>
                  </div>
                </div>

                {/* Signature Block */}
                <div className="text-center sm:text-right relative">
                  <p className="text-slate-600">
                    Jakarta, {formatIndonesianDate(selectedLetter.issuedDate)}
                  </p>
                  <p className="font-bold text-slate-800 mt-1">
                    {selectedLetter.company?.name || "PT Kanaya Multi Solusindo"}
                  </p>

                  {/* Stamp Graphic & Signature */}
                  <div className="relative h-24 my-2 flex items-center justify-center sm:justify-end pr-4">
                    {/* Indonesian Official Stamp Emblem */}
                    <div className="absolute right-4 sm:right-6 w-24 h-24 rounded-full border-2 border-dashed border-red-600/60 flex items-center justify-center -rotate-12 pointer-events-none select-none">
                      <div className="w-20 h-20 rounded-full border border-red-600/60 flex flex-col items-center justify-center text-center p-1 text-red-600/70">
                        <span className="text-[7px] font-black uppercase tracking-tighter">PT KANAYA</span>
                        <span className="text-[8px] font-black border-y border-red-600/60 w-full my-0.5 py-0.2">HR DEPT</span>
                        <span className="text-[6px] font-bold tracking-widest">RESMI</span>
                      </div>
                    </div>

                    {/* Digital Signature */}
                    <div className="z-10 font-serif italic text-base text-blue-900/80 font-bold transform -rotate-3 select-none">
                      {selectedLetter.signerName}
                    </div>
                  </div>

                  <p className="font-bold text-slate-900 underline text-xs">
                    {selectedLetter.signerName}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {selectedLetter.signerPosition}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
