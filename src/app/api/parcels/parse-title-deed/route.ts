import { NextRequest, NextResponse } from 'next/server';
import { getApprovedUserId } from '@/lib/auth';

export const runtime = 'nodejs';

const SYSTEM = `You are a Dubai title deed extractor. The user uploads an image
of a Dubai Land Department title deed (sanad / mulkiya). Extract the following
fields and return ONLY a JSON object — no prose, no markdown.

Schema:
{
  "plotNumber": string | null,
  "titleDeedNumber": string | null,
  "ownerName": string | null,
  "areaSqm": number | null,
  "areaSqft": number | null,
  "emirate": string | null,
  "district": string | null,
  "issueDate": string | null  // ISO YYYY-MM-DD if visible
}

Rules:
- If a field is not visible, return null.
- Numbers must be plain JSON numbers (no commas).
- Do not invent values.
- Output only the JSON object, nothing else.`;

/**
 * POST /api/parcels/parse-title-deed
 * Body: { imageBase64: string, mediaType?: "image/png"|"image/jpeg"|"application/pdf" }
 * Calls Claude Sonnet 4.6 vision and returns the parsed structured fields.
 */
export async function POST(req: NextRequest) {
  const callerId = await getApprovedUserId(req);
  if (!callerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes('REPLACE_ME')) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 },
    );
  }

  let body: { imageBase64?: string; mediaType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.imageBase64) {
    return NextResponse.json({ error: 'imageBase64 required' }, { status: 400 });
  }
  const mediaType = body.mediaType ?? 'image/jpeg';
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(mediaType)) {
    return NextResponse.json({ error: 'unsupported_media_type' }, { status: 400 });
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: SYSTEM,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: body.imageBase64 },
              },
              { type: 'text', text: 'Extract the title deed fields as JSON.' },
            ],
          },
        ],
      }),
    });
    if (!r.ok) {
      const errText = await r.text();
      console.error('[parse-title-deed] anthropic:', r.status, errText);
      return NextResponse.json({ error: `anthropic_${r.status}` }, { status: 502 });
    }
    const data = (await r.json()) as { content?: Array<{ type: string; text?: string }> };
    const raw = data.content?.find((c) => c.type === 'text')?.text ?? '';
    // Strip ```json fences if the model adds them.
    const jsonText = raw.replace(/```json\s*|\s*```/g, '').trim();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return NextResponse.json({ error: 'parse_failed', raw }, { status: 502 });
    }
    return NextResponse.json({ fields: parsed });
  } catch (e) {
    console.error('[parse-title-deed] failed:', e);
    return NextResponse.json({ error: 'upstream_failed' }, { status: 502 });
  }
}
