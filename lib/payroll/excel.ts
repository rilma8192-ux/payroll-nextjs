import * as XLSX from "xlsx";
import { EmployeeInput, ParsedExcelFile, PayrollResult } from "./types";
import { checkMissingHeaders } from "./validation";
import { RESULT_EXPORT_HEADERS, rowFromExcelRecord } from "./columns";
import { SAMPLE_EMPLOYEES } from "./sampleData";

/**
 * excel.ts
 * -----------------------------------------------------------------------
 * 브라우저에서 실제로 Excel 파일을 읽고/쓰는 함수 모음 (SheetJS 사용).
 * 업로드된 원본 Excel은 서버로 전송되지 않으며, 브라우저 메모리에서만
 * 처리된다.
 * -----------------------------------------------------------------------
 */

export class ExcelParseError extends Error {}

/** 사용자가 업로드한 .xlsx 파일을 읽어 내부 스키마 행 배열로 변환한다. */
export async function parseExcelFile(file: File): Promise<ParsedExcelFile> {
  let workbook: XLSX.WorkBook;
  try {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { type: "array" });
  } catch {
    throw new ExcelParseError("Excel 파일을 읽을 수 없습니다. 파일이 손상되었거나 .xlsx 형식이 아닙니다.");
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new ExcelParseError("업로드한 파일에 시트가 없습니다.");
  }
  const worksheet = workbook.Sheets[sheetName];

  const headerRows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, raw: true });
  const headerRow = (headerRows[0] ?? []).map((h) => String(h ?? "").trim());

  if (headerRow.length === 0) {
    throw new ExcelParseError("업로드한 파일이 비어 있습니다.");
  }

  const missing = checkMissingHeaders(headerRow);
  if (missing.length > 0) {
    throw new ExcelParseError(`필수 컬럼이 없습니다: ${missing.join(", ")}`);
  }

  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: null, raw: true });
  if (records.length === 0) {
    throw new ExcelParseError("업로드한 파일에 직원 데이터가 없습니다.");
  }

  const rows: EmployeeInput[] = records.map(rowFromExcelRecord);

  return { fileName: file.name, columnCount: headerRow.length, rows };
}

/** 발표용 샘플 Excel(sample_payroll.xlsx)을 생성하여 즉시 다운로드한다. */
export function downloadSampleExcel(): void {
  const worksheet = XLSX.utils.json_to_sheet(SAMPLE_EMPLOYEES);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "급여입력자료");
  XLSX.writeFile(workbook, "sample_payroll.xlsx");
}

/** 급여 산출 결과를 실제 .xlsx 파일로 생성하여 다운로드한다. */
export function downloadResultExcel(results: PayrollResult[], fileName = "payroll_result.xlsx"): void {
  const exportRows = results.map((r) => {
    const record: Record<(typeof RESULT_EXPORT_HEADERS)[number], string | number> = {
      사번: r.employeeNumber,
      성명: r.employeeName,
      재직상태: r.employmentStatus,
      기본급: r.baseSalary,
      직책수당: r.positionAllowance,
      식대: r.mealAllowance,
      기타고정수당: r.fixedAllowance,
      연장근로시간: r.overtimeHours,
      연장근로수당: r.overtimePay,
      인센티브: r.incentive,
      성과급: r.bonus,
      기타지급: r.otherPayment,
      총지급액: r.grossPay,
      국민연금: r.pension,
      건강보험: r.healthInsurance,
      고용보험: r.employmentInsurance,
      소득세: r.incomeTax,
      지방소득세: r.localIncomeTax,
      기타공제: r.otherDeduction,
      총공제액: r.totalDeductions,
      최종지급액: r.netPay,
      전월총지급액: r.previousGrossPay,
      변동금액: r.changeAmount ?? "",
      변동률: r.changeRate !== null ? Number(r.changeRate.toFixed(1)) : "",
      검증상태: r.status,
      확인필요사유: r.reasons.join("; "),
    };
    return record;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: [...RESULT_EXPORT_HEADERS] });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "급여산출결과");
  XLSX.writeFile(workbook, fileName);
}
