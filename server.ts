import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// In-memory store for shareable client portals
interface SharedPortalRecord {
  id: string;
  client: any;
  posts: any[];
  permissions?: any;
  updatedAt: string;
}
const sharedPortalsMap = new Map<string, SharedPortalRecord>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Client Portal sharing endpoints
  app.post('/api/portals', (req, res) => {
    try {
      const { id, client, posts, permissions } = req.body;
      if (!id || !client) {
        return res.status(400).json({ error: 'id and client are required' });
      }
      const record: SharedPortalRecord = {
        id,
        client,
        posts: Array.isArray(posts) ? posts : [],
        permissions: permissions || {},
        updatedAt: new Date().toISOString(),
      };
      sharedPortalsMap.set(id, record);
      return res.json({ success: true, id, record });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to save portal' });
    }
  });

  app.get('/api/portals/:id', (req, res) => {
    const id = req.params.id;
    const found = sharedPortalsMap.get(id);
    if (found) {
      return res.json({ portal: found });
    }
    // Search by client id, handle, or name
    for (const p of sharedPortalsMap.values()) {
      if (
        p.client?.id === id ||
        p.client?.handle?.replace('@', '').toLowerCase() === id.toLowerCase() ||
        p.client?.name?.toLowerCase() === id.toLowerCase()
      ) {
        return res.json({ portal: p });
      }
    }
    return res.status(404).json({ error: 'Portal not found' });
  });

  // AI Polish & Tone endpoint
  app.post('/api/gemini/polish', async (req, res) => {
    try {
      const { text, tone = 'engaging', platform = 'all' } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text prompt is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback intelligent response if API key is not configured
        let polished = text;
        if (tone === 'engaging') {
          polished = `🚀 ${text}\n\nWhat are your thoughts on this? Drop a comment below 👇 #Growth #Innovation`;
        } else if (tone === 'professional') {
          polished = `Key architectural update:\n\n${text}\n\nOur team continues to optimize reliability and developer velocity across our systems.`;
        } else if (tone === 'punchy') {
          polished = `${text.split('.')[0]}. Built for scale. Zero compromises.`;
        }
        return res.json({ polished, tone, note: 'Generated via smart template (GEMINI_API_KEY not set)' });
      }

      let polished = text;
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are an expert social media copywriter for top tech companies and creative agencies.
Rewrite and polish the following social media post copy to match the tone "${tone}" targeted for ${platform} platform.
Keep the core message, but enhance clarity, hook, engagement, line breaks, and add 2-3 high-impact relevant hashtags at the bottom.
Do not include quotation marks or explanatory chatter, output ONLY the revised copy ready to post:

Post draft:
"""
${text}
"""`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        if (response.text) {
          polished = response.text.trim();
        }
      } catch (genError) {
        console.warn('Gemini generation fallback engaged:', genError);
        if (tone === 'engaging') {
          polished = `🚀 ${text}\n\nWhat are your thoughts on this? Drop your perspective below 👇 #Growth #Innovation`;
        } else if (tone === 'professional') {
          polished = `Key architectural update:\n\n${text}\n\nOur team continues to optimize reliability and developer velocity across our systems.`;
        } else if (tone === 'punchy') {
          polished = `${text.split('.')[0]}. Built for scale. Zero compromises.`;
        }
      }

      return res.json({ polished, tone });
    } catch (err: any) {
      console.error('Gemini polish error:', err);
      return res.status(500).json({ error: err?.message || 'Failed to polish copy' });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Dev SPA fallback so direct links like /portal or /?portal=... serve index.html without 404
    app.use('*', async (req, res, next) => {
      if (req.method !== 'GET') return next();
      try {
        const url = req.originalUrl;
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = await fs.promises.readFile(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
