const defaultRevealApiBaseUrl = 'https://fim.api.us.fleetmatics.com';
const defaultTokenPath = '/token';
const defaultVehiclePath = '/cmd/v1/vehicles';
const metadataTokenUrl = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

const jdtHomeBase = {
  name: 'JD Thornton Nurseries Home Base',
  address: '1010 E Sugarland Hwy, Clewiston, FL 33440',
  locationType: 'Farm',
};

const vehicleIdAliases = [
  'VehicleId',
  'VehicleID',
  'vehicleId',
  'vehicleID',
  'Id',
  'id',
];

const vehicleNumberAliases = [
  'VehicleNumber',
  'VehicleNo',
  'vehicleNumber',
  'vehicleNo',
  'UnitNumber',
  'unitNumber',
  'Number',
  'number',
];

const vehicleNameAliases = [
  'VehicleName',
  'vehicleName',
  'Name',
  'name',
  'Description',
  'description',
];

const registrationAliases = [
  'RegistrationNumber',
  'registrationNumber',
  'LicensePlate',
  'licensePlate',
  'Plate',
  'plate',
  'Tag',
  'tag',
];

const vinAliases = ['VIN', 'Vin', 'vin'];
const makeAliases = ['Make', 'make'];
const modelAliases = ['Model', 'model'];
const yearAliases = ['Year', 'year', 'ModelYear', 'modelYear'];

export function revealApiCredentialsConfigured(env = process.env) {
  return Boolean(
    getRevealApiUsername(env)
    && getRevealApiPassword(env)
    && getRevealApiAppId(env)
  );
}

export function buildRevealApiAuthorizationHeader(appId, token) {
  return `Atmosphere atmosphere_app_id=${String(appId || '').trim()}, Bearer ${String(token || '').trim()}`;
}

export async function fetchRevealApiToken({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const username = getRevealApiUsername(env);
  const password = getRevealApiPassword(env);
  if (!username || !password) {
    throw new Error('Reveal API username and password are not configured.');
  }

  const response = await fetchImpl(buildRevealApiUrl(env, getRevealApiTokenPath(env)), {
    method: 'GET',
    headers: {
      Accept: 'text/plain',
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    },
  });

  if (!response.ok) {
    const message = await safeResponseText(response);
    throw new Error(`Reveal API token request failed (${response.status}): ${message || response.statusText}`);
  }

  const token = stripTokenEnvelope(await safeResponseText(response));
  if (!token) throw new Error('Reveal API token response was empty.');
  return token;
}

export async function fetchRevealVehicles({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  if (!revealApiCredentialsConfigured(env)) {
    throw new Error('Reveal API credentials are not configured.');
  }

  const token = await fetchRevealApiToken({ env, fetchImpl });
  const response = await fetchImpl(buildRevealApiUrl(env, getRevealVehiclesPath(env)), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: buildRevealApiAuthorizationHeader(getRevealApiAppId(env), token),
    },
  });

  if (!response.ok) {
    const message = await safeResponseText(response);
    throw new Error(`Reveal Vehicle API request failed (${response.status}): ${message || response.statusText}`);
  }

  return normalizeRevealVehicleRecords(await response.json());
}

export function normalizeRevealVehicleRecords(payload) {
  return getVehicleItems(payload).map((item) => stripUndefined({
    providerVehicleId: coerceText(firstValue(item, vehicleIdAliases)),
    name: coerceText(firstValue(item, vehicleNameAliases)),
    vehicleNumber: coerceText(firstValue(item, vehicleNumberAliases)),
    registrationNumber: coerceText(firstValue(item, registrationAliases)),
    vin: coerceText(firstValue(item, vinAliases)),
    make: coerceText(firstValue(item, makeAliases)),
    model: coerceText(firstValue(item, modelAliases)),
    year: coerceNumber(firstValue(item, yearAliases)),
    raw: item,
  })).filter((vehicle) => vehicle.providerVehicleId || vehicle.name || vehicle.vehicleNumber || vehicle.registrationNumber || vehicle.vin);
}

