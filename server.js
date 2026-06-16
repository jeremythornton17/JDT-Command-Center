import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  handleRevealAlertWebhook,
  handleRevealGpsWebhook,
  revealAlertWebhookCredentialsConfigured,
  revealWebhookCredentialsConfigured,
} from './server/revealTelematics.js';
import {
  buildRevealRecommendedApiStatus,
  handleRevealLiveLocationsSyncRequest,
  handleRevealRecommendedApisSyncRequest,
  handleRevealVehicleMatchApprovalRequest,
  handleRevealVehicleMatchPreviewRequest,
  handleRevealVehiclesSyncRequest,
  revealApiCredentialsConfigured,
} from './server/revealApi.js';
import {
  arcGisServerCredentialsConfigured,
  handleArcGisTreeAssetApplyEditsRequest,
} from './server/arcgisApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT) || 8080;
const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
const firestoreProjectId = process.env.FIRESTORE_PROJECT_ID || firebaseConfig.projectId;
const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

const app = express();

app.disable('x-powered-by');
app.get('/api/integrations/reveal/gps/health', (_request, response) => {
  response
    .type('application/json')
    .set('Cache-Control', 'no-store')
    .send({
      ok: true,
      provider: 'Reveal',
      endpoint: '/api/integrations/reveal/gps',
      credentialsConfigured: revealWebhookCredentialsConfigured(process.env),
      firestoreProjectId,
      firestoreDatabaseId,
    });
});

app.get('/api/integrations/reveal/api/health', (_request, response) => {
  const recommendedApiStatus = buildRevealRecommendedApiStatus(process.env);
  response
    .type('application/json')
    .set('Cache-Control', 'no-store')
    .send({
      ok: true,
      provider: 'Reveal',
      api: 'Vehicle API',
      credentialsConfigured: revealApiCredentialsConfigured(process.env),
      tokenEndpointConfigured: true,
      vehicleEndpointConfigured: true,
      recommendedApis: recommendedApiStatus.supported,
      configuredRecommendedApis: recommendedApiStatus.configured,
      alertWebhookConfigured: revealAlertWebhookCredentialsConfigured(process.env),
    });
});

app.post('/api/integrations/reveal/vehicles/sync', express.json({ limit: '64kb', type: ['application/json', 'application/*+json'] }), async (request, response) => {
  try {
    const result = await handleRevealVehiclesSyncRequest({
      headers: request.headers,
      env: process.env,
      projectId: firestoreProjectId,
      databaseId: firestoreDatabaseId,
      firebaseApiKey: firebaseConfig.apiKey,
      now: new Date(),
    });

    response
      .status(result.statusCode)
      .type('application/json')
      .set('Cache-Control', 'no-store')
      .send(result.body);
  } catch (error) {
    console.error('Reveal vehicle sync failed', error);
    response
      .status(500)
      .type('application/json')
      .set('Cache-Control', 'no-store')
      .send({
        ok: false,
        error: error instanceof Error ? error.message : 'Reveal vehicle sync failed.',
      });
  }
});

app.post('/api/integrations/reveal/vehicles/matches/preview', express.json({ limit: '64kb', type: ['application/json', 'application/*+json'] }), async (request, response) => {
  try {
    const result = await handleRevealVehicleMatchPreviewRequest({
      headers: request.headers,
      env: process.env,
      projectId: firestoreProjectId,
      databaseId: firestoreDatabaseId,
      firebaseApiKey: firebaseConfig.apiKey,
    });

    response
      .status(result.statusCode)
      .type('application/json')
      .set('Cache-Control', 'no-store')
      .send(result.body);
  } catch (error) {
    console.error('Reveal vehicle match preview failed', error);
    response
      .status(500)
      .type('application/json')
      .set('Cache-Control', 'no-store')
      .send({
        ok: false,
        error: error instanceof Error ? error.message : 'Reveal vehicle match preview failed.',
      });
  }
});

