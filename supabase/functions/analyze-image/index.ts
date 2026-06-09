/**
 * analyze-image Edge Function
 *
 * Gemini Vision으로 업로드된 이미지에서 손글씨 인증 코드를 읽어
 * 기대값과 일치하는지 검증한다.
 *
 * 보안:
 *   - 로그인한 유저만 호출 가능 (Authorization 헤더의 Supabase JWT 검증).
 *     → GEMINI_API_KEY 무단 호출로 인한 비용 abuse 방지.
 *   - 검증 결과는 VERIFY_SECRET 으로 HMAC 서명하여 반환한다.
 *     클라이언트는 이 서명을 auctions.verify_sig 로 함께 저장하고,
 *     DB 트리거(enforce_verify_matched)가 서명을 재검증하므로
 *     클라이언트가 verify_matched=true 를 위조할 수 없다.
 *
 * Request body:
 *   imageBase64      - base64 인코딩된 이미지 (data URL의 콤마 뒤 부분)
 *   mimeType         - 이미지 MIME 타입 (e.g. "image/jpeg")
 *   verificationWord - 기대하는 인증 코드 (e.g. "VIOLET-PINE")
 *
 * Response:
 *   { matched: boolean, detected: string | null, message: string, signature: string | null }
 *
 * 환경변수 (Supabase Dashboard → Edge Functions → Secrets):
 *   GEMINI_API_KEY
 *   VERIFY_SECRET   - DB의 app.verify_secret 과 동일한 값 (migration_security_fixes.sql 참고)
 *   SUPABASE_URL, SUPABASE_ANON_KEY  - 런타임 기본 제공
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// VERIFY_SECRET 으로 "<word>:<matched>" 를 HMAC-SHA256 서명 → hex 문자열
async function signVerdict(word: string, matched: boolean): Promise<string | null> {
  const secret = Deno.env.get('VERIFY_SECRET');
  if (!secret) return null;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const msg = `${word}:${matched ? 'true' : 'false'}`;
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    // ── 인증: 로그인 유저만 허용 ──────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ matched: false, detected: null, message: '로그인이 필요합니다.', signature: null }, 401);
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return json({ matched: false, detected: null, message: '인증에 실패했습니다.', signature: null }, 401);
    }

    const { imageBase64, mimeType, verificationWord } = await req.json();

    if (!imageBase64 || !verificationWord) {
      return json({ matched: false, detected: null, message: '필수 파라미터 누락', signature: null }, 400);
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return json({ matched: false, detected: null, message: 'GEMINI_API_KEY 미설정', signature: null }, 500);
    }

    const prompt = `이 이미지에 손으로 쓴 텍스트가 있나요?
있다면 정확히 어떤 글자인지 알려주세요.
특히 "${verificationWord}" 라는 코드가 손글씨로 쓰여 있는지 확인해주세요.

다음 JSON 형식으로만 답해주세요 (다른 텍스트 없이):
{"detected": "이미지에서 읽은 텍스트 또는 null", "matched": true 또는 false}

matched는 읽은 텍스트가 "${verificationWord}"와 동일하거나 매우 유사하면 true, 없거나 다르면 false입니다.
대소문자, 하이픈 등 약간의 차이는 무시하고 판단해주세요.`;

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
      }),
    });

    const gemini = await res.json();
    const text = gemini.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // JSON 파싱 시도
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const matched = !!parsed.matched;
      return json({
        matched,
        detected: parsed.detected ?? null,
        message:  matched ? '인증 코드 확인됨' : '코드가 보이지 않거나 일치하지 않아요',
        signature: await signVerdict(verificationWord, matched),
      });
    }

    return json({
      matched: false, detected: null,
      message: '분석 실패, 다시 시도해주세요',
      signature: await signVerdict(verificationWord, false),
    });

  } catch (e) {
    return json({ matched: false, detected: null, message: e.message, signature: null }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
