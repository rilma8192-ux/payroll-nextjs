import { EmployeeChangeType, PayrollComputedResult, PayrollInputRow, PayrollRules, ValidationIssue } from "./types";
import {
  MASTER_REQUIRED_HEADERS,
  PAYROLL_COLUMN_MAP,
  PAYROLL_INSURANCE_HEADERS,
  PAYROLL_NUMERIC_HEADERS,
  PAYROLL_REQUIRED_HEADERS,
} from "./columns";
import { toNumber } from "./calculation";

/**
 * validation.ts
 * -----------------------------------------------------------------------
 * Payroll 검증 Rule 엔진 (PAY-001 ~ PAY-016). UI와 완전히 분리된 순수
 * 함수로만 구성되며, 아래 Rule 은 실제 Payroll 심사/감사 기준이 아니라
 * 발표(시연)를 위해 정의한 "발표용 검증 예시 규칙"이다.
 * -----------------------------------------------------------------------
 */

export const VALIDATION_NOTE =
  "아래 검증 Rule 은 실제 Payroll 심사 기준이 아니라, 발표 시연을 위해 정의한 '발표용 검증 예시 규칙'입니다.";

const VALID_YN = new Set(["Y", "N"]);
const RETIRED_STATUSES = new Set(["퇴사", "퇴직"]);

export function isBlank(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === "";
}

export function checkMissingHeaders(headerRow: string[], required: string[]): string[] {
  return required.filter((h) => !headerRow.includes(h));
}

export const checkMissingPayrollHeaders = (headerRow: string[]) => checkMissingHeaders(headerRow, PAYROLL_REQUIRED_HEADERS);
export const checkMissingMasterHeaders = (headerRow: string[]) => checkMissingHeaders(headerRow, MASTER_REQUIRED_HEADERS);

export interface EmployeeRuleContext {
  employeeNumber: string;
  changeType: EmployeeChangeType;
  previousRow: PayrollInputRow | null;
  currentRow: PayrollInputRow | null;
  currentDuplicateCount: number;
  previousComputed: PayrollComputedResult | null;
  currentComputed: PayrollComputedResult | null;
}

function issue(ruleId: string, ruleName: string, severity: ValidationIssue["severity"], message: string): ValidationIssue {
  return { ruleId, ruleName, severity, message };
}

/** 당월(current) 입력 1행 자체의 구조적 오류를 검사한다 (PAY-001~007). */
function validateCurrentRowStructure(row: PayrollInputRow, duplicateCount: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (isBlank(row.employeeNumber)) {
    issues.push(issue("PAY-001", "사번누락", "오류", "사번이 입력되어 있지 않습니다."));
  } else if (duplicateCount > 1) {
    issues.push(issue("PAY-002", "사번중복", "오류", `당월 자료에 동일한 사번이 ${duplicateCount}건 존재합니다. 첫 번째 행을 기준으로 처리했습니다.`));
  }

  if (isBlank(row.employeeName)) {
    issues.push(issue("PAY-003", "성명누락", "오류", "성명이 입력되어 있지 않습니다."));
  }

  const base = toNumber(row.baseSalary);
  if (isBlank(row.baseSalary)) {
    issues.push(issue("PAY-004", "기본급누락", "오류", "기본급이 입력되어 있지 않습니다."));
  } else if (base === null) {
    issues.push(issue("PAY-004", "기본급누락", "오류", `기본급 값이 숫자가 아닙니다 (입력값: ${row.baseSalary}).`));
  } else if (base < 0) {
    issues.push(issue("PAY-006", "지급항목 비정상 음수", "오류", `기본급이 음수입니다 (입력값: ${row.baseSalary}).`));
  }

  for (const [header, field] of PAYROLL_COLUMN_MAP) {
    if (field === "baseSalary" || !PAYROLL_NUMERIC_HEADERS.includes(header)) continue;
    const raw = row[field];
    if (isBlank(raw)) continue;
    const n = toNumber(raw);
    if (n === null) {
      issues.push(issue("PAY-005", "숫자형식 오류", "확인 필요", `'${header}' 값이 숫자가 아닙니다 (입력값: ${raw}).`));
    } else if (n < 0) {
      issues.push(issue("PAY-006", "지급항목 비정상 음수", "확인 필요", `'${header}' 값이 음수입니다 (입력값: ${raw}).`));
    }
  }

  for (const { header, field } of PAYROLL_INSURANCE_HEADERS) {
    const raw = row[field];
    if (isBlank(raw)) continue;
    const val = String(raw).trim().toUpperCase();
    if (!VALID_YN.has(val)) {
      issues.push(issue("PAY-007", "보험 Y/N 오류", "확인 필요", `'${header}' 값이 Y/N 형식이 아닙니다 (입력값: ${raw}).`));
    }
  }

  const otHours = toNumber(row.overtimeHours);
  const otPay = toNumber(row.overtimePay);
  if (otHours !== null && otHours > 0 && (otPay === null || otPay === 0)) {
    issues.push(issue("PAY-008", "연장근로 불일치", "확인 필요", `연장근로시간이 ${otHours}시간 입력되어 있으나 연장근로수당이 0원입니다.`));
  }

  const empStatus = String(row.employmentStatus ?? "").trim();
  if (RETIRED_STATUSES.has(empStatus)) {
    const paidFields: Array<[string, keyof PayrollInputRow]> = [
      ["연장근로수당", "overtimePay"],
      ["인센티브", "incentive"],
      ["성과급", "bonus"],
      ["기타지급", "otherPayment"],
    ];
    const paid = paidFields.filter(([, f]) => (toNumber(row[f]) ?? 0) > 0).map(([h]) => h);
    if (paid.length > 0) {
      issues.push(
        issue("PAY-016", "퇴사자 지급항목 존재", "확인 필요", `재직상태가 '${empStatus}'이나 지급항목(${paid.join(", ")})이 입력되어 있습니다.`)
      );
    }
  }

  return issues;
}

