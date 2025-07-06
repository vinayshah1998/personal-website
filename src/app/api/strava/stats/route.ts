import { NextResponse } from 'next/server';
import { stravaAPI } from '@/lib/strava';
import { cache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'strava-stats';
const CACHE_TTL_MINUTES = 10;

export async function GET() {
  try {
    // Try to get from cache first
    const cachedStats = cache.get(CACHE_KEY);
    if (cachedStats) {
      console.log('Returning cached Strava stats');
      return NextResponse.json(cachedStats);
    }

    // Fetch fresh data from Strava
    console.log('Fetching fresh Strava stats');
    const stats = await stravaAPI.getAthleteStats();
    
    // Cache the result
    cache.set(CACHE_KEY, stats, CACHE_TTL_MINUTES);
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch Strava stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Strava stats' },
      { status: 500 }
    );
  }
}