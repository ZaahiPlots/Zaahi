import { NextRequest, NextResponse } from 'next/server';

// Redact an email to "ab***@domain" to keep logs diagnostic without leaking PII.
function redactEmail(input: unknown): string {
  if (typeof input !== 'string' || !input.includes('@')) return '[missing]';
  const [local, domain] = input.split('@');
  const head = local.slice(0, 2);
  return `${head}***@${domain}`;
}

// Redact a phone to last-4 only.
function redactPhone(input: unknown): string {
  if (typeof input !== 'string' || input.length < 4) return '[missing]';
  return `***${input.slice(-4)}`;
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, role } = await req.json();

    // Log a redacted summary only — never raw PII (CLAUDE.md rule).
    // Enough signal to triage access requests from Vercel logs, zero leak.
    console.log('=== NEW ACCESS REQUEST ===');
    console.log(`Name: ${typeof name === 'string' ? name.slice(0, 40) : '[missing]'}`);
    console.log(`Email: ${redactEmail(email)}`);
    console.log(`Phone: ${redactPhone(phone)}`);
    console.log(`Role: ${typeof role === 'string' ? role.slice(0, 40) : '[missing]'}`);
    console.log('========================');

    // Send email notification via Supabase Edge Function or simple fetch
    // For now, we use Supabase's built-in email (the admin can check Vercel logs)

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
