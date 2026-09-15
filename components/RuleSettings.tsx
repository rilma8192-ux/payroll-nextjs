"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { PayrollRules } from "@/lib/payroll/types";
import { RULES_DISCLAIMER } from "@/lib/payroll/rules";

interface Props {
  rules: PayrollRules;
  onRecalculate: (rules: PayrollRules) => void;
  hasData: boolean;
}

function Field({
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
          className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-right text-sm focus:border-orange-500 focus:outline-none"
        />
        <span className="text-slate-500">%</span>
      </div>
    </label>
  );
}

export default function RuleSettings({ rules, onRecalculate, hasData }: Props) {
  const [pension, setPension] = useState(rules.pensionRate * 100);
  const [health, setHealth] = useState(rules.healthInsuranceRate * 100);
  const [employment, setEmployment] = useState(rules.employmentInsuranceRate * 100);
  const [changeAlert, setChangeAlert] = useState(rules.changeAlertRate * 100);

  function handleRecalculate() {
    onRecalculate({
      pensionRate: pension / 100,
      healthInsuranceRate: health / 100,
      employmentInsuranceRate: employment / 100,
      changeAlertRate: changeAlert / 100,
    });
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-800">
        <Settings2 className="h-4 w-4 text-orange-500" />
        계산 기준 설정
      </h2>
      <p className="mb-4 text-xs text-orange-600">{RULES_DISCLAIMER}</p>

      <div className="flex flex-wrap gap-4">
        <Field label="국민연금 요율" value={pension} onChange={setPension} />
        <Field label="건강보험 요율" value={health} onChange={setHealth} />
        <Field label="고용보험 요율" value={employment} onChange={setEmployment} />
        <Field label="전월 대비 이상변동 기준" value={changeAlert} onChange={setChangeAlert} />
      </div>

      <button
        type="button"
        onClick={handleRecalculate}
        disabled={!hasData}
        className="mt-4 rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
      >
        다시 계산
      </button>
    </section>
  );
}
