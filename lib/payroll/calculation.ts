import { EmployeeInput, PayrollResult, PayrollRules } from "./types";
import { FIXED_PAY_FIELDS, VARIABLE_PAY_FIELDS } from "./columns";
import { appendChangeRateIssue, toNumber, validateEmployees } from "./validation";

/**
 * calculation.ts
 * -----------------------------------------------------------------------
 * Payroll 지급액 / 공제액 / 최종 지급액 계산 엔진 (deterministic, rule-based).
 * AI는 이 계산에 관여하지 않는다.
 *
 * 4대보험 공제율 등은 전부 rules.ts 를 통해 주입받으며, 이 파일에는
 * 요율을 직접 하드코딩하지 않는다. rules.ts 의 수치는 실제 법정 요율이
 * 아닌 "시연용 가상 계산 기준"이다.
 * -----------------------------------------------------------------------
 */

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function sumFields(row: EmployeeInput, fields: Array<keyof EmployeeInput>): number {
  return fields.reduce((sum, f) => sum + num(row[f]), 0);
}

/** 고정 지급 합계 = 기본급 + 직책수당 + 식대 + 기타고정수당 */
export function calcFixedPay(row: EmployeeInput): number {
  return sumFields(row, FIXED_PAY_FIELDS);
}

/** 변동 지급 합계 = 연장근로수당 + 인센티브 + 성과급 + 기타지급 */
export function calcVariablePay(row: EmployeeInput): number {
  return sumFields(row, VARIABLE_PAY_FIELDS);
}

/** 총 지급액 = 고정 지급 + 변동 지급 */
export function calcGrossPay(row: EmployeeInput): number {
  return calcFixedPay(row) + calcVariablePay(row);
}

interface InsuranceDeductions {
  pension: number;
  healthInsurance: number;
  employmentInsurance: number;
}

/**
 * 4대보험 성격의 공제(국민연금/건강보험/고용보험)를 계산한다.
 * 계산 기준(시연용): 기본급 × rules 의 공제율.
 * 적용여부가 'Y'가 아니면(또는 유효하지 않은 값이면) 0원 처리한다 -
 * 잘못된 값을 임의로 Y/N 으로 추정하지 않는다.
 */
export function calcInsuranceDeductions(row: EmployeeInput, rules: PayrollRules): InsuranceDeductions {
  const base = num(row.baseSalary);
  const applyRate = (flagValue: unknown, rate: number) => {
    const flag = String(flagValue ?? "").trim().toUpperCase();
    if (flag !== "Y") return 0;
    return Math.round(base * rate);
  };
  return {
    pension: applyRate(row.pensionApplied, rules.pensionRate),
    healthInsurance: applyRate(row.healthInsuranceApplied, rules.healthInsuranceRate),
    employmentInsurance: applyRate(row.employmentInsuranceApplied, rules.employmentInsuranceRate),
  };
}

/**
 * 총 공제액 = 국민연금 + 건강보험 + 고용보험 + 소득세 + 지방소득세 + 기타공제
 * (소득세/지방소득세/기타공제는 입력자료 값을 그대로 반영 - 별도 계산하지 않음)
 */
export function calcTotalDeductions(row: EmployeeInput, insurance: InsuranceDeductions): number {
  return (
    insurance.pension +
    insurance.healthInsurance +
    insurance.employmentInsurance +
    num(row.incomeTax) +
    num(row.localIncomeTax) +
    num(row.otherDeduction)
  );
}

/** 전월 총지급액이 0보다 클 때만 당월과 비교한 변동금액/변동률을 계산한다. */
export function calcChange(grossPay: number, previousGrossPay: unknown): { amount: number | null; rate: number | null } {
  const prev = num(previousGrossPay);
  if (!(prev > 0)) return { amount: null, rate: null };
  const amount = grossPay - prev;
  const rate = (amount / prev) * 100;
  return { amount, rate };
}

/**
 * 직원 한 명에 대해 검증 + 계산을 모두 수행하여 최종 PayrollResult 를 만든다.
 * '오류' 상태(필수값 누락 등)인 경우에도 금액을 임의로 추정하지 않고
 * 입력값이 있는 항목만 그대로 계산하며(누락값은 0), 오류 표시를 유지한다.
 */
