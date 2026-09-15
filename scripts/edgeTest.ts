import { validateEmployees, checkMissingHeaders } from "../lib/payroll/validation";
import { computePayroll } from "../lib/payroll/calculation";
import { DEFAULT_RULES } from "../lib/payroll/rules";
import { EmployeeInput } from "../lib/payroll/types";

function makeRow(overrides: Partial<EmployeeInput>): EmployeeInput {
  return {
    employeeNumber: "E1", employeeName: "테스트", employmentStatus: "재직",
    baseSalary: 3000000, positionAllowance: 0, mealAllowance: 0, fixedAllowance: 0,
    overtimeHours: 0, overtimePay: 0, incentive: 0, bonus: 0, otherPayment: 0,
    pensionApplied: "Y", healthInsuranceApplied: "Y", employmentInsuranceApplied: "Y",
    incomeTax: 0, localIncomeTax: 0, otherDeduction: 0, previousGrossPay: 0,
    ...overrides,
  };
}

let failed = false;
function check(label: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"} - ${label}`);
  if (!cond) failed = true;
}

// 1) 필수 헤더 누락
const missing = checkMissingHeaders(["사번", "성명"]);
check("필수 헤더 누락 감지 (재직상태, 기본급 없음)", missing.length === 2 && missing.includes("기본급"));

// 2) 기본급 누락 -> 오류
const [r1] = validateEmployees([makeRow({ baseSalary: null })]);
check("기본급 누락 -> 오류", r1.status === "오류" && r1.reasons.some(r => r.includes("기본급 누락")));

// 3) 기본급 음수 -> 오류
const [r2] = validateEmployees([makeRow({ baseSalary: -100 })]);
check("기본급 음수 -> 오류", r2.status === "오류");

// 4) 사번 중복 -> 오류
const dup = validateEmployees([makeRow({ employeeNumber: "DUP" }), makeRow({ employeeNumber: "DUP" })]);
check("사번 중복 -> 두 행 모두 오류", dup[0].status === "오류" && dup[1].status === "오류");

// 5) 숫자 아닌 값 -> 확인 필요 (기본급 외 항목)
const [r3] = validateEmployees([makeRow({ incentive: "삼백만원" as unknown as number })]);
check("숫자 아닌 인센티브 -> 확인 필요", r3.status === "확인 필요" && r3.reasons.some(r => r.includes("숫자가 아닙니다")));

// 6) 오류 직원은 금액을 임의 추정하지 않고 0으로 계산됨 (baseSalary 누락)
const errResult = computePayroll([makeRow({ baseSalary: null })], DEFAULT_RULES);
check("오류 직원 baseSalary 임의추정 없이 0 처리", errResult[0].baseSalary === 0 && errResult[0].status === "오류");

// 7) 보험 미적용(N)은 정상이며 공제 0원
const [okResult] = computePayroll([makeRow({ employmentInsuranceApplied: "N" })], DEFAULT_RULES);
check("고용보험 N -> 공제 0원, 상태 정상", okResult.employmentInsurance === 0 && okResult.status === "정상");

console.log(failed ? "\n일부 실패" : "\n모든 엣지케이스 PASS");
process.exitCode = failed ? 1 : 0;
