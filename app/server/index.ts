import { Hono } from 'hono';
import { cors } from 'hono/cors';
import plan from './routes/plan';
import progress from './routes/progress';
import notes from './routes/notes';

const app = new Hono();

app.use('*', cors({ origin: 'http://localhost:5173' }));

app.route('/api', plan);
app.route('/api', progress);
app.route('/api', notes);

app.get('/', (c) => c.text('iOS Tutorial API — see /api/plan'));

export default {
  port: 5174,
  fetch: app.fetch,
};
