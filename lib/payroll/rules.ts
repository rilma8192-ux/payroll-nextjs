import { PayrollRules } from "./types";

/**
 * 시연용 가상 계산/검증 기준.
 *
 * 중요: 아래 수치는 실제 대한민국 세법·4대보험 법정 요율이 아니며,
 * 발표(시연)를 위해 임의로 설정한 "시연용 가상 계산 기준"입니다.
 * 실제 업무에 적용하려면 이 값을 회사 정책/공식 기준으로 교체해야 합니다.
 */
export const DEFAULT_RULES: PayrollRules = {
  pensionRate: 0.045,
  healthInsuranceRate: 0.035,
  employmentInsuranceRate: 0.009,
  changeAlertRate: 0.3,
};

export const RULES_DISCLAIMER =
  "본 프로토타입의 보험료율 및 검증 기준은 시연용 예시 값이며 실제 Payroll 산출 기준이 아닙니다. 실제 업무 적용 시 회사 정책 및 공식 Payroll 기준에 따른 추가 검증이 필요합니다.";

export const REVIEW_PRIORITY_DISCLAIMER = "시연용 검토 우선순위이며 실제 업무 우선순위 기준이 아닙니다.";
