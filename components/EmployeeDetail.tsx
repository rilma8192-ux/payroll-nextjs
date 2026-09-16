"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { PayrollResult, PayrollRules } from "@/lib/payroll/types";
import { buildCalculationTrace } from "@/lib/payroll/calculation";
import { won, pct } from "@/lib/payroll/format";
import StatusBadge from "./StatusBadge";

interface Props {
  result: PayrollResult | null;
  rules: PayrollRules;
  onClose: () => void;
}

function KV({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={bold ? "font-semibold text-slate-900" : "text-slate-800"}>{value}</span>
    </div>
  );
}

export default function EmployeeDetail({ result, rules, onClose }: Props) {
  const [showTrace, setShowTrace] = useState(false);

  if (!result) return null;

  const trace = buildCalculationTrace(result, rules);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
            {result.employeeName}
            <StatusBadge status={result.status} />
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-5 py-4">
          <div>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">기본정보</h3>
            <KV label="사번" value={result.employeeNumber} />
            <KV label="성명" value={result.employeeName} />
            <KV label="재직상태" value={result.employmentStatus} />
            <KV label="부서" value={result.department || "-"} />
            <KV label="연락처" value={result.phone || "-"} />
            <KV label="이메일" value={result.email || "-"} />
          </div>

          <div>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">지급내역</h3>
            <KV label="기본급" value={won(result.baseSalary)} />
            <KV label="직책수당" value={won(result.positionAllowance)} />
            <KV label="식대" value={won(result.mealAllowance)} />
            <KV label="기타고정수당" value={won(result.fixedAllowance)} />
            <KV label="연장근로수당" value={won(result.overtimePay)} />
            <KV label="인센티브" value={won(result.incentive)} />
            <KV label="성과급" value={won(result.bonus)} />
            <KV label="기타지급" value={won(result.otherPayment)} />
            <KV label="총 지급액" value={won(result.grossPay)} bold />
          </div>

          <div>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">공제내역</h3>
            <KV label="국민연금" value={won(result.pension)} />
            <KV label="건강보험" value={won(result.healthInsurance)} />
            <KV label="고용보험" value={won(result.employmentInsurance)} />
            <KV label="소득세" value={won(result.incomeTax)} />
            <KV label="지방소득세" value={won(result.localIncomeTax)} />
            <KV label="기타공제" value={won(result.otherDeduction)} />
            <KV label="총 공제액" value={won(result.totalDeductions)} bold />
          </div>

          <div className="rounded-md bg-orange-50 px-4 py-3 text-sm">
            총 지급액 {won(result.grossPay)} − 총 공제액 {won(result.totalDeductions)} ={" "}
            <span className="font-bold text-orange-600">최종 지급액 {won(result.netPay)}</span>
          </div>

          <div>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">전월 비교</h3>
            <KV label="전월 총지급액" value={won(result.previousGrossPay)} />
            <KV label="당월 총지급액" value={won(result.grossPay)} />
            <KV label="변동금액" value={result.changeAmount === null ? "N/A" : won(result.changeAmount)} />
            <KV label="변동률" value={pct(result.changeRate)} />
          </div>

          <div>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">검증</h3>
            <div className="mb-2">
              <StatusBadge status={result.status} />
            </div>
            {result.reasons.length > 0 ? (
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
                {result.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-500">특이사항이 없습니다.</div>
            )}
          </div>

          <div>
            <button
              onClick={() => setShowTrace((v) => !v)}
              className="text-sm font-medium text-orange-600 hover:underline"
            >
              📌 계산 근거 {showTrace ? "숨기기" : "보기"} (왜 이 값이 나왔는가)
            </button>
            {showTrace && (
              <ul className="mt-2 space-y-1.5 rounded-md bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                {trace.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