app.post('/api/integrations/reveal/vehicles/matches/approve', express.json({ limit: '64kb', type: ['application/json', 'application/*+json'] }), async (request, response) => {
  try {
    const result = await handleRevealVehicleMatchApprovalRequest({
      headers: request.headers,
      body: request.body,
      env: process.env,
      projectId: firestoreProjectId,
      databaseId: firestoreDatabaseId,
      firebaseApiKey: firebaseConfig.apiKey,
      now: new Date(),
    });

    response
      .status(result.statusCode)
      .type('application/json')
      .set('Cache-Control', 'no-store')
      .send(result.body);
  } catch (error) {
    console.error('Reveal vehicle match approval failed', error);
    response
      .status(500)
      .type('application/json')
      .set('Cache-Control', 'no-store')
      .send({
        ok: false,
        error: error instanceof Error ? error.message : 'Reveal vehicle match approval failed.',
      });
  }
});

app.post('/api/integrations/reveal/recommended/sync', express.json({ limit: '64kb', type: ['application/json', 'application/*+json'] }), async (request, response) => {
  try {
    const result = await handleRevealRecommendedApisSyncRequest({
      headers: request.headers,
      env: process.env,
      projectId: firestoreProjectId,
      databaseId: firestoreDatabaseId,
      firebaseApiKey: firebaseConfig.apiKey,
      now: new Date(),
      enabledApis: request.body?.enabledApis,
    });

    response
      .status(result.statusCode)
      .type('application/json')
      .set('Cache-Control', 'no-store')
      .send(result.body);
  } catch (error) {
    console.error('Reveal recommended API sync failed', error);
    response
      .status(500)
      .type('application/json')
      .set('Cache-Control', 'no-store')
      .send({
        ok: false,
        error: error instanceof Error ? error.message : 'Reveal recommended API sync failed.',
      });
  }
});

app.post('/api/integrations/reveal/live-locations/sync', express.json({ limit: '64kb', type: ['application/json', 'application/*+json'] }), async (request, response) => {
  try {
    const result = await handleRevealLiveLocationsSyncRequest({
      headers: request.headers,
      env: process.env,
      projectId: firestoreProjectId,
      databaseId: firestoreDatabaseId,
      firebaseApiKey: firebaseConfig.apiKey,
      now: new Date(),
    });

    response
      .status(result.statusCode)
      .type('application/json')
      .set('Cache-Control', 'no-store')
      .send(result.body);
  } catch (error) {
    console.error('Reveal live location sync failed', error);
    response
      .status(500)
      .type('application/json')
      .set('Cache-Control', 'no-store')
      .send({
        ok: false,
        error: error instanceof Error ? error.message : 'Reveal live location sync failed.',
      });
  }
});

app.post('/api/integrations/reveal/gps', express.json({ limit: '2mb', type: ['application/json', 'application/*+json'] }), async (request, response) => {
  try {
    const result = await handleRevealGpsWebhook({
      body: request.body,
      headers: request.headers,
      env: process.env,
      projectId: firestoreProjectId,
      databaseId: firestoreDatabaseId,
      now: new Date(),
    });

    Object.entries(result.headers || {}).forEach(([key, value]) => response.set(key, value));
    response
      .status(result.statusCode)
      .type('application/json')
      .set('Cache-Control', 'no-store')
      .send(result.body);
  } catch (error) {
    console.error('Reveal GPS webhook failed', error);
    response
      .status(500)
      .type('application/json')
      .set('Cache-Control', 'no-store')
      .send({
        ok: false,
        error: error instanceof Error ? error.message : 'Reveal GPS webhook failed.',
      });
  }
});

app.post('/api/integrations/reveal/alerts', express.json({ limit: '2mb', type: ['application/json', 'application/*+json'] }), async (request, response) => {
  try {
    const result = await handleRevealAlertWebhook({
      body: request.body,
      headers: request.headers,
      env: process.env,
      projectId: firestoreProjectId,
      databaseId: firestoreDatabaseId,
      now: new Date(),
    });

    Object.entries(result.headers || {}).forEach(([key, value]) => response.set(key, value));
    response
      .status(result.statusCode)
      .type('application/json')
      .set('Cache-Control', 'no-store')
      .send(result.body);
  } catch (error) {
    console.error('Reveal Alert webhook failed', error);
    response
      .status(500)
      .type('application/json')
      .set('Cache-Control', 'no-store')
      .send({
        ok: false,
        error: error instanceof Error ? error.message : 'Reveal Alert webhook failed.',
      });
  }
});

