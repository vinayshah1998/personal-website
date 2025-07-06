import { NextResponse } from 'next/server';
import { stravaAPI } from '@/lib/strava';
import { cache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MINUTES = 10;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Create cache key based on limit parameter
    const cacheKey = `strava-activities-${limit}`;
    
    // Try to get from cache first
    const cachedActivities = cache.get(cacheKey);
    if (cachedActivities) {
      console.log(`Returning cached Strava activities (limit: ${limit})`);
      return NextResponse.json(cachedActivities);
    }

    // Fetch fresh data from Strava
    console.log(`Fetching fresh Strava activities (limit: ${limit})`);
    const activities = await stravaAPI.getRecentActivities(limit);
    
    // Cache the result
    cache.set(cacheKey, activities, CACHE_TTL_MINUTES);
    
    return NextResponse.json(activities);
  } catch (error) {
    console.error('Failed to fetch Strava activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Strava activities' },
      { status: 500 }
    );
  }
}