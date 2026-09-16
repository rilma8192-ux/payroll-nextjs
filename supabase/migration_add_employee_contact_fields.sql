-- ============================================================================
-- Migration: payroll_results 에 인적사항(부서/연락처/이메일) 컬럼 추가
-- ============================================================================
-- 이미 schema.sql 을 실행해 payroll_results 테이블이 존재하는 배포 환경에
-- 적용하는 증분 마이그레이션입니다. Supabase 프로젝트의 SQL Editor 에서
-- 이 파일 전체를 한 번 실행하세요. (신규로 schema.sql 을 처음부터 실행하는
-- 경우에는 이미 반영되어 있으므로 이 파일을 따로 실행할 필요가 없습니다.)
--
-- 부서/연락처/이메일은 급여 계산에는 사용되지 않는 인적사항 전용 항목이며,
-- 모두 가상 데이터로만 채워집니다.
-- ============================================================================

alter table payroll_results
  add column if not exists department text not null default '';

alter table payroll_results
  add column if not exists phone text not null default '';

alter table payroll_results
  add column if not exists email text not null default '';
