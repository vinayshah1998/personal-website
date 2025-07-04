import { NextResponse } from 'next/server';
import { stravaAPI } from '@/lib/strava';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const activities = await stravaAPI.getRecentActivities(limit);
    
    return NextResponse.json(activities);
  } catch (error) {
    console.error('Failed to fetch Strava activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Strava activities' },
      { status: 500 }
    );
  }
}