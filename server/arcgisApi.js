const defaultArcGisTokenUrl = 'https://www.arcgis.com/sharing/rest/oauth2/token/';

export function arcGisServerCredentialsConfigured(env = process.env) {
  return Boolean(clean(firstEnv(env, ['ARCGIS_CLIENT_ID', 'ARCGIS_APP_CLIENT_ID'])) && clean(firstEnv(env, ['ARCGIS_CLIENT_SECRET', 'ARCGIS_APP_CLIENT_SECRET'])));
}

export function normalizeArcGisEditableLayerUrl(url) {
  const cleanUrl = clean(url);
  if (!cleanUrl) throw new Error('ArcGIS hosted layer URL is required.');
  let parsed;
  try {
    parsed = new URL(cleanUrl);
  } catch {
    throw new Error('ArcGIS hosted layer URL is not valid.');
  }
  if (parsed.protocol !== 'https:') throw new Error('ArcGIS hosted layer URL must use HTTPS.');
  const normalized = cleanUrl.replace(/\/$/, '');
  if (/\/FeatureServer\/\d+$/i.test(normalized)) return normalized;
  if (/\/FeatureServer$/i.test(normalized)) return `${normalized}/0`;
  throw new Error('ArcGIS hosted layer URL must point to a FeatureServer layer.');
}

export async function fetchArcGisAppToken({ env = process.env, fetchImpl = fetch } = {}) {
  const clientId = clean(firstEnv(env, ['ARCGIS_CLIENT_ID', 'ARCGIS_APP_CLIENT_ID']));
  const clientSecret = clean(firstEnv(env, ['ARCGIS_CLIENT_SECRET', 'ARCGIS_APP_CLIENT_SECRET']));
  if (!clientId || !clientSecret) {
    throw new Error('ArcGIS server credentials are not configured.');
  }

  const body = new URLSearchParams({
    f: 'json',
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    expiration: clean(firstEnv(env, ['ARCGIS_TOKEN_EXPIRATION_MINUTES'])) || '60',
  });

  const response = await fetchImpl(clean(firstEnv(env, ['ARCGIS_TOKEN_URL'])) || defaultArcGisTokenUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok || payload.error) {
    throw new Error(arcGisErrorMessage(payload, 'ArcGIS token request failed.'));
  }
  const token = clean(payload.access_token);
  if (!token) throw new Error('ArcGIS token response did not include an access token.');
  return token;
}

export async function applyArcGisHostedLayerEdit({
  layerUrl,
  edit,
  arcGisFeatureId,
  env = process.env,
  fetchImpl = fetch,
}) {
  const editableLayerUrl = normalizeArcGisEditableLayerUrl(layerUrl);
  const token = await fetchArcGisAppToken({ env, fetchImpl });
  const restFeature = toArcGisRestFeature(edit, arcGisFeatureId);
  const isUpdate = Boolean(clean(arcGisFeatureId));
  const body = new URLSearchParams({
    f: 'json',
    token,
    rollbackOnFailure: 'true',
    [isUpdate ? 'updates' : 'adds']: JSON.stringify([restFeature]),
  });

  const response = await fetchImpl(`${editableLayerUrl}/applyEdits`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok || payload.error) {
    throw new Error(arcGisErrorMessage(payload, 'ArcGIS hosted layer sync failed.'));
  }
  const editResult = featureResultFromApplyEdits(payload);
  if (!editResult?.success) {
    throw new Error(arcGisErrorMessage(editResult, 'ArcGIS hosted layer sync failed.'));
  }
  const featureId = clean(editResult.objectId ?? editResult.globalId);
  if (!featureId) throw new Error('ArcGIS hosted layer sync did not return a feature id.');

  return {
    featureId,
    layerUrl: editableLayerUrl,
    syncedAt: new Date().toISOString(),
  };
}

