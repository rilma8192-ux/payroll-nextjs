"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { EmployeeComparison, PayrollRules, ReviewStatus } from "@/lib/payroll/types";
import { buildCalculationTrace } from "@/lib/payroll/calculation";
import { won, pct } from "@/lib/payroll/format";
import StatusBadge, { PriorityBadge, ReviewStatusBadge } from "./StatusBadge";
import ProfilePopover from "./ProfilePopover";

interface Props {
  employee: EmployeeComparison | null;
  rules: PayrollRules;
  onClose: () => void;
  onSaveReview: (employeeNumber: string, patch: { reviewStatus?: ReviewStatus; reviewMemo?: string }) => void;
}

function KV({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={bold ? "font-semibold text-slate-900" : "text-slate-800"}>{value}</span>
    </div>
  );
}

const REVIEW_OPTIONS: ReviewStatus[] = ["미확인", "검토중", "확인완료"];

export default function PayrollDrawer({ employee, rules, onClose, onSaveReview }: Props) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!employee) return null;

  // employeeNumber 로 key 를 주어, 직원이 바뀌면 아래 내부 상태(메모 입력값/펼침 여부)가
  // 자연스럽게 초기화되도록 한다 (effect 로 동기화하지 않는다).
  return <DrawerContent key={employee.employeeNumber} employee={employee} rules={rules} onClose={onClose} onSaveReview={onSaveReview} />;
}

function DrawerContent({ employee, rules, onClose, onSaveReview }: Props & { employee: EmployeeComparison }) {
  const [showDetail, setShowDetail] = useState(false);
  const [memo, setMemo] = useState(employee.reviewMemo);

  const c = employee;
  const trace = c.current ? buildCalculationTrace(c.current, rules) : [];
  const mainIssues = c.issues.filter((i) => i.severity !== "정보");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <ProfilePopover employee={c} />
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={c.validationStatus} />
              <PriorityBadge priority={c.reviewPriority} />
              <ReviewStatusBadge status={c.reviewStatus} />
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="닫기">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          {!c.current ? (
            <div className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">
              당월 Payroll 자료에 존재하지 않습니다. 전월 자료만 남아 있는 상태입니다.
            </div>
          ) : (
            <>
              <div>
                <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">전월 → 당월 비교</h3>
                <KV label="전월 총지급액" value={c.previous ? won(c.previous.grossPay) : "N/A"} />
                <KV label="당월 총지급액" value={won(c.current.grossPay)} />
                <KV label="증감금액" value={c.totalChangeAmount === null ? "N/A" : won(c.totalChangeAmount)} />
                <KV label="증감률" value={pct(c.totalChangeRate)} bold />
              </div>

              {c.deltas.filter((d) => d.amount !== 0).length > 0 && (
                <div>
                  <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">주요 변동 항목</h3>
                  {c.deltas
                    .filter((d) => d.amount !== 0)
                    .map((d) => (
                      <KV
                        key={d.field}
                        label={d.label}
                        value={`${won(d.previous)} → ${won(d.current)} (${d.amount >= 0 ? "+" : ""}${d.amount.toLocaleString("ko-KR")}원)`}
                      />
                    ))}
                </div>
              )}

              <div>
                <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">확인 필요 Rule</h3>
                {mainIssues.length === 0 ? (
                  <div className="text-sm text-slate-500">확인이 필요한 항목이 없습니다.</div>
                ) : (
                  <ul className="space-y-1.5">
                    {mainIssues.map((issue, i) => (
                      <li key={i} className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
                        <span className="mr-1.5 font-mono text-[10px] text-slate-400">{issue.ruleId}</span>
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <button
                  onClick={() => setShowDetail((v) => !v)}
                  className="flex w-full items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  상세 급여내역 보기
                  {showDetail ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showDetail && (
                  <div className="mt-3 space-y-4">
                    <div>
                      <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">지급내역</h4>
                      <KV label="기본급" value={won(c.current.baseSalary)} />
                      <KV label="직책수당" value={won(c.current.positionAllowance)} />
                      <KV label="식대" value={won(c.current.mealAllowance)} />
                      <KV label="기타고정수당" value={won(c.current.fixedAllowance)} />
                      <KV label="연장근로수당" value={won(c.current.overtimePay)} />
                      <KV label="인센티브" value={won(c.current.incentive)} />
                      <KV label="성과급" value={won(c.current.bonus)} />
                      <KV label="기타지급" value={won(c.current.otherPayment)} />
                      <KV label="총지급액" value={won(c.current.grossPay)} bold />
                    </div>
                    <div>
                      <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">공제내역</h4>
                      <KV label="국민연금" value={won(c.current.pension)} />
                      <KV label="건강보험" value={won(c.current.healthInsurance)} />
                      <KV label="고용보험" value={won(c.current.employmentInsurance)} />
                      <KV label="소득세" value={won(c.current.incomeTax)} />
                      <KV label="지방소득세" value={won(c.current.localIncomeTax)} />
                      <KV label="기타공제" value={won(c.current.otherDeduction)} />
                      <KV label="총공제액" value={won(c.current.totalDeductions)} bold />
                    </div>
                    <div className="rounded-md bg-brand-soft px-4 py-3 text-sm">
                      최종지급액 <span className="font-bold text-brand-dark">{won(c.current.netPay)}</span>
                    </div>
                    <div>
                      <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                        계산 근거 (왜 이 값이 나왔는가)
                      </h4>
                      <ul className="space-y-1.5 rounded-md bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                        {trace.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="border-t border-slate-200 pt-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">담당자 검토</h3>
            <div className="mb-2 flex gap-1.5">
              {REVIEW_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => onSaveReview(c.employeeNumber, { reviewStatus: opt })}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    c.reviewStatus === opt ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="검토 메모를 남겨주세요 (예: 부서장 확인 완료, 인센티브 지급 근거 확인함)"
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
            <button
              onClick={() => onSaveReview(c.employeeNumber, { reviewMemo: memo })}
              className="mt-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              메모 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
