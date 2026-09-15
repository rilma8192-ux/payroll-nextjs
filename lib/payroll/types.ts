// Payroll 급여 산출 및 검증 자동화 - 공용 타입 정의

export type ValidationStatus = "정상" | "확인 필요" | "오류";

/** Excel에서 그대로 읽어온 직원 1명 분의 원본 입력값 (검증 전, 타입 미확정) */
export interface EmployeeInput {
  employeeNumber: unknown;
  employeeName: unknown;
  employmentStatus: unknown;
  baseSalary: unknown;
  positionAllowance: unknown;
  mealAllowance: unknown;
  fixedAllowance: unknown;
  overtimeHours: unknown;
  overtimePay: unknown;
  incentive: unknown;
  bonus: unknown;
  otherPayment: unknown;
  pensionApplied: unknown;
  healthInsuranceApplied: unknown;
  employmentInsuranceApplied: unknown;
  incomeTax: unknown;
  localIncomeTax: unknown;
  otherDeduction: unknown;
  previousGrossPay: unknown;
}

/** 시연용 계산 기준 (실제 법정 요율이 아님) */
export interface PayrollRules {
  pensionRate: number;
  healthInsuranceRate: number;
  employmentInsuranceRate: number;
  changeAlertRate: number;
}

export interface ValidationResult {
  status: ValidationStatus;
  reasons: string[];
}

/** 검증 + 계산이 모두 끝난 직원 1명의 최종 결과 */
export interface PayrollResult extends ValidationResult {
  employeeNumber: string;
  employeeName: string;
  employmentStatus: string;

  baseSalary: number;
  positionAllowance: number;
  mealAllowance: number;
  fixedAllowance: number;
  overtimeHours: number;
  overtimePay: number;
  incentive: number;
  bonus: number;
  otherPayment: number;
  grossPay: number;

  pension: number;
  healthInsurance: number;
  employmentInsurance: number;
  incomeTax: number;
  localIncomeTax: number;
  otherDeduction: number;
  totalDeductions: number;

  netPay: number;

  previousGrossPay: number;
  changeAmount: number | null;
  changeRate: number | null;

  pensionApplied: string;
  healthInsuranceApplied: string;
  employmentInsuranceApplied: string;
}

/** payroll_runs 테이블 1행 (작업 요약) */
export interface PayrollRun {
  id?: string;
  runName: string;
  payrollMonth: string;
  employeeCount: number;
  normalCount: number;
  reviewCount: number;
  errorCount: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  createdAt?: string;
}

export interface ParsedExcelFile {
  fileName: string;
  columnCount: number;
  rows: EmployeeInput[];
}
