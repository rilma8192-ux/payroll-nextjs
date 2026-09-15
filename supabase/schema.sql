-- ============================================================================
-- Payroll 급여 산출 및 검증 자동화 - Supabase Schema
-- ============================================================================
-- Supabase 프로젝트의 SQL Editor 에서 이 파일 전체를 한 번에 실행하세요.
--
-- 주의: 이 프로토타입은 로그인 없이(V1) 사용되므로, 아래 RLS 정책은
-- 익명(anon) 사용자에게 select / insert 를 허용합니다. 이는 발표용
-- 프로토타입에 한정된 설정이며, 실제 운영 환경에서는 반드시 인증 기반
-- 정책으로 교체해야 합니다. update / delete 는 아무 정책도 없어
-- anon 키로는 불가능합니다(기본적으로 RLS가 모든 접근을 막기 때문).
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- payroll_runs: 급여 산출 작업(run) 요약
-- ----------------------------------------------------------------------------
create table if not exists payroll_runs (
  id uuid primary key default gen_random_uuid(),
  run_name text not null,
  payroll_month text not null,
  employee_count integer not null default 0,
  normal_count integer not null default 0,
  review_count integer not null default 0,
  error_count integer not null default 0,
  total_gross_pay numeric not null default 0,
  total_deductions numeric not null default 0,
  total_net_pay numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_payroll_runs_created_at on payroll_runs (created_at desc);

-- ----------------------------------------------------------------------------
-- payroll_results: 작업(run)에 속한 직원별 산출 결과
-- ----------------------------------------------------------------------------
create table if not exists payroll_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references payroll_runs (id) on delete cascade,

  employee_number text not null,
  employee_name text not null,
  employment_status text not null,

  base_salary numeric not null default 0,
  position_allowance numeric not null default 0,
  meal_allowance numeric not null default 0,
  fixed_allowance numeric not null default 0,
  overtime_hours numeric not null default 0,
  overtime_pay numeric not null default 0,
  incentive numeric not null default 0,
  bonus numeric not null default 0,
  other_payment numeric not null default 0,
  gross_pay numeric not null default 0,

  pension numeric not null default 0,
  health_insurance numeric not null default 0,
  employment_insurance numeric not null default 0,
  income_tax numeric not null default 0,
  local_income_tax numeric not null default 0,
  other_deduction numeric not null default 0,
  total_deductions numeric not null default 0,

  net_pay numeric not null default 0,

  previous_gross_pay numeric not null default 0,
  change_amount numeric,
  change_rate numeric,

  validation_status text not null check (validation_status in ('정상', '확인 필요', '오류')),
  validation_reasons jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_payroll_results_run_id on payroll_results (run_id);
create index if not exists idx_payroll_results_employee_number on payroll_results (employee_number);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table payroll_runs enable row level security;
alter table payroll_results enable row level security;

drop policy if exists "anon can read payroll_runs" on payroll_runs;
create policy "anon can read payroll_runs"
  on payroll_runs for select
  to anon
  using (true);

drop policy if exists "anon can insert payroll_runs" on payroll_runs;
create policy "anon can insert payroll_runs"
  on payroll_runs for insert
  to anon
  with check (true);

drop policy if exists "anon can read payroll_results" on payroll_results;
create policy "anon can read payroll_results"
  on payroll_results for select
  to anon
  using (true);

drop policy if exists "anon can insert payroll_results" on payroll_results;
create policy "anon can insert payroll_results"
  on payroll_results for insert
  to anon
  with check (true);

-- update/delete 정책은 의도적으로 만들지 않았습니다.
-- (RLS가 기본적으로 모든 접근을 차단하므로 anon 키로는 수정/삭제가 불가능합니다.)
