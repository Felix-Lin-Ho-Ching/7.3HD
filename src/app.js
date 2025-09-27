import express from 'express';
import client from 'prom-client';

const app = express();
const port = process.env.PORT || 3000;

// ---- Prometheus metrics ----
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});
register.registerMetric(httpRequestDuration);

function timingMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || req.path, code: res.statusCode });
  });
  next();
}
app.use(timingMiddleware);

// ---- Routes ----
app.get('/healthz', (req, res) => res.status(200).json({ ok: true }));
app.get('/api/version', (req, res) => res.json({ version: process.env.APP_VERSION || '1.0.0' }));
app.get('/api/fault', (req, res) => {
  if (process.env.FAULT === '1') return res.status(500).json({ error: 'Injected fault' });
  return res.json({ ok: true });
});
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ---- Start ONLY outside tests ----
let server = null;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(port, () => console.log(`App listening on :${port}`));
}

export default app;
export { server };
