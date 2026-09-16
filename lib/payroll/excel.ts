import * as XLSX from "xlsx";
import { EmployeeComparison, ParsedPayrollFile, PayrollInputRow, PayrollRunSummary } from "./types";
import { checkMissingPayrollHeaders } from "./validation";
import { payrollRowFromExcelRecord, RESULT_EXPORT_HEADERS } from "./columns";
import { buildSampleDataset } from "./sampleData";
import { pct } from "./format";

/**
 * excel.ts
 * -----------------------------------------------------------------------
 * 브라우저에서 실제로 Excel 파일을 읽고/쓰는 함수 모음 (SheetJS 사용).
 * 업로드된 원본 Excel 은 서버로 전송되지 않으며, 브라우저 메모리에서만
 * 처리된다.
 * -----------------------------------------------------------------------
 */

export class ExcelParseError extends Error {}

function readWorkbookHeaderAndRecords(buffer: ArrayBuffer): { headerRow: string[]; records: Record<string, unknown>[] } {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array" });
  } catch {
    throw new ExcelParseError("Excel 파일을 읽을 수 없습니다. 파일이 손상되었거나 .xlsx 형식이 아닙니다.");
  }
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new ExcelParseError("업로드한 파일에 시트가 없습니다.");
  const worksheet = workbook.Sheets[sheetName];

  const headerRows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, raw: true });
  const headerRow = (headerRows[0] ?? []).map((h) => String(h ?? "").trim());
  if (headerRow.length === 0) throw new ExcelParseError("업로드한 파일이 비어 있습니다.");

  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: null, raw: true });
  return { headerRow, records };
}

export async function parsePayrollFile(file: File): Promise<ParsedPayrollFile> {
  const buffer = await file.arrayBuffer();
  const { headerRow, records } = readWorkbookHeaderAndRecords(buffer);
  const missing = checkMissingPayrollHeaders(headerRow);
  if (missing.length > 0) throw new ExcelParseError(`필수 컬럼이 없습니다: ${missing.join(", ")}`);
  if (records.length === 0) throw new ExcelParseError("업로드한 Payroll 파일에 직원 데이터가 없습니다.");
  const rows: PayrollInputRow[] = records.map(payrollRowFromExcelRecord);
  return { fileName: file.name, columnCount: headerRow.length, rows };
}

