import { Hono } from 'hono';
import { getPlan } from '../planCache';

const router = new Hono();

router.get('/plan', (c) => {
  try {
    const phases = getPlan();
    return c.json({ phases });
  } catch (err) {
    console.error('Failed to parse plan:', err);
    return c.json({ error: String(err) }, 500);
  }
});

export default router;
