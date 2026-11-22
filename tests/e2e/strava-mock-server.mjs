import { createServer } from 'node:http';
import { handle } from './strava-mock.mjs';

createServer(handle).listen(Number(process.env.STRAVA_MOCK_PORT ?? 3218), '127.0.0.1');
