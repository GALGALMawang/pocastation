/**
 * supabase.js — Supabase 클라이언트 초기화
 *
 * 환경변수는 .env.local에 설정한다 (.env.example 참고).
 * Vercel 배포 시에는 프로젝트 설정 → Environment Variables에도 동일하게 등록 필요.
 *
 * VITE_SUPABASE_ANON_KEY는 Supabase의 공개 키(anon key)로,
 * 클라이언트에 노출되어도 안전하다. 실제 보안은 RLS(Row Level Security)가 담당한다.
 */
import { createClient } from '@supabase/supabase-js';

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SB_URL || !SB_KEY) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local');
}

export const supabase = createClient(SB_URL, SB_KEY);
