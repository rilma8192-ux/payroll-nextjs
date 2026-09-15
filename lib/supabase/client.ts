import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase 브라우저 클라이언트.
 *
 * NEXT_PUBLIC_* 환경변수만 사용하며, service_role key는 이 파일을 포함한
 * 클라이언트 코드 어디에도 존재하지 않는다. 환경변수가 설정되지 않은 경우
 * (로컬 개발 초기 상태 등)에도 앱 전체가 죽지 않도록 null을 반환한다.
 */

let cachedClient: SupabaseClient | null | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;

  if (!isSupabaseConfigured()) {
    cachedClient = null;
    return null;
  }

  cachedClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  );
  return cachedClient;
}
