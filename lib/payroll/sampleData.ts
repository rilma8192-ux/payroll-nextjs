/**
 * sampleData.ts
 * -----------------------------------------------------------------------
 * 발표(시연)용 가상 전월/당월 Payroll 100명분을 고정(deterministic) 규칙
 * 으로 생성한다 - 실행할 때마다 항상 동일한 결과가 나오며, 실제
 * 인물·회사와 무관한 가상 데이터이다.
 *
 * 부서/직책/이메일/연락처/입사일은 별도의 Employee Master 파일이 아니라
 * 이 Payroll 시트 자체의 선택 컬럼으로 포함한다 (실무 Payroll 대장에
 * 인적사항이 함께 있는 경우가 많다는 점을 반영).
 *
 * 정상 약 75명 / 확인필요 약 20명 / 오류 3명 (+ 신규 3명 · 전월미존재 2명은
 * 별도 보조 지표) 이 나오도록 시나리오를 배치했다. 객체의 key 는 Excel
 * 헤더(한글)와 동일하게 맞춰 json_to_sheet 로 바로 실제 .xlsx 를 생성할
 * 수 있도록 한다.
 * -----------------------------------------------------------------------
 */

export type PayrollFieldValue = string | number | null;

export interface SamplePayrollRecord {
  사번: string;
  성명: string;
  재직상태: string;
  부서: string;
  직책: string;
  이메일: string;
  연락처: string;
  입사일: string;
  기본급: PayrollFieldValue;
  직책수당: PayrollFieldValue;
  식대: PayrollFieldValue;
  기타고정수당: PayrollFieldValue;
  연장근로시간: PayrollFieldValue;
  연장근로수당: PayrollFieldValue;
  인센티브: PayrollFieldValue;
  성과급: PayrollFieldValue;
  기타지급: PayrollFieldValue;
  국민연금적용여부: string;
  건강보험적용여부: string;
  고용보험적용여부: string;
  소득세: PayrollFieldValue;
  지방소득세: PayrollFieldValue;
  기타공제: PayrollFieldValue;
}

export const SAMPLE_DEPARTMENTS = [
  "인사팀",
  "재무팀",
  "경영기획팀",
  "IT기획팀",
  "영업1팀",
  "영업2팀",
  "마케팅팀",
  "구매팀",
  "서비스운영팀",
  "연구개발팀",
];

export const SAMPLE_POSITIONS = ["사원", "프로", "선임", "책임", "팀장"];

const POSITION_ALLOWANCE: Record<string, number> = {
  사원: 0,
  프로: 100000,
  선임: 150000,
  책임: 200000,
  팀장: 300000,
};

const EMPLOYEE_COUNT = 100;
const pad3 = (n: number) => String(n).padStart(3, "0");
const pad2 = (n: number) => String(n).padStart(2, "0");
const pad4 = (n: number) => String(n).padStart(4, "0");

function baseSalaryFor(i: number): number {
  return 2500000 + ((i - 1) % 10) * 100000;
}

function positionFor(i: number): string {
  return SAMPLE_POSITIONS[(i - 1) % SAMPLE_POSITIONS.length];
}

function departmentFor(i: number): string {
  return SAMPLE_DEPARTMENTS[(i - 1) % SAMPLE_DEPARTMENTS.length];
}