app.get('/api/integrations/arcgis/health', (_request, response) => {
  response
    .type('application/json')
    .set('Cache-Control', 'no-store')
    .send({
      ok: true,
      provider: 'ArcGIS Online',
      endpoint: '/api/integrations/arcgis/tree-assets/apply-edits',
      serverCredentialsConfigured: arcGisServerCredentialsConfigured(process.env),
    });
});

app.post('/api/integrations/arcgis/tree-assets/apply-edits', express.json({ limit: '512kb', type: ['application/json', 'application/*+json'] }), async (request, response) => {
  try {
    const result = await handleArcGisTreeAssetApplyEditsRequest({
      headers: request.headers,
      body: request.body,
      env: process.env,
      firebaseApiKey: firebaseConfig.apiKey,
    });

    response
      .status(result.statusCode)
      .type('application/json')
      .set('Cache-Control', 'no-store')
      .send(result.body);
  } catch (error) {
    console.error('ArcGIS hosted layer sync failed', error);
    response
      .status(500)
      .type('application/json')
      .set('Cache-Control', 'no-store')
      .send({
        ok: false,
        error: error instanceof Error ? error.message : 'ArcGIS hosted layer sync failed.',
      });
  }
});

app.get('/runtime-config.js', (_request, response) => {
  const runtimeConfig = {
    APP_URL: process.env.APP_URL || '',
    VITE_GOOGLE_MAPS_API_KEY: process.env.VITE_GOOGLE_MAPS_API_KEY || '',
    VITE_GOOGLE_MAPS_MAP_ID: process.env.VITE_GOOGLE_MAPS_MAP_ID || '',
    VITE_ARCGIS_API_KEY: process.env.VITE_ARCGIS_API_KEY || '',
    VITE_ARCGIS_ORG_URL: process.env.VITE_ARCGIS_ORG_URL || '',
    VITE_ARCGIS_WEB_MAP_ID: process.env.VITE_ARCGIS_WEB_MAP_ID || '',
    VITE_ARCGIS_LAYER_JDT_PROJECT_BOUNDARIES_URL: process.env.VITE_ARCGIS_LAYER_JDT_PROJECT_BOUNDARIES_URL || '',
    VITE_ARCGIS_LAYER_JDT_TREE_ASSETS_URL: process.env.VITE_ARCGIS_LAYER_JDT_TREE_ASSETS_URL || '',
    VITE_ARCGIS_LAYER_JDT_FINAL_TREE_LOCATIONS_URL: process.env.VITE_ARCGIS_LAYER_JDT_FINAL_TREE_LOCATIONS_URL || '',
    VITE_ARCGIS_LAYER_JDT_HOLDING_AREAS_URL: process.env.VITE_ARCGIS_LAYER_JDT_HOLDING_AREAS_URL || '',
    VITE_ARCGIS_LAYER_JDT_WORK_ZONES_URL: process.env.VITE_ARCGIS_LAYER_JDT_WORK_ZONES_URL || '',
    VITE_ARCGIS_LAYER_JDT_ROOT_PRUNE_EVENTS_URL: process.env.VITE_ARCGIS_LAYER_JDT_ROOT_PRUNE_EVENTS_URL || '',
    VITE_ARCGIS_LAYER_JDT_RELOCATION_WORK_URL: process.env.VITE_ARCGIS_LAYER_JDT_RELOCATION_WORK_URL || '',
    VITE_ARCGIS_LAYER_JDT_NUTRIENT_CARE_TASKS_URL: process.env.VITE_ARCGIS_LAYER_JDT_NUTRIENT_CARE_TASKS_URL || '',
    VITE_ARCGIS_LAYER_JDT_EQUIPMENT_LOCATIONS_URL: process.env.VITE_ARCGIS_LAYER_JDT_EQUIPMENT_LOCATIONS_URL || '',
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
