"use client";

import { useEffect, useState } from "react";
import { History, RefreshCw } from "lucide-react";
import { PayrollRun } from "@/lib/payroll/types";
import { won } from "@/lib/payroll/format";
import { listPayrollRuns, SupabaseNotConfiguredError } from "@/lib/supabase/payrollHistory";

interface Props {
  refreshToken: number;
  onOpenRun: (run: PayrollRun) => void;
  supabaseConfigured: boolean;
}

export default function PayrollHistory({ refreshToken, onOpenRun, supabaseConfigured }: Props) {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!supabaseConfigured) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listPayrollRuns();
      setRuns(data);
    } catch (e) {
      setError(e instanceof SupabaseNotConfiguredError ? e.message : "작업 이력을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken, supabaseConfigured]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
          <History className="h-4 w-4 text-orange-500" />
          작업 이력
        </h2>
        {supabaseConfigured && (
          <button onClick={load} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      {!supabaseConfigured && (
        <div className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-500">
          작업 이력 저장 기능을 사용하려면 Supabase 연결이 필요합니다. (.env.local 에
          NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 를 설정하세요.)
        </div>
      )}

      {supabaseConfigured && error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {supabaseConfigured && !error && runs.length === 0 && !loading && (
        <div className="text-sm text-slate-400">저장된 작업이 아직 없습니다.</div>
      )}

      {supabaseConfigured && runs.length > 0 && (
        <ul className="space-y-2">
          {runs.map((run) => (
            <li
              key={run.id}
              onClick={() => onOpenRun(run)}
              className="cursor-pointer rounded-md border border-slate-200 px-4 py-3 text-sm hover:border-orange-300 hover:bg-orange-50"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">{run.runName}</span>
                <span className="text-xs text-slate-400">
                  {run.createdAt ? new Date(run.createdAt).toLocaleString("ko-KR") : ""}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                <span>직원 {run.employeeCount}명</span>
                <span className="text-emerald-600">정상 {run.normalCount}</span>
                <span className="text-orange-600">확인 필요 {run.reviewCount}</span>
                {run.errorCount > 0 && <span className="text-red-600">오류 {run.errorCount}</span>}
                <span>최종 지급 {won(run.totalNetPay)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
