export interface DisbursalEmployeeItem {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  netSalary: number;
  email?: string;
}

export type BankFormat = "BCA" | "MANDIRI" | "BRI" | "BNI" | "GENERIC_CSV";

/**
 * Formats payroll payment data for bank upload
 */
export function generateBankDisbursalFile(
  format: BankFormat,
  companyName: string,
  periodName: string,
  items: DisbursalEmployeeItem[]
): { fileName: string; contentType: string; content: string } {
  const sanitizedPeriod = periodName.replace(/[^a-zA-Z0-9_-]/g, "_");

  switch (format) {
    case "BCA": {
      // BCA Corporate Payroll / KlikBCA Bisnis Format
      // Format: [Account Number],[Amount],[Employee Name],[Remark]
      const lines: string[] = [];
      for (const item of items) {
        const acc = (item.bankAccountNumber || "").replace(/[^0-9]/g, "");
        const amt = Math.round(item.netSalary);
        const name = (item.bankAccountHolder || item.employeeName).substring(0, 40).replace(/,/g, " ");
        const remark = `Gaji ${periodName}`.substring(0, 30).replace(/,/g, " ");
        lines.push(`${acc},${amt},${name},${remark}`);
      }
      return {
        fileName: `BCA_PAYROLL_${sanitizedPeriod}.txt`,
        contentType: "text/plain",
        content: lines.join("\r\n"),
      };
    }

    case "MANDIRI": {
      // Mandiri Cash Management (MCM) Format
      // Format: AccountNumber,BeneficiaryName,Amount,Currency,Remark
      const lines: string[] = ["AccountNumber,BeneficiaryName,Amount,Currency,Remark"];
      for (const item of items) {
        const acc = (item.bankAccountNumber || "").replace(/[^0-9]/g, "");
        const amt = Math.round(item.netSalary);
        const name = (item.bankAccountHolder || item.employeeName).substring(0, 40).replace(/,/g, " ");
        const remark = `Payroll ${periodName}`.substring(0, 30).replace(/,/g, " ");
        lines.push(`"${acc}","${name}",${amt},"IDR","${remark}"`);
      }
      return {
        fileName: `MANDIRI_PAYROLL_${sanitizedPeriod}.csv`,
        contentType: "text/csv",
        content: lines.join("\r\n"),
      };
    }

    case "BRI": {
      // BRI Corporate Mass Payout Format
      const lines: string[] = ["Rekening,Nama,Nominal,Keterangan"];
      for (const item of items) {
        const acc = (item.bankAccountNumber || "").replace(/[^0-9]/g, "");
        const amt = Math.round(item.netSalary);
        const name = (item.bankAccountHolder || item.employeeName).substring(0, 40).replace(/,/g, " ");
        lines.push(`"${acc}","${name}",${amt},"Gaji ${periodName}"`);
      }
      return {
        fileName: `BRI_PAYROLL_${sanitizedPeriod}.csv`,
        contentType: "text/csv",
        content: lines.join("\r\n"),
      };
    }

    case "BNI": {
      // BNI Direct Mass Payout Format
      const lines: string[] = ["BENEFICIARY_ACC,BENEFICIARY_NAME,AMOUNT,REMARK"];
      for (const item of items) {
        const acc = (item.bankAccountNumber || "").replace(/[^0-9]/g, "");
        const amt = Math.round(item.netSalary);
        const name = (item.bankAccountHolder || item.employeeName).substring(0, 40).replace(/,/g, " ");
        lines.push(`"${acc}","${name}",${amt},"Payroll ${periodName}"`);
      }
      return {
        fileName: `BNI_PAYROLL_${sanitizedPeriod}.csv`,
        contentType: "text/csv",
        content: lines.join("\r\n"),
      };
    }

    case "GENERIC_CSV":
    default: {
      // Comprehensive Generic Payroll Summary CSV
      const headers = [
        "No",
        "ID Karyawan",
        "Nama Karyawan",
        "Bank",
        "Nomor Rekening",
        "Atas Nama",
        "Gaji Bersih (IDR)",
        "Berita Acara",
      ];
      const rows = items.map((item, idx) => [
        idx + 1,
        `"${item.employeeNumber}"`,
        `"${item.employeeName}"`,
        `"${item.bankName || "BCA"}"`,
        `"${item.bankAccountNumber}"`,
        `"${item.bankAccountHolder || item.employeeName}"`,
        Math.round(item.netSalary),
        `"Gaji ${periodName} - ${companyName}"`,
      ]);

      const content = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
      return {
        fileName: `REKAP_DISBURSAL_${sanitizedPeriod}.csv`,
        contentType: "text/csv",
        content,
      };
    }
  }
}
