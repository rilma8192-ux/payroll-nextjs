import { EmployeeComparison, PayrollRunRecord, PayrollRunSummary, ReviewStatus } from "../payroll/types";

/**
 * runStorage.ts
 * -----------------------------------------------------------------------
 * 작업(run) 저장/조회 Storage Layer. 현재는 브라우저 localStorage 를
 * 사용하지만, 이 파일이 유일한 진입점이므로 이후 실제 DB/API 로 교체할
 * 때 이 파일만 바꾸면 된다 (호출부는 변경할 필요가 없다).
 *
 * 원본 Excel 파일 자체는 저장하지 않으며, 계산된 결과와 검토 상태만
 * 저장한다. 실제 업무 적용 시에는 저장 위치의 접근권한·보안·감사로그를
 * 별도로 검토해야 한다 (README 참고).
 * -----------------------------------------------------------------------
 */

const INDEX_KEY = "payroll_run_index_v1";
const RECORD_KEY_PREFIX = "payroll_run_record_v1_";
const MAX_HISTORY = 20;

export function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const testKey = "__payroll_storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function readIndex(): PayrollRunSummary[] {
  if (!isStorageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PayrollRunSummary[];
  } catch {
    return [];
  }
}

function writeIndex(index: PayrollRunSummary[]): void {
  if (!isStorageAvailable()) return;
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function listRunSummaries(): PayrollRunSummary[] {
  return readIndex()
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getRunRecord(id: string): PayrollRunRecord | null {
  if (!isStorageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(RECORD_KEY_PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw) as PayrollRunRecord;
  } catch {
    return null;
  }
}

function persistRecord(record: PayrollRunRecord): void {
  if (!isStorageAvailable()) return;
  window.localStorage.setItem(RECORD_KEY_PREFIX + record.summary.id, JSON.stringify(record));

  const index = readIndex().filter((r) => r.id !== record.summary.id);
  index.unshift(record.summary);
  writeIndex(index.slice(0, MAX_HISTORY));
}

export function saveRun(record: PayrollRunRecord): void {
  persistRecord(record);
}

function recomputeReviewDoneCount(comparisons: EmployeeComparison[]): number {
  return comparisons.filter((c) => c.reviewStatus === "확인완료").length;
}

/** 특정 직원의 검토상태/메모를 갱신하고, 즉시 localStorage 에 반영한다. */
export function updateEmployeeReview(
  runId: string,
  employeeNumber: string,
  patch: { reviewStatus?: ReviewStatus; reviewMemo?: string }
): PayrollRunRecord | null {
  const record = getRunRecord(runId);
  if (!record) return null;

  const now = new Date().toISOString();
  const comparisons = record.comparisons.map((c) =>
    c.employeeNumber === employeeNumber
      ? {
          ...c,
          reviewStatus: patch.reviewStatus ?? c.reviewStatus,
          reviewMemo: patch.reviewMemo ?? c.reviewMemo,
          reviewUpdatedAt: now,
        }
      : c
  );

  const updated: PayrollRunRecord = {
    ...record,
    comparisons,
    summary: { ...record.summary, reviewDoneCount: recomputeReviewDoneCount(comparisons) },
  };
  persistRecord(updated);
  return updated;
}

export function closeRun(runId: string): PayrollRunRecord | null {
  const record = getRunRecord(runId);
  if (!record) return null;
  const updated: PayrollRunRecord = {
    ...record,
    summary: { ...record.summary, closedAt: new Date().toISOString() },
  };
  persistRecord(updated);
  return updated;
}

export function deleteRun(runId: string): void {
  if (!isStorageAvailable()) return;
  window.localStorage.removeItem(RECORD_KEY_PREFIX + runId);
  writeIndex(readIndex().filter((r) => r.id !== runId));
}

export function generateRunId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
