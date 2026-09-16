"use client";

import { CheckCircle2, Download, Lock } from "lucide-react";
import { EmployeeComparison, PayrollRunSummary } from "@/lib/payroll/types";
import { won } from "@/lib/payroll/format";
import { downloadResultExcel } from "@/lib/payroll/excel";

interface Props {
  summary: PayrollRunSummary | null;
  comparisons: EmployeeComparison[] | null;
  onClose: () => void;
}

export default function CloseView({ summary, comparisons, onClose }: Props) {
  if (!summary || !comparisons) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        먼저 홈에서 Payroll 자료를 업로드하거나 샘플 데이터로 시작해 주세요.
      </div>
    );
  }

  const remaining = summary.reviewCount + summary.errorCount - summary.reviewDoneCount;
  const isClosed = Boolean(summary.closedAt);

  const newHires = comparisons.filter((c) => c.changeType === "신규");
  const dropped = comparisons.filter((c) => c.changeType === "전월미존재");

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">{summary.payrollMonth} Payroll 마감</h1>
        <p className="mt-1 text-sm text-slate-500">{summary.runName}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="처리대상" value={`${summary.employeeCount}명`} />
          <Stat label="확인필요" value={`${summary.reviewCount}명`} />
          <Stat label="오류" value={`${summary.errorCount}명`} />
          <Stat label="검토완료" value={`${summary.reviewDoneCount}명`} />
        </div>

        <div className={`mt-4 rounded-md px-4 py-3 text-sm ${remaining > 0 ? "bg-brand-soft text-brand-dark" : "bg-emerald-50 text-emerald-700"}`}>
          {remaining > 0
            ? `확인이 필요한 항목이 ${remaining}건 남아 있습니다.`
            : "모든 확인 대상 검토가 완료되었습니다."}
        </div>

        {isClosed && (
          <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-slate-600">
            <Lock className="h-4 w-4" />
            {new Date(summary.closedAt as string).toLocaleString("ko-KR")}에 검토완료 상태로 마감되었습니다.
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
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
            <div className="text-xs text-slate-400">최종지급액</div>
            <div className="mt-1 break-words text-lg font-bold text-brand-dark">{won(summary.totalNetPay)}</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1">신규입사 {newHires.length}명</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">전월존재·당월미존재 확인 {dropped.length}명</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => downloadResultExcel(summary, comparisons)}
          className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Payroll 결과 다운로드
        </button>
        {!isClosed && (
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark"
          >
            <CheckCircle2 className="h-4 w-4" />
            검토완료 상태로 마감
          </button>
        )}
      </div>

      <p className="text-xs leading-relaxed text-slate-400">
        본 마감은 실제 법적 승인 절차가 아니라, 담당자의 검토완료 상태를 기록하는 시연용 기능입니다. 실제 업무 적용
        전 회사의 정식 마감·승인 절차를 따라야 합니다.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3 text-center">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-base font-bold text-slate-900">{value}</div>
    </div>
  );
}
