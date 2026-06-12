const defaultRevealApiBaseUrl = 'https://fim.api.us.fleetmatics.com';
const defaultTokenPath = '/token';
const defaultVehiclePath = '/cmd/v1/vehicles';

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

function getVehicleItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  for (const alias of ['Vehicles', 'vehicles', 'Vehicle', 'vehicle', 'Items', 'items', 'Data', 'data']) {
    const value = payload[alias];
    if (Array.isArray(value)) return value;
  }

  return [payload];
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
