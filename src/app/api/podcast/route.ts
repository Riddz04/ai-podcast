import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  return NextResponse.json({ message: 'Podcast API is working!' });
}

// You can add POST, PUT, DELETE handlers here later for actual podcast generation logic
// For example:
// export async function POST(request: Request) {
//   const data = await request.json();
//   // Process data and generate podcast
//   return NextResponse.json({ podcastId: '123', status: 'processing' });
// }