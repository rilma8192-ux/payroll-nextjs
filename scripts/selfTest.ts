/* Payroll 검증/비교 엔진 자가 테스트 (Node 환경, xlsx 왕복 포함) */
import * as XLSX from "xlsx";
import { buildSampleDataset } from "../lib/payroll/sampleData";
import { masterRowFromExcelRecord, payrollRowFromExcelRecord } from "../lib/payroll/columns";
import { buildEmployeeComparisons } from "../lib/payroll/compare";
import { DEFAULT_RULES } from "../lib/payroll/rules";
import { EmployeeMaster, PayrollInputRow } from "../lib/payroll/types";

function roundTripXlsx(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "sheet1");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const reReadWorkbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = reReadWorkbook.Sheets[reReadWorkbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
}

const { master, previous, current } = buildSampleDataset();

const masterRecords = roundTripXlsx(master as unknown as Record<string, unknown>[]);
const previousRecords = roundTripXlsx(previous as unknown as Record<string, unknown>[]);
const currentRecords = roundTripXlsx(current as unknown as Record<string, unknown>[]);

const masterRows: EmployeeMaster[] = masterRecords.map(masterRowFromExcelRecord);
const previousRows: PayrollInputRow[] = previousRecords.map(payrollRowFromExcelRecord);
const currentRows: PayrollInputRow[] = currentRecords.map(payrollRowFromExcelRecord);

console.log(`Master ${masterRows.length}행 / 전월 ${previousRows.length}행 / 당월 ${currentRows.length}행 (xlsx 왕복 완료)`);

const comparisons = buildEmployeeComparisons(masterRows, previousRows, currentRows, DEFAULT_RULES);
const currentPeriod = comparisons.filter((c) => c.changeType !== "전월미존재");

const normal = currentPeriod.filter((c) => c.validationStatus === "정상").length;
const review = currentPeriod.filter((c) => c.validationStatus === "확인 필요").length;
const error = currentPeriod.filter((c) => c.validationStatus === "오류").length;
const newHires = currentPeriod.filter((c) => c.changeType === "신규").length;
const dropped = comparisons.filter((c) => c.changeType === "전월미존재").length;

console.log(`처리대상 ${currentPeriod.length} / 정상 ${normal} / 확인필요 ${review} / 오류 ${error} / 신규 ${newHires} / 전월미존재 ${dropped}`);

let failed = false;
function check(label: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"} - ${label}`);
  if (!cond) failed = true;
}

check("처리대상 100명 - 전월미존재 2명 = 98명", currentPeriod.length === 98);
check("정상 70~80명 범위", normal >= 70 && normal <= 80);
check("확인필요 15~25명 범위", review >= 15 && review <= 25);
check("오류 3~5명 범위", error >= 3 && error <= 5);
check("신규입사 3명", newHires === 3);
check("전월미존재 2명", dropped === 2);

// 최종지급액 = 총지급액 - 총공제액 (당월 자료가 있는 모든 직원)
let arithmeticOk = true;
for (const c of comparisons) {
  if (!c.current) continue;
  const expected = c.current.grossPay - c.current.totalDeductions;
  if (Math.abs(expected - c.current.netPay) > 0.001) {
    arithmeticOk = false;
    console.error(`검산 실패: ${c.employeeNumber} netPay=${c.current.netPay} expected=${expected}`);
  }
}
check("검산: 모든 직원 최종지급액 = 총지급액 - 총공제액", arithmeticOk);

function findComp(empNo: string) {
  const c = comparisons.find((x) => x.employeeNumber === empNo);
  if (!c) throw new Error(`${empNo} 를 찾을 수 없습니다`);
  return c;
}

// 개별 5명 수기 검산
const emp001 = findComp("EMP001");
// 기본급2,500,000 + 식대200,000(사원 직책수당0) = 총지급 2,700,000
check("EMP001 총지급액 2,700,000", emp001.current?.grossPay === 2700000);
check("EMP001 신규입사(전월 자료 없음), 정상", emp001.changeType === "신규" && emp001.validationStatus === "정상");

const emp030 = findComp("EMP030");
check("EMP030 변동없음(기존, 정상)", emp030.changeType === "기존" && emp030.validationStatus === "정상" && emp030.totalChangeRate === 0);

const emp006 = findComp("EMP006");
check("EMP006 기본급변경(PAY-010) 확인필요", emp006.validationStatus === "확인 필요" && emp006.issues.some((i) => i.ruleId === "PAY-010"));

const emp016 = findComp("EMP016");
check("EMP016 연장근로 불일치(PAY-008)", emp016.issues.some((i) => i.ruleId === "PAY-008"));

const emp025 = findComp("EMP025");
check("EMP025 기본급누락(PAY-004) 오류, netPay 임의추정 없이 0", emp025.validationStatus === "오류" && emp025.current?.baseSalary === 0);

const emp027 = findComp("EMP027");
check("EMP027 사번중복(PAY-002) 오류", emp027.validationStatus === "오류" && emp027.issues.some((i) => i.ruleId === "PAY-002"));

const emp004 = findComp("EMP004");
check("EMP004 전월미존재(PAY-015)", emp004.changeType === "전월미존재" && emp004.issues.some((i) => i.ruleId === "PAY-015"));

const actualNewHire = comparisons.find((c) => c.changeType === "신규");
check("신규입사(PAY-014, 정보) 최소 1건", Boolean(actualNewHire && actualNewHire.issues.some((i) => i.ruleId === "PAY-014")));

console.log(failed ? "\n일부 실패" : "\n모든 검산 완료.");
process.exitCode = failed ? 1 : 0;
