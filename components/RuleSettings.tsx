"use client";

import { useState } from "react";
import { AlertTriangle, Landmark, Settings2, TimerReset } from "lucide-react";
import { PayrollRules } from "@/lib/payroll/types";
import { RULES_DISCLAIMER } from "@/lib/payroll/rules";

interface Props {
  rules: PayrollRules;
  onRecalculate: (rules: PayrollRules) => void;
  hasData: boolean;
}

type CategoryId = "insurance" | "attendance" | "changeAlert";

interface Category {
  id: CategoryId;
  label: string;
  icon: typeof Landmark;
}

const CATEGORIES: Category[] = [
  { id: "insurance", label: "4대보험", icon: Landmark },
  { id: "attendance", label: "근태 / 변동지급", icon: TimerReset },
  { id: "changeAlert", label: "이상변동 기준", icon: AlertTriangle },
];

function RateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-600">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step="0.1"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-right text-sm focus:border-brand focus:outline-none"
        />
        <span className="text-slate-500">%</span>
      </div>
    </label>
  );
}

export default function RuleSettings({ rules, onRecalculate, hasData }: Props) {
  const [active, setActive] = useState<CategoryId>("insurance");

  // *100 은 부동소수점 오차(예: 0.035*100=3.5000000000000004)를 만들 수 있어
  // 화면에 노출되는 값은 소수 3자리에서 반올림해 정리한다.
  const toPercent = (rate: number) => Number((rate * 100).toFixed(3));

  const [pension, setPension] = useState(toPercent(rules.pensionRate));
  const [health, setHealth] = useState(toPercent(rules.healthInsuranceRate));
  const [employment, setEmployment] = useState(toPercent(rules.employmentInsuranceRate));
  const [changeAlert, setChangeAlert] = useState(toPercent(rules.changeAlertRate));

  function handleRecalculate() {
    onRecalculate({
      pensionRate: pension / 100,
      healthInsuranceRate: health / 100,
      employmentInsuranceRate: employment / 100,
      changeAlertRate: changeAlert / 100,
    });
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 pt-6 pb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
          <Settings2 className="h-4 w-4 text-brand" />
          계산 기준 설정
        </h2>
        <p className="mt-1 text-xs text-brand-dark">{RULES_DISCLAIMER}</p>
      </div>

      <div className="flex flex-col sm:flex-row">
        {/* 왼쪽 카테고리 탭 */}
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-100 p-3 sm:w-48 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const isActive = active === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActive(c.id)}
                className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors sm:w-full ${
                  isActive
                    ? "bg-brand text-white"
                    : "text-slate-600 hover:bg-orange-50 hover:text-brand-dark"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{c.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 오른쪽 선택된 카테고리 내용 */}
        <div className="flex-1 p-6">
          {active === "insurance" && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">4대보험 시연용 요율</h3>
              <p className="mb-4 text-xs text-slate-400">
                보험 적용여부가 &apos;Y&apos;인 직원에게만, 기본급 × 아래 요율로 공제액을 계산합니다.
              </p>
              <div className="flex flex-wrap gap-4">
                <RateField label="국민연금 요율" value={pension} onChange={setPension} />
                <RateField label="건강보험 요율" value={health} onChange={setHealth} />
                <RateField label="고용보험 요율" value={employment} onChange={setEmployment} />
              </div>
            </div>
          )}

          {active === "attendance" && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">근태 / 변동지급 검증 규칙</h3>
              <p className="mb-4 text-xs text-slate-400">
                연장근로수당·인센티브·성과급 등 변동지급 항목에는 현재 아래 규칙이 결정론적 코드로 항상
                적용되며, 이 버전에서는 별도의 숫자 기준값 없이 자동으로 검증됩니다.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="rounded-md bg-slate-50 px-3 py-2">
                  연장근로시간이 0보다 크지만 연장근로수당이 0원이면{" "}
                  <span className="font-semibold text-brand-dark">확인 필요</span>로 분류합니다.
                </li>
                <li className="rounded-md bg-slate-50 px-3 py-2">
                  재직상태가 &apos;퇴사&apos;/&apos;퇴직&apos;인데 연장근로수당·인센티브·성과급·기타지급 중
                  하나라도 입력되어 있으면 <span className="font-semibold text-brand-dark">확인 필요</span>
                  로 분류합니다.
                </li>
              </ul>
            </div>
          )}

          {active === "changeAlert" && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">전월 대비 이상변동 기준</h3>
              <p className="mb-4 text-xs text-slate-400">
                당월 총 지급액이 전월 총지급액 대비 아래 기준(절대값)을 초과해 변동하면 확인 필요로
                분류합니다.
              </p>
              <RateField label="전월 대비 이상변동 기준" value={changeAlert} onChange={setChangeAlert} />
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 px-6 py-4">
        <button
          type="button"
          onClick={handleRecalculate}
          disabled={!hasData}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          다시 계산
        </button>
        <span className="ml-3 text-xs text-slate-400">
          어느 탭에서 값을 바꾸든, 위 버튼을 누르면 현재 설정된 모든 기준이 한 번에 반영됩니다.
        </span>
      </div>
    </section>
  );
}
