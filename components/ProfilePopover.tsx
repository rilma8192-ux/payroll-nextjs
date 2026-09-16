"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, ExternalLink, Mail, Phone } from "lucide-react";
import { EmployeeComparison } from "@/lib/payroll/types";
import { won, pct } from "@/lib/payroll/format";
import StatusBadge from "./StatusBadge";

interface Props {
  employee: EmployeeComparison;
  onOpenDrawer?: (employee: EmployeeComparison) => void;
  className?: string;
}

/** 이름/Avatar 클릭 시 뜨는 작은 인물 정보 Popover (Google Workspace 스타일). */
export default function ProfilePopover({ employee, onOpenDrawer, className }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const initial = employee.employeeName ? employee.employeeName.slice(-1) : "?";
  const hasPayrollThisMonth = Boolean(employee.current);

  return (
    <div className={`relative inline-block ${className ?? ""}`} ref={rootRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex items-center gap-2 rounded text-left hover:underline"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand-dark">
          {initial}
        </span>
        <span className="font-medium text-slate-800">{employee.employeeName || "(성명없음)"}</span>
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full z-40 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-base font-bold text-brand-dark">
              {initial}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-900">
                {employee.employeeName || "(성명없음)"} <span className="font-normal text-slate-400">/ {employee.employeeNumber}</span>
              </div>
              <div className="truncate text-xs text-slate-500">
                {employee.department || "부서 정보 없음"} · {employee.position || "직책 정보 없음"}
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              {employee.email ? (
                <a href={`mailto:${employee.email}`} className="truncate text-brand-dark hover:underline">
                  {employee.email}
                </a>
              ) : (
                <span className="text-slate-400">이메일 정보 없음</span>
              )}
              {employee.email && <CopyButton value={employee.email} />}
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              {employee.phone ? (
                <a href={`tel:${employee.phone}`} className="truncate text-brand-dark hover:underline">
                  {employee.phone}
                </a>
              ) : (
                <span className="text-slate-400">연락처 정보 없음</span>
              )}
              {employee.phone && <CopyButton value={employee.phone} />}
            </div>
            <div className="text-slate-500">
              입사일 {employee.hireDate || "정보 없음"} · {employee.employmentStatus || "재직상태 정보 없음"}
            </div>
          </div>

          <div className="mt-3 border-t border-slate-100 pt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">이번달 Payroll 상태</span>
              {hasPayrollThisMonth ? (
                <StatusBadge status={employee.validationStatus} />
              ) : (
                <span className="text-slate-400">당월 자료 없음</span>
              )}
            </div>
            {employee.current && (
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-slate-500">최종지급액</span>
                <span className="font-semibold text-slate-800">{won(employee.current.netPay)}</span>
              </div>
            )}
            {employee.totalChangeRate !== null && (
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-slate-500">전월대비</span>
                <span className="font-semibold text-slate-800">{pct(employee.totalChangeRate)}</span>
              </div>
            )}
          </div>

          {onOpenDrawer && hasPayrollThisMonth && (
            <button
              onClick={() => {
                setOpen(false);
                onOpenDrawer(employee);
              }}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Payroll 상세 보기
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          // clipboard 접근 불가 시 조용히 무시 (기능 저해 없음)
        }
      }}
      className="ml-auto shrink-0 rounded p-0.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500"
      aria-label="복사"
      title="복사"
    >
      {copied ? <span className="text-[10px] text-emerald-600">복사됨</span> : <Copy className="h-3 w-3" />}
    </button>
  );
}