function hireDateFor(i: number): string {
  const year = 2015 + ((i - 1) % 10);
  const month = 1 + ((i - 1) % 12);
  const day = 1 + ((i - 1) % 28);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function buildBaselineRecord(i: number): SamplePayrollRecord {
  const base = baseSalaryFor(i);
  const incomeTax = Math.round((base * 0.033) / 1000) * 1000;
  return {
    사번: `EMP${pad3(i)}`,
    성명: `직원${pad3(i)}`,
    재직상태: "재직",
    부서: departmentFor(i),
    직책: positionFor(i),
    이메일: `employee${pad3(i)}@example.com`,
    연락처: `010-0000-${pad4(i)}`,
    입사일: hireDateFor(i),
    기본급: base,
    직책수당: POSITION_ALLOWANCE[positionFor(i)],
    식대: 200000,
    기타고정수당: 0,
    연장근로시간: 0,
    연장근로수당: 0,
    인센티브: 0,
    성과급: 0,
    기타지급: 0,
    국민연금적용여부: "Y",
    건강보험적용여부: "Y",
    고용보험적용여부: "Y",
    소득세: incomeTax,
    지방소득세: Math.round((incomeTax * 0.1) / 100) * 100,
    기타공제: 0,
  };
}

function clone(record: SamplePayrollRecord): SamplePayrollRecord {
  return { ...record };
}

/** 시나리오 인덱스 (1~100). 각 그룹의 의도는 함수 이름/주석 참고. */
const NEW_HIRE = [1, 2, 3];
const DROPPED = [4, 5];
const BASE_SALARY_CHANGE = [6, 7, 8];
const NEW_VARIABLE_PAY = [9, 10, 11];
const ZERO_OUT_VARIABLE_PAY = [12, 13];
const INSURANCE_CHANGE = [14, 15];
const OVERTIME_MISMATCH = [16, 17];
const BIG_CHANGE = [18, 19, 20];
const YN_ERROR = [21, 22];
const NUMERIC_ERROR = 23;
const NEGATIVE_ERROR = 24;
const MISSING_BASE_SALARY = 25;
const MISSING_NAME = 26;
const DUPLICATE_NUMBER = 27;
const RETIREE_WITH_PAY = 28;

export interface SampleDataset {
  previous: SamplePayrollRecord[];
  current: SamplePayrollRecord[];
}

/** 매번 호출해도 완전히 동일한 결과를 반환하는 고정(deterministic) 샘플 데이터셋. */
export function buildSampleDataset(): SampleDataset {
  const previous: SamplePayrollRecord[] = [];
  const current: SamplePayrollRecord[] = [];

  for (let i = 1; i <= EMPLOYEE_COUNT; i++) {
    const prevBase = buildBaselineRecord(i);
    const currBase = clone(prevBase);
    if (DROPPED.includes(i)) {
      prevBase.재직상태 = "퇴사";
    }

    if (NEW_HIRE.includes(i)) {
      current.push(currBase);
      continue; // 전월 자료 없음
    }
    if (DROPPED.includes(i)) {
      previous.push(prevBase);
      continue; // 당월 자료 없음
    }

    if (BASE_SALARY_CHANGE.includes(i)) {
      const delta = i === 8 ? -150000 : 200000;
      currBase.기본급 = (currBase.기본급 as number) + delta;
    }
    if (NEW_VARIABLE_PAY.includes(i)) {
      if (i === 9) currBase.인센티브 = 500000;
      if (i === 10) currBase.성과급 = 400000;
      if (i === 11) currBase.기타지급 = 200000;
    }
    if (ZERO_OUT_VARIABLE_PAY.includes(i)) {
      if (i === 12) {
        prevBase.인센티브 = 300000;
        currBase.인센티브 = 0;
      }
      if (i === 13) {
        prevBase.성과급 = 400000;
        currBase.성과급 = 0;
      }
    }
    if (INSURANCE_CHANGE.includes(i)) {
      if (i === 14) {
        prevBase.고용보험적용여부 = "Y";
        currBase.고용보험적용여부 = "N";
      }
      if (i === 15) {
        prevBase.건강보험적용여부 = "N";
        currBase.건강보험적용여부 = "Y";
      }
    }
    if (OVERTIME_MISMATCH.includes(i)) {
      currBase.연장근로시간 = 10;
      currBase.연장근로수당 = 0;
    }
    if (BIG_CHANGE.includes(i)) {
      if (i === 18) currBase.성과급 = 2000000;
      if (i === 19) currBase.인센티브 = 1800000;
      if (i === 20) currBase.기본급 = Math.round((currBase.기본급 as number) * 0.5);
    }
    if (YN_ERROR.includes(i)) {
      if (i === 21) currBase.국민연금적용여부 = "YES";
      if (i === 22) currBase.건강보험적용여부 = "1";
    }
    if (i === NUMERIC_ERROR) currBase.기타지급 = "미정";
    if (i === NEGATIVE_ERROR) currBase.인센티브 = -100000;
    if (i === MISSING_BASE_SALARY) currBase.기본급 = null;
    if (i === MISSING_NAME) currBase.성명 = "";
    if (i === RETIREE_WITH_PAY) {
      currBase.재직상태 = "퇴사";
      currBase.인센티브 = 200000;
    }

    previous.push(prevBase);
    current.push(currBase);
    if (i === DUPLICATE_NUMBER) {
      current.push(clone(currBase)); // PAY-002 사번중복 유발용 중복 행
    }
  }

  return { previous, current };
}
