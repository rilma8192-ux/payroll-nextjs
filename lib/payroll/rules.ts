import { PayrollRules } from "./types";

/**
 * 시연용 가상 계산 기준 (Payroll 계산 규칙)
 *
 * 중요: 아래 수치는 실제 대한민국 세법·4대보험 법정 요율이 아니며,
 * 발표(시연)를 위해 임의로 설정한 "시연용 가상 계산 기준"입니다.
 * 실제 업무에 적용하려면 이 값을 회사 정책/공식 기준으로 교체해야 합니다.
 */
export const DEFAULT_RULES: PayrollRules = {
  pensionRate: 0.045, // 국민연금 시연용 요율 (기본급 × 이 값)
  healthInsuranceRate: 0.035, // 건강보험 시연용 요율 (기본급 × 이 값)
  employmentInsuranceRate: 0.009, // 고용보험 시연용 요율 (기본급 × 이 값)
  changeAlertRate: 0.3, // 전월 대비 이상변동 기준 (절대값, 30%)
};

export const RULES_DISCLAIMER =
  "※ 본 프로토타입의 보험료율 및 검증 기준은 시연용 예시 값이며 실제 Payroll 산출 기준이 아닙니다.";
