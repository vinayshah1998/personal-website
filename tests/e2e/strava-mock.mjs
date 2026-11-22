// A stand-in for the Strava API, for end-to-end tests: a run every other day and a ride every third day since the
// start of last year, in Los Angeles time. strava-mock-server.mjs serves it.

export const TIMEZONE = '(GMT-08:00) America/Los_Angeles';
const DAY = 86_400_000;

/** The mock's activities, oldest first, as of `now`. */
export function activities(now = Date.now()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(now);
  const year = Number(today.slice(0, 4));
  const out = [];
  for (let t = Date.UTC(year - 1, 0, 1), d = 0; new Date(t).toISOString().slice(0, 10) <= today; t += DAY, d++) {
    const date = new Date(t).toISOString().slice(0, 10);
    const base = { start_date_local: `${date}T07:00:00Z`, start_date: `${date}T15:00:00Z`, timezone: TIMEZONE, elapsed_time: 0, total_elevation_gain: 40 };
    if (d % 2 === 0) out.push({ ...base, id: d * 2, name: d % 14 === 0 ? 'Sunday Long Run' : 'Morning Run', type: 'Run', distance: 5000 + (d % 7) * 800, moving_time: 1800 + (d % 7) * 240 });
    if (d % 3 === 0) out.push({ ...base, id: d * 2 + 1, name: 'Ride', type: 'Ride', distance: 20000, moving_time: 3600 });
  }
  return out;
}

function totals(runs) {
  return {
    count: runs.length,
    distance: runs.reduce((s, r) => s + r.distance, 0),
    moving_time: runs.reduce((s, r) => s + r.moving_time, 0),
    elapsed_time: 0,
    elevation_gain: runs.reduce((s, r) => s + r.total_elevation_gain, 0),
  };
}

export function handle(req, res) {
  const url = new URL(req.url, 'http://mock');
  const json = (body) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  const all = activities();
  const year = all.at(-1).start_date_local.slice(0, 4);
  const runs = all.filter((a) => a.type === 'Run');
  if (url.pathname === '/oauth/token') return json({ access_token: 'mock', refresh_token: 'mock', expires_at: Math.floor(Date.now() / 1000) + 3600 });
  if (url.pathname === '/api/v3/athlete') return json({ id: 1 });
  if (url.pathname === '/api/v3/athletes/1/stats') {
    const ytd = totals(runs.filter((r) => r.start_date_local.startsWith(year)));
    return json({ recent_run_totals: ytd, ytd_run_totals: ytd, all_run_totals: totals(runs) });
  }
  if (url.pathname === '/api/v3/athlete/activities') {
    const after = Number(url.searchParams.get('after') ?? 0) * 1000;
    const per = Number(url.searchParams.get('per_page') ?? 30);
    const page = Number(url.searchParams.get('page') ?? 1);
    return json(all.filter((a) => Date.parse(a.start_date) > after).slice((page - 1) * per, page * per));
  }
  if (url.pathname === '/health') return json({ ok: true });
  res.writeHead(404).end();
}
