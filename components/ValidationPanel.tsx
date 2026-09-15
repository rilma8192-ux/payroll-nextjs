import { AlertTriangle } from "lucide-react";
import { PayrollResult } from "@/lib/payroll/types";
import { VALIDATION_NOTE } from "@/lib/payroll/validation";

export default function ValidationPanel({
  results,
  onSelect,
}: {
  results: PayrollResult[];
  onSelect: (r: PayrollResult) => void;
}) {
  const needCheck = results.filter((r) => r.status !== "정상");

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-800">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        확인 필요 {needCheck.length}건
      </h2>
      <p className="mb-4 text-xs text-slate-400">{VALIDATION_NOTE}</p>

      {needCheck.length === 0 ? (
        <div className="text-sm text-slate-500">확인이 필요한 직원이 없습니다.</div>
      ) : (
        <ul className="space-y-3">
          {needCheck.map((r) => (
            <li
              key={r.employeeNumber}
              onClick={() => onSelect(r)}
              className="cursor-pointer rounded-md border border-slate-200 p-3 hover:border-orange-300 hover:bg-orange-50"
            >
              <div className="mb-1 text-sm font-semibold text-slate-800">
                {r.employeeNumber} / {r.employeeName}{" "}
                <span className={r.status === "오류" ? "text-red-600" : "text-orange-600"}>· {r.status}</span>
              </div>
              <ul className="list-inside list-disc space-y-0.5 text-xs text-slate-600">
                {r.reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
