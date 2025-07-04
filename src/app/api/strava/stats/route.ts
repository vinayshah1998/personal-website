import { NextResponse } from 'next/server';
import { stravaAPI } from '@/lib/strava';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await stravaAPI.getAthleteStats();
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch Strava stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Strava stats' },
      { status: 500 }
    );
  }
}