import { createHash, timingSafeEqual } from 'node:crypto';

const providerName = 'Reveal';
const metadataTokenUrl = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

const vehicleIdAliases = [
  'VehicleId',
  'VehicleID',
  'vehicleId',
  'vehicleID',
  'vehicle.id',
  'vehicle.vehicleId',
  'vehicle.VehicleId',
  'AssetId',
  'assetId',
  'unitId',
];

const vehicleNumberAliases = [
  'VehicleNumber',
  'VehicleNo',
  'vehicleNumber',
  'vehicleNo',
  'vehicle.number',
  'UnitNumber',
  'unitNumber',
  'UnitNo',
  'unitNo',
];

const vehicleNameAliases = [
  'VehicleName',
  'vehicleName',
  'Name',
  'name',
  'vehicle.name',
  'asset.name',
];

const registrationAliases = [
  'RegistrationNumber',
  'registrationNumber',
  'LicensePlate',
  'licensePlate',
  'Plate',
  'plate',
];

const vinAliases = ['VIN', 'Vin', 'vin', 'vehicle.vin'];
const latitudeAliases = ['Latitude', 'latitude', 'Lat', 'lat', 'location.lat', 'location.latitude', 'position.latitude'];
const longitudeAliases = ['Longitude', 'longitude', 'Lng', 'lng', 'Lon', 'lon', 'location.lng', 'location.lon', 'location.longitude', 'position.longitude'];
const timestampAliases = ['EventDateTime', 'GPSDateTime', 'GpsDateTime', 'Timestamp', 'timestamp', 'DateTime', 'dateTime', 'time', 'location.time'];
const addressAliases = ['Address', 'address', 'StreetAddress', 'streetAddress', 'FormattedAddress', 'formattedAddress', 'location.address'];
const speedAliases = ['Speed', 'speed', 'SpeedMph', 'speedMph', 'MilesPerHour', 'mph'];
const headingAliases = ['Heading', 'heading', 'Direction', 'direction', 'Bearing', 'bearing'];
const statusAliases = ['Status', 'status', 'IgnitionStatus', 'ignitionStatus', 'VehicleStatus', 'vehicleStatus'];
const driverNameAliases = ['DriverName', 'driverName', 'driver.name', 'AssignedDriver', 'assignedDriver'];
const odometerAliases = ['Odometer', 'odometer', 'OdometerMiles', 'odometerMiles'];
const alertIdAliases = ['AlertId', 'alertId', 'Id', 'id', 'EventId', 'eventId'];
const alertTypeAliases = ['AlertType', 'alertType', 'Type', 'type', 'Name', 'name'];
const alertSeverityAliases = ['Severity', 'severity', 'Priority', 'priority', 'Level', 'level'];
const alertNotesAliases = ['Notes', 'notes', 'Description', 'description', 'Message', 'message'];

export function normalizeRevealGpsPayloads(payload, receivedAt = new Date().toISOString()) {
  const receivedAtIso = normalizeTimestamp(receivedAt) || new Date().toISOString();
  return getPayloadItems(payload)
    .map((item) => normalizeRevealGpsPayloadItem(item, receivedAtIso))
    .filter((event) => event.providerVehicleId || event.vehicleNumber || event.vehicleName || event.coordinateText);
}

export function normalizeRevealAlertPayloads(payload, receivedAt = new Date().toISOString()) {
  const receivedAtIso = normalizeTimestamp(receivedAt) || new Date().toISOString();
  return getAlertItems(payload)
    .map((item) => normalizeRevealAlertPayloadItem(item, receivedAtIso))
    .filter((alert) => alert.title || alert.body);
}

function normalizeRevealGpsPayloadItem(item, receivedAtIso) {
  const latitude = coerceNumber(firstValue(item, latitudeAliases));
  const longitude = coerceNumber(firstValue(item, longitudeAliases));
  const address = coerceText(firstValue(item, addressAliases));
  const vehicleNumber = coerceText(firstValue(item, vehicleNumberAliases));
  const vehicleName = coerceText(firstValue(item, vehicleNameAliases));
  const eventAt = normalizeTimestamp(firstValue(item, timestampAliases)) || receivedAtIso;

  return stripUndefined({
    provider: providerName,
    providerVehicleId: coerceText(firstValue(item, vehicleIdAliases)),
    vehicleNumber,
    vehicleName,
    registrationNumber: coerceText(firstValue(item, registrationAliases)),
    vin: coerceText(firstValue(item, vinAliases)),
    latitude,
    longitude,
    coordinateText: latitude !== undefined && longitude !== undefined ? formatCoordinateText(latitude, longitude) : undefined,
    address,
    eventAt,
    receivedAt: receivedAtIso,
    speedMph: coerceNumber(firstValue(item, speedAliases)),
    heading: coerceNumber(firstValue(item, headingAliases)),
    status: coerceText(firstValue(item, statusAliases)),
    driverName: coerceText(firstValue(item, driverNameAliases)),
    odometerMiles: coerceNumber(firstValue(item, odometerAliases)),
  });
}

