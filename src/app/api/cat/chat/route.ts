import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { message } = await request.json();
  
  // Placeholder for real estate advice generation logic
  const response = `Based on your message: "${message}", here's some helpful real estate advice.`;
  
  return NextResponse.json({ response });
}