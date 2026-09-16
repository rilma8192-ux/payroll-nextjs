"use client";

import { useEffect, useMemo, useState } from "react";
import { EmployeeComparison, EmployeeMaster, PayrollInputRow, PayrollRules, PayrollRunRecord, ReviewStatus } from "@/lib/payroll/types";
import { DEFAULT_RULES } from "@/lib/payroll/rules";
import { masterRowFromExcelRecord, payrollRowFromExcelRecord } from "@/lib/payroll/columns";
import { buildSampleDataset } from "@/lib/payroll/sampleData";
import { buildEmployeeComparisons } from "@/lib/payroll/compare";
import { buildRunRecord, mergeReviewState, recomputeRunRecord } from "@/lib/payroll/buildRun";
import { ExcelParseError, parseMasterFile, parsePayrollFile } from "@/lib/payroll/excel";
import { getRunRecord, listRunSummaries, saveRun, updateEmployeeReview, closeRun as closeRunInStorage } from "@/lib/storage/runStorage";

import Sidebar, { ViewId } from "./layout/Sidebar";
import HomeView, { UploadedFileInfo } from "./HomeView";
import DirectoryView from "./DirectoryView";
import ReviewInboxView from "./ReviewInboxView";
import CloseView from "./CloseView";
import PayrollDrawer from "./PayrollDrawer";
import SettingsPanel from "./SettingsPanel";

const CALC_STEPS = [
  "1. 사번 매칭 중...",
  "2. 지급/공제 계산 중...",
  "3. 전월 대비 비교 중...",
  "4. 검증 Rule 적용 중...",
  "5. 확인 필요 항목 추출 중...",
];

