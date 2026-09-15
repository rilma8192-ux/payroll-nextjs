import { EmployeeInput, ValidationResult } from "./types";
import { COLUMN_MAP, INSURANCE_HEADERS, NUMERIC_HEADERS, REQUIRED_HEADERS } from "./columns";

/**
 * validation.ts
 * -----------------------------------------------------------------------
 * Payroll 입력자료 검증(Validation) 엔진.
 *
 * 이 파일은 UI와 완전히 분리되어 있으며, 순수 함수로만 구성된다.
 * 누락/중복/이상값/데이터 불일치를 찾아 직원별 상태(정상/확인 필요/오류)와
 * 사유 목록을 반환한다. 계산(지급액/공제액)은 calculation.ts 에서 수행한다.
 *
 * 중요: 아래 검증 규칙(허용값, 임계치 등)은 실제 Payroll 심사/감사 기준이
 * 아니라 발표(시연)를 위해 정의한 "발표용 검증 예시 규칙"이다.
 * -----------------------------------------------------------------------
 */

export const VALIDATION_NOTE =
  "아래 검증 규칙은 실제 Payroll 심사 기준이 아니라, 발표 시연을 위해 정의한 '발표용 검증 예시 규칙'입니다.";

const VALID_YN = new Set(["Y", "N"]);
const RETIRED_STATUSES = new Set(["퇴사", "퇴직"]);

/** 문자/숫자가 섞인 값을 숫자로 변환 시도. 실패하면 null */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function isBlank(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === "";
}

/** 업로드된 엑셀의 헤더 행(첫 줄)에서 필수 컬럼이 모두 있는지 확인한다. */
export function checkMissingHeaders(headerRow: string[]): string[] {
  return REQUIRED_HEADERS.filter((h) => !headerRow.includes(h));
}

/**
 * 직원 한 명(row)을 검증하여 {status, reasons} 를 반환한다.
 * 우선순위: 오류 > 확인 필요 > 정상
 *
 * '오류'는 필수값 누락처럼 신뢰할 수 있는 계산 자체가 불가능한 경우에만
 * 사용하며, 이 경우 금액을 임의로 추정하지 않는다(호출 측 calculation.ts 에서
 * 0으로 처리하고 오류 표시를 유지한다).
 */
export function validateRow(row: EmployeeInput, duplicateCount: number): ValidationResult {
  const blocking: string[] = [];
  const review: string[] = [];

  // 2. 사번 누락
  if (isBlank(row.employeeNumber)) blocking.push("사번 누락");
  // 3. 성명 누락
  if (isBlank(row.employeeName)) blocking.push("성명 누락");
  // 5. 기본급 누락 / 6,7. 숫자 타입 오류 및 음수 (기본급)
  const base = toNumber(row.baseSalary);
  if (isBlank(row.baseSalary)) {
    blocking.push("기본급 누락");
  } else if (base === null) {
    blocking.push(`기본급 값이 숫자가 아닙니다 (입력값: ${row.baseSalary})`);
  } else if (base < 0) {
    blocking.push(`기본급이 음수입니다 (입력값: ${row.baseSalary})`);
  }

  // 4. 사번 중복
  if (!isBlank(row.employeeNumber) && duplicateCount > 1) {
    blocking.push("사번 중복");
  }

  // 6. 숫자 데이터 타입 오류 / 8. 지급항목의 비정상적인 음수 (기본급 제외 나머지 숫자 항목)
  for (const [header, field] of COLUMN_MAP) {
    if (field === "baseSalary" || !NUMERIC_HEADERS.includes(header)) continue;
    const raw = row[field];
    if (isBlank(raw)) continue;
    const num = toNumber(raw);
    if (num === null) {
      review.push(`'${header}' 값이 숫자가 아닙니다 (입력값: ${raw})`);
    } else if (num < 0) {
      review.push(`'${header}' 값이 음수입니다 (입력값: ${raw})`);
    }
  }

  // 9. 보험 적용 여부 검증 (Y/N만 허용)
  for (const { header, field } of INSURANCE_HEADERS) {
    const raw = row[field];
    if (isBlank(raw)) continue;
    const val = String(raw).trim().toUpperCase();
    if (!VALID_YN.has(val)) {
      review.push(`'${header}' 값이 Y/N 형식이 아닙니다 (입력값: ${raw})`);
    }
  }

  // 10. 연장근로시간 > 0 인데 연장근로수당 = 0
  const otHours = toNumber(row.overtimeHours);
  const otPay = toNumber(row.overtimePay);
  if (otHours !== null && otHours > 0 && (otPay === null || otPay === 0)) {
    review.push(`연장근로시간이 ${otHours}시간 입력되어 있으나 연장근로수당이 0원입니다.`);
  }

  // 재직상태와 지급항목 불일치 (퇴사자인데 변동 지급이 존재)
  const empStatus = String(row.employmentStatus ?? "").trim();
  if (RETIRED_STATUSES.has(empStatus)) {
    const paidFields: Array<[string, keyof EmployeeInput]> = [
      ["연장근로수당", "overtimePay"],
      ["인센티브", "incentive"],
      ["성과급", "bonus"],
      ["기타지급", "otherPayment"],
    ];
    const paid = paidFields.filter(([, f]) => (toNumber(row[f]) ?? 0) > 0).map(([h]) => h);
    if (paid.length > 0) {
      review.push(`재직상태가 '${empStatus}'이나 지급항목(${paid.join(", ")})이 입력되어 있습니다.`);
    }
  }

  if (blocking.length > 0) {
    return { status: "오류", reasons: [...blocking, ...review] };
  }
  if (review.length > 0) {
    return { status: "확인 필요", reasons: review };
  }
  return { status: "정상", reasons: [] };
}

/** 전체 직원 배열을 검증한다. (사번 중복 카운트를 먼저 집계) */
export function validateEmployees(rows: EmployeeInput[]): ValidationResult[] {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (!isBlank(row.employeeNumber)) {
      const key = String(row.employeeNumber).trim();
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return rows.map((row) => {
    const key = isBlank(row.employeeNumber) ? "" : String(row.employeeNumber).trim();
    return validateRow(row, counts[key] ?? 0);
  });
}

/**
 * 11~12. 전월 총지급액이 0보다 클 때만 당월과 비교하며, 설정된 이상변동
 * 기준(절대값)을 초과하면 '확인 필요' 사유를 추가한다.
 * '오류' 상태는 변경하지 않는다(신뢰할 수 없는 계산이므로 변동 검증도 보류).
 */
export function appendChangeRateIssue(
  current: ValidationResult,
  changeRatePct: number | null,
  thresholdRate: number
): ValidationResult {
  if (changeRatePct === null || current.status === "오류") return current;
  if (Math.abs(changeRatePct) < thresholdRate * 100) return current;

  const sign = changeRatePct >= 0 ? "+" : "";
  const reason = `전월 대비 총 지급액이 ${sign}${changeRatePct.toFixed(1)}% 변동했습니다 (기준 ±${(thresholdRate * 100).toFixed(0)}%, 시연용 설정 기준).`;

  return {
    status: current.status === "정상" ? "확인 필요" : current.status,
    reasons: [...current.reasons, reason],
  };
}
