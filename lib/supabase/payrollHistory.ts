import { getSupabaseClient } from "./client";
import { PayrollResult, PayrollRun } from "../payroll/types";

/**
 * payrollHistory.ts
 * -----------------------------------------------------------------------
 * Supabase 의 payroll_runs / payroll_results 테이블에 대한 저장/조회 함수.
 * anon key 로만 동작하며(RLS: 익명 select/insert 허용, supabase/schema.sql
 * 참고), service_role key 는 사용하지 않는다.
 * -----------------------------------------------------------------------
 */

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("작업 이력 저장 기능을 사용하려면 Supabase 연결이 필요합니다.");
  }
}

interface PayrollRunRow {
  id: string;
  run_name: string;
  payroll_month: string;
  employee_count: number;
  normal_count: number;
  review_count: number;
  error_count: number;
  total_gross_pay: number;
  total_deductions: number;
  total_net_pay: number;
  created_at: string;
}

function rowToRun(row: PayrollRunRow): PayrollRun {
  return {
    id: row.id,
    runName: row.run_name,
    payrollMonth: row.payroll_month,
    employeeCount: row.employee_count,
    normalCount: row.normal_count,
    reviewCount: row.review_count,
    errorCount: row.error_count,
    totalGrossPay: Number(row.total_gross_pay),
    totalDeductions: Number(row.total_deductions),
    totalNetPay: Number(row.total_net_pay),
    createdAt: row.created_at,
  };
}

interface PayrollResultRow {
  employee_number: string;
  employee_name: string;
  employment_status: string;
  base_salary: number;
  position_allowance: number;
  meal_allowance: number;
  fixed_allowance: number;
  overtime_hours: number;
  overtime_pay: number;
  incentive: number;
  bonus: number;
  other_payment: number;
  gross_pay: number;
  pension: number;
  health_insurance: number;
  employment_insurance: number;
  income_tax: number;
  local_income_tax: number;
  other_deduction: number;
  total_deductions: number;
  net_pay: number;
  previous_gross_pay: number;
  change_amount: number | null;
  change_rate: number | null;
  validation_status: PayrollResult["status"];
  validation_reasons: string[];
}

function rowToResult(row: PayrollResultRow): PayrollResult {
  return {
    status: row.validation_status,
    reasons: row.validation_reasons ?? [],
    employeeNumber: row.employee_number,
    employeeName: row.employee_name,
    employmentStatus: row.employment_status,
    baseSalary: Number(row.base_salary),
    positionAllowance: Number(row.position_allowance),
    mealAllowance: Number(row.meal_allowance),
    fixedAllowance: Number(row.fixed_allowance),
    overtimeHours: Number(row.overtime_hours),
    overtimePay: Number(row.overtime_pay),
    incentive: Number(row.incentive),
    bonus: Number(row.bonus),
    otherPayment: Number(row.other_payment),
    grossPay: Number(row.gross_pay),
    pension: Number(row.pension),
    healthInsurance: Number(row.health_insurance),
    employmentInsurance: Number(row.employment_insurance),
    incomeTax: Number(row.income_tax),
    localIncomeTax: Number(row.local_income_tax),
    otherDeduction: Number(row.other_deduction),
    totalDeductions: Number(row.total_deductions),
    netPay: Number(row.net_pay),
    previousGrossPay: Number(row.previous_gross_pay),
    changeAmount: row.change_amount === null ? null : Number(row.change_amount),
    changeRate: row.change_rate === null ? null : Number(row.change_rate),
    pensionApplied: "",
    healthInsuranceApplied: "",
    employmentInsuranceApplied: "",
  };
}

/** 급여 산출 작업(run) 요약 + 직원별 결과를 Supabase에 저장한다. */
export async function savePayrollRun(
  runName: string,
  payrollMonth: string,
  results: PayrollResult[]
): Promise<string> {
  const client = getSupabaseClient();
  if (!client) throw new SupabaseNotConfiguredError();

  const normalCount = results.filter((r) => r.status === "정상").length;
  const reviewCount = results.filter((r) => r.status === "확인 필요").length;
  const errorCount = results.filter((r) => r.status === "오류").length;
  const totalGrossPay = results.reduce((s, r) => s + r.grossPay, 0);
  const totalDeductions = results.reduce((s, r) => s + r.totalDeductions, 0);
  const totalNetPay = results.reduce((s, r) => s + r.netPay, 0);

  const { data: runData, error: runError } = await client
    .from("payroll_runs")
    .insert({
      run_name: runName,
      payroll_month: payrollMonth,
      employee_count: results.length,
      normal_count: normalCount,
      review_count: reviewCount,
      error_count: errorCount,
      total_gross_pay: totalGrossPay,
      total_deductions: totalDeductions,
      total_net_pay: totalNetPay,
    })
    .select("id")
    .single();

  if (runError || !runData) {
    throw new Error(`작업 저장 중 오류가 발생했습니다: ${runError?.message ?? "알 수 없는 오류"}`);
  }

  const runId = runData.id as string;

  const resultRows = results.map((r) => ({
    run_id: runId,
    employee_number: r.employeeNumber,
    employee_name: r.employeeName,
    employment_status: r.employmentStatus,
    base_salary: r.baseSalary,
    position_allowance: r.positionAllowance,
    meal_allowance: r.mealAllowance,
    fixed_allowance: r.fixedAllowance,
    overtime_hours: r.overtimeHours,
    overtime_pay: r.overtimePay,
    incentive: r.incentive,
    bonus: r.bonus,
    other_payment: r.otherPayment,
    gross_pay: r.grossPay,
    pension: r.pension,
    health_insurance: r.healthInsurance,
    employment_insurance: r.employmentInsurance,
    income_tax: r.incomeTax,
    local_income_tax: r.localIncomeTax,
    other_deduction: r.otherDeduction,
    total_deductions: r.totalDeductions,
    net_pay: r.netPay,
    previous_gross_pay: r.previousGrossPay,
    change_amount: r.changeAmount,
    change_rate: r.changeRate,
    validation_status: r.status,
    validation_reasons: r.reasons,
  }));

  const { error: resultsError } = await client.from("payroll_results").insert(resultRows);
  if (resultsError) {
    throw new Error(`직원별 결과 저장 중 오류가 발생했습니다: ${resultsError.message}`);
  }

  return runId;
}

/** 최근 작업 이력 목록을 조회한다. */
export async function listPayrollRuns(limit = 20): Promise<PayrollRun[]> {
  const client = getSupabaseClient();
  if (!client) throw new SupabaseNotConfiguredError();

  const { data, error } = await client
    .from("payroll_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`작업 이력 조회 중 오류가 발생했습니다: ${error.message}`);
  return (data as PayrollRunRow[]).map(rowToRun);
}

/** 특정 작업(run)의 직원별 결과를 다시 조회한다. */
export async function getPayrollRunResults(runId: string): Promise<PayrollResult[]> {
  const client = getSupabaseClient();
  if (!client) throw new SupabaseNotConfiguredError();

  const { data, error } = await client
    .from("payroll_results")
    .select("*")
    .eq("run_id", runId)
    .order("employee_number", { ascending: true });

  if (error) throw new Error(`직원별 결과 조회 중 오류가 발생했습니다: ${error.message}`);
  return (data as PayrollResultRow[]).map(rowToResult);
}
