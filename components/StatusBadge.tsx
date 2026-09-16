import { ReviewPriority, ReviewStatus, ValidationStatus } from "@/lib/payroll/types";

const VALIDATION_STYLES: Record<ValidationStatus, string> = {
  "정상": "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  "확인 필요": "bg-brand-soft text-brand-dark ring-1 ring-orange-200",
  "오류": "bg-red-50 text-red-700 ring-1 ring-red-200",
};

const REVIEW_STYLES: Record<ReviewStatus, string> = {
  "미확인": "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  "검토중": "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  "확인완료": "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};

const PRIORITY_STYLES: Record<ReviewPriority, string> = {
  "높음": "bg-red-50 text-red-700 ring-1 ring-red-200",
  "중간": "bg-brand-soft text-brand-dark ring-1 ring-orange-200",
  "낮음": "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${className}`}>
      {label}
    </span>
  );
}

export default function StatusBadge({ status }: { status: ValidationStatus }) {
  return <Badge label={status} className={VALIDATION_STYLES[status]} />;
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return <Badge label={status} className={REVIEW_STYLES[status]} />;
}

export function PriorityBadge({ priority }: { priority: ReviewPriority }) {
  return <Badge label={priority} className={PRIORITY_STYLES[priority]} />;
}
