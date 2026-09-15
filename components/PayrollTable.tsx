"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PayrollResult, ValidationStatus } from "@/lib/payroll/types";
import { won, pct } from "@/lib/payroll/format";
import StatusBadge from "./StatusBadge";

const FILTERS: Array<ValidationStatus | "전체"> = ["전체", "정상", "확인 필요", "오류"];

interface Props {
  results: PayrollResult[];
  onSelect: (result: PayrollResult) => void;
}

export default function PayrollTable({ results, onSelect }: Props) {
  const [filter, setFilter] = useState<ValidationStatus | "전체">("전체");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return results.filter((r) => {
      if (filter !== "전체" && r.status !== filter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return r.employeeNumber.toLowerCase().includes(q) || r.employeeName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [results, filter, search]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-slate-800">직원별 산출 결과</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="사번 또는 성명 검색"
              className="rounded-md border border-slate-300 py-1.5 pl-8 pr-3 text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mb-3 flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f}
            {f !== "전체" && ` (${results.filter((r) => r.status === f).length})`}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="py-2 pr-3">사번</th>
              <th className="py-2 pr-3">성명</th>
              <th className="py-2 pr-3 text-right">총 지급액</th>
              <th className="py-2 pr-3 text-right">총 공제액</th>
              <th className="py-2 pr-3 text-right">최종 지급액</th>
              <th className="py-2 pr-3 text-right">전월 대비</th>
              <th className="py-2 pr-3">검증 상태</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.employeeNumber}
                onClick={() => onSelect(r)}
                className="cursor-pointer border-b border-slate-100 hover:bg-orange-50"
              >
                <td className="py-2 pr-3">{r.employeeNumber}</td>
                <td className="py-2 pr-3 font-medium text-slate-800">{r.employeeName}</td>
                <td className="py-2 pr-3 text-right">{won(r.grossPay)}</td>
                <td className="py-2 pr-3 text-right">{won(r.totalDeductions)}</td>
                <td className="py-2 pr-3 text-right font-semibold text-slate-900">{won(r.netPay)}</td>
                <td className="py-2 pr-3 text-right">{pct(r.changeRate)}</td>
                <td className="py-2 pr-3">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-400">
                  조건에 맞는 직원이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
