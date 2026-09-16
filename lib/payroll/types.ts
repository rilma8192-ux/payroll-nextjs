// Payroll 급여 검증 및 마감 지원 시스템 - 공용 타입 정의
//
// AI는 이 계산/검증/비교에 관여하지 않는다. 전부 TypeScript의 결정론적
// (deterministic) 로직이며, 최종 판단은 담당자가 검토 워크플로우를 통해
// 내린다.

export type ValidationSeverity = "오류" | "확인 필요" | "정보";

/** 직원 1명의 종합 상태 (이슈 중 가장 심각한 것을 반영, '정보'는 집계 제외) */
export type ValidationStatus = "정상" | "확인 필요" | "오류";

/** 담당자의 검토 진행 상태. ValidationStatus 와 별개이며 서로를 덮어쓰지 않는다. */
export type ReviewStatus = "미확인" | "검토중" | "확인완료";

/** 시연용 검토 우선순위 (실제 업무 우선순위 기준이 아님) */
export type ReviewPriority = "높음" | "중간" | "낮음";

/** 전월 대비 이 직원의 상태 분류 */
export type EmployeeChangeType = "기존" | "신규" | "전월미존재";

/**
 * Excel 에서 그대로 읽어온 Payroll 입력 1행 (전월/당월 공통 스키마, 검증 전).
 *
 * 부서/직책/이메일/연락처/입사일은 급여 계산에는 쓰이지 않는 인적사항 참고
 * 정보로, 실무에서 Payroll 대장에 함께 들어 있는 경우가 많아 별도의
 * Employee Master 파일 없이 이 한 시트에 선택 컬럼으로 포함한다.
 */
export interface PayrollInputRow {
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

  /** 인적사항 (급여 계산에는 사용되지 않음, 선택 컬럼) */
  department?: unknown;
  position?: unknown;
  email?: unknown;
  phone?: unknown;
  hireDate?: unknown;
}

/** 시연용 계산 기준 (실제 법정 요율이 아님) */
export interface PayrollRules {
  pensionRate: number;
  healthInsuranceRate: number;
  employmentInsuranceRate: number;
  changeAlertRate: number;
}

export interface ValidationIssue {
  ruleId: string;
  ruleName: string;
  severity: ValidationSeverity;
  message: string;
}

/** 검증 + 계산이 끝난 직원 1명의 특정 시점(전월 또는 당월) 산출 결과 */
export interface PayrollComputedResult {
  employeeNumber: string;
  employeeName: string;
  employmentStatus: string;

  /** 인적사항 (급여 계산에는 사용되지 않는 참고 정보) */
  department: string;
  position: string;
  email: string;
  phone: string;
  hireDate: string;

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

  pensionApplied: string;
  healthInsuranceApplied: string;
  employmentInsuranceApplied: string;
}

/** 전월 대비 당월 특정 항목의 증감 */
export interface FieldDelta {
  field: string;
  label: string;
  previous: number;
  current: number;
  amount: number;
  rate: number | null;
}

/** 직원 1명에 대한 전월-당월 비교 + 검증 + 검토 상태를 모두 담은 최종 레코드 */
export interface EmployeeComparison {
  employeeNumber: string;
  employeeName: string;
  department: string;
  position: string;
  employmentStatus: string;
  email: string;
  phone: string;
  hireDate: string;

  changeType: EmployeeChangeType;

  previous: PayrollComputedResult | null;
  current: PayrollComputedResult | null;

  deltas: FieldDelta[];
  totalChangeAmount: number | null;
  totalChangeRate: number | null;

  issues: ValidationIssue[];
  validationStatus: ValidationStatus;
  reviewPriority: ReviewPriority;

  reviewStatus: ReviewStatus;
  reviewMemo: string;
  reviewUpdatedAt: string | null;
}

/** 작업(run) 요약 - localStorage 에 저장되는 작업이력 항목 */
export interface PayrollRunSummary {
  id: string;
  runName: string;
  payrollMonth: string;
  employeeCount: number;
  normalCount: number;
  reviewCount: number;
  errorCount: number;
  newHireCount: number;
  droppedCount: number;
  reviewDoneCount: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  createdAt: string;
  closedAt: string | null;
}

/** 작업(run) 전체 레코드 - 직원별 비교 결과를 모두 포함해 localStorage 에 저장 */
export interface PayrollRunRecord {
  summary: PayrollRunSummary;
  rules: PayrollRules;
  comparisons: EmployeeComparison[];
}

export interface ParsedPayrollFile {
  fileName: string;
  columnCount: number;
  rows: PayrollInputRow[];
}
