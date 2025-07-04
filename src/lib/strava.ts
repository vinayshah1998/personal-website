interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
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
  average_speed?: number;
  max_speed?: number;
}

interface StravaStats {
  recent_run_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
  };
  ytd_run_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
  };
  all_run_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
  };
}

class StravaAPI {
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.clientId = process.env.STRAVA_CLIENT_ID!;
    this.clientSecret = process.env.STRAVA_CLIENT_SECRET!;
    this.refreshToken = process.env.STRAVA_REFRESH_TOKEN!;

    if (!this.clientId || !this.clientSecret || !this.refreshToken) {
      throw new Error('Missing Strava API credentials');
    }
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt * 1000) {
      return this.accessToken;
    }

    console.log('Refreshing Strava access token...');
    
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token refresh failed:', response.status, errorText);
      throw new Error(`Failed to refresh token: ${response.statusText} - ${errorText}`);
    }

    const data: StravaTokenResponse = await response.json();
    console.log('Token refreshed successfully');
    
    this.accessToken = data.access_token;
    this.tokenExpiresAt = data.expires_at;

    return this.accessToken;
  }

  private async makeRequest(endpoint: string) {
    const token = await this.refreshAccessToken();
    
    console.log(`Making request to: https://www.strava.com/api/v3${endpoint}`);
    
    const response = await fetch(`https://www.strava.com/api/v3${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`API request failed: ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  async getAthleteStats(athleteId?: string): Promise<StravaStats> {
    // If no athleteId provided, get current athlete first
    if (!athleteId) {
      const athlete = await this.makeRequest('/athlete');
      athleteId = athlete.id;
    }

    return this.makeRequest(`/athletes/${athleteId}/stats`);
  }

  async getRecentActivities(limit = 10): Promise<StravaActivity[]> {
    return this.makeRequest(`/athlete/activities?per_page=${limit}`);
  }
}

export const stravaAPI = new StravaAPI();
export type { StravaActivity, StravaStats };