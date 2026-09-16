"use client";

import { useRef, useState } from "react";
import { AlertTriangle, FileSpreadsheet, History, PlayCircle, Repeat, Sparkles, UploadCloud } from "lucide-react";
import { EmployeeComparison, PayrollRunSummary } from "@/lib/payroll/types";
import { won } from "@/lib/payroll/format";
import { downloadSampleCurrentExcel, downloadSamplePreviousExcel } from "@/lib/payroll/excel";
import StatusBadge, { PriorityBadge } from "./StatusBadge";
import ProfilePopover from "./ProfilePopover";

export interface UploadedFileInfo {
  fileName: string;
  rowCount: number;
}

interface Props {
  payrollMonth: string;
  onChangePayrollMonth: (v: string) => void;
  runName: string;
  onChangeRunName: (v: string) => void;

  previousFile: UploadedFileInfo | null;
  currentFile: UploadedFileInfo | null;
  uploadErrors: { previous?: string; current?: string };
  loadingStep: string | null;

  onUploadPrevious: (file: File) => void;
  onUploadCurrent: (file: File) => void;
  onStartWithSample: () => void;
  onStartValidation: () => void;

  comparisons: EmployeeComparison[] | null;
  summary: PayrollRunSummary | null;
  onOpenDrawer: (employee: EmployeeComparison) => void;
  onGotoReview: () => void;

  recentRuns: PayrollRunSummary[];
  onOpenRun: (id: string) => void;

  carryForwardSource: PayrollRunSummary | null;
  useCarryForward: boolean;
  onToggleCarryForward: (v: boolean) => void;
}

const PRIORITY_ORDER: Record<string, number> = { "높음": 0, "중간": 1, "낮음": 2 };

function UploadSlot({
  label,
  required,
  info,
  error,
  onFile,
}: {
  label: string;
  required: boolean;
  info: UploadedFileInfo | null;
  error?: string;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={`flex-1 cursor-pointer rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
        dragOver ? "border-brand bg-brand-soft" : "border-slate-300 hover:border-brand"
      }`}
    >
      <UploadCloud className="mx-auto mb-1.5 h-6 w-6 text-slate-400" />
      <div className="text-sm font-medium text-slate-700">
        {label} {required ? <span className="text-red-500">*</span> : <span className="text-slate-400">(선택)</span>}
      </div>
      <div className="mt-0.5 text-xs text-slate-400">.xlsx 클릭 또는 끌어다 놓기</div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
      {!error && info && (
        <div className="mt-2 flex items-center justify-center gap-1 text-xs text-slate-600">
          <FileSpreadsheet className="h-3.5 w-3.5 text-brand" />
          {info.fileName} · {info.rowCount}행
        </div>
      )}
    </label>
  );
}

