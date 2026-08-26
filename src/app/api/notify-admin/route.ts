import { NextRequest, NextResponse } from 'next/server';
import { debugLog } from '@/lib/debug';

// Redact a name to first initial only — a full name is PII (CLAUDE.md rule 5).
function redactName(input: unknown): string {
  if (typeof input !== 'string' || input.trim().length === 0) return '[missing]';
  return `${input.trim()[0]}***`;
}

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

    // Redacted summary, DEBUG-gated. Two problems with the previous version:
    // the surrounding comment claimed "never raw PII" while `Name` was logged
    // verbatim (a full name is PII under PDPL — CLAUDE.md rule 5), and this
    // route is in the middleware PUBLIC_API allow-list, so an unauthenticated
    // caller could write arbitrary attacker-chosen strings into Vercel logs
    // on every request. Six unconditional lines per submission, now one,
    // silent unless DEBUG is on.
    debugLog(
      '[notify-admin] access request',
      {
        name: redactName(name),
        email: redactEmail(email),
        phone: redactPhone(phone),
        role: typeof role === 'string' ? role.slice(0, 40) : '[missing]',
      },
    );

    // Send email notification via Supabase Edge Function or simple fetch
    // For now, we use Supabase's built-in email (the admin can check Vercel logs)

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