function defaultRunName() {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 Payroll 검증`;
}

function defaultPayrollMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function PayrollApp() {
  const [activeView, setActiveView] = useState<ViewId>("home");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeComparison | null>(null);

  const [payrollMonth, setPayrollMonth] = useState(defaultPayrollMonth());
  const [runName, setRunName] = useState(defaultRunName());

  const [masterRows, setMasterRows] = useState<EmployeeMaster[] | null>(null);
  const [previousRows, setPreviousRows] = useState<PayrollInputRow[] | null>(null);
  const [currentRows, setCurrentRows] = useState<PayrollInputRow[] | null>(null);

  const [masterFile, setMasterFile] = useState<UploadedFileInfo | null>(null);
  const [previousFile, setPreviousFile] = useState<UploadedFileInfo | null>(null);
  const [currentFile, setCurrentFile] = useState<UploadedFileInfo | null>(null);
  const [uploadErrors, setUploadErrors] = useState<{ master?: string; previous?: string; current?: string }>({});

  const [rules, setRules] = useState<PayrollRules>(DEFAULT_RULES);
  const [activeRun, setActiveRun] = useState<PayrollRunRecord | null>(null);
  const [loadedFromHistory, setLoadedFromHistory] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);

  // 서버 렌더링과 첫 클라이언트 렌더의 hydration mismatch를 피하기 위해 빈 배열로 시작하고,
  // localStorage 값은 마운트 이후 useEffect 에서만 읽어온다.
  const [recentRuns, setRecentRuns] = useState<ReturnType<typeof listRunSummaries>>([]);

  function refreshRecentRuns() {
    setRecentRuns(listRunSummaries());
  }

  useEffect(() => {
    refreshRecentRuns();
  }, []);

  async function handleUploadMaster(file: File) {
    try {
      const parsed = await parseMasterFile(file);
      setMasterRows(parsed.rows);
      setMasterFile({ fileName: parsed.fileName, rowCount: parsed.rows.length });
      setUploadErrors((e) => ({ ...e, master: undefined }));
    } catch (e) {
      setMasterRows(null);
      setMasterFile(null);
      setUploadErrors((prev) => ({ ...prev, master: e instanceof ExcelParseError ? e.message : "예상치 못한 오류로 파일을 처리하지 못했습니다." }));
    }
  }

  async function handleUploadPrevious(file: File) {
    try {
      const parsed = await parsePayrollFile(file);
      setPreviousRows(parsed.rows);
      setPreviousFile({ fileName: parsed.fileName, rowCount: parsed.rows.length });
      setUploadErrors((e) => ({ ...e, previous: undefined }));
    } catch (e) {
      setPreviousRows(null);
      setPreviousFile(null);
      setUploadErrors((prev) => ({ ...prev, previous: e instanceof ExcelParseError ? e.message : "예상치 못한 오류로 파일을 처리하지 못했습니다." }));
    }
  }

  async function handleUploadCurrent(file: File) {
    try {
      const parsed = await parsePayrollFile(file);
      setCurrentRows(parsed.rows);
      setCurrentFile({ fileName: parsed.fileName, rowCount: parsed.rows.length });
      setUploadErrors((e) => ({ ...e, current: undefined }));
    } catch (e) {
      setCurrentRows(null);
      setCurrentFile(null);
      setUploadErrors((prev) => ({ ...prev, current: e instanceof ExcelParseError ? e.message : "예상치 못한 오류로 파일을 처리하지 못했습니다." }));
    }
  }

  function handleStartWithSample() {
    const { master, previous, current } = buildSampleDataset();
    const masterParsed = master.map((r) => masterRowFromExcelRecord(r as unknown as Record<string, unknown>));
    const previousParsed = previous.map((r) => payrollRowFromExcelRecord(r as unknown as Record<string, unknown>));
    const currentParsed = current.map((r) => payrollRowFromExcelRecord(r as unknown as Record<string, unknown>));

    setMasterRows(masterParsed);
    setPreviousRows(previousParsed);
    setCurrentRows(currentParsed);
    setMasterFile({ fileName: "sample_employee_master.xlsx", rowCount: masterParsed.length });
    setPreviousFile({ fileName: "sample_payroll_previous.xlsx", rowCount: previousParsed.length });
    setCurrentFile({ fileName: "sample_payroll_current.xlsx", rowCount: currentParsed.length });
    setUploadErrors({});
  }

  async function runValidation() {
    if (!previousRows || !currentRows) return;
    setLoadedFromHistory(false);
    for (const step of CALC_STEPS) {
      setLoadingStep(step);
      await new Promise((r) => setTimeout(r, 110));
    }
    const comparisons = buildEmployeeComparisons(masterRows ?? [], previousRows, currentRows, rules);
    const record = buildRunRecord(comparisons, runName.trim() || defaultRunName(), payrollMonth.trim() || defaultPayrollMonth(), rules);
    saveRun(record);
    setActiveRun(record);
    setLoadingStep(null);
    refreshRecentRuns();
    setActiveView("home");
  }

  function handleSaveRules(newRules: PayrollRules) {
    if (!activeRun || !previousRows || !currentRows || loadedFromHistory) return;
    const fresh = buildEmployeeComparisons(masterRows ?? [], previousRows, currentRows, newRules);
    const merged = mergeReviewState(fresh, activeRun.comparisons);
    const updated = recomputeRunRecord(activeRun.summary, merged, newRules);
    saveRun(updated);
    setRules(newRules);
    setActiveRun(updated);
    refreshRecentRuns();
    setSettingsOpen(false);
  }

  function handleSaveReview(employeeNumber: string, patch: { reviewStatus?: ReviewStatus; reviewMemo?: string }) {
    if (!activeRun) return;
    const updated = updateEmployeeReview(activeRun.summary.id, employeeNumber, patch);
    if (!updated) return;
    setActiveRun(updated);
    refreshRecentRuns();
    setSelectedEmployee((prev) => (prev ? updated.comparisons.find((c) => c.employeeNumber === employeeNumber) ?? prev : prev));
  }

  function handleCloseRun() {
    if (!activeRun) return;
    const updated = closeRunInStorage(activeRun.summary.id);
    if (updated) {
      setActiveRun(updated);
      refreshRecentRuns();
    }
  }

  function handleOpenRun(id: string) {
    const record = getRunRecord(id);
    if (!record) return;
    setActiveRun(record);
    setRules(record.rules);
    setLoadedFromHistory(true);
    setActiveView("home");
  }

  const pendingReviewCount = useMemo(() => {
    if (!activeRun) return 0;
    return activeRun.comparisons.filter((c) => (c.validationStatus !== "정상" || c.changeType === "전월미존재") && c.reviewStatus !== "확인완료").length;
  }, [activeRun]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar active={activeView} onSelect={setActiveView} reviewBadgeCount={pendingReviewCount} onOpenSettings={() => setSettingsOpen(true)} />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl">
          {activeView === "home" && (
            <HomeView
              payrollMonth={payrollMonth}
              onChangePayrollMonth={setPayrollMonth}
              runName={runName}
              onChangeRunName={setRunName}
              masterFile={masterFile}
              previousFile={previousFile}
              currentFile={currentFile}
              uploadErrors={uploadErrors}
              loadingStep={loadingStep}
              onUploadMaster={handleUploadMaster}
              onUploadPrevious={handleUploadPrevious}
              onUploadCurrent={handleUploadCurrent}
              onStartWithSample={handleStartWithSample}
              onStartValidation={runValidation}
              comparisons={activeRun?.comparisons ?? null}
              summary={activeRun?.summary ?? null}
              onOpenDrawer={setSelectedEmployee}
              onGotoReview={() => setActiveView("review")}
              recentRuns={recentRuns}
              onOpenRun={handleOpenRun}
            />
          )}

          {activeView === "directory" && (
            <>
              {activeRun ? (
                <DirectoryView comparisons={activeRun.comparisons} onOpenDrawer={setSelectedEmployee} />
              ) : (
                <EmptyState />
              )}
            </>
          )}

          {activeView === "review" && (
            <>
              {activeRun ? (
                <ReviewInboxView comparisons={activeRun.comparisons} onOpenDrawer={setSelectedEmployee} />
              ) : (
                <EmptyState />
              )}
            </>
          )}

          {activeView === "close" && (
            <CloseView summary={activeRun?.summary ?? null} comparisons={activeRun?.comparisons ?? null} onClose={handleCloseRun} />
          )}
        </div>
      </main>

      <PayrollDrawer employee={selectedEmployee} rules={rules} onClose={() => setSelectedEmployee(null)} onSaveReview={handleSaveReview} />

      <SettingsPanel
        open={settingsOpen}
        rules={rules}
        canRecalculate={Boolean(activeRun && previousRows && currentRows && !loadedFromHistory)}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveRules}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
      Payroll 자료를 업로드하거나 샘플 데이터로 시작해 주세요.
    </div>
  );
}
