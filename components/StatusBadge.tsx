import { ValidationStatus } from "@/lib/payroll/types";

const STYLES: Record<ValidationStatus, string> = {
  "정상": "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  "확인 필요": "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  "오류": "bg-red-50 text-red-700 ring-1 ring-red-200",
};

export default function StatusBadge({ status }: { status: ValidationStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}>
      {status}
    </span>
  );
}
