// Serves the Strava and GitHub mocks for end-to-end tests on MOCK_PORT (default 3218).
import { createServer } from 'node:http';
import { calendarHtml } from './github-mock.mjs';
import { handle } from './strava-mock.mjs';

createServer((req, res) => {
  if (req.url?.startsWith('/users/')) {
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end(calendarHtml());
  }
  handle(req, res);
}).listen(Number(process.env.MOCK_PORT ?? 3218), '127.0.0.1');
