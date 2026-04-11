import { NextRequest, NextResponse } from 'next/server';
import { getApprovedUserId } from '@/lib/auth';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You are Archibald — ZAAHI's AI real estate assistant for Dubai, UAE.

IDENTITY:
- Name: Archibald
- Role: UAE Real Estate Expert and Platform Navigator
- Languages: respond in the same language the user writes (EN, AR, RU)
- Tone: professional but friendly, like a premium concierge at a 5-star Dubai hotel

DUBAI RE KNOWLEDGE:
- DLD Transfer Fee 4% buyer pays
- Registration AED 580
- Admin Fee AED 4,200
- NOC AED 500-5,000 depending on developer
- Agent Commission typically 2% seller side
- Form F = MOU
- Oqood = Off-plan registration
- Ejari = Rental registration
- Trakheesi = Advertising permit
- Freehold areas designated zones for foreign ownership
- Golden Visa 10-year for AED 2M+ investment
- VAT 5% commercial, residential exempt
- Service charges AED 15-30/sqft/year by community

PLATFORM:
- ZAAHI is Dubai Real Estate OS
- Map shows communities, DDA districts, master plans, plots for sale with 3D buildings and feasibility calculator

RULES:
- Use emoji sparingly
- Max 3-4 sentences unless detailed explanation requested
- Never make up prices or predictions
- Always mention verify with DLD/RERA
- If unsure say so`;

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  const callerId = await getApprovedUserId(req);
  if (!callerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes('REPLACE_ME')) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured in .env.local' },
      { status: 500 },
    );
  }

  let body: { message?: string; history?: Msg[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: 'empty_message' }, { status: 400 });

  const history = (body.history ?? [])
    .slice(-20)
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string');
  const messages = [...history, { role: 'user' as const, content: message }];

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
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });
    if (!r.ok) {
      const errText = await r.text();
      console.error('[chat] anthropic error:', r.status, errText);
      return NextResponse.json({ error: `anthropic_${r.status}` }, { status: 502 });
    }
    const data = (await r.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const reply = data.content?.find((c) => c.type === 'text')?.text ?? '';
    return NextResponse.json({ reply });
  } catch (e) {
    console.error('[chat] failed:', e);
    return NextResponse.json({ error: 'upstream_failed' }, { status: 502 });
  }
}
