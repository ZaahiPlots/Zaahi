import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, role } = await req.json();
    
    // Log the request (visible in Vercel logs)
    console.log('=== NEW ACCESS REQUEST ===');
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`Phone: ${phone}`);
    console.log(`Role: ${role}`);
    console.log('========================');

    // Send email notification via Supabase Edge Function or simple fetch
    // For now, we use Supabase's built-in email (the admin can check Vercel logs)
    
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
