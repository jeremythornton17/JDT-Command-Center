import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT) || 8080;

const app = express();

app.disable('x-powered-by');
app.use(express.static(distDir, { maxAge: '1h' }));
app.get('*', (_request, response) => {
  response.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`JDT Command Center listening on port ${port}`);
});
