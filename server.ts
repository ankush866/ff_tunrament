import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'node:path';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { initDatabase, db } from './src/server/db.js';
import { authenticateUser } from './src/server/auth.js';
import { apiRouter } from './src/server/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Optional legacy SQL init (app uses Firebase Auth + Cloud Firestore by default)
  try {
    if (db.isPostgres) {
      await initDatabase();
    }
  } catch (err) {
    console.warn('[SERVER] Continuing with Firebase persistence (SQL DB skipped):', (err as Error).message);
  }

  const app = express();
  const isProd = process.env.NODE_ENV === 'production';
  const PORT = isProd && process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.set('trust proxy', 1);
  app.use(cors());

  // Dynamic Sitemap.xml Generator (public crawlable routes only on canonical Vlexa domain, before auth middleware)
  app.get('/sitemap.xml', async (_req: Request, res: Response) => {
    const baseUrl = 'https://vlexa.free.nf';
    const defaultLastMod = '2026-11-21';
    const publicPaths = [
      { loc: '/', changefreq: 'daily', priority: '1.0' },
      { loc: '/tournaments', changefreq: 'hourly', priority: '0.9' },
      { loc: '/live-rooms', changefreq: 'hourly', priority: '0.9' },
      { loc: '/about', changefreq: 'monthly', priority: '0.8' },
      { loc: '/leaderboard', changefreq: 'daily', priority: '0.8' },
      { loc: '/faq', changefreq: 'weekly', priority: '0.7' },
      { loc: '/page/tournament-rules', changefreq: 'monthly', priority: '0.6' },
      { loc: '/page/privacy-policy', changefreq: 'monthly', priority: '0.5' },
      { loc: '/page/terms-and-conditions', changefreq: 'monthly', priority: '0.5' },
      { loc: '/page/refund-policy', changefreq: 'monthly', priority: '0.5' }
    ];

    const seen = new Set<string>(publicPaths.map(p => p.loc));
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    for (const item of publicPaths) {
      xml += `  <url>\n    <loc>${baseUrl}${item.loc}</loc>\n    <lastmod>${defaultLastMod}</lastmod>\n    <changefreq>${item.changefreq}</changefreq>\n    <priority>${item.priority}</priority>\n  </url>\n`;
    }

    try {
      if (db.isPostgres) {
        const pages = (await db.prepare('SELECT slug, updated_at FROM website_pages WHERE is_published = 1').all()) as { slug: string; updated_at: string }[];
        const tournaments = (await db.prepare('SELECT id, updated_at FROM tournaments WHERE is_published = 1').all()) as { id: number | string; updated_at: string }[];
        for (const p of pages) {
          const loc = `/page/${p.slug}`;
          if (!seen.has(loc)) {
            seen.add(loc);
            const lm = p.updated_at ? new Date(p.updated_at).toISOString().split('T')[0] : defaultLastMod;
            xml += `  <url>\n    <loc>${baseUrl}${loc}</loc>\n    <lastmod>${lm}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
          }
        }
        for (const t of tournaments) {
          const loc = `/tournament/${t.id}`;
          if (!seen.has(loc)) {
            seen.add(loc);
            const lm = t.updated_at ? new Date(t.updated_at).toISOString().split('T')[0] : defaultLastMod;
            xml += `  <url>\n    <loc>${baseUrl}${loc}</loc>\n    <lastmod>${lm}</lastmod>\n    <changefreq>hourly</changefreq>\n    <priority>0.85</priority>\n  </url>\n`;
          }
        }
      }
    } catch {
      // Serve core public sitemap URLs even if legacy SQL is unused
    }

    xml += `</urlset>\n`;
    res
      .status(200)
      .setHeader('Content-Type', 'application/xml; charset=utf-8')
      .setHeader('Cache-Control', 'public, max-age=3600')
      .send(xml);
  });

  // Robots.txt (before auth middleware)
  app.get('/robots.txt', (_req: Request, res: Response) => {
    res
      .status(200)
      .setHeader('Content-Type', 'text/plain; charset=utf-8')
      .setHeader('Cache-Control', 'public, max-age=3600')
      .send(
        [
          'User-agent: Googlebot',
          'Allow: /',
          'Disallow: /admin',
          'Disallow: /dashboard',
          'Disallow: /wallet',
          'Disallow: /api',
          'Disallow: /login',
          '',
          'User-agent: *',
          'Allow: /',
          'Disallow: /admin',
          'Disallow: /dashboard',
          'Disallow: /wallet',
          'Disallow: /api',
          'Disallow: /login',
          '',
          'Sitemap: https://vlexa.free.nf/sitemap.xml',
          ''
        ].join('\n')
      );
  });

  // Google Search Console Verification File (before auth middleware)
  app.get('/googlef3256bb9c85090e7.html', (_req: Request, res: Response) => {
    res
      .status(200)
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      .send('google-site-verification: googlef3256bb9c85090e7.html');
  });

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Global Auth Token Extractor (for app/API routes)
  app.use(authenticateUser);

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      timezone: 'Asia/Kolkata',
      database: 'firebase-firestore',
      isPostgres: db.isPostgres
    });
  });

  // Mount API Router
  app.use('/api', apiRouter);

  if (!isProd) {
    // Development mode with Vite Middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  // Global API error handler
  app.use((err: any, req: Request, res: Response, next: any) => {
    console.error('[API ERROR]:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Flaxy Free Fire Tournament Server running on http://0.0.0.0:${PORT}`);
  });
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('[SERVER SAFETY] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[SERVER SAFETY] Uncaught Exception:', err);
});

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
