"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EmployeeComparison } from "@/lib/payroll/types";
import { SAMPLE_DEPARTMENTS } from "@/lib/payroll/sampleData";
import StatusBadge from "./StatusBadge";
import ProfilePopover from "./ProfilePopover";

interface Props {
  comparisons: EmployeeComparison[];
  onOpenDrawer: (employee: EmployeeComparison) => void;
}

const PAGE_SIZE = 20;

export default function DirectoryView({ comparisons, onOpenDrawer }: Props) {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("전체");
  const [page, setPage] = useState(1);

  const departments = useMemo(() => {
    const found = new Set(comparisons.map((c) => c.department).filter(Boolean));
    const all = found.size > 0 ? Array.from(found) : SAMPLE_DEPARTMENTS;
    return ["전체", ...all];
  }, [comparisons]);

  const filtered = useMemo(() => {
    return comparisons
      .filter((c) => department === "전체" || c.department === department)
      .filter((c) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          c.employeeName.toLowerCase().includes(q) ||
          c.employeeNumber.toLowerCase().includes(q) ||
          c.department.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.employeeNumber.localeCompare(b.employeeNumber));
  }, [comparisons, search, department]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-slate-900">임직원 ({filtered.length}명)</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="이름·사번·부서·이메일 검색"
              className="rounded-md border border-slate-300 py-1.5 pl-8 pr-3 text-sm focus:border-brand focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="py-2 pr-3">임직원</th>
              <th className="py-2 pr-3">부서</th>
              <th className="py-2 pr-3">직책</th>
              <th className="py-2 pr-3">이메일</th>
              <th className="py-2 pr-3">이번달 Payroll 상태</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((c) => (
              <tr key={c.employeeNumber} className="border-b border-slate-100">
                <td className="py-2 pr-3">
                  <ProfilePopover employee={c} onOpenDrawer={onOpenDrawer} />
                </td>
                <td className="py-2 pr-3 text-slate-600">{c.department || "-"}</td>
                <td className="py-2 pr-3 text-slate-600">{c.position || "-"}</td>
                <td className="py-2 pr-3 text-slate-500">{c.email || "-"}</td>
                <td className="py-2 pr-3">{c.current ? <StatusBadge status={c.validationStatus} /> : <span className="text-xs text-slate-400">당월자료없음</span>}</td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  조건에 맞는 임직원이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`h-7 w-7 rounded-md text-xs font-medium ${
                p === currentPage ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
