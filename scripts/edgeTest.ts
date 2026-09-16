import { checkMissingPayrollHeaders, checkMissingMasterHeaders } from "../lib/payroll/validation";
import { buildEmployeeComparisons } from "../lib/payroll/compare";
import { DEFAULT_RULES } from "../lib/payroll/rules";
import { PayrollInputRow } from "../lib/payroll/types";

function makeRow(overrides: Partial<PayrollInputRow>): PayrollInputRow {
  return {
    employeeNumber: "E1",
    employeeName: "테스트",
    employmentStatus: "재직",
    baseSalary: 3000000,
    positionAllowance: 0,
    mealAllowance: 0,
    fixedAllowance: 0,
    overtimeHours: 0,
    overtimePay: 0,
    incentive: 0,
    bonus: 0,
    otherPayment: 0,
    pensionApplied: "Y",
    healthInsuranceApplied: "Y",
    employmentInsuranceApplied: "Y",
    incomeTax: 0,
    localIncomeTax: 0,
    otherDeduction: 0,
    ...overrides,
  };
}

let failed = false;
function check(label: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"} - ${label}`);
  if (!cond) failed = true;
}

// 1) 필수 헤더 누락
check(
  "Payroll 필수 헤더 누락 감지 (재직상태, 기본급 없음)",
  checkMissingPayrollHeaders(["사번", "성명"]).length === 2
);
check("Master 필수 헤더 누락 감지", checkMissingMasterHeaders(["사번", "성명"]).length === 3);

// 2) 기본급 누락 -> 오류 (전월/당월 동일 자료로 비교, 구조적 오류만 확인)
const [r1] = buildEmployeeComparisons([], [makeRow({})], [makeRow({ baseSalary: null })], DEFAULT_RULES);
check("기본급 누락 -> 오류", r1.validationStatus === "오류" && r1.issues.some((i) => i.ruleId === "PAY-004"));

// 3) 기본급 음수 -> 오류
const [r2] = buildEmployeeComparisons([], [makeRow({})], [makeRow({ baseSalary: -100 })], DEFAULT_RULES);
check("기본급 음수 -> 오류", r2.validationStatus === "오류");

// 4) 사번 중복 -> 당월 두 행 모두 오류 (첫 행 기준으로 처리, 동일 사번이므로 결과는 1건)
const dup = buildEmployeeComparisons(
  [],
  [makeRow({ employeeNumber: "DUP" })],
  [makeRow({ employeeNumber: "DUP" }), makeRow({ employeeNumber: "DUP" })],
  DEFAULT_RULES
);
check("사번 중복 -> 오류", dup.length === 1 && dup[0].validationStatus === "오류" && dup[0].issues.some((i) => i.ruleId === "PAY-002"));

// 5) 숫자 아닌 값 -> 확인 필요
const [r3] = buildEmployeeComparisons([], [makeRow({})], [makeRow({ incentive: "삼백만원" as unknown as number })], DEFAULT_RULES);
check("숫자 아닌 인센티브 -> 확인 필요", r3.validationStatus === "확인 필요" && r3.issues.some((i) => i.ruleId === "PAY-005"));

// 6) 오류 직원은 금액을 임의 추정하지 않고 0으로 계산됨
check("오류 직원 baseSalary 임의추정 없이 0 처리", r1.current?.baseSalary === 0);

// 7) 보험 미적용(N)은 정상이며 공제 0원 (전월에도 N 이어서 PAY-013 변경 감지에 걸리지 않음)
const [okResult] = buildEmployeeComparisons(
  [],
  [makeRow({ employmentInsuranceApplied: "N" })],
  [makeRow({ employmentInsuranceApplied: "N" })],
  DEFAULT_RULES
);
check("고용보험 N -> 공제 0원, 상태 정상", okResult.current?.employmentInsurance === 0 && okResult.validationStatus === "정상");

// 8) 보험 Y/N 형식 오류 -> 확인 필요
const [ynErr] = buildEmployeeComparisons([], [makeRow({})], [makeRow({ pensionApplied: "YES" })], DEFAULT_RULES);
check("보험 Y/N 형식 오류 -> 확인 필요 (PAY-007)", ynErr.validationStatus === "확인 필요" && ynErr.issues.some((i) => i.ruleId === "PAY-007"));

