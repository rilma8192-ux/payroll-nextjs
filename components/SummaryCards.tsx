import { PayrollResult } from "@/lib/payroll/types";
import { won } from "@/lib/payroll/format";

function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex-1 min-w-[140px] rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${accent ? "border-l-4 border-l-orange-500" : ""}`}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default function SummaryCards({ results }: { results: PayrollResult[] }) {
  const total = results.length;
  const normal = results.filter((r) => r.status === "정상").length;
  const review = results.filter((r) => r.status === "확인 필요").length;
  const error = results.filter((r) => r.status === "오류").length;
  const totalGross = results.reduce((s, r) => s + r.grossPay, 0);
  const totalDeductions = results.reduce((s, r) => s + r.totalDeductions, 0);
  const totalNet = results.reduce((s, r) => s + r.netPay, 0);

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-slate-800">급여 산출 요약 (KPI)</h2>
      <div className="flex flex-wrap gap-3">
        <Card label="처리 대상" value={`${total}명`} accent />
        <Card label="정상" value={`${normal}명`} />
        <Card label="확인 필요" value={`${review}명`} />
        <Card label="오류" value={`${error}명`} />
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        <Card label="총 지급액" value={won(totalGross)} accent />
        <Card label="총 공제액" value={won(totalDeductions)} />
        <Card label="최종 지급 예정액" value={won(totalNet)} accent />
      </div>
    </section>
  );
}
