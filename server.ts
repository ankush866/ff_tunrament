import express, { Request, Response } from 'express';
import path from 'node:path';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { initDatabase, db } from './src/server/db.js';
import { authenticateUser } from './src/server/auth.js';
import { apiRouter } from './src/server/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB and Seed Data
initDatabase();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(cors());
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Global Auth Token Extractor
  app.use(authenticateUser);

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString(), timezone: 'Asia/Kolkata' });
  });

  // Dynamic Sitemap.xml Generator (Requirement 16)
  app.get('/sitemap.xml', (req: Request, res: Response) => {
    try {
      const pages = db.prepare('SELECT slug, updated_at FROM website_pages WHERE is_published = 1').all() as { slug: string; updated_at: string }[];
      const tournaments = db.prepare('SELECT slug, updated_at FROM tournaments WHERE is_published = 1').all() as { slug: string; updated_at: string }[];

      const baseUrl = process.env.APP_URL || 'https://flaxy.gg';

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      xml += `  <url><loc>${baseUrl}/</loc><changefreq>always</changefreq><priority>1.0</priority></url>\n`;
      xml += `  <url><loc>${baseUrl}/tournaments</loc><changefreq>hourly</changefreq><priority>0.9</priority></url>\n`;
      xml += `  <url><loc>${baseUrl}/live-rooms</loc><changefreq>always</changefreq><priority>0.9</priority></url>\n`;
      xml += `  <url><loc>${baseUrl}/leaderboard</loc><changefreq>daily</changefreq><priority>0.8</priority></url>\n`;
      xml += `  <url><loc>${baseUrl}/faq</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>\n`;

      for (const p of pages) {
        xml += `  <url><loc>${baseUrl}/page/${p.slug}</loc><lastmod>${new Date(p.updated_at).toISOString().split('T')[0]}</lastmod><priority>0.8</priority></url>\n`;
      }
      for (const t of tournaments) {
        xml += `  <url><loc>${baseUrl}/tournament/${t.slug}</loc><lastmod>${new Date(t.updated_at).toISOString().split('T')[0]}</lastmod><priority>0.85</priority></url>\n`;
      }
      xml += `</urlset>`;

      res.setHeader('Content-Type', 'application/xml');
      res.send(xml);
    } catch {
      res.status(500).send('Error generating sitemap');
    }
  });

  // Robots.txt
  app.get('/robots.txt', (req: Request, res: Response) => {
    const baseUrl = process.env.APP_URL || 'https://flaxy.gg';
    res.setHeader('Content-Type', 'text/plain');
    res.send(`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${baseUrl}/sitemap.xml\n`);
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Flaxy Free Fire Tournament Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
