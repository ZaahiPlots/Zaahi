import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const corePath = path.join(process.cwd(), 'core');
  try {
    const files = fs.readdirSync(corePath)
      .filter(f => f.endsWith('.py'))
      .sort((a, b) => fs.statSync(path.join(corePath, b)).mtimeMs - fs.statSync(path.join(corePath, a)).mtimeMs);
    return NextResponse.json({ files });
  } catch (e) {
    return NextResponse.json({ files: [] });
  }
}