function normalizeRevealAlertPayloadItem(item, receivedAtIso) {
  const alertId = coerceText(firstValue(item, alertIdAliases));
  const alertType = coerceText(firstValue(item, alertTypeAliases)) || 'Reveal fleet alert';
  const vehicleId = coerceText(firstValue(item, vehicleIdAliases));
  const vehicleNumber = coerceText(firstValue(item, vehicleNumberAliases));
  const vehicleName = coerceText(firstValue(item, vehicleNameAliases));
  const driverName = coerceText(firstValue(item, driverNameAliases));
  const address = coerceText(firstValue(item, addressAliases));
  const notes = coerceText(firstValue(item, alertNotesAliases));
  const eventAt = normalizeTimestamp(firstValue(item, timestampAliases)) || receivedAtIso;
  const severity = coerceText(firstValue(item, alertSeverityAliases)) || severityForAlert(alertType, notes);
  const title = alertType;
  const id = `reveal-alert-${slugify(alertId || `${vehicleId || vehicleNumber || vehicleName}-${alertType}-${eventAt}`)}`;

  return stripUndefined({
    id,
    title,
    name: title,
    body: [
      vehicleName || vehicleNumber || vehicleId ? `Vehicle: ${vehicleName || vehicleNumber || vehicleId}` : '',
      driverName ? `Driver: ${driverName}` : '',
      address ? `Location: ${address}` : '',
      notes,
    ].filter(Boolean).join('\n') || title,
    severity,
    status: 'Needs Review',
    time: eventAt,
    targetTab: 'equipment',
    relatedEntityType: 'equipment',
    relatedEntityId: vehicleId,
    provider: providerName,
    revealAlertId: alertId,
    revealVehicleId: vehicleId,
    revealVehicleNumber: vehicleNumber,
    receivedAt: receivedAtIso,
  });
}

function getPayloadItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const collectionAliases = [
    'GPSPlotData',
    'gpsPlotData',
    'VehicleLocation',
    'vehicleLocation',
    'VehicleLocations',
    'vehicleLocations',
    'Locations',
    'locations',
    'Events',
    'events',
    'Items',
    'items',
    'Data',
    'data',
  ];

  for (const alias of collectionAliases) {
    const value = firstValue(payload, [alias]);
    if (Array.isArray(value)) return value;
  }

  return [payload];
}

function getAlertItems(payload) {
  if (Array.isArray(payload)) return payload.filter((item) => item && typeof item === 'object');
  if (!payload || typeof payload !== 'object') return [];

  for (const alias of ['Alerts', 'alerts', 'Alert', 'alert', 'Events', 'events', 'Items', 'items', 'Data', 'data']) {
    const value = firstValue(payload, [alias]);
    if (Array.isArray(value)) return value.filter((item) => item && typeof item === 'object');
  }

  return [payload];
}

export function buildRevealTelematicsEventId(event) {
  const vehicleKey = slugify(event.providerVehicleId || event.vehicleNumber || event.vehicleName || 'unknown-vehicle');
  const timeKey = slugify(event.eventAt || event.receivedAt || 'unknown-time');
  const digest = createHash('sha256')
    .update(JSON.stringify({
      providerVehicleId: event.providerVehicleId,
      vehicleNumber: event.vehicleNumber,
      vehicleName: event.vehicleName,
      latitude: event.latitude,
      longitude: event.longitude,
      eventAt: event.eventAt,
    }))
    .digest('hex')
    .slice(0, 12);

  return `reveal-${vehicleKey}-${timeKey}-${digest}`;
}

