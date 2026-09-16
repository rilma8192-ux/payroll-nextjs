"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EmployeeComparison, ReviewPriority, ReviewStatus } from "@/lib/payroll/types";
import { pct } from "@/lib/payroll/format";
import { VALIDATION_NOTE } from "@/lib/payroll/validation";
import { REVIEW_PRIORITY_DISCLAIMER } from "@/lib/payroll/rules";
import StatusBadge, { PriorityBadge, ReviewStatusBadge } from "./StatusBadge";
import ProfilePopover from "./ProfilePopover";

interface Props {
  comparisons: EmployeeComparison[];
  onOpenDrawer: (employee: EmployeeComparison) => void;
}

const PRIORITY_ORDER: Record<ReviewPriority, number> = { "높음": 0, "중간": 1, "낮음": 2 };
const REVIEW_FILTERS: Array<ReviewStatus | "전체"> = ["전체", "미확인", "검토중", "확인완료"];

export default function ReviewInboxView({ comparisons, onOpenDrawer }: Props) {
  const [reviewFilter, setReviewFilter] = useState<ReviewStatus | "전체">("전체");
  const [search, setSearch] = useState("");

  const items = useMemo(() => {
    return comparisons
      .filter((c) => c.validationStatus !== "정상" || c.changeType === "전월미존재")
      .filter((c) => reviewFilter === "전체" || c.reviewStatus === reviewFilter)
      .filter((c) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          c.employeeNumber.toLowerCase().includes(q) ||
          c.employeeName.toLowerCase().includes(q) ||
          c.department.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => PRIORITY_ORDER[a.reviewPriority] - PRIORITY_ORDER[b.reviewPriority]);
  }, [comparisons, reviewFilter, search]);

  const totalNeedReview = comparisons.filter((c) => c.validationStatus !== "정상" || c.changeType === "전월미존재").length;
  const doneCount = comparisons.filter((c) => c.reviewStatus === "확인완료").length;
  const progress = totalNeedReview > 0 ? Math.round((doneCount / totalNeedReview) * 100) : 100;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900">검토함</h1>
            <p className="mt-0.5 text-xs text-slate-400">{VALIDATION_NOTE}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500">
              확인완료 <span className="font-semibold text-slate-800">{doneCount}</span> / {totalNeedReview}
            </div>
            <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-brand" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5">
            {REVIEW_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setReviewFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  reviewFilter === f ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="사번·성명·부서 검색"
              className="rounded-md border border-slate-300 py-1.5 pl-8 pr-3 text-sm focus:border-brand focus:outline-none"
            />
          </div>
        </div>
        <p className="mb-3 text-[11px] text-slate-400">{REVIEW_PRIORITY_DISCLAIMER}</p>

        {items.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">현재 확인이 필요한 임직원이 없습니다.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((c) => (
              <li
                key={c.employeeNumber}
                onClick={() => onOpenDrawer(c)}
                className="flex cursor-pointer flex-col gap-1.5 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="w-16 shrink-0">
                  <PriorityBadge priority={c.reviewPriority} />
                </div>
                <div className="w-44 shrink-0">
                  <ProfilePopover employee={c} onOpenDrawer={onOpenDrawer} />
                </div>
                <div className="w-24 shrink-0 text-xs text-slate-500">{c.department || "-"}</div>
                <div className="w-20 shrink-0 text-right text-xs font-medium text-slate-700">
                  {c.totalChangeRate !== null ? pct(c.totalChangeRate) : "N/A"}
                </div>
                <div className="min-w-0 flex-1 truncate text-xs text-slate-600">
                  {c.issues.filter((i) => i.severity !== "정보").map((i) => i.message).join(" · ") || "-"}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <StatusBadge status={c.validationStatus} />
                  <ReviewStatusBadge status={c.reviewStatus} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
