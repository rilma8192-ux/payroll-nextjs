import {
  EmployeeChangeType,
  EmployeeComparison,
  EmployeeMaster,
  FieldDelta,
  PayrollComputedResult,
  PayrollInputRow,
  PayrollRules,
} from "./types";
import { COMPARISON_FIELDS } from "./columns";
import { computeSinglePeriod, toNumber } from "./calculation";
import { deriveValidationStatus, derivePriority, evaluateEmployeeRules } from "./validation";

/**
 * compare.ts
 * -----------------------------------------------------------------------
 * Employee Master(선택) + 전월 Payroll(필수) + 당월 Payroll(필수) 을
 * 사번 기준으로 매칭하고, 시점별 계산과 변화 검증을 모두 수행해
 * EmployeeComparison[] 를 만든다. UI 는 이 배열만 소비한다.
 * -----------------------------------------------------------------------
 */

function indexByEmployeeNumber<T extends { employeeNumber: unknown }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    const key = String(row.employeeNumber ?? "").trim();
    if (!key) continue;
    if (!map.has(key)) map.set(key, row);
  }
  return map;
}

function countByEmployeeNumber(rows: PayrollInputRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = String(row.employeeNumber ?? "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function buildDeltas(previous: PayrollComputedResult, current: PayrollComputedResult): FieldDelta[] {
  return COMPARISON_FIELDS.map(({ field, label }) => {
    const prevVal = Number((previous as unknown as Record<string, number>)[field] ?? 0);
    const currVal = Number((current as unknown as Record<string, number>)[field] ?? 0);
    const amount = currVal - prevVal;
    const rate = prevVal !== 0 ? (amount / Math.abs(prevVal)) * 100 : null;
    return { field, label, previous: prevVal, current: currVal, amount, rate };
  });
}

export function buildEmployeeComparisons(
  masterRows: EmployeeMaster[],
  previousRows: PayrollInputRow[],
  currentRows: PayrollInputRow[],
  rules: PayrollRules
): EmployeeComparison[] {
  const masterMap = indexByEmployeeNumber(masterRows);
  const previousMap = indexByEmployeeNumber(previousRows);
  const currentMap = indexByEmployeeNumber(currentRows);
  const currentDuplicateCounts = countByEmployeeNumber(currentRows);

  const keys = new Set<string>([...previousMap.keys(), ...currentMap.keys()]);

  // 사번이 비어 있는 당월 행도(오류로 처리되어야 하므로) 합성 키로 포함시킨다.
  const blankKeyRows: Array<{ key: string; row: PayrollInputRow }> = [];
  currentRows.forEach((row, i) => {
    if (String(row.employeeNumber ?? "").trim() === "") {
      blankKeyRows.push({ key: `__blank_current_${i}`, row });
    }
  });

  const results: EmployeeComparison[] = [];

  for (const key of keys) {
    const previousRow = previousMap.get(key) ?? null;
    const currentRow = currentMap.get(key) ?? null;
    const master = masterMap.get(key) ?? null;

    const changeType: EmployeeChangeType = currentRow && previousRow ? "기존" : currentRow ? "신규" : "전월미존재";

    const previousComputed = previousRow ? computeSinglePeriod(previousRow, rules) : null;
    const currentComputed = currentRow ? computeSinglePeriod(currentRow, rules) : null;

    const issues = evaluateEmployeeRules(
      {
        employeeNumber: key,
        changeType,
        previousRow,
        currentRow,
        currentDuplicateCount: currentDuplicateCounts.get(key) ?? 0,
        previousComputed,
        currentComputed,
      },
      rules
    );

    const deltas = previousComputed && currentComputed ? buildDeltas(previousComputed, currentComputed) : [];
    const prevGross = previousComputed?.grossPay ?? 0;
    const currGross = currentComputed?.grossPay ?? 0;
    const totalChangeAmount = previousComputed && currentComputed ? currGross - prevGross : null;
    const totalChangeRate = previousComputed && currentComputed && prevGross > 0 ? ((currGross - prevGross) / prevGross) * 100 : null;

    const employeeName = currentComputed?.employeeName || previousComputed?.employeeName || master?.employeeName || "";
    const employmentStatus = currentComputed?.employmentStatus || previousComputed?.employmentStatus || master?.employmentStatus || "";

    results.push({
      employeeNumber: key,
      employeeName,
      department: master?.department ?? "",
      position: master?.position ?? "",
      employmentStatus,
      email: master?.email ?? "",
      phone: master?.phone ?? "",
      hireDate: master?.hireDate ?? "",

      changeType,
      previous: previousComputed,
      current: currentComputed,
      deltas,
      totalChangeAmount,
      totalChangeRate,

      issues,
      validationStatus: deriveValidationStatus(issues),
      reviewPriority: derivePriority(issues, totalChangeRate),

      reviewStatus: "미확인",
      reviewMemo: "",
      reviewUpdatedAt: null,
    });
  }

  for (const { key, row } of blankKeyRows) {
    const currentComputed = computeSinglePeriod(row, rules);
    const issues = evaluateEmployeeRules(
      {
        employeeNumber: key,
        changeType: "신규",
        previousRow: null,
        currentRow: row,
        currentDuplicateCount: 0,
        previousComputed: null,
        currentComputed,
      },
      rules
    );
    results.push({
      employeeNumber: currentComputed.employeeNumber || "(사번없음)",
      employeeName: currentComputed.employeeName,
      department: "",
      position: "",
      employmentStatus: currentComputed.employmentStatus,
      email: "",
      phone: "",
      hireDate: "",
      changeType: "신규",
      previous: null,
      current: currentComputed,
      deltas: [],
      totalChangeAmount: null,
      totalChangeRate: null,
      issues,
      validationStatus: deriveValidationStatus(issues),
      reviewPriority: derivePriority(issues, null),
      reviewStatus: "미확인",
      reviewMemo: "",
      reviewUpdatedAt: null,
    });
  }

  return results;
}

export { toNumber };
