import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(req: Request) {
  const { message } = await req.json();
  try {
    const { stdout } = await execAsync(`ollama run qwen3:8b "${message}"`);
    return NextResponse.json({ response: stdout.trim() });
  } catch (error) {
    return NextResponse.json({ error: 'Cat is sleeping...' }, { status: 500 });
  }
}