export async function handleArcGisTreeAssetApplyEditsRequest({
  headers,
  body,
  env = process.env,
  firebaseApiKey,
  fetchImpl = fetch,
}) {
  const verification = await verifyArcGisWriteRequest({ headers, env, fetchImpl, firebaseApiKey });
  if (!verification.ok) {
    return { statusCode: verification.statusCode, body: { ok: false, error: verification.error } };
  }

  if (!arcGisServerCredentialsConfigured(env)) {
    return {
      statusCode: 503,
      body: {
        ok: false,
        error: 'ArcGIS server credentials are not configured.',
      },
    };
  }

  try {
    const result = await applyArcGisHostedLayerEdit({
      layerUrl: body?.layerUrl,
      edit: body?.edit,
      arcGisFeatureId: body?.arcGisFeatureId,
      env,
      fetchImpl,
    });

    return {
      statusCode: 200,
      body: {
        ok: true,
        ...result,
        actorEmail: verification.email,
      },
    };
  } catch (error) {
    return {
      statusCode: 502,
      body: {
        ok: false,
        error: error instanceof Error ? error.message : 'ArcGIS hosted layer sync failed.',
      },
    };
  }
}

async function verifyArcGisWriteRequest({ headers, env, fetchImpl, firebaseApiKey }) {
  const idToken = bearerTokenFromHeaders(headers);
  if (!idToken) {
    return { ok: false, statusCode: 401, error: 'Sign in before syncing ArcGIS hosted layers.' };
  }
  if (!firebaseApiKey) {
    return { ok: false, statusCode: 503, error: 'Firebase API key is not configured for server-side auth checks.' };
  }

  const response = await fetchImpl(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) {
    return { ok: false, statusCode: 401, error: 'Firebase session could not be verified.' };
  }

  const payload = await response.json();
  const email = clean(payload.users?.[0]?.email).toLowerCase();
  if (!email) {
    return { ok: false, statusCode: 401, error: 'Firebase session did not include an email address.' };
  }
  if (!isArcGisWriteEmailAllowed(email, env)) {
    return { ok: false, statusCode: 403, error: 'ArcGIS hosted layer sync is limited to authorized JDT users.' };
  }
  return { ok: true, statusCode: 200, email };
}

function isArcGisWriteEmailAllowed(email, env) {
  if (email.endsWith('@jdtnurseries.com')) return true;
  return authorizedArcGisEmails(env).has(email);
}

function authorizedArcGisEmails(env) {
  return new Set(
    (firstEnv(env, ['JDT_ARCGIS_WRITE_EMAILS', 'JDT_AUTHORIZED_EMAILS', 'JDT_SYNC_ADMIN_EMAILS', 'JDT_ADMIN_EMAILS']) || 'jeremy@jdtnurseries.com,buck@jdtnurseries.com')
      .split(/[,;\n]/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function toArcGisRestFeature(edit, arcGisFeatureId) {
  if (!edit || typeof edit !== 'object') throw new Error('ArcGIS edit payload is required.');
  const attributes = { ...(edit.attributes || {}) };
  if (clean(arcGisFeatureId)) {
    attributes.OBJECTID = Number.isFinite(Number(arcGisFeatureId)) ? Number(arcGisFeatureId) : arcGisFeatureId;
  }
  const feature = { attributes };
  const geometry = edit.geometry || {};
  const latitude = Number(geometry.latitude ?? geometry.y);
  const longitude = Number(geometry.longitude ?? geometry.x);
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    feature.geometry = {
      x: longitude,
      y: latitude,
      spatialReference: geometry.spatialReference || { wkid: 4326 },
    };
  }
  return feature;
}

function featureResultFromApplyEdits(payload) {
  const candidates = [
    ...(payload.addResults || []),
    ...(payload.updateResults || []),
    ...(payload.addFeatureResults || []),
    ...(payload.updateFeatureResults || []),
  ];
  return candidates[0];
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: text } };
  }
}

function arcGisErrorMessage(payload, fallback) {
  const error = payload?.error || payload;
  const details = Array.isArray(error?.details) ? error.details.filter(Boolean).join(' ') : '';
  return [
    error?.message,
    error?.description,
    details,
  ].map(clean).filter(Boolean).join(' ') || fallback;
}

function bearerTokenFromHeaders(headers) {
  const value = clean(getHeader(headers, 'authorization'));
  return value.toLowerCase().startsWith('bearer ') ? value.slice(7).trim() : '';
}

function getHeader(headers, name) {
  if (!headers) return '';
  const lowerName = name.toLowerCase();
  return Object.entries(headers).find(([key]) => key.toLowerCase() === lowerName)?.[1] || '';
}

function firstEnv(env, names) {
  for (const name of names) {
    const value = env?.[name];
    if (clean(value)) return value;
  }
  return '';
}

function clean(value) {
  return String(value ?? '').trim();
}