export function revealEquipmentMatchCandidates(event) {
  const candidates = [
    ['revealVehicleId', event.providerVehicleId],
    ['verizonVehicleId', event.providerVehicleId],
    ['revealVehicleNumber', event.vehicleNumber],
    ['vehicleNumber', event.vehicleNumber],
    ['registrationNumber', event.registrationNumber],
    ['vin', event.vin],
    ['name', event.vehicleName],
    ['asset', event.vehicleName],
    ['assetId', event.vehicleNumber],
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

export function buildEquipmentPatchFromRevealEvent(event) {
  const locationText = event.address || event.coordinateText;
  const moving = typeof event.speedMph === 'number' && event.speedMph > 2;

  return stripUndefined({
    telematicsProvider: providerName,
    revealVehicleId: event.providerVehicleId,
    verizonVehicleId: event.providerVehicleId,
    revealVehicleNumber: event.vehicleNumber,
    currentLocationType: locationText ? (moving ? 'In Transit' : 'GPS') : undefined,
    currentLocationName: locationText,
    currentLocation: locationText,
    lastTelematicsAt: event.eventAt || event.receivedAt,
    revealLastReceivedAt: event.receivedAt,
    lastTelematicsLatitude: event.latitude,
    lastTelematicsLongitude: event.longitude,
    lastTelematicsAddress: event.address,
    lastTelematicsSpeedMph: event.speedMph,
    lastTelematicsHeading: event.heading,
    lastTelematicsStatus: event.status,
    lastTelematicsDriverName: event.driverName,
    lastTelematicsOdometerMiles: event.odometerMiles,
  });
}

export function buildFirestoreCommitBody({ projectId, databaseId, event, rawPayload, matchedEquipmentDocumentName }) {
  const eventId = buildRevealTelematicsEventId(event);
  const eventDocumentName = firestoreDocumentName(projectId, databaseId, 'fleetTelematicsEvents', eventId);
  const eventRecord = stripUndefined({
    ...event,
    id: eventId,
    eventId,
    rawPayload,
    matchedEquipmentDocumentName,
  });
  const writes = [{
    update: {
      name: eventDocumentName,
      fields: toFirestoreFields(eventRecord),
    },
  }];

  if (matchedEquipmentDocumentName) {
    const equipmentPatch = buildEquipmentPatchFromRevealEvent(event);
    writes.push({
      update: {
        name: matchedEquipmentDocumentName,
        fields: toFirestoreFields(equipmentPatch),
      },
      updateMask: {
        fieldPaths: Object.keys(equipmentPatch),
      },
    });
  }

  return { writes };
}

export function buildRevealAlertCommitBody({ projectId, databaseId, alert }) {
  return {
    writes: [{
      update: {
        name: firestoreDocumentName(projectId, databaseId, 'alerts', alert.id),
        fields: toFirestoreFields(alert),
      },
    }],
  };
}

export function parseBasicAuthorization(headerValue) {
  const value = String(headerValue || '').trim();
  if (!value.toLowerCase().startsWith('basic ')) return null;

  try {
    const decoded = Buffer.from(value.slice(6), 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex < 0) return null;
    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

export function isRevealWebhookAuthorized(headers, env = process.env) {
  const configuredToken = firstEnv(env, ['REVEAL_GPS_WEBHOOK_TOKEN', 'REVEAL_WEBHOOK_TOKEN', 'VERIZON_REVEAL_WEBHOOK_TOKEN']);
  const configuredUsername = firstEnv(env, ['REVEAL_GPS_WEBHOOK_USERNAME', 'REVEAL_WEBHOOK_USERNAME', 'VERIZON_REVEAL_WEBHOOK_USERNAME']);
  const configuredPassword = firstEnv(env, ['REVEAL_GPS_WEBHOOK_PASSWORD', 'REVEAL_WEBHOOK_PASSWORD', 'VERIZON_REVEAL_WEBHOOK_PASSWORD']);
  const authHeader = getHeader(headers, 'authorization');

  if (configuredToken) {
    const bearer = String(authHeader || '').replace(/^Bearer\s+/i, '').trim();
    if (safeTextEqual(bearer, configuredToken)) return true;
  }

  if (configuredUsername && configuredPassword) {
    const parsed = parseBasicAuthorization(authHeader);
    if (!parsed) return false;
    return safeTextEqual(parsed.username, configuredUsername) && safeTextEqual(parsed.password, configuredPassword);
  }

  return false;
}

export function revealWebhookCredentialsConfigured(env = process.env) {
  return Boolean(
    firstEnv(env, ['REVEAL_GPS_WEBHOOK_TOKEN', 'REVEAL_WEBHOOK_TOKEN', 'VERIZON_REVEAL_WEBHOOK_TOKEN'])
    || (
      firstEnv(env, ['REVEAL_GPS_WEBHOOK_USERNAME', 'REVEAL_WEBHOOK_USERNAME', 'VERIZON_REVEAL_WEBHOOK_USERNAME'])
      && firstEnv(env, ['REVEAL_GPS_WEBHOOK_PASSWORD', 'REVEAL_WEBHOOK_PASSWORD', 'VERIZON_REVEAL_WEBHOOK_PASSWORD'])
    )
  );
}

export function revealAlertWebhookCredentialsConfigured(env = process.env) {
  return Boolean(
    firstEnv(env, ['REVEAL_ALERT_WEBHOOK_TOKEN', 'VERIZON_REVEAL_ALERT_WEBHOOK_TOKEN'])
    || (
      firstEnv(env, ['REVEAL_ALERT_WEBHOOK_USERNAME', 'VERIZON_REVEAL_ALERT_WEBHOOK_USERNAME'])
      && firstEnv(env, ['REVEAL_ALERT_WEBHOOK_PASSWORD', 'VERIZON_REVEAL_ALERT_WEBHOOK_PASSWORD'])
    )
    || revealWebhookCredentialsConfigured(env)
  );
}

export function isRevealAlertWebhookAuthorized(headers, env = process.env) {
  const configuredToken = firstEnv(env, ['REVEAL_ALERT_WEBHOOK_TOKEN', 'VERIZON_REVEAL_ALERT_WEBHOOK_TOKEN']);
  const configuredUsername = firstEnv(env, ['REVEAL_ALERT_WEBHOOK_USERNAME', 'VERIZON_REVEAL_ALERT_WEBHOOK_USERNAME']);
  const configuredPassword = firstEnv(env, ['REVEAL_ALERT_WEBHOOK_PASSWORD', 'VERIZON_REVEAL_ALERT_WEBHOOK_PASSWORD']);
  const authHeader = getHeader(headers, 'authorization');

  if (configuredToken) {
    const bearer = String(authHeader || '').replace(/^Bearer\s+/i, '').trim();
    if (safeTextEqual(bearer, configuredToken)) return true;
  }

  if (configuredUsername && configuredPassword) {
    const parsed = parseBasicAuthorization(authHeader);
    if (!parsed) return false;
    return safeTextEqual(parsed.username, configuredUsername) && safeTextEqual(parsed.password, configuredPassword);
  }

  return isRevealWebhookAuthorized(headers, env);
}

export async function handleRevealGpsWebhook({ body, headers = {}, env = process.env, fetchImpl = globalThis.fetch, projectId, databaseId, now = new Date() }) {
  if (!revealWebhookCredentialsConfigured(env)) {
    return {
      statusCode: 503,
      body: { ok: false, error: 'Reveal GPS webhook credentials are not configured.' },
    };
  }

  if (!isRevealWebhookAuthorized(headers, env)) {
    return {
      statusCode: 401,
      body: { ok: false, error: 'Unauthorized Reveal GPS webhook request.' },
      headers: { 'WWW-Authenticate': 'Basic realm="JDT Reveal GPS Webhook"' },
    };
  }

  const events = normalizeRevealGpsPayloads(body, now.toISOString());
  if (events.length === 0) {
    return {
      statusCode: 202,
      body: { ok: true, accepted: 0, written: 0, warning: 'No vehicle GPS records were found in the payload.' },
    };
  }

  const results = [];
  for (const event of events) {
    results.push(await writeRevealGpsEventToFirestore({
      event,
      rawPayload: body,
      projectId,
      databaseId,
      env,
      fetchImpl,
    }));
  }

  return {
    statusCode: 202,
    body: {
      ok: true,
      accepted: events.length,
      written: results.length,
      matchedEquipment: results.filter((result) => result.matchedEquipmentDocumentName).length,
      unmatchedEquipment: results.filter((result) => !result.matchedEquipmentDocumentName).length,
      eventIds: results.map((result) => result.eventId),
    },
  };
}

export async function handleRevealAlertWebhook({ body, headers = {}, env = process.env, fetchImpl = globalThis.fetch, projectId, databaseId, now = new Date() }) {
  if (!revealAlertWebhookCredentialsConfigured(env)) {
    return {
      statusCode: 503,
      body: { ok: false, error: 'Reveal Alert webhook credentials are not configured.' },
    };
  }

  if (!isRevealAlertWebhookAuthorized(headers, env)) {
    return {
      statusCode: 401,
      body: { ok: false, error: 'Unauthorized Reveal Alert webhook request.' },
      headers: { 'WWW-Authenticate': 'Basic realm="JDT Reveal Alert Webhook"' },
    };
  }

  const alerts = normalizeRevealAlertPayloads(body, now.toISOString());
  if (alerts.length === 0) {
    return {
      statusCode: 202,
      body: { ok: true, accepted: 0, written: 0, warning: 'No Reveal alert records were found in the payload.' },
    };
  }

  const accessToken = await getGoogleAccessToken({ env, fetchImpl });
  const writes = alerts.flatMap((alert) => buildRevealAlertCommitBody({ projectId, databaseId, alert }).writes);
  await firestoreRequest({
    method: 'POST',
    path: 'documents:commit',
    body: { writes },
    accessToken,
    projectId,
    databaseId,
    fetchImpl,
  });

  return {
    statusCode: 202,
    body: {
      ok: true,
      accepted: alerts.length,
      written: writes.length,
      alertIds: alerts.map((alert) => alert.id),
    },
  };
}

async function writeRevealGpsEventToFirestore({ event, rawPayload, projectId, databaseId, env, fetchImpl }) {
  const accessToken = await getGoogleAccessToken({ env, fetchImpl });
  const matchedEquipmentDocumentName = await findMatchingEquipmentDocument({
    event,
    accessToken,
    projectId,
    databaseId,
    fetchImpl,
  });
  const commitBody = buildFirestoreCommitBody({
    projectId,
    databaseId,
    event,
    rawPayload,
    matchedEquipmentDocumentName,
  });

  await firestoreRequest({
    method: 'POST',
    path: 'documents:commit',
    body: commitBody,
    accessToken,
    projectId,
    databaseId,
    fetchImpl,
  });

  return {
    eventId: buildRevealTelematicsEventId(event),
    matchedEquipmentDocumentName,
  };
}

async function findMatchingEquipmentDocument({ event, accessToken, projectId, databaseId, fetchImpl }) {
  for (const [fieldPath, value] of revealEquipmentMatchCandidates(event)) {
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

function firestoreDocumentName(projectId, databaseId, collectionId, documentId) {
  return `projects/${projectId}/databases/${databaseId}/documents/${collectionId}/${documentId}`;
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

function firstValue(source, aliases) {
  for (const alias of aliases) {
    const value = valueAtPath(source, alias);
    if (hasValue(value)) return value;
  }
  return undefined;
}

function valueAtPath(source, alias) {
  if (!source || typeof source !== 'object') return undefined;
  return String(alias)
    .split('.')
    .reduce((current, key) => {
      if (!current || typeof current !== 'object') return undefined;
      if (Object.hasOwn(current, key)) return current[key];
      const matchingKey = Object.keys(current).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
      return matchingKey ? current[matchingKey] : undefined;
    }, source);
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
  const match = String(value).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!match) return undefined;
  const numberValue = Number(match[0]);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function normalizeTimestamp(value) {
  if (!hasValue(value)) return undefined;
  const date = typeof value === 'number'
    ? new Date(value > 100000000000 ? value : value * 1000)
    : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function severityForAlert(type, notes) {
  const text = `${type || ''} ${notes || ''}`.toLowerCase();
  if (/crash|collision|panic|stolen|unauthorized|tow|critical/.test(text)) return 'Critical';
  if (/speed|harsh|geofence|enter|exit|late|idle|maintenance|fault/.test(text)) return 'High';
  return 'Medium';
}

function formatCoordinateText(latitude, longitude) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function stripUndefined(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'unknown';
}

function firstEnv(env, names) {
  return names.map((name) => env[name]).find((value) => String(value || '').trim()) || '';
}

function getHeader(headers, name) {
  if (!headers) return '';
  const lowerName = name.toLowerCase();
  return Object.entries(headers).find(([key]) => key.toLowerCase() === lowerName)?.[1] || '';
}

function safeTextEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

async function safeResponseText(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}