export function buildRevealEquipmentRecordForVehicle(vehicle, { documentId, nowIso = new Date().toISOString(), createNew = false } = {}) {
  const displayName = vehicle.name
    || [vehicle.make, vehicle.model, vehicle.vehicleNumber].filter(Boolean).join(' ')
    || vehicle.registrationNumber
    || vehicle.vin
    || vehicle.providerVehicleId
    || 'Reveal vehicle';

  const baseRecord = stripUndefined({
    id: documentId || revealEquipmentDocumentId(vehicle),
    name: displayName,
    title: displayName,
    asset: displayName,
    category: 'Truck',
    type: 'Truck',
    eqType: 'Truck',
    status: 'Available',
    currentLocationName: jdtHomeBase.name,
    currentLocation: jdtHomeBase.address,
    currentLocationType: jdtHomeBase.locationType,
  });

  return stripUndefined({
    ...(createNew ? baseRecord : { id: documentId || revealEquipmentDocumentId(vehicle) }),
    telematicsProvider: 'Reveal',
    revealVehicleId: vehicle.providerVehicleId,
    verizonVehicleId: vehicle.providerVehicleId,
    revealVehicleNumber: vehicle.vehicleNumber,
    vehicleNumber: vehicle.vehicleNumber,
    registrationNumber: vehicle.registrationNumber,
    vin: vehicle.vin,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    revealSyncedAt: nowIso,
  });
}

export async function handleRevealVehiclesSyncRequest({
  headers = {},
  env = process.env,
  fetchImpl = globalThis.fetch,
  projectId,
  databaseId,
  firebaseApiKey,
  now = new Date(),
} = {}) {
  const verification = await verifyRevealSyncAdminRequest({ headers, env, fetchImpl, firebaseApiKey });
  if (!verification.ok) {
    return {
      statusCode: verification.statusCode,
      body: { ok: false, error: verification.error },
    };
  }

  const result = await syncRevealVehiclesToFirestore({
    env,
    fetchImpl,
    projectId,
    databaseId,
    now,
    actorEmail: verification.email,
  });

  return {
    statusCode: 200,
    body: { ok: true, actorEmail: verification.email, ...result },
  };
}

export async function syncRevealVehiclesToFirestore({
  env = process.env,
  fetchImpl = globalThis.fetch,
  projectId,
  databaseId,
  now = new Date(),
  actorEmail,
} = {}) {
  const vehicles = await fetchRevealVehicles({ env, fetchImpl });
  const nowIso = normalizeIso(now);
  const accessToken = await getGoogleAccessToken({ env, fetchImpl });
  const writes = [];
  const summaries = [];

  for (const vehicle of vehicles) {
    const matchedDocumentName = await findMatchingEquipmentDocumentForRevealVehicle({
      vehicle,
      accessToken,
      projectId,
      databaseId,
      fetchImpl,
    });
    const documentId = matchedDocumentName ? firestoreDocumentId(matchedDocumentName) : revealEquipmentDocumentId(vehicle);
    const createNew = !matchedDocumentName;
    const record = buildRevealEquipmentRecordForVehicle(vehicle, { documentId, nowIso, createNew });
    const documentName = matchedDocumentName || firestoreDocumentName(projectId, databaseId, 'equipment', documentId);
    const syncRecord = stripUndefined({
      ...record,
      revealSyncedBy: actorEmail,
    });

    writes.push(createNew
      ? {
        update: {
          name: documentName,
          fields: toFirestoreFields(syncRecord),
        },
      }
      : {
        update: {
          name: documentName,
          fields: toFirestoreFields(syncRecord),
        },
        updateMask: {
          fieldPaths: Object.keys(syncRecord).filter((field) => field !== 'id'),
        },
      });

    summaries.push({
      id: documentId,
      name: record.name || vehicle.name || vehicle.vehicleNumber || vehicle.providerVehicleId,
      revealVehicleId: vehicle.providerVehicleId,
      vehicleNumber: vehicle.vehicleNumber,
      action: createNew ? 'created' : 'updated',
    });
  }

  if (writes.length > 0) {
    await firestoreRequest({
      method: 'POST',
      path: 'documents:commit',
      body: { writes },
      accessToken,
      projectId,
      databaseId,
      fetchImpl,
    });
  }

  return {
    fetched: vehicles.length,
    created: summaries.filter((vehicle) => vehicle.action === 'created').length,
    updated: summaries.filter((vehicle) => vehicle.action === 'updated').length,
    vehicles: summaries,
  };
}

