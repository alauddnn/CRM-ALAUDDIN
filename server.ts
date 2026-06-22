import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './server/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());

// API Endpoints
app.use('/api', apiRouter);

// Serve Static Assets in Production
if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  app.get('*', (req: express.Request, res: express.Response) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  // If we run `node server.ts` directly in dev without vite:
  app.get('/', (req, res) => {
    res.send('API Server is running in development. Use Vite on port 3000 mapping /api here.');
  });
}

app.listen(port, () => {
  console.log(`Unified Full-Stack CRM Server running on port ${port}`);
});
