import { PayrollInputRow, PayrollComputedResult, PayrollRules } from "./types";
import { FIXED_PAY_FIELDS, VARIABLE_PAY_FIELDS } from "./columns";

/**
 * calculation.ts
 * -----------------------------------------------------------------------
 * Payroll 지급액 / 공제액 / 최종 지급액 계산 (deterministic, rule-based).
 * AI는 이 계산에 관여하지 않는다. 4대보험 요율 등은 전부 rules.ts 를 통해
 * 주입받으며, 이 파일에는 요율을 직접 하드코딩하지 않는다.
 * -----------------------------------------------------------------------
 */

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function strOrEmpty(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function sumFields(row: PayrollInputRow, fields: Array<keyof PayrollInputRow>): number {
  return fields.reduce((sum, f) => sum + num(row[f]), 0);
}

export function calcFixedPay(row: PayrollInputRow): number {
  return sumFields(row, FIXED_PAY_FIELDS);
}

export function calcVariablePay(row: PayrollInputRow): number {
  return sumFields(row, VARIABLE_PAY_FIELDS);
}

export function calcGrossPay(row: PayrollInputRow): number {
  return calcFixedPay(row) + calcVariablePay(row);
}

interface InsuranceDeductions {
  pension: number;
  healthInsurance: number;
  employmentInsurance: number;
}

/**
 * 4대보험 성격의 공제(국민연금/건강보험/고용보험)를 계산한다.
 * 계산 기준(시연용): 기본급 × rules 의 공제율. 적용여부가 'Y'가 아니면
 * (또는 유효하지 않은 값이면) 0원 처리한다 - 잘못된 값을 임의로 Y/N 으로
 * 추정하지 않는다.
 */
export function calcInsuranceDeductions(row: PayrollInputRow, rules: PayrollRules): InsuranceDeductions {
  const base = num(row.baseSalary);
  const applyRate = (flagValue: unknown, rate: number) => {
    const flag = strOrEmpty(flagValue).toUpperCase();
    if (flag !== "Y") return 0;
    return Math.round(base * rate);
  };
  return {
    pension: applyRate(row.pensionApplied, rules.pensionRate),
    healthInsurance: applyRate(row.healthInsuranceApplied, rules.healthInsuranceRate),
    employmentInsurance: applyRate(row.employmentInsuranceApplied, rules.employmentInsuranceRate),
  };
}

export function calcTotalDeductions(row: PayrollInputRow, insurance: InsuranceDeductions): number {
  return (
    insurance.pension +
    insurance.healthInsurance +
    insurance.employmentInsurance +
    num(row.incomeTax) +
    num(row.localIncomeTax) +
    num(row.otherDeduction)
  );
}

/**
 * 직원 한 명의 특정 시점(전월 또는 당월) Payroll 입력 1행을 계산해
 * PayrollComputedResult 로 만든다. 값이 없거나(null) 숫자가 아니면 0으로
 * 계산하되, 검증 단계에서 별도로 오류/확인필요 사유가 기록된다.
 */
export function computeSinglePeriod(row: PayrollInputRow, rules: PayrollRules): PayrollComputedResult {
  const fixedPay = calcFixedPay(row);
  const variablePay = calcVariablePay(row);
  const grossPay = fixedPay + variablePay;

  const insurance = calcInsuranceDeductions(row, rules);
  const totalDeductions = calcTotalDeductions(row, insurance);
  const netPay = grossPay - totalDeductions;

  return {
    employeeNumber: strOrEmpty(row.employeeNumber),
    employeeName: strOrEmpty(row.employeeName),
    employmentStatus: strOrEmpty(row.employmentStatus),

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

    pensionApplied: strOrEmpty(row.pensionApplied),
    healthInsuranceApplied: strOrEmpty(row.healthInsuranceApplied),
    employmentInsuranceApplied: strOrEmpty(row.employmentInsuranceApplied),
  };
}

/** 직원 상세화면에서 '왜 이 값이 나왔는가'를 문장 목록으로 만든다. */
export function buildCalculationTrace(row: PayrollComputedResult, rules: PayrollRules): string[] {
  const won = (x: number) => `${Math.round(x).toLocaleString("ko-KR")}원`;
  const trace: string[] = [];

  trace.push(
    `[지급] 기본급 ${won(row.baseSalary)} + 직책수당 ${won(row.positionAllowance)} + 식대 ${won(row.mealAllowance)} + 기타고정수당 ${won(row.fixedAllowance)} + 연장근로수당 ${won(row.overtimePay)} + 인센티브 ${won(row.incentive)} + 성과급 ${won(row.bonus)} + 기타지급 ${won(row.otherPayment)} = 총지급 ${won(row.grossPay)}`
  );

  const insuranceRows: Array<[string, string, number, number]> = [
    ["국민연금", row.pensionApplied, rules.pensionRate, row.pension],
    ["건강보험", row.healthInsuranceApplied, rules.healthInsuranceRate, row.healthInsurance],
    ["고용보험", row.employmentInsuranceApplied, rules.employmentInsuranceRate, row.employmentInsurance],
  ];
  for (const [name, flagValue, rate, amount] of insuranceRows) {
    const flag = strOrEmpty(flagValue).toUpperCase();
    if (flag === "Y") {
      trace.push(`[공제] ${name}: 적용여부 'Y' → 기본급 ${won(row.baseSalary)} × 시연용 요율 ${(rate * 100).toFixed(1)}% = ${won(amount)}`);
    } else {
      trace.push(`[공제] ${name}: 적용여부 '${flag || "N"}' → 공제 0원`);
    }
  }

  trace.push(
    `[공제] 소득세 ${won(row.incomeTax)} + 지방소득세 ${won(row.localIncomeTax)} + 기타공제 ${won(row.otherDeduction)} (입력자료 값 그대로 반영) = 총공제 ${won(row.totalDeductions)}`
  );
  trace.push(`[최종] 총지급 ${won(row.grossPay)} - 총공제 ${won(row.totalDeductions)} = 최종지급 ${won(row.netPay)}`);

  return trace;
}
