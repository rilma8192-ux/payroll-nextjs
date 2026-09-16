import { EmployeeComparison, PayrollRunRecord, PayrollRunSummary, PayrollRules } from "./types";
import { generateRunId } from "../storage/runStorage";

function summarize(comparisons: EmployeeComparison[]) {
  const currentPeriod = comparisons.filter((c) => c.changeType !== "전월미존재");

  const normalCount = currentPeriod.filter((c) => c.validationStatus === "정상").length;
  const reviewCount = currentPeriod.filter((c) => c.validationStatus === "확인 필요").length;
  const errorCount = currentPeriod.filter((c) => c.validationStatus === "오류").length;
  const newHireCount = currentPeriod.filter((c) => c.changeType === "신규").length;
  const droppedCount = comparisons.filter((c) => c.changeType === "전월미존재").length;
  const reviewDoneCount = comparisons.filter((c) => c.reviewStatus === "확인완료").length;

  const totalGrossPay = currentPeriod.reduce((s, c) => s + (c.current?.grossPay ?? 0), 0);
  const totalDeductions = currentPeriod.reduce((s, c) => s + (c.current?.totalDeductions ?? 0), 0);
  const totalNetPay = currentPeriod.reduce((s, c) => s + (c.current?.netPay ?? 0), 0);

  return {
    employeeCount: currentPeriod.length,
    normalCount,
    reviewCount,
    errorCount,
    newHireCount,
    droppedCount,
    reviewDoneCount,
    totalGrossPay,
    totalDeductions,
    totalNetPay,
  };
}

/** EmployeeComparison[] 로부터 새 작업(run) 레코드를 만든다. */
export function buildRunRecord(
  comparisons: EmployeeComparison[],
  runName: string,
  payrollMonth: string,
  rules: PayrollRules
): PayrollRunRecord {
  return {
    summary: {
      id: generateRunId(),
      runName,
      payrollMonth,
      createdAt: new Date().toISOString(),
      closedAt: null,
      ...summarize(comparisons),
    },
    rules,
    comparisons,
  };
}

/** 기존 run 의 id/작업명/생성일시/마감상태는 유지한 채, 새 계산 규칙으로 재계산한 결과를 반영한다. */
export function recomputeRunRecord(existing: PayrollRunSummary, comparisons: EmployeeComparison[], rules: PayrollRules): PayrollRunRecord {
  return {
    summary: {
      ...existing,
      ...summarize(comparisons),
    },
    rules,
    comparisons,
  };
}

/** 재계산 시 이전 검토상태/메모를 사번 기준으로 새 비교 결과에 이어붙인다. */
export function mergeReviewState(freshComparisons: EmployeeComparison[], previousComparisons: EmployeeComparison[]): EmployeeComparison[] {
  const prevMap = new Map(previousComparisons.map((c) => [c.employeeNumber, c]));
  return freshComparisons.map((c) => {
    const prev = prevMap.get(c.employeeNumber);
    if (!prev) return c;
    return { ...c, reviewStatus: prev.reviewStatus, reviewMemo: prev.reviewMemo, reviewUpdatedAt: prev.reviewUpdatedAt };
  });
}