/** 전월-당월 두 시점을 함께 봐야 알 수 있는 변화 관련 검증 (PAY-009~015). */
function validateChangeRules(ctx: EmployeeRuleContext, rules: PayrollRules): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (ctx.changeType === "신규") {
    issues.push(issue("PAY-014", "신규입사", "정보", "이번 달 처음으로 급여가 산출되는 직원입니다."));
    return issues;
  }

  if (ctx.changeType === "전월미존재") {
    issues.push(issue("PAY-015", "전월존재/당월미존재", "확인 필요", "전월 자료에는 있었으나 당월 자료에 존재하지 않습니다. 퇴사 처리 또는 자료 누락 여부를 확인해주세요."));
    return issues;
  }

  // changeType === '기존' : 두 시점 계산 결과가 모두 있어야 비교 가능
  if (!ctx.previousComputed || !ctx.currentComputed || !ctx.previousRow || !ctx.currentRow) return issues;

  const prevGross = ctx.previousComputed.grossPay;
  const currGross = ctx.currentComputed.grossPay;
  if (prevGross > 0) {
    const rate = ((currGross - prevGross) / prevGross) * 100;
    if (Math.abs(rate) >= rules.changeAlertRate * 100) {
      const sign = rate >= 0 ? "+" : "";
      issues.push(
        issue(
          "PAY-009",
          "총지급 전월대비 기준초과",
          "확인 필요",
          `총지급액이 전월 대비 ${sign}${rate.toFixed(1)}% 변동했습니다 (기준 ±${(rules.changeAlertRate * 100).toFixed(0)}%, 시연용 설정 기준).`
        )
      );
    }
  }

  const prevBase = toNumber(ctx.previousRow.baseSalary) ?? 0;
  const currBase = toNumber(ctx.currentRow.baseSalary) ?? 0;
  if (prevBase !== currBase) {
    const amount = currBase - prevBase;
    const sign = amount >= 0 ? "+" : "";
    issues.push(issue("PAY-010", "기본급변경", "확인 필요", `기본급이 전월 대비 ${sign}${amount.toLocaleString("ko-KR")}원 변경되었습니다.`));
  }

  const variableFields: Array<[string, keyof PayrollInputRow]> = [
    ["인센티브", "incentive"],
    ["성과급", "bonus"],
    ["기타지급", "otherPayment"],
    ["기타고정수당", "fixedAllowance"],
  ];
  for (const [label, field] of variableFields) {
    const prevVal = toNumber(ctx.previousRow[field]) ?? 0;
    const currVal = toNumber(ctx.currentRow[field]) ?? 0;
    if (prevVal === 0 && currVal > 0) {
      issues.push(issue("PAY-011", "신규 지급항목", "확인 필요", `전월에는 없던 '${label}'이 당월 ${currVal.toLocaleString("ko-KR")}원 발생했습니다.`));
    } else if (prevVal > 0 && currVal === 0) {
      issues.push(issue("PAY-012", "지급항목 0원 전환", "확인 필요", `전월 ${prevVal.toLocaleString("ko-KR")}원이던 '${label}'이 당월 0원으로 전환되었습니다.`));
    }
  }

  const insuranceFields: Array<[string, keyof PayrollInputRow]> = [
    ["국민연금적용여부", "pensionApplied"],
    ["건강보험적용여부", "healthInsuranceApplied"],
    ["고용보험적용여부", "employmentInsuranceApplied"],
  ];
  for (const [label, field] of insuranceFields) {
    const prevVal = String(ctx.previousRow[field] ?? "").trim().toUpperCase();
    const currVal = String(ctx.currentRow[field] ?? "").trim().toUpperCase();
    if (VALID_YN.has(prevVal) && VALID_YN.has(currVal) && prevVal !== currVal) {
      issues.push(issue("PAY-013", "보험적용 변경", "확인 필요", `'${label}'이 전월 '${prevVal}' → 당월 '${currVal}'로 변경되었습니다.`));
    }
  }

  return issues;
}

export function evaluateEmployeeRules(ctx: EmployeeRuleContext, rules: PayrollRules): ValidationIssue[] {
  const structural = ctx.currentRow ? validateCurrentRowStructure(ctx.currentRow, ctx.currentDuplicateCount) : [];
  const changeIssues = validateChangeRules(ctx, rules);
  return [...structural, ...changeIssues];
}

/** 이슈 목록에서 종합 ValidationStatus 를 도출한다 ('정보' 는 집계에서 제외). */
export function deriveValidationStatus(issues: ValidationIssue[]): "정상" | "확인 필요" | "오류" {
  if (issues.some((i) => i.severity === "오류")) return "오류";
  if (issues.some((i) => i.severity === "확인 필요")) return "확인 필요";
  return "정상";
}

/** 이슈 목록 + 변동률로 "시연용 검토 우선순위"를 도출한다. */
export function derivePriority(issues: ValidationIssue[], changeRate: number | null): "높음" | "중간" | "낮음" {
  if (issues.some((i) => i.severity === "오류")) return "높음";
  const hasHighSeverityRule = issues.some((i) => ["PAY-008", "PAY-015", "PAY-016"].includes(i.ruleId));
  const bigChange = changeRate !== null && Math.abs(changeRate) >= 50;
  if (hasHighSeverityRule || bigChange) return "높음";
  if (issues.some((i) => i.severity === "확인 필요")) return "중간";
  return "낮음";
}
