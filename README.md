# Payroll 급여 산출 및 검증 자동화 도구

> 급여 입력자료 검증부터 최종 지급액 산출까지

실제 회사 급여시스템을 대체하지 않는 **발표(시연)용 프로토타입**입니다. Excel 업로드 →
브라우저에서 실제 데이터 읽기 → 검증 → 계산 → 확인 필요 자동 분류 → 결과 확인 →
Supabase 저장 → 과거 작업 조회 → Excel 다운로드까지, 목업이 아니라 실제로 동작합니다.

## ⚠️ 이 프로그램의 성격

- 실제 대한민국 세법·4대보험 법정 요율을 사용하지 않습니다. `lib/payroll/rules.ts` 의 수치는
  전부 **"시연용 가상 계산 기준"**입니다.
- 모든 직원/금액 데이터는 **가상 데이터**입니다 (실제 인물·회사·계좌와 무관).
- 실제 급여 송금, 세금/보험 신고, 법률·세무 판단 기능은 없습니다.
- 급여 계산과 검증은 전부 TypeScript의 결정론적(rule-based) 로직으로 수행하며, AI는
  계산에 관여하지 않습니다.

## 기술 스택

- Next.js (App Router) + React + TypeScript
- Tailwind CSS
- Supabase (PostgreSQL) — 작업 이력 저장/조회
- SheetJS (xlsx) — 브라우저에서 실제 Excel 읽기/쓰기
- lucide-react — 아이콘

## 핵심 기능 (전부 실제로 동작)

1. **Excel 업로드** — 드래그 앤 드롭 또는 파일 선택, SheetJS로 브라우저에서 실제 파싱
2. **입력자료 검증** — 필수값 누락/사번 중복/숫자 오류/음수/보험값 오류/연장근로 불일치 등
   (`lib/payroll/validation.ts`)
3. **지급/공제 계산** — 고정지급 + 변동지급, 4대보험(시연용 요율), 최종지급액
   (`lib/payroll/calculation.ts`)
4. **전월 대비 이상변동 검증** — 설정된 임계치 초과 시 확인 필요로 자동 분류
5. **계산 기준 설정** — 국민연금/건강보험/고용보험 요율, 이상변동 기준을 화면에서 직접 수정 후
   "다시 계산"
6. **직원 상세보기** — Drawer로 지급/공제 상세, 계산 근거(왜 이 값이 나왔는가), 확인 필요 사유
7. **Excel 결과 다운로드** — 실제 .xlsx 파일 생성 (SheetJS)
8. **Supabase 저장/조회** — "작업 결과 저장" → `payroll_runs` + `payroll_results` 테이블에
   저장, "작업 이력"에서 과거 작업을 다시 조회 (새로고침해도 유지)

## 프로젝트 구조

```
payroll-nextjs/
├── app/
│   ├── page.tsx            # 메인 페이지 (PayrollDashboard 렌더)
│   └── layout.tsx
├── components/
│   ├── PayrollDashboard.tsx # 전체 상태관리 및 화면 오케스트레이션
│   ├── PayrollUpload.tsx    # Excel 업로드 + 샘플 다운로드
│   ├── RuleSettings.tsx     # 계산 기준 설정
│   ├── SummaryCards.tsx     # KPI 카드
│   ├── PayrollTable.tsx     # 직원별 결과 테이블 (필터/검색)
│   ├── ValidationPanel.tsx  # 확인 필요 목록
│   ├── EmployeeDetail.tsx   # 직원 상세 Drawer
│   ├── PayrollHistory.tsx   # 작업 이력 (Supabase)
│   └── StatusBadge.tsx
├── lib/
│   ├── payroll/
│   │   ├── types.ts         # EmployeeInput / PayrollResult / PayrollRules 등
│   │   ├── rules.ts         # 시연용 계산 기준 (기본값)
│   │   ├── columns.ts       # Excel 헤더 <-> 필드명 매핑
│   │   ├── validation.ts    # 검증 엔진 (UI와 분리)
│   │   ├── calculation.ts   # 계산 엔진 (UI와 분리)
│   │   ├── excel.ts         # SheetJS 읽기/쓰기
│   │   ├── sampleData.ts    # 발표용 가상 직원 10명
│   │   └── format.ts
│   └── supabase/
│       ├── client.ts          # anon key 전용 브라우저 클라이언트
│       └── payrollHistory.ts  # 작업 저장/조회 함수
├── scripts/
│   ├── selfTest.ts          # 계산 엔진 자가 테스트 (xlsx 왕복 포함)
│   └── edgeTest.ts          # 검증 엔진 엣지케이스 테스트
├── supabase/
│   └── schema.sql           # Supabase에 한 번에 실행할 SQL
├── .env.local.example
└── package.json
```

## 로컬 실행

```bash
npm install
npm run dev
```

`http://localhost:3000` 접속. Supabase 환경변수가 없어도 업로드/검증/계산/다운로드는
정상 동작하며, "작업 이력" 영역에만 안내 문구가 표시됩니다.

계산/검증 엔진만 다시 확인하고 싶다면:

```bash
npx tsx scripts/selfTest.ts   # 실제 xlsx 생성 -> 파싱 -> 계산 왕복 + 수기 검산
npx tsx scripts/edgeTest.ts   # 필수값 누락/중복/음수/보험값 오류 등 엣지케이스
```

## Supabase 설정 순서 (초보자용, 매우 구체적으로)

### 1. Supabase 프로젝트 생성

1. https://supabase.com 접속 후 로그인 (GitHub 계정으로 로그인 가능)
2. **New Project** 클릭
3. Organization 선택 → Project name 입력 (예: `payroll-nextjs`) → Database Password 설정
   (기억해 둘 필요는 없습니다. 이 앱은 anon key만 사용합니다)