export default function HomeView(props: Props) {
  const {
    payrollMonth,
    onChangePayrollMonth,
    runName,
    onChangeRunName,
    previousFile,
    currentFile,
    uploadErrors,
    loadingStep,
    onUploadPrevious,
    onUploadCurrent,
    onStartWithSample,
    onStartValidation,
    comparisons,
    summary,
    onOpenDrawer,
    onGotoReview,
    recentRuns,
    onOpenRun,
    carryForwardSource,
    useCarryForward,
    onToggleCarryForward,
  } = props;

  const carryForwardActive = Boolean(useCarryForward && carryForwardSource && !previousFile);
  const canValidate = Boolean(currentFile) && Boolean(previousFile || (useCarryForward && carryForwardSource));

  const priorityList = comparisons
    ? comparisons
        .filter((c) => c.validationStatus !== "정상" || c.changeType === "전월미존재")
        .sort((a, b) => PRIORITY_ORDER[a.reviewPriority] - PRIORITY_ORDER[b.reviewPriority])
        .slice(0, 6)
    : [];

  const reviewDone = comparisons?.filter((c) => c.reviewStatus === "확인완료").length ?? 0;
  const reviewTotal = comparisons?.filter((c) => c.validationStatus !== "정상" || c.changeType === "전월미존재").length ?? 0;
  const progress = reviewTotal > 0 ? Math.round((reviewDone / reviewTotal) * 100) : summary ? 100 : 0;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Payroll 급여 검증 및 마감 지원 시스템</h1>
        <p className="mt-1 text-sm text-slate-500">전월·당월 급여자료 비교부터 이상변동 검토 및 마감까지</p>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            기준월
            <input
              value={payrollMonth}
              onChange={(e) => onChangePayrollMonth(e.target.value)}
              placeholder="예: 2026-09"
              className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            작업명
            <input
              value={runName}
              onChange={(e) => onChangeRunName(e.target.value)}
              placeholder="예: 2026년 9월 Payroll 검증"
              className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </label>
          <button
            onClick={onStartWithSample}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Sparkles className="h-4 w-4 text-brand" />
            샘플 데이터로 시작
          </button>
        </div>

        {carryForwardSource && (
          <label
            className={`mt-4 flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm transition-colors ${
              carryForwardActive ? "border-brand bg-brand-soft" : "border-slate-200 bg-slate-50"
            }`}
          >
            <input
              type="checkbox"
              checked={useCarryForward}
              onChange={(e) => onToggleCarryForward(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-orange-500"
            />
            <span>
              <span className="flex items-center gap-1.5 font-medium text-slate-800">
                <Repeat className="h-3.5 w-3.5 text-brand" />
                지난 작업 결과를 전월 기준으로 자동 이월
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                &apos;{carryForwardSource.runName}&apos; ({carryForwardSource.payrollMonth}) 의 당월 결과 {carryForwardSource.employeeCount}명을
                전월 자료로 사용합니다. 전월 Payroll 파일을 직접 업로드하면 이 설정 대신 그 파일이 사용됩니다.
              </span>
            </span>
          </label>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <UploadSlot
            label="전월 Payroll"
            required={!carryForwardActive}
            info={
              previousFile ??
              (carryForwardActive && carryForwardSource
                ? { fileName: `자동 이월 · ${carryForwardSource.runName}`, rowCount: carryForwardSource.employeeCount }
                : null)
            }
            error={uploadErrors.previous}
            onFile={onUploadPrevious}
          />
          <UploadSlot label="당월 Payroll" required info={currentFile} error={uploadErrors.current} onFile={onUploadCurrent} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          <button onClick={downloadSamplePreviousExcel} className="underline hover:text-brand-dark">
            sample_payroll_previous.xlsx 다운로드
          </button>
          <span>·</span>
          <button onClick={downloadSampleCurrentExcel} className="underline hover:text-brand-dark">
            sample_payroll_current.xlsx 다운로드
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          부서·직책·이메일·연락처·입사일은 별도 파일 없이 위 Payroll 시트에 선택 컬럼으로 함께 넣을 수 있습니다.
        </p>

        <div className="mt-5">
          {loadingStep ? (
            <div className="text-sm font-medium text-slate-600">{loadingStep}</div>
          ) : (
            <button
              onClick={onStartValidation}
              disabled={!canValidate}
              className="flex items-center gap-2 rounded-md bg-brand px-6 py-3 text-sm font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              <PlayCircle className="h-5 w-5" />
              검증 시작
            </button>
          )}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-400">
          업로드된 원본 Excel 파일은 브라우저에서 처리되며 별도로 저장하지 않습니다. 모든 예시 데이터는 가상 데이터입니다.
        </p>
      </div>

      {summary && comparisons && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="처리대상" value={`${summary.employeeCount}명`} />
            <KpiCard label="정상" value={`${summary.normalCount}명`} accent="emerald" />
            <KpiCard label="확인필요" value={`${summary.reviewCount}명`} accent="brand" />
            <KpiCard label="오류" value={`${summary.errorCount}명`} accent="red" />
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">신규입사 {summary.newHireCount}명 (참고)</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">전월존재·당월미존재 {summary.droppedCount}명 (참고)</span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">급여 집계</h2>
            <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
              <div className="min-w-0">
                <div className="text-xs text-slate-400">총지급액</div>
                <div className="mt-1 break-words text-lg font-bold text-slate-900">{won(summary.totalGrossPay)}</div>
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-400">총공제액</div>
                <div className="mt-1 break-words text-lg font-bold text-slate-900">{won(summary.totalDeductions)}</div>
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-400">최종지급 예정액</div>
                <div className="mt-1 break-words text-lg font-bold text-brand-dark">{won(summary.totalNetPay)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <AlertTriangle className="h-4 w-4 text-brand" />
                우선 확인이 필요한 임직원
              </h2>
              <span className="text-xs text-slate-400">
                검토진행률 {progress}% ({reviewDone}/{reviewTotal})
              </span>
            </div>
            {priorityList.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">확인이 필요한 임직원이 없습니다.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {priorityList.map((c) => (
                  <li key={c.employeeNumber} className="flex items-center gap-3 py-2.5 text-sm">
                    <PriorityBadge priority={c.reviewPriority} />
                    <ProfilePopover employee={c} onOpenDrawer={onOpenDrawer} className="w-40" />
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-500">
                      {c.issues.find((i) => i.severity !== "정보")?.message ?? ""}
                    </span>
                    <StatusBadge status={c.validationStatus} />
                  </li>
                ))}
              </ul>
            )}
            <button onClick={onGotoReview} className="mt-3 text-sm font-medium text-brand-dark hover:underline">
              검토함에서 전체보기 →
            </button>
          </div>
        </>
      )}

      {recentRuns.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <History className="h-4 w-4 text-slate-400" />
            최근 작업
          </h2>
          <ul className="space-y-1.5">
            {recentRuns.slice(0, 3).map((r) => (
              <li
                key={r.id}
                onClick={() => onOpenRun(r.id)}
                className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-slate-50"
              >
                <span className="font-medium text-slate-700">
                  {r.runName} <span className="font-normal text-slate-400">({r.payrollMonth})</span>
                </span>
                <span className="text-slate-400">
                  처리 {r.employeeCount}명 · 정상 {r.normalCount} · 확인필요 {r.reviewCount}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: "brand" | "emerald" | "red" }) {
  const border =
    accent === "brand" ? "border-l-brand" : accent === "emerald" ? "border-l-emerald-500" : accent === "red" ? "border-l-red-500" : "border-l-slate-200";
  return (
    <div className={`rounded-lg border border-slate-200 border-l-4 bg-white p-4 shadow-sm ${border}`}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
