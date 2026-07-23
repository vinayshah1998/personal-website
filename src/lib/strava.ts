interface StravaTokenResponse {
  access_token: string;
  expires_at: number;
}

interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  start_date: string;
  start_date_local?: string;
  average_speed?: number;
  max_speed?: number;
}

interface StravaTotals {
  count: number;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  elevation_gain: number;
}

interface StravaStats {
  recent_run_totals: StravaTotals;
  ytd_run_totals: StravaTotals;
  all_run_totals: StravaTotals;
}

interface StravaCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export class StravaConfigurationError extends Error {
  constructor() {
    super('Strava is not configured');
    this.name = 'StravaConfigurationError';
  }
}

function getCredentials(): StravaCredentials {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const refreshToken = process.env.STRAVA_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new StravaConfigurationError();
  }

  return { clientId, clientSecret, refreshToken };
}

export function isStravaConfigured() {
  return Boolean(
    process.env.STRAVA_CLIENT_ID &&
      process.env.STRAVA_CLIENT_SECRET &&
      process.env.STRAVA_REFRESH_TOKEN,
  );
}

class StravaAPI {
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  private async refreshAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt * 1000) {
      return this.accessToken;
    }

    const credentials = getCredentials();
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        refresh_token: credentials.refreshToken,
        grant_type: 'refresh_token',
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Strava token refresh failed with status ${response.status}`);
    }

    const data: StravaTokenResponse = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = data.expires_at;

    return this.accessToken;
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    const token = await this.refreshAccessToken();
    const response = await fetch(`https://www.strava.com/api/v3${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: {
        revalidate: 600,
      },
    });

    if (!response.ok) {
      throw new Error(`Strava API request failed with status ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  async getAthleteStats(athleteId?: string): Promise<StravaStats> {
    let resolvedAthleteId = athleteId;

    if (!resolvedAthleteId) {
      const athlete = await this.makeRequest<{ id: number }>('/athlete');
      resolvedAthleteId = String(athlete.id);
    }

    return this.makeRequest<StravaStats>(
      `/athletes/${resolvedAthleteId}/stats`,
    );
  }

  async getRecentActivities(limit = 10): Promise<StravaActivity[]> {
    return this.makeRequest<StravaActivity[]>(
      `/athlete/activities?per_page=${limit}`,
    );
  }
}

export const stravaAPI = new StravaAPI();
export type { StravaActivity, StravaStats };