function writeWorkbook(rows: Record<string, unknown>[], sheetName: string, fileName: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

export function downloadSamplePreviousExcel(): void {
  const { previous } = buildSampleDataset();
  writeWorkbook(previous as unknown as Record<string, unknown>[], "전월Payroll", "sample_payroll_previous.xlsx");
}

export function downloadSampleCurrentExcel(): void {
  const { current } = buildSampleDataset();
  writeWorkbook(current as unknown as Record<string, unknown>[], "당월Payroll", "sample_payroll_current.xlsx");
}

function pickAmount(comparison: EmployeeComparison, field: keyof NonNullable<EmployeeComparison["current"]>): number {
  const source = comparison.current ?? comparison.previous;
  if (!source) return 0;
  const v = (source as unknown as Record<string, number>)[field as string];
  return typeof v === "number" ? v : 0;
}

/** 급여 산출 결과를 실제 .xlsx 파일(4개 시트)로 생성하여 다운로드한다. */
export function downloadResultExcel(
  summary: PayrollRunSummary,
  comparisons: EmployeeComparison[],
  fileName = "payroll_result.xlsx"
): void {
  const workbook = XLSX.utils.book_new();

  // 1) Payroll Summary
  const summaryRows = [
    { 항목: "작업명", 값: summary.runName },
    { 항목: "대상월", 값: summary.payrollMonth },
    { 항목: "처리대상", 값: summary.employeeCount },
    { 항목: "정상", 값: summary.normalCount },
    { 항목: "확인필요", 값: summary.reviewCount },
    { 항목: "오류", 값: summary.errorCount },
    { 항목: "신규입사(참고)", 값: summary.newHireCount },
    { 항목: "전월존재당월미존재(참고)", 값: summary.droppedCount },
    { 항목: "검토완료", 값: summary.reviewDoneCount },
    { 항목: "총지급액", 값: summary.totalGrossPay },
    { 항목: "총공제액", 값: summary.totalDeductions },
    { 항목: "최종지급액", 값: summary.totalNetPay },
    { 항목: "생성일시", 값: summary.createdAt },
    { 항목: "안내", 값: "본 결과의 보험료율·검증 기준은 시연용 예시 값이며 실제 Payroll 산출 기준이 아닙니다." },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Payroll Summary");

  // 2) Employee Results
  const employeeRows = comparisons.map((c) => {
    const record: Record<(typeof RESULT_EXPORT_HEADERS)[number], string | number> = {
      사번: c.employeeNumber,
      성명: c.employeeName,
      부서: c.department,
      직책: c.position,
      재직상태: c.employmentStatus,
      직원구분: c.changeType,
      이메일: c.email,
      연락처: c.phone,
      입사일: c.hireDate,
      기본급: pickAmount(c, "baseSalary"),
      직책수당: pickAmount(c, "positionAllowance"),
      식대: pickAmount(c, "mealAllowance"),
      기타고정수당: pickAmount(c, "fixedAllowance"),
      연장근로시간: pickAmount(c, "overtimeHours"),
      연장근로수당: pickAmount(c, "overtimePay"),
      인센티브: pickAmount(c, "incentive"),
      성과급: pickAmount(c, "bonus"),
      기타지급: pickAmount(c, "otherPayment"),
      총지급액: pickAmount(c, "grossPay"),
      국민연금: pickAmount(c, "pension"),
      건강보험: pickAmount(c, "healthInsurance"),
      고용보험: pickAmount(c, "employmentInsurance"),
      소득세: pickAmount(c, "incomeTax"),
      지방소득세: pickAmount(c, "localIncomeTax"),
      기타공제: pickAmount(c, "otherDeduction"),
      총공제액: pickAmount(c, "totalDeductions"),
      최종지급액: pickAmount(c, "netPay"),
      전월총지급액: c.previous?.grossPay ?? "",
      변동금액: c.totalChangeAmount ?? "",
      변동률: c.totalChangeRate !== null ? Number(c.totalChangeRate.toFixed(1)) : "",
      검증상태: c.validationStatus,
      시연용우선순위: c.reviewPriority,
      검토상태: c.reviewStatus,
      검증사유: c.issues.map((i) => `[${i.ruleId}] ${i.message}`).join("; "),
      메모: c.reviewMemo,
    };
    return record;
  });
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(employeeRows, { header: [...RESULT_EXPORT_HEADERS] }),
    "Employee Results"
  );

  // 3) Review Items (정상이 아니거나 전월미존재인 항목)
  const reviewRows = comparisons
    .filter((c) => c.validationStatus !== "정상" || c.changeType === "전월미존재")
    .map((c) => ({
      사번: c.employeeNumber,
      성명: c.employeeName,
      부서: c.department,
      우선순위: c.reviewPriority,
      검증상태: c.validationStatus,
      검토상태: c.reviewStatus,
      변동률: c.totalChangeRate !== null ? pct(c.totalChangeRate) : "N/A",
      주요사유: c.issues.map((i) => i.message).join(" / "),
      메모: c.reviewMemo,
    }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(reviewRows), "Review Items");

  // 4) Validation Issues (직원 x 이슈 1건당 1행)
  const issueRows = comparisons.flatMap((c) =>
    c.issues.map((issue) => ({
      사번: c.employeeNumber,
      성명: c.employeeName,
      RuleId: issue.ruleId,
      RuleName: issue.ruleName,
      Severity: issue.severity,
      Message: issue.message,
    }))
  );
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(issueRows), "Validation Issues");

  XLSX.writeFile(workbook, fileName);
}