4. Region은 가까운 지역(예: Northeast Asia (Seoul) 이 있다면 그것) 선택 후 **Create new project**
5. 1~2분 정도 프로비저닝 대기

### 2. schema.sql 실행

1. 왼쪽 메뉴에서 **SQL Editor** 클릭
2. **New query** 클릭
3. 이 프로젝트의 [`supabase/schema.sql`](supabase/schema.sql) 파일 내용 전체를 복사해서 붙여넣기
4. 우측 하단 **Run** 클릭 → "Success. No rows returned" 메시지 확인
5. 왼쪽 메뉴 **Table Editor** 에서 `payroll_runs`, `payroll_results` 테이블이 생성되었는지 확인

### 3. API 키 확인

1. 왼쪽 메뉴 **Project Settings** (톱니바퀴) → **API**
2. **Project URL** 값을 복사 (`https://xxxxx.supabase.co` 형태)
3. **Project API keys** 에서 **anon / public** 키를 복사 (⚠️ **service_role** 키는 절대
   사용하지 않습니다)

### 4. 환경변수 설정

1. 프로젝트 루트에 `.env.local.example` 파일을 복사해서 `.env.local` 파일을 새로 만듭니다.
2. 아래처럼 값을 채웁니다.

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJхxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

3. 개발 서버를 재시작합니다 (`npm run dev`). "작업 이력" 영역에 안내 문구 대신 실제 이력
   목록(또는 "저장된 작업이 아직 없습니다")이 표시되면 성공입니다.

## GitHub 에 올리기 (초보자용)

```bash
git init
git add .
git commit -m "Initial commit: Payroll 급여 산출 및 검증 자동화 도구"
```

GitHub CLI 사용 시:
```bash
gh repo create payroll-nextjs --private --source=. --remote=origin --push
```

또는 GitHub 웹사이트에서 새 저장소를 만든 뒤:
```bash
git remote add origin https://github.com/<내계정>/payroll-nextjs.git
git branch -M main
git push -u origin main
```

`.env.local` 은 `.gitignore` 에 포함되어 있어 절대 커밋되지 않습니다.

## Vercel 배포하기

1. https://vercel.com 접속 후 GitHub 계정으로 로그인
2. **Add New...** → **Project** 클릭
3. 방금 만든 GitHub 저장소(`payroll-nextjs`) **Import**
4. Framework Preset 은 Next.js 로 자동 인식됩니다. 그대로 둡니다.
5. **Environment Variables** 에 아래 두 개를 등록:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. **Deploy** 클릭
7. 배포가 끝나면 `https://payroll-nextjs.vercel.app` (또는 Vercel이 부여한 주소)로 접속해
   확인합니다.

이후 `main` 브랜치에 push 할 때마다 Vercel이 자동으로 다시 빌드/배포합니다.

## 자동 검증 항목 (발표용 검증 예시 규칙)

1. 필수 컬럼/값 누락 (사번, 성명, 재직상태, 기본급) → **오류**
2. 사번 중복 → **오류**
3. 숫자여야 할 값이 숫자가 아님 / 음수 → **확인 필요** (기본급은 **오류**)
4. 보험 적용여부가 Y/N 이외의 값 → **확인 필요**
5. 연장근로시간 > 0 인데 연장근로수당 = 0 → **확인 필요**
6. 재직상태가 퇴사인데 변동 지급항목이 입력됨 → **확인 필요**
7. 전월 대비 총지급액 변동률이 설정 기준 초과 → **확인 필요**

**오류** 상태의 직원은 누락된 금액을 임의로 추정하지 않고 0으로 처리하며, 검증 사유와 함께
그대로 표시됩니다 — 담당자가 원본 데이터를 확인해야 합니다.

## 만들지 않은 것 (V1 범위 밖)

실제 회사 급여시스템 연동, 실제 개인정보/고객사 데이터, 실제 계좌번호, 실제 세금/보험 신고,
법률·세무 판단, 급여 자동 송금, 이메일 자동 발송, 로그인/회원가입, 회사 내부 시스템처럼
위장한 화면 — 모두 포함하지 않습니다.

## 향후 확장 아이디어 (V1 미구현, 아이디어만 기록)

- 근태 시스템 연동
- 전월 급여 자동 불러오기
- 고객사별 급여 규칙 설정
- Excel 입력 양식 자동 매핑
- Payroll 마감 일정 관리
- 급여명세서 생성
- 확인 필요 항목 담당자 배정
- 로그인 기반 접근 제어
- 검증 결과 자연어 설명 (AI, 계산에는 관여하지 않는 선택 기능)

## 60~90초 시연 순서

1. (0~8초) Vercel 사이트 접속, 첫 화면 확인
2. (8~15초) 샘플 Excel 다운로드
3. (15~25초) 다운로드한 sample_payroll.xlsx 내용 확인
4. (25~35초) 사이트에 Excel 업로드
5. (35~45초) "급여 산출 실행" 클릭
6. (45~55초) KPI 대시보드 확인 (처리 대상/정상/확인 필요/총 지급/총 공제/최종 지급)
7. (55~70초) 확인 필요 직원 클릭 → 전월 대비 급증 또는 연장근로 데이터 불일치 확인
8. (70~80초) 직원 상세 산출내역(계산 근거) 확인
9. (80~90초) "급여 산출 결과 다운로드" 클릭

시간이 남으면 "작업 결과 저장" → "작업 이력"에서 다시 조회하는 과정도 보여줍니다.
