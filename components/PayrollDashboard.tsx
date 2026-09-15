"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Download, PlayCircle, Save, Undo2 } from "lucide-react";

import { EmployeeInput, PayrollResult, PayrollRules, PayrollRun } from "@/lib/payroll/types";
import { DEFAULT_RULES } from "@/lib/payroll/rules";
import { computePayroll } from "@/lib/payroll/calculation";
import { downloadResultExcel, ExcelParseError, parseExcelFile } from "@/lib/payroll/excel";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getPayrollRunResults, savePayrollRun, SupabaseNotConfiguredError } from "@/lib/supabase/payrollHistory";

import PayrollUpload from "./PayrollUpload";
import RuleSettings from "./RuleSettings";
import SummaryCards from "./SummaryCards";
import PayrollTable from "./PayrollTable";
import ValidationPanel from "./ValidationPanel";
import EmployeeDetail from "./EmployeeDetail";
import PayrollHistory from "./PayrollHistory";

const CALC_STEPS = [
  "1. 데이터 검증 중...",
  "2. 지급 항목 계산 중...",
  "3. 공제 항목 계산 중...",
  "4. 최종 지급액 계산 중...",
  "5. 전월 대비 변동 계산 중...",
  "6. 검증 상태 생성 중...",
];

export default function PayrollDashboard() {
  const supabaseConfigured = useMemo(() => isSupabaseConfigured(), []);

  // 업로드 상태
  const [rawRows, setRawRows] = useState<EmployeeInput[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [columnCount, setColumnCount] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  // 계산 규칙 / 결과
  const [rules, setRules] = useState<PayrollRules>(DEFAULT_RULES);
  const [results, setResults] = useState<PayrollResult[] | null>(null);
  const [calcStep, setCalcStep] = useState<string | null>(null);

  // 상세 보기
  const [selected, setSelected] = useState<PayrollResult | null>(null);

  // 저장
  const [runName, setRunName] = useState("");
  const [payrollMonth, setPayrollMonth] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);

  // 작업 이력 조회 모드
  const [viewingRun, setViewingRun] = useState<PayrollRun | null>(null);
  const [historyResults, setHistoryResults] = useState<PayrollResult[] | null>(null);
  const [historyLoadError, setHistoryLoadError] = useState<string | null>(null);

  const displayedResults = viewingRun ? historyResults : results;

  async function handleFileSelected(file: File) {
    setParsing(true);
    setUploadError(null);
    setResults(null);
    setViewingRun(null);
    setHistoryResults(null);
    setSelected(null);
    setSaveState("idle");
    try {
      const parsed = await parseExcelFile(file);
      setRawRows(parsed.rows);
      setFileName(parsed.fileName);
      setColumnCount(parsed.columnCount);
    } catch (e) {
      setRawRows(null);
      setFileName(null);
      setColumnCount(null);
      setUploadError(e instanceof ExcelParseError ? e.message : "예상치 못한 오류로 파일을 처리하지 못했습니다.");
    } finally {
      setParsing(false);
    }
  }

  async function runPayroll(nextRules: PayrollRules) {
    if (!rawRows) return;
    setViewingRun(null);
    setHistoryResults(null);
    setSaveState("idle");

    for (const step of CALC_STEPS) {
      setCalcStep(step);
      await new Promise((r) => setTimeout(r, 120));
    }
    const computed = computePayroll(rawRows, nextRules);
    setResults(computed);
    setCalcStep(null);
  }

  function handleRecalculate(nextRules: PayrollRules) {
    setRules(nextRules);
    if (rawRows) runPayroll(nextRules);
  }

  async function handleSave() {
    if (!results) return;
    if (!runName.trim()) {
      setSaveState("error");
      setSaveMessage("작업명을 입력해주세요.");
      return;
    }
    setSaveState("saving");
    setSaveMessage(null);
    try {
      await savePayrollRun(runName.trim(), payrollMonth.trim() || runName.trim(), results);
      setSaveState("saved");
      setSaveMessage("작업 결과가 저장되었습니다.");
      setHistoryRefreshToken((t) => t + 1);
    } catch (e) {
      setSaveState("error");
      setSaveMessage(e instanceof SupabaseNotConfiguredError ? e.message : (e as Error).message);
    }
  }

  async function handleOpenRun(run: PayrollRun) {
    setHistoryLoadError(null);
    setSelected(null);
    try {
      const runResults = run.id ? await getPayrollRunResults(run.id) : [];
      setViewingRun(run);
      setHistoryResults(runResults);
    } catch (e) {
      setHistoryLoadError((e as Error).message);
    }
  }

  function handleExitHistory() {
    setViewingRun(null);
    setHistoryResults(null);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 lg:px-8">
      <header className="rounded-lg bg-slate-900 px-6 py-6 text-white">
        <h1 className="text-2xl font-bold">
          Payroll 급여 산출 및 검증 자동화{" "}
          <span className="ml-2 rounded-full bg-orange-500 px-2.5 py-0.5 align-middle text-xs font-semibold">
            시연용 프로토타입
          </span>
        </h1>
        <p className="mt-1 text-sm text-slate-300">급여 입력자료 검증부터 최종 지급액 산출까지</p>
      </header>

      <div className="rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-xs leading-relaxed text-slate-700">
        본 프로토타입의 보험료율 및 검증 기준은 시연용 예시 값이며 실제 Payroll 산출 기준이 아닙니다. 실제
        업무 적용 시 회사 정책 및 공식 Payroll 기준에 따른 추가 검증이 필요합니다. 모든 예시 데이터는
        가상 데이터입니다.
      </div>

      <PayrollUpload
        onFileSelected={handleFileSelected}
        fileName={fileName}
        columnCount={columnCount}
        employeeCount={rawRows?.length ?? null}
        error={uploadError}
        loading={parsing}
      />

      {rawRows && (
        <>
          <RuleSettings rules={rules} onRecalculate={handleRecalculate} hasData={Boolean(rawRows)} />

          {!results && !calcStep && (
            <section className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
              <button
                onClick={() => runPayroll(rules)}
                className="inline-flex items-center gap-2 rounded-md bg-orange-500 px-6 py-3 text-sm font-bold text-white hover:bg-orange-600"
              >
                <PlayCircle className="h-5 w-5" />
                급여 산출 실행
              </button>
            </section>
          )}

          {calcStep && (
            <section className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="text-sm font-medium text-slate-600">{calcStep}</div>
            </section>
          )}
        </>
      )}

      {viewingRun && (
        <div className="flex items-center justify-between rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-sm">
          <span>
            과거 작업 <b>{viewingRun.runName}</b> 결과를 조회하고 있습니다.
          </span>
          <button
            onClick={handleExitHistory}
            className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-100"
          >
            <Undo2 className="h-3.5 w-3.5" />
            현재 작업으로 돌아가기
          </button>
        </div>
      )}
      {historyLoadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{historyLoadError}</div>
      )}

      {displayedResults && (
        <>
          <SummaryCards results={displayedResults} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <PayrollTable results={displayedResults} onSelect={setSelected} />
            </div>
            <div>
              <ValidationPanel results={displayedResults} onSelect={setSelected} />
            </div>
          </div>

          <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
            <button
              onClick={() => downloadResultExcel(displayedResults)}
              className="flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              급여 산출 결과 다운로드
            </button>

            {!viewingRun && (
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end sm:justify-end">
                <label className="flex flex-col gap-1 text-xs text-slate-500">
                  작업명
                  <input
                    value={runName}
                    onChange={(e) => setRunName(e.target.value)}
                    placeholder="예: 2026년 9월 급여 시뮬레이션"
                    className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-500">
                  대상 월
                  <input
                    value={payrollMonth}
                    onChange={(e) => setPayrollMonth(e.target.value)}
                    placeholder="예: 2026-09"
                    className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                  />
                </label>
                <button
                  onClick={handleSave}
                  disabled={saveState === "saving"}
                  className="flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saveState === "saving" ? "저장 중..." : "작업 결과 저장"}
                </button>
              </div>
            )}
          </section>

          {saveMessage && (
            <div
              className={`flex items-center gap-2 rounded-md px-4 py-3 text-sm ${
                saveState === "saved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}
            >
              {saveState === "saved" && <CheckCircle2 className="h-4 w-4" />}
              {saveMessage}
            </div>
          )}
        </>
      )}

      <PayrollHistory refreshToken={historyRefreshToken} onOpenRun={handleOpenRun} supabaseConfigured={supabaseConfigured} />

      <EmployeeDetail result={selected} rules={rules} onClose={() => setSelected(null)} />
    </div>
  );
}
