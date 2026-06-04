import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT) || 8080;

const app = express();

app.disable('x-powered-by');
app.get('/runtime-config.js', (_request, response) => {
  const runtimeConfig = {
    APP_URL: process.env.APP_URL || '',
    VITE_GOOGLE_MAPS_API_KEY: process.env.VITE_GOOGLE_MAPS_API_KEY || '',
    VITE_GOOGLE_MAPS_MAP_ID: process.env.VITE_GOOGLE_MAPS_MAP_ID || '',
  };

  response
    .type('application/javascript')
    .set('Cache-Control', 'no-store')
    .send(`window.JDT_RUNTIME_CONFIG = ${JSON.stringify(runtimeConfig)};`);
});

app.use(express.static(distDir, { index: false, maxAge: '1h' }));
app.get('*', (_request, response) => {
  response
    .set('Cache-Control', 'no-store')
    .sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`JDT Command Center listening on port ${port}`);
});
