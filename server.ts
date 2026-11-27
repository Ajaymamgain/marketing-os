import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const productApiUrl = (process.env.DUAL_MOTION_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

app.disable('x-powered-by');
let activeImports = 0;
app.use('/v1/imports/preview', async (req, res, next) => {
  // Bound uploads at the web edge too: parsing must not precede authentication.
  if (activeImports >= 2) { res.status(429).json({ error: 'Import capacity is busy', retryable: true }); return; }
  activeImports += 1;
  let released = false;
  const release = () => { if (!released) { released = true; activeImports -= 1; } };
  res.once('finish', release); res.once('close', release);
  try {
    const response = await fetch(`${productApiUrl}/v1/auth/me`, { headers: { Cookie: req.headers.cookie || '' }, signal: AbortSignal.timeout(5_000), redirect: 'error' });
    if (!response.ok) { res.status(401).json({ error: 'Sign in before importing data' }); return; }
    const session = await response.json();
    if (!['owner', 'admin'].includes(session.role) || !session.csrf_token || req.headers['x-csrf-token'] !== session.csrf_token) {
      res.status(403).json({ error: 'Authenticated workspace owner access required' }); return;
    }
    next();
  } catch { res.status(503).json({ error: 'Import authorization unavailable', retryable: true }); }
});
app.use('/v1/imports/preview', express.json({ limit: 64 * 1024 * 1024 }));
app.use(express.json({ limit: 1_048_576 }));

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function proxyProductApi(req: express.Request, res: express.Response): Promise<void> {
  const target = `${productApiUrl}${req.originalUrl}`;
  const headers: Record<string, string> = { Accept: req.headers.accept || 'application/json' };
  if (req.headers.cookie) headers.Cookie = req.headers.cookie;
  const authorization = headerValue(req.headers.authorization);
  const csrf = headerValue(req.headers['x-csrf-token']);
  if (authorization) headers.Authorization = authorization;
  if (csrf) headers['X-CSRF-Token'] = csrf;
  const origin = headerValue(req.headers.origin);
  if (origin) headers.Origin = origin;
  const hasBody = !['GET', 'HEAD'].includes(req.method);
  if (hasBody) headers['Content-Type'] = req.headers['content-type'] || 'application/json';

  try {
    const response = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
      signal: AbortSignal.timeout(req.path === '/operator/run' ? 100_000 : 35_000),
      redirect: 'error',
    });
    res.status(response.status);
    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    const setCookies = response.headers.getSetCookie?.() || [];
    if (setCookies.length) res.setHeader('Set-Cookie', setCookies);
    for (const name of ['cache-control', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'content-security-policy', 'strict-transport-security', 'cross-origin-opener-policy']) {
      const value = response.headers.get(name);
      if (value) res.setHeader(name, value);
    }
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('Product API request failed:', error instanceof Error ? error.name : 'UnknownError');
    res.status(503).json({ error: 'Dual Motion API is temporarily unavailable', retryable: true });
  }
}

app.use('/v1', proxyProductApi);
app.use('/mcp', proxyProductApi);
app.get(['/login', '/security', '/account-access'], proxyProductApi);
app.get(['/healthz', '/readyz'], proxyProductApi);
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', operator: 'python-typesafe-jev', productApiUrl, time: new Date().toISOString() });
});

async function startServer() {
  const rootDir = path.resolve(__dirname);
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ root: rootDir, server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = rootDir; // Bundled server.cjs and index.html share dist/.
    app.use((req, res, next) => {
      if (/\.(?:cjs|map)$/.test(req.path)) { res.sendStatus(404); return; }
      next();
    });
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Dual Motion web listening on http://0.0.0.0:${port}`);
    console.log(`Decision operator: Python TypeSafe SDK / Jev via ${productApiUrl}`);
  });
  server.requestTimeout = 60_000;
  server.headersTimeout = 15_000;
  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 30_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch(() => { console.error('Web server startup failed'); process.exit(1); });
