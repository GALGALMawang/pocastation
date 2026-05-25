/**
 * analyze-image Edge Function
 *
 * Gemini Vision으로 업로드된 이미지에서 손글씨 인증 코드를 읽어
 * 기대값과 일치하는지 검증한다.
 *
 * Request body:
 *   imageBase64    - base64 인코딩된 이미지 (data URL의 콤마 뒤 부분)
 *   mimeType       - 이미지 MIME 타입 (e.g. "image/jpeg")
 *   verificationWord - 기대하는 인증 코드 (e.g. "VIOLET-PINE")
 *
 * Response:
 *   { matched: boolean, detected: string | null, message: string }
 *
 * 환경변수 (Supabase Dashboard → Edge Functions → Secrets):
 *   GEMINI_API_KEY
 */

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { imageBase64, mimeType, verificationWord } = await req.json();

    if (!imageBase64 || !verificationWord) {
      return json({ matched: false, detected: null, message: '필수 파라미터 누락' }, 400);
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return json({ matched: false, detected: null, message: 'GEMINI_API_KEY 미설정' }, 500);
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
      return json({
        matched:  !!parsed.matched,
        detected: parsed.detected ?? null,
        message:  parsed.matched ? '인증 코드 확인됨' : '코드가 보이지 않거나 일치하지 않아요',
      });
    }

    return json({ matched: false, detected: null, message: '분석 실패, 다시 시도해주세요' });

  } catch (e) {
    return json({ matched: false, detected: null, message: e.message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