function buildResult(
  row: EmployeeInput,
  validation: { status: PayrollResult["status"]; reasons: string[] },
  rules: PayrollRules
): PayrollResult {
  const fixedPay = calcFixedPay(row);
  const variablePay = calcVariablePay(row);
  const grossPay = fixedPay + variablePay;

  const insurance = calcInsuranceDeductions(row, rules);
  const totalDeductions = calcTotalDeductions(row, insurance);
  const netPay = grossPay - totalDeductions;
  const { amount: changeAmount, rate: changeRate } = calcChange(grossPay, row.previousGrossPay);

  return {
    status: validation.status,
    reasons: validation.reasons,

    employeeNumber: isBlankToStr(row.employeeNumber),
    employeeName: isBlankToStr(row.employeeName),
    employmentStatus: isBlankToStr(row.employmentStatus),

    department: isBlankToStr(row.department),
    phone: isBlankToStr(row.phone),
    email: isBlankToStr(row.email),

    baseSalary: num(row.baseSalary),
    positionAllowance: num(row.positionAllowance),
    mealAllowance: num(row.mealAllowance),
    fixedAllowance: num(row.fixedAllowance),
    overtimeHours: num(row.overtimeHours),
    overtimePay: num(row.overtimePay),
    incentive: num(row.incentive),
    bonus: num(row.bonus),
    otherPayment: num(row.otherPayment),
    grossPay,

    pension: insurance.pension,
    healthInsurance: insurance.healthInsurance,
    employmentInsurance: insurance.employmentInsurance,
    incomeTax: num(row.incomeTax),
    localIncomeTax: num(row.localIncomeTax),
    otherDeduction: num(row.otherDeduction),
    totalDeductions,

    netPay,

    previousGrossPay: num(row.previousGrossPay),
    changeAmount,
    changeRate,

    pensionApplied: isBlankToStr(row.pensionApplied),
    healthInsuranceApplied: isBlankToStr(row.healthInsuranceApplied),
    employmentInsuranceApplied: isBlankToStr(row.employmentInsuranceApplied),
  };
}

function isBlankToStr(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/**
 * 전체 직원에 대해 검증 -> 계산 -> 전월 대비 변동 검증을 순서대로 수행한다.
 * app에서 "급여 산출 실행" 버튼을 눌렀을 때 호출되는 최상위 함수.
 */
export function computePayroll(rows: EmployeeInput[], rules: PayrollRules): PayrollResult[] {
  const validations = validateEmployees(rows); // 1차: 구조적 검증
  return rows.map((row, i) => {
    const result = buildResult(row, validations[i], rules); // 2차: 지급/공제 계산
    const withChangeCheck = appendChangeRateIssue(
      { status: result.status, reasons: result.reasons },
      result.changeRate,
      rules.changeAlertRate
    ); // 3차: 전월 대비 이상변동 검증
    return { ...result, status: withChangeCheck.status, reasons: withChangeCheck.reasons };
  });
}

/** 직원 상세화면에서 '왜 이 값이 나왔는가'를 문장 목록으로 만든다. */
export function buildCalculationTrace(row: PayrollResult, rules: PayrollRules): string[] {
  const won = (x: number) => `${Math.round(x).toLocaleString("ko-KR")}원`;
  const pct = (x: number) => `${x >= 0 ? "+" : ""}${x.toFixed(1)}%`;
  const trace: string[] = [];

  trace.push(
    `[지급] 기본급 ${won(row.baseSalary)} + 직책수당 ${won(row.positionAllowance)} + 식대 ${won(row.mealAllowance)} + 기타고정수당 ${won(row.fixedAllowance)} = 고정 지급 ${won(row.baseSalary + row.positionAllowance + row.mealAllowance + row.fixedAllowance)}`
  );
  trace.push(
    `[지급] 연장근로수당 ${won(row.overtimePay)} + 인센티브 ${won(row.incentive)} + 성과급 ${won(row.bonus)} + 기타지급 ${won(row.otherPayment)} = 변동 지급 ${won(row.overtimePay + row.incentive + row.bonus + row.otherPayment)}`
  );
  trace.push(`[지급] 고정 지급 + 변동 지급 = 총 지급액 ${won(row.grossPay)}`);

  const insuranceRows: Array<[string, string, number, number]> = [
    ["국민연금", row.pensionApplied, rules.pensionRate, row.pension],
    ["건강보험", row.healthInsuranceApplied, rules.healthInsuranceRate, row.healthInsurance],
    ["고용보험", row.employmentInsuranceApplied, rules.employmentInsuranceRate, row.employmentInsurance],
  ];
  for (const [name, flagValue, rate, amount] of insuranceRows) {
    const flag = String(flagValue || "").trim().toUpperCase();
    if (flag === "Y") {
      trace.push(`[공제] ${name}: 적용여부 Y → 기본급 ${won(row.baseSalary)} × 시연용 요율 ${(rate * 100).toFixed(1)}% = ${won(amount)}`);
    } else {
      trace.push(`[공제] ${name}: 적용여부 '${flag || "N"}' → 공제 0원`);
    }
  }

  trace.push(
    `[공제] 소득세 ${won(row.incomeTax)} + 지방소득세 ${won(row.localIncomeTax)} + 기타공제 ${won(row.otherDeduction)} (입력자료 값 그대로 반영)`
  );
  trace.push(`[공제] 총 공제액 = ${won(row.totalDeductions)}`);
  trace.push(`[최종] 총 지급액 ${won(row.grossPay)} - 총 공제액 ${won(row.totalDeductions)} = 최종 지급액 ${won(row.netPay)}`);

  if (row.changeRate !== null) {
    trace.push(
      `[변동] 전월 총지급액 ${won(row.previousGrossPay)} → 당월 총지급액 ${won(row.grossPay)} (변동률 ${pct(row.changeRate)})`
    );
  } else {
    trace.push("[변동] 전월 총지급액 정보 없음 → 변동률 계산 불가");
  }

  return trace;
}

export { toNumber };
