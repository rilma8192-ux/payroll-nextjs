import { PayrollInputRow } from "./types";

/**
 * Payroll 입력 Excel 헤더 <-> 필드명 매핑 (전월/당월 공통).
 *
 * 부서/직책/이메일/연락처/입사일은 별도의 Employee Master 파일 없이 이
 * 한 시트에 선택 컬럼으로 함께 들어 있다고 가정한다 (실무 Payroll 대장에
 * 인적사항이 함께 있는 경우가 많다는 점을 반영).
 */
export const PAYROLL_COLUMN_MAP: Array<[header: string, field: keyof PayrollInputRow]> = [
  ["사번", "employeeNumber"],
  ["성명", "employeeName"],
  ["재직상태", "employmentStatus"],
  ["부서", "department"],
  ["직책", "position"],
  ["이메일", "email"],
  ["연락처", "phone"],
  ["입사일", "hireDate"],
  ["기본급", "baseSalary"],
  ["직책수당", "positionAllowance"],
  ["식대", "mealAllowance"],
  ["기타고정수당", "fixedAllowance"],
  ["연장근로시간", "overtimeHours"],
  ["연장근로수당", "overtimePay"],
  ["인센티브", "incentive"],
  ["성과급", "bonus"],
  ["기타지급", "otherPayment"],
  ["국민연금적용여부", "pensionApplied"],
  ["건강보험적용여부", "healthInsuranceApplied"],
  ["고용보험적용여부", "employmentInsuranceApplied"],
  ["소득세", "incomeTax"],
  ["지방소득세", "localIncomeTax"],
  ["기타공제", "otherDeduction"],
];

export const PAYROLL_REQUIRED_HEADERS = ["사번", "성명", "재직상태", "기본급"];

export const PAYROLL_NUMERIC_HEADERS = [
  "기본급",
  "직책수당",
  "식대",
  "기타고정수당",
  "연장근로시간",
  "연장근로수당",
  "인센티브",
  "성과급",
  "기타지급",
  "소득세",
  "지방소득세",
  "기타공제",
];

export const PAYROLL_INSURANCE_HEADERS: Array<{ header: string; field: keyof PayrollInputRow }> = [
  { header: "국민연금적용여부", field: "pensionApplied" },
  { header: "건강보험적용여부", field: "healthInsuranceApplied" },
  { header: "고용보험적용여부", field: "employmentInsuranceApplied" },
];

export const FIXED_PAY_FIELDS: Array<keyof PayrollInputRow> = [
  "baseSalary",
  "positionAllowance",
  "mealAllowance",
  "fixedAllowance",
];

export const VARIABLE_PAY_FIELDS: Array<keyof PayrollInputRow> = [
  "overtimePay",
  "incentive",
  "bonus",
  "otherPayment",
];

/** 전월/당월 비교 대상 필드 (총지급/총공제 구성 요소 전부) */
export const COMPARISON_FIELDS: Array<{ field: string; label: string }> = [
  { field: "baseSalary", label: "기본급" },
  { field: "positionAllowance", label: "직책수당" },
  { field: "mealAllowance", label: "식대" },
  { field: "fixedAllowance", label: "기타고정수당" },
  { field: "overtimePay", label: "연장근로수당" },
  { field: "incentive", label: "인센티브" },
  { field: "bonus", label: "성과급" },
  { field: "otherPayment", label: "기타지급" },
  { field: "grossPay", label: "총지급액" },
  { field: "pension", label: "국민연금" },
  { field: "healthInsurance", label: "건강보험" },
  { field: "employmentInsurance", label: "고용보험" },
  { field: "incomeTax", label: "소득세" },
  { field: "localIncomeTax", label: "지방소득세" },
  { field: "otherDeduction", label: "기타공제" },
  { field: "totalDeductions", label: "총공제액" },
  { field: "netPay", label: "최종지급액" },
];

export function payrollRowFromExcelRecord(record: Record<string, unknown>): PayrollInputRow {
  const row = {} as PayrollInputRow;
  for (const [header, field] of PAYROLL_COLUMN_MAP) {
    row[field] = Object.prototype.hasOwnProperty.call(record, header) ? record[header] : null;
  }
  return row;
}

/** Employee Results 결과 시트 헤더 순서 */
export const RESULT_EXPORT_HEADERS = [
  "사번",
  "성명",
  "부서",
  "직책",
  "재직상태",
  "직원구분",
  "이메일",
  "연락처",
  "입사일",
  "기본급",
  "직책수당",
  "식대",
  "기타고정수당",
  "연장근로시간",
  "연장근로수당",
  "인센티브",
  "성과급",
  "기타지급",
  "총지급액",
  "국민연금",
  "건강보험",
  "고용보험",
  "소득세",
  "지방소득세",
  "기타공제",
  "총공제액",
  "최종지급액",
  "전월총지급액",
  "변동금액",
  "변동률",
  "검증상태",
  "시연용우선순위",
  "검토상태",
  "검증사유",
  "메모",
] as const;
