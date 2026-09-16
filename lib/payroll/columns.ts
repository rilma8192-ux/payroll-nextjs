import { EmployeeInput } from "./types";

/** Excel 한글 헤더 <-> 내부 필드명 매핑 (업로드 읽기용) */
export const COLUMN_MAP: Array<[header: string, field: keyof EmployeeInput]> = [
  ["사번", "employeeNumber"],
  ["성명", "employeeName"],
  ["재직상태", "employmentStatus"],
  ["부서", "department"],
  ["연락처", "phone"],
  ["이메일", "email"],
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
  ["전월총지급액", "previousGrossPay"],
];

export const REQUIRED_HEADERS = ["사번", "성명", "재직상태", "기본급"];

export const NUMERIC_HEADERS = [
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
  "전월총지급액",
];

export const INSURANCE_HEADERS: Array<{ header: string; field: keyof EmployeeInput }> = [
  { header: "국민연금적용여부", field: "pensionApplied" },
  { header: "건강보험적용여부", field: "healthInsuranceApplied" },
  { header: "고용보험적용여부", field: "employmentInsuranceApplied" },
];

export const FIXED_PAY_FIELDS: Array<keyof EmployeeInput> = [
  "baseSalary",
  "positionAllowance",
  "mealAllowance",
  "fixedAllowance",
];

export const VARIABLE_PAY_FIELDS: Array<keyof EmployeeInput> = [
  "overtimePay",
  "incentive",
  "bonus",
  "otherPayment",
];

/** 엑셀에서 파싱된 한 행(헤더 기준 객체)을 내부 스키마 객체로 변환 */
export function rowFromExcelRecord(record: Record<string, unknown>): EmployeeInput {
  const row = {} as EmployeeInput;
  for (const [header, field] of COLUMN_MAP) {
    row[field] = Object.prototype.hasOwnProperty.call(record, header) ? record[header] : null;
  }
  return row;
}

/** 다운로드용 결과 행 하나를 엑셀 헤더 기준 객체로 변환할 때 사용할 헤더 순서 */
export const RESULT_EXPORT_HEADERS = [
  "사번",
  "성명",
  "재직상태",
  "부서",
  "연락처",
  "이메일",
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
  "확인필요사유",
] as const;
