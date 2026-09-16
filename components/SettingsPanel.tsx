"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { PayrollRules } from "@/lib/payroll/types";
import { RULES_DISCLAIMER } from "@/lib/payroll/rules";

interface Props {
  open: boolean;
  rules: PayrollRules;
  canRecalculate: boolean;
  onClose: () => void;
  onSave: (rules: PayrollRules) => void;
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
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

const toPercent = (rate: number) => Number((rate * 100).toFixed(3));

export default function SettingsPanel({ open, rules, canRecalculate, onClose, onSave }: Props) {
  const [pension, setPension] = useState(toPercent(rules.pensionRate));
  const [health, setHealth] = useState(toPercent(rules.healthInsuranceRate));
  const [employment, setEmployment] = useState(toPercent(rules.employmentInsuranceRate));
  const [changeAlert, setChangeAlert] = useState(toPercent(rules.changeAlertRate));

  if (!open) return null;

  function handleSave() {
    onSave({
      pensionRate: pension / 100,
      healthInsuranceRate: health / 100,
      employmentInsuranceRate: employment / 100,
      changeAlertRate: changeAlert / 100,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">설정 (시연용 계산 기준)</h2>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100" aria-label="닫기">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-brand-dark">{RULES_DISCLAIMER}</p>

        <div className="space-y-3">
          <Field label="국민연금 요율" value={pension} onChange={setPension} />
          <Field label="건강보험 요율" value={health} onChange={setHealth} />
          <Field label="고용보험 요율" value={employment} onChange={setEmployment} />
          <Field label="전월 대비 이상변동 기준" value={changeAlert} onChange={setChangeAlert} />
        </div>

        <button
          onClick={handleSave}
          disabled={!canRecalculate}
          className="mt-5 w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          저장 및 재계산
        </button>
        {!canRecalculate && (
          <p className="mt-2 text-center text-xs text-slate-400">
            현재 세션에서 업로드/생성한 작업만 재계산할 수 있습니다. (과거 작업이력 조회 중에는 비활성화)
          </p>
        )}
      </div>
    </div>
  );
}