// 9) 연장근로시간>0, 수당=0 -> 확인 필요 (PAY-008)
const [otErr] = buildEmployeeComparisons([], [makeRow({})], [makeRow({ overtimeHours: 5, overtimePay: 0 })], DEFAULT_RULES);
check("연장근로 불일치 -> 확인 필요 (PAY-008)", otErr.issues.some((i) => i.ruleId === "PAY-008"));

// 10) 퇴사자 지급항목 존재 -> 확인 필요 (PAY-016)
const [retireeErr] = buildEmployeeComparisons([], [makeRow({})], [makeRow({ employmentStatus: "퇴사", incentive: 100000 })], DEFAULT_RULES);
check("퇴사자 지급항목 존재 -> 확인 필요 (PAY-016)", retireeErr.issues.some((i) => i.ruleId === "PAY-016"));

// 11) 신규입사 (전월 없음, 당월만) -> changeType 신규, PAY-014 정보
const [newHireResult] = buildEmployeeComparisons([], [], [makeRow({ employeeNumber: "NEW1" })], DEFAULT_RULES);
check("신규입사 -> changeType 신규 + PAY-014", newHireResult.changeType === "신규" && newHireResult.issues.some((i) => i.ruleId === "PAY-014"));

// 12) 전월미존재 (전월만 있고 당월 없음) -> changeType 전월미존재, PAY-015, current null
const [droppedResult] = buildEmployeeComparisons([], [makeRow({ employeeNumber: "OLD1" })], [], DEFAULT_RULES);
check(
  "전월미존재 -> changeType 전월미존재 + PAY-015 + current null",
  droppedResult.changeType === "전월미존재" && droppedResult.issues.some((i) => i.ruleId === "PAY-015") && droppedResult.current === null
);

// 13) 기본급 변경 -> PAY-010, 변동률 계산
const [baseChange] = buildEmployeeComparisons(
  [],
  [makeRow({ baseSalary: 3000000 })],
  [makeRow({ baseSalary: 4500000 })],
  DEFAULT_RULES
);
check("기본급 변경 -> PAY-010", baseChange.issues.some((i) => i.ruleId === "PAY-010"));
check("총지급 전월대비 기준초과(50%) -> PAY-009", baseChange.issues.some((i) => i.ruleId === "PAY-009"));
check("변동률 50% 계산", baseChange.totalChangeRate !== null && Math.abs(baseChange.totalChangeRate - 50) < 0.01);

// 14) 신규 지급항목 발생 -> PAY-011 / 0원 전환 -> PAY-012
const [newPay] = buildEmployeeComparisons([], [makeRow({ incentive: 0 })], [makeRow({ incentive: 500000 })], DEFAULT_RULES);
check("신규 지급항목 -> PAY-011", newPay.issues.some((i) => i.ruleId === "PAY-011"));
const [zeroPay] = buildEmployeeComparisons([], [makeRow({ bonus: 400000 })], [makeRow({ bonus: 0 })], DEFAULT_RULES);
check("지급항목 0원 전환 -> PAY-012", zeroPay.issues.some((i) => i.ruleId === "PAY-012"));

// 15) 보험적용 변경 -> PAY-013
const [insChange] = buildEmployeeComparisons(
  [],
  [makeRow({ employmentInsuranceApplied: "Y" })],
  [makeRow({ employmentInsuranceApplied: "N" })],
  DEFAULT_RULES
);
check("보험적용 변경 -> PAY-013", insChange.issues.some((i) => i.ruleId === "PAY-013"));

// 16) Employee Master 조인 (부서/직책/이메일/연락처)
const [joined] = buildEmployeeComparisons(
  [
    {
      employeeNumber: "E1",
      employeeName: "테스트",
      department: "인사팀",
      position: "프로",
      employmentStatus: "재직",
      email: "e1@example.com",
      phone: "010-0000-0001",
      hireDate: "2020-01-01",
    },
  ],
  [makeRow({})],
  [makeRow({})],
  DEFAULT_RULES
);
check("Employee Master 조인 (부서/이메일)", joined.department === "인사팀" && joined.email === "e1@example.com");

console.log(failed ? "\n일부 실패" : "\n모든 엣지케이스 PASS");
process.exitCode = failed ? 1 : 0;
