/* 급여 계산/검증 엔진 자가 테스트 (Node 환경에서 실행, xlsx 왕복 포함) */
import * as XLSX from "xlsx";
import { SAMPLE_EMPLOYEES } from "../lib/payroll/sampleData";
import { rowFromExcelRecord } from "../lib/payroll/columns";
import { computePayroll } from "../lib/payroll/calculation";
import { DEFAULT_RULES } from "../lib/payroll/rules";
import { EmployeeInput } from "../lib/payroll/types";

// 1) 샘플 데이터를 실제 xlsx 워크북으로 만들고 다시 파싱 (왕복 테스트)
const worksheet = XLSX.utils.json_to_sheet(SAMPLE_EMPLOYEES);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "급여입력자료");
const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

const reReadWorkbook = XLSX.read(buffer, { type: "buffer" });
const reReadSheet = reReadWorkbook.Sheets[reReadWorkbook.SheetNames[0]];
const headerRow = (XLSX.utils.sheet_to_json<string[]>(reReadSheet, { header: 1, raw: true })[0] ?? []).map(String);
const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(reReadSheet, { defval: null, raw: true });
const rows: EmployeeInput[] = records.map(rowFromExcelRecord);

console.log("헤더 수:", headerRow.length, "직원 수:", rows.length);

const results = computePayroll(rows, DEFAULT_RULES);

console.log("\n--- 전체 결과 ---");
for (const r of results) {
  console.log(
    `${r.employeeNumber} ${r.employeeName} | 총지급 ${r.grossPay.toLocaleString()} | 총공제 ${r.totalDeductions.toLocaleString()} | 최종 ${r.netPay.toLocaleString()} | 변동률 ${r.changeRate?.toFixed(1)}% | ${r.status}`
  );
  if (r.reasons.length) console.log("   사유:", r.reasons.join(" / "));
}

const normal = results.filter((r) => r.status === "정상").length;
const review = results.filter((r) => r.status === "확인 필요").length;
const error = results.filter((r) => r.status === "오류").length;
console.log(`\n정상 ${normal} / 확인필요 ${review} / 오류 ${error}`);

// 2) 검산: 최종지급액 = 총지급액 - 총공제액 (모든 직원)
let arithmeticOk = true;
for (const r of results) {
  const expected = r.grossPay - r.totalDeductions;
  if (Math.abs(expected - r.netPay) > 0.001) {
    arithmeticOk = false;
    console.error(`검산 실패: ${r.employeeNumber} netPay=${r.netPay} expected=${expected}`);
  }
}
console.log("검산(최종지급액 = 총지급액 - 총공제액):", arithmeticOk ? "PASS" : "FAIL");

// 3) 개별 3명 수기 검산 (EMP001, EMP003, EMP008)
function assertClose(label: string, actual: number, expected: number) {
  const ok = Math.abs(actual - expected) < 0.01;
  console.log(`${ok ? "PASS" : "FAIL"} - ${label}: actual=${actual} expected=${expected}`);
  if (!ok) process.exitCode = 1;
}

const emp1 = results.find((r) => r.employeeNumber === "EMP001")!;
// 기본급3,000,000 + 직책200,000 + 식대200,000 = 총지급 3,400,000
// 국민연금 3,000,000*0.045=135,000 / 건강보험 3,000,000*0.035=105,000 / 고용보험 3,000,000*0.009=27,000
// 소득세100,000 + 지방소득세10,000 = 총공제 377,000 / 최종 3,023,000
assertClose("EMP001 총지급액", emp1.grossPay, 3400000);
assertClose("EMP001 총공제액", emp1.totalDeductions, 135000 + 105000 + 27000 + 100000 + 10000);
assertClose("EMP001 최종지급액", emp1.netPay, 3400000 - (135000 + 105000 + 27000 + 100000 + 10000));
assertClose("EMP001 변동률(0%)", emp1.changeRate ?? NaN, 0);

const emp3 = results.find((r) => r.employeeNumber === "EMP003")!;
// 기본급2,800,000 + 식대200,000 + 연장근로수당250,000 = 3,250,000
assertClose("EMP003 총지급액", emp3.grossPay, 3250000);

const emp8 = results.find((r) => r.employeeNumber === "EMP008")!;
// gross=4,200,000, prev=3,000,000 -> +40%
assertClose("EMP008 변동률(+40%)", emp8.changeRate ?? NaN, 40);
if (emp8.status !== "확인 필요") {
  console.error("FAIL - EMP008 상태가 확인 필요가 아님:", emp8.status);
  process.exitCode = 1;
}

const emp7 = results.find((r) => r.employeeNumber === "EMP007")!;
if (!emp7.reasons.some((r) => r.includes("연장근로수당"))) {
  console.error("FAIL - EMP007 연장근로 불일치 사유 누락");
  process.exitCode = 1;
}

const emp9 = results.find((r) => r.employeeNumber === "EMP009")!;
if (!emp9.reasons.some((r) => r.includes("Y/N"))) {
  console.error("FAIL - EMP009 보험값 오류 사유 누락");
  process.exitCode = 1;
}

console.log("\n모든 검산 완료.");