async function verifyRevealSyncAdminRequest({ headers, env, fetchImpl, firebaseApiKey }) {
  const idToken = bearerTokenFromHeaders(headers);
  if (!idToken) {
    return { ok: false, statusCode: 401, error: 'Sign in as an owner admin before syncing Reveal vehicles.' };
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
  const email = String(payload.users?.[0]?.email || '').trim().toLowerCase();
  if (!email) {
    return { ok: false, statusCode: 401, error: 'Firebase session did not include an email address.' };
  }

  if (!serverAdminEmails(env).has(email)) {
    return { ok: false, statusCode: 403, error: 'Reveal vehicle sync is limited to owner admin accounts.' };
  }

  return { ok: true, statusCode: 200, email };
}

async function findMatchingEquipmentDocumentForRevealVehicle({ vehicle, accessToken, projectId, databaseId, fetchImpl }) {
  for (const [fieldPath, value] of revealVehicleEquipmentMatchCandidates(vehicle)) {
    const response = await firestoreRequest({
      method: 'POST',
      path: 'documents:runQuery',
      body: {
        structuredQuery: {
          from: [{ collectionId: 'equipment' }],
          where: {
            fieldFilter: {
              field: { fieldPath },
              op: 'EQUAL',
              value: toFirestoreValue(value),
            },
          },
          limit: 1,
        },
      },
      accessToken,
      projectId,
      databaseId,
      fetchImpl,
    });

    const match = Array.isArray(response) ? response.find((item) => item.document?.name) : null;
    if (match?.document?.name) return match.document.name;
  }

  return null;
}

function revealVehicleEquipmentMatchCandidates(vehicle) {
  const candidates = [
    ['revealVehicleId', vehicle.providerVehicleId],
    ['verizonVehicleId', vehicle.providerVehicleId],
    ['revealVehicleNumber', vehicle.vehicleNumber],
    ['vehicleNumber', vehicle.vehicleNumber],
    ['registrationNumber', vehicle.registrationNumber],
    ['vin', vehicle.vin],
    ['name', vehicle.name],
    ['asset', vehicle.name],
    ['assetId', vehicle.vehicleNumber],
  ];
  const seen = new Set();
  return candidates.filter(([field, value]) => {
    const cleanValue = coerceText(value);
    const key = `${field}:${cleanValue}`;
    if (!cleanValue || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(([field, value]) => [field, coerceText(value)]);
}

function getVehicleItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  for (const alias of ['Vehicles', 'vehicles', 'Vehicle', 'vehicle', 'Items', 'items', 'Data', 'data']) {
    const value = payload[alias];
    if (Array.isArray(value)) return value;
  }

  return [payload];
}

async function getGoogleAccessToken({ env, fetchImpl }) {
  const configuredToken = firstEnv(env, ['GOOGLE_OAUTH_ACCESS_TOKEN', 'FIRESTORE_REST_ACCESS_TOKEN']);
  if (configuredToken) return configuredToken;

  const response = await fetchImpl(metadataTokenUrl, {
    headers: { 'Metadata-Flavor': 'Google' },
  });

  if (!response.ok) {
    const message = await safeResponseText(response);
    throw new Error(`Unable to fetch Google metadata access token (${response.status}): ${message || response.statusText}`);
  }

  const tokenResponse = await response.json();
  if (!tokenResponse.access_token) throw new Error('Google metadata access token response did not include access_token.');
  return tokenResponse.access_token;
}

async function firestoreRequest({ method, path, body, accessToken, projectId, databaseId, fetchImpl }) {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/${path}`;
  const response = await fetchImpl(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const message = await safeResponseText(response);
    throw new Error(`Firestore REST request failed (${response.status}): ${message || response.statusText}`);
  }

  return response.json();
}

function getRevealApiUsername(env) {
  return firstEnv(env, ['REVEAL_API_USERNAME', 'VERIZON_REVEAL_API_USERNAME', 'FLEETMATICS_API_USERNAME']);
}

function getRevealApiPassword(env) {
  return firstEnv(env, ['REVEAL_API_PASSWORD', 'VERIZON_REVEAL_API_PASSWORD', 'FLEETMATICS_API_PASSWORD']);
}

function getRevealApiAppId(env) {
  return firstEnv(env, ['REVEAL_API_APP_ID', 'VERIZON_REVEAL_API_APP_ID', 'FLEETMATICS_API_APP_ID']);
}

function getRevealApiTokenPath(env) {
  return firstEnv(env, ['REVEAL_API_TOKEN_PATH', 'VERIZON_REVEAL_API_TOKEN_PATH']) || defaultTokenPath;
}

function getRevealVehiclesPath(env) {
  return firstEnv(env, ['REVEAL_VEHICLES_PATH', 'VERIZON_REVEAL_VEHICLES_PATH']) || defaultVehiclePath;
}

function buildRevealApiUrl(env, path) {
  const baseUrl = (firstEnv(env, ['REVEAL_API_BASE_URL', 'VERIZON_REVEAL_API_BASE_URL']) || defaultRevealApiBaseUrl).replace(/\/+$/, '');
  return `${baseUrl}/${String(path || '').replace(/^\/+/, '')}`;
}

function revealEquipmentDocumentId(vehicle) {
  const source = vehicle.providerVehicleId || vehicle.vehicleNumber || vehicle.name || vehicle.registrationNumber || vehicle.vin || 'vehicle';
  return `equipment-reveal-${slugify(source)}`;
}

function firestoreDocumentName(projectId, databaseId, collectionId, documentId) {
  return `projects/${projectId}/databases/${databaseId}/documents/${collectionId}/${documentId}`;
}

function firestoreDocumentId(documentName) {
  return String(documentName || '').split('/').pop() || '';
}

function toFirestoreFields(record) {
  return Object.fromEntries(
    Object.entries(record)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, toFirestoreValue(value)]),
  );
}

function toFirestoreValue(value) {
  if (value === null) return { nullValue: 'NULL_VALUE' };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (value instanceof Date) return { timestampValue: value.toISOString() };

  switch (typeof value) {
    case 'boolean':
      return { booleanValue: value };
    case 'number':
      return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    case 'object':
      return { mapValue: { fields: toFirestoreFields(value) } };
    case 'string':
    default:
      return { stringValue: String(value) };
  }
}

function stripTokenEnvelope(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  try {
    const parsed = JSON.parse(text);
    return String(parsed.token || parsed.access_token || parsed.Token || parsed.AccessToken || '').trim();
  } catch {
    return text.replace(/^"|"$/g, '').trim();
  }
}

function bearerTokenFromHeaders(headers) {
  const value = String(getHeader(headers, 'authorization') || '').trim();
  return value.toLowerCase().startsWith('bearer ') ? value.slice(7).trim() : '';
}

function getHeader(headers, name) {
  if (!headers) return '';
  const lowerName = name.toLowerCase();
  return Object.entries(headers).find(([key]) => key.toLowerCase() === lowerName)?.[1] || '';
}

function serverAdminEmails(env) {
  return new Set(
    (firstEnv(env, ['JDT_SYNC_ADMIN_EMAILS', 'JDT_ADMIN_EMAILS']) || 'jeremy@jdtnurseries.com,buck@jdtnurseries.com')
      .split(/[,;\n]/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function firstValue(source, aliases) {
  for (const alias of aliases) {
    const value = source?.[alias];
    if (hasValue(value)) return value;
    const matchingKey = source && typeof source === 'object'
      ? Object.keys(source).find((candidate) => candidate.toLowerCase() === String(alias).toLowerCase())
      : '';
    if (matchingKey && hasValue(source[matchingKey])) return source[matchingKey];
  }
  return undefined;
}

function hasValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
}

function coerceText(value) {
  if (!hasValue(value)) return undefined;
  if (typeof value === 'object') return undefined;
  return String(value).trim();
}

function coerceNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!hasValue(value)) return undefined;
  const numberValue = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function stripUndefined(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

function normalizeIso(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'vehicle';
}

function firstEnv(env, names) {
  return names.map((name) => env[name]).find((value) => String(value || '').trim()) || '';
}

async function safeResponseText(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}
