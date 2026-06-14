const defaultRevealApiBaseUrl = 'https://fim.api.us.fleetmatics.com';
const defaultTokenPath = '/token';
const defaultVehiclePath = '/cmd/v1/vehicles';
const defaultVehicleLiveLocationPathTemplate = '/rad/v1/vehicles/{vehicleNumber}/location';
const metadataTokenUrl = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

const recommendedRevealApis = [
  {
    id: 'driverAssignments',
    label: 'Driver Assignment API',
    envPathNames: ['REVEAL_DRIVER_ASSIGNMENTS_PATH', 'VERIZON_REVEAL_DRIVER_ASSIGNMENTS_PATH'],
    targetCollection: 'fieldUpdates',
    itemAliases: ['DriverAssignments', 'driverAssignments', 'Assignments', 'assignments', 'Items', 'items', 'Data', 'data'],
  },
  {
    id: 'driverStatuses',
    label: 'Driver Status API',
    envPathNames: ['REVEAL_DRIVER_STATUSES_PATH', 'REVEAL_DRIVER_STATUS_PATH', 'VERIZON_REVEAL_DRIVER_STATUSES_PATH'],
    targetCollection: 'fieldUpdates',
    itemAliases: ['DriverStatuses', 'driverStatuses', 'Statuses', 'statuses', 'Items', 'items', 'Data', 'data'],
  },
  {
    id: 'fleetInspections',
    label: 'Fleet Inspection API',
    envPathNames: ['REVEAL_FLEET_INSPECTIONS_PATH', 'REVEAL_INSPECTIONS_PATH', 'VERIZON_REVEAL_FLEET_INSPECTIONS_PATH'],
    targetCollection: 'workOrders',
    itemAliases: ['FleetInspections', 'fleetInspections', 'Inspections', 'inspections', 'Items', 'items', 'Data', 'data'],
  },
  {
    id: 'geofences',
    label: 'Geofence API',
    envPathNames: ['REVEAL_GEOFENCES_PATH', 'VERIZON_REVEAL_GEOFENCES_PATH'],
    targetCollection: 'locations',
    itemAliases: ['Geofences', 'geofences', 'Zones', 'zones', 'Items', 'items', 'Data', 'data'],
  },
  {
    id: 'nonPoweredAssets',
    label: 'Non-Powered Assets API',
    envPathNames: ['REVEAL_NON_POWERED_ASSETS_PATH', 'VERIZON_REVEAL_NON_POWERED_ASSETS_PATH'],
    targetCollection: 'equipment',
    itemAliases: ['Assets', 'assets', 'NonPoweredAssets', 'nonPoweredAssets', 'Items', 'items', 'Data', 'data'],
  },
  {
    id: 'nonPoweredAssetLocations',
    label: 'Non-Powered Assets Update / GPS History API',
    envPathNames: ['REVEAL_NON_POWERED_ASSET_LOCATIONS_PATH', 'REVEAL_NON_POWERED_ASSET_GPS_HISTORY_PATH', 'VERIZON_REVEAL_NON_POWERED_ASSET_LOCATIONS_PATH'],
    targetCollection: 'fleetTelematicsEvents',
    itemAliases: ['AssetLocations', 'assetLocations', 'Locations', 'locations', 'GPSPlotData', 'gpsPlotData', 'Items', 'items', 'Data', 'data'],
  },
  {
    id: 'vehicleGpsHistory',
    label: 'Vehicle GPS History API',
    envPathNames: ['REVEAL_VEHICLE_GPS_HISTORY_PATH', 'VERIZON_REVEAL_VEHICLE_GPS_HISTORY_PATH'],
    targetCollection: 'fleetTelematicsEvents',
    itemAliases: ['GPSPlotData', 'gpsPlotData', 'VehicleLocations', 'vehicleLocations', 'Locations', 'locations', 'Items', 'items', 'Data', 'data'],
  },
  {
    id: 'vehicleSegments',
    label: 'Vehicle Segment Data API',
    envPathNames: ['REVEAL_VEHICLE_SEGMENTS_PATH', 'REVEAL_VEHICLE_SEGMENT_DATA_PATH', 'VERIZON_REVEAL_VEHICLE_SEGMENTS_PATH'],
    targetCollection: 'fleetTelematicsEvents',
    itemAliases: ['Segments', 'segments', 'VehicleSegments', 'vehicleSegments', 'Items', 'items', 'Data', 'data'],
  },
];

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

export function buildRevealRecommendedApiStatus(env = process.env) {
  const supported = recommendedRevealApis.map((api) => revealApiStatusItem(api, env));
  return {
    supported,
    configured: supported.filter((api) => api.configured),
    missing: supported.filter((api) => !api.configured),
  };
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

export async function fetchRevealConfiguredApiResource(apiId, { env = process.env, fetchImpl = globalThis.fetch } = {}) {
  if (!revealApiCredentialsConfigured(env)) {
    throw new Error('Reveal API credentials are not configured.');
  }

  const definition = revealRecommendedApiDefinition(apiId);
  const path = configuredRevealApiPath(definition, env);
  if (!path) {
    throw new Error(`${definition.label} path is not configured.`);
  }

  const token = await fetchRevealApiToken({ env, fetchImpl });
  const response = await fetchImpl(buildRevealApiUrl(env, path), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: buildRevealApiAuthorizationHeader(getRevealApiAppId(env), token),
    },
  });

  if (!response.ok) {
    const message = await safeResponseText(response);
    throw new Error(`Reveal ${definition.label} request failed (${response.status}): ${message || response.statusText}`);
  }

  return response.json();
}

export async function fetchRevealVehicleLiveLocation(vehicleNumber, { token, env = process.env, fetchImpl = globalThis.fetch } = {}) {
  if (!revealApiCredentialsConfigured(env)) {
    throw new Error('Reveal API credentials are not configured.');
  }

  const cleanVehicleNumber = coerceText(vehicleNumber);
  if (!cleanVehicleNumber) {
    throw new Error('Reveal live location requires a Vehicle Number.');
  }

  const revealToken = token || await fetchRevealApiToken({ env, fetchImpl });
  const response = await fetchImpl(buildRevealApiUrl(env, buildRevealVehicleLiveLocationPath(cleanVehicleNumber, env)), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: buildRevealApiAuthorizationHeader(getRevealApiAppId(env), revealToken),
    },
  });

  if (!response.ok) {
    const message = await safeResponseText(response);
    throw new Error(`Reveal live location request failed for ${cleanVehicleNumber} (${response.status}): ${message || response.statusText}`);
  }

  return response.json();
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

export function buildRevealRecommendedApiFirestoreRecords(apiId, payload, { nowIso = new Date().toISOString(), actorEmail = '' } = {}) {
  const definition = revealRecommendedApiDefinition(apiId);
  const items = getApiItems(payload, definition.itemAliases);
  return items
    .map((item) => {
      switch (definition.id) {
        case 'driverAssignments':
          return buildDriverAssignmentRecord(item, nowIso, actorEmail);
        case 'driverStatuses':
          return buildDriverStatusRecord(item, nowIso, actorEmail);
        case 'fleetInspections':
          return buildFleetInspectionWorkOrderRecord(item, nowIso, actorEmail);
        case 'geofences':
          return buildGeofenceLocationRecord(item, nowIso, actorEmail);
        case 'nonPoweredAssets':
          return buildNonPoweredAssetEquipmentRecord(item, nowIso, actorEmail);
        case 'nonPoweredAssetLocations':
          return buildNonPoweredAssetLocationEventRecord(item, nowIso, actorEmail);
        case 'vehicleGpsHistory':
          return buildVehicleGpsHistoryEventRecord(item, nowIso, actorEmail);
        case 'vehicleSegments':
          return buildVehicleSegmentEventRecord(item, nowIso, actorEmail);
        default:
          return null;
      }
    })
    .filter(Boolean);
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

export function buildRevealVehicleMatchCandidates(vehicles = [], equipment = []) {
  return vehicles.map((vehicle) => {
    const match = bestRevealVehicleEquipmentMatch(vehicle, equipment);
    const revealVehicleName = vehicle.name
      || [vehicle.make, vehicle.model, vehicle.vehicleNumber].filter(Boolean).join(' ')
      || vehicle.registrationNumber
      || vehicle.vin
      || vehicle.providerVehicleId
      || 'Reveal vehicle';
    const base = {
      revealVehicleId: vehicle.providerVehicleId || '',
      revealVehicleName,
      revealVehicleNumber: vehicle.vehicleNumber || '',
      registrationNumber: vehicle.registrationNumber || '',
      vin: vehicle.vin || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      jdtEquipmentId: match?.equipment?.id || '',
      jdtEquipmentName: match?.equipment ? equipmentDisplayName(match.equipment) : '',
      matchField: match?.field || '',
      matchValue: match?.value || '',
    };

    if (!match) {
      return {
        ...base,
        confidence: 'New',
        status: 'newVehicle',
        recommendedAction: 'Create or link this Reveal vehicle to a JDT equipment record before relying on live GPS updates.',
      };
    }

    const approved = match.field === 'revealVehicleId'
      || match.field === 'verizonVehicleId'
      || Boolean(match.equipment.revealVehicleId && vehicle.providerVehicleId && match.equipment.revealVehicleId === vehicle.providerVehicleId)
      || Boolean(match.equipment.verizonVehicleId && vehicle.providerVehicleId && match.equipment.verizonVehicleId === vehicle.providerVehicleId);

    return {
      ...base,
      confidence: approved ? 'Approved' : match.confidence,
      status: approved ? 'matched' : 'needsReview',
      recommendedAction: approved
        ? 'Approved match. Reveal can update this JDT equipment record.'
        : 'Review and approve this match before allowing Reveal to update this JDT equipment record.',
    };
  });
}

export function buildRevealMatchApprovalWrites({
  approvals = [],
  vehicles = [],
  projectId,
  databaseId,
  nowIso = new Date().toISOString(),
  actorEmail = '',
} = {}) {
  const vehiclesById = new Map(vehicles.map((vehicle) => [coerceText(vehicle.providerVehicleId), vehicle]).filter(([id]) => id));
  const seen = new Set();
  const writes = [];
  const approved = [];
  const skipped = [];

  approvals.forEach((approval) => {
    const revealVehicleId = coerceText(approval?.revealVehicleId);
    const jdtEquipmentId = coerceText(approval?.jdtEquipmentId);
    const approvalKey = `${revealVehicleId}:${jdtEquipmentId}`;

    if (!revealVehicleId || !jdtEquipmentId) {
      skipped.push({ revealVehicleId: revealVehicleId || '', jdtEquipmentId: jdtEquipmentId || '', reason: 'Approval requires both Reveal vehicle ID and JDT equipment ID.' });
      return;
    }
    if (seen.has(approvalKey)) return;
    seen.add(approvalKey);

    const vehicle = vehiclesById.get(revealVehicleId);
    if (!vehicle) {
      skipped.push({ revealVehicleId, jdtEquipmentId, reason: 'Reveal vehicle was not returned by the Vehicle API.' });
      return;
    }

    const identityRecord = stripUndefined({
      ...buildRevealEquipmentRecordForVehicle(vehicle, { documentId: jdtEquipmentId, nowIso, createNew: false }),
      revealMatchStatus: 'approved',
      revealMatchApprovedAt: nowIso,
      revealMatchApprovedBy: actorEmail,
    });
    const fieldPaths = Object.keys(identityRecord).filter((field) => field !== 'id');

    writes.push({
      update: {
        name: firestoreDocumentName(projectId, databaseId, 'equipment', jdtEquipmentId),
        fields: toFirestoreFields(identityRecord),
      },
      updateMask: { fieldPaths },
    });
    approved.push({
      revealVehicleId,
      jdtEquipmentId,
      revealVehicleName: vehicle.name || vehicle.vehicleNumber || revealVehicleId,
      revealVehicleNumber: vehicle.vehicleNumber || '',
    });
  });

  return { writes, approved, skipped };
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

export async function handleRevealVehicleMatchApprovalRequest({
  headers = {},
  body = {},
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

  const result = await approveRevealVehicleMatchesInFirestore({
    approvals: Array.isArray(body?.approvals) ? body.approvals : [],
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

export async function handleRevealVehicleMatchPreviewRequest({
  headers = {},
  env = process.env,
  fetchImpl = globalThis.fetch,
  projectId,
  databaseId,
  firebaseApiKey,
} = {}) {
  const verification = await verifyRevealSyncAdminRequest({ headers, env, fetchImpl, firebaseApiKey });
  if (!verification.ok) {
    return {
      statusCode: verification.statusCode,
      body: { ok: false, error: verification.error },
    };
  }

  const [vehicles, equipment] = await Promise.all([
    fetchRevealVehicles({ env, fetchImpl }),
    fetchFirestoreCollection({
      collectionId: 'equipment',
      env,
      fetchImpl,
      projectId,
      databaseId,
    }),
  ]);
  const reviewCandidates = buildRevealVehicleMatchCandidates(vehicles, equipment);

  return {
    statusCode: 200,
    body: {
      ok: true,
      actorEmail: verification.email,
      fetchedRevealVehicles: vehicles.length,
      equipmentRecords: equipment.length,
      summary: {
        matched: reviewCandidates.filter((candidate) => candidate.status === 'matched').length,
        needsReview: reviewCandidates.filter((candidate) => candidate.status === 'needsReview').length,
        newVehicle: reviewCandidates.filter((candidate) => candidate.status === 'newVehicle').length,
      },
      reviewCandidates,
    },
  };
}

export async function approveRevealVehicleMatchesInFirestore({
  approvals = [],
  env = process.env,
  fetchImpl = globalThis.fetch,
  projectId,
  databaseId,
  now = new Date(),
  actorEmail,
} = {}) {
  const vehicles = await fetchRevealVehicles({ env, fetchImpl });
  const { writes, approved, skipped } = buildRevealMatchApprovalWrites({
    approvals,
    vehicles,
    projectId,
    databaseId,
    nowIso: normalizeIso(now),
    actorEmail,
  });

  if (writes.length > 0) {
    const accessToken = await getGoogleAccessToken({ env, fetchImpl });
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
    requested: approvals.length,
    approved,
    skipped,
  };
}

export async function handleRevealRecommendedApisSyncRequest({
  headers = {},
  env = process.env,
  fetchImpl = globalThis.fetch,
  projectId,
  databaseId,
  firebaseApiKey,
  now = new Date(),
  enabledApis,
} = {}) {
  const verification = await verifyRevealSyncAdminRequest({ headers, env, fetchImpl, firebaseApiKey });
  if (!verification.ok) {
    return {
      statusCode: verification.statusCode,
      body: { ok: false, error: verification.error },
    };
  }

  const result = await syncRecommendedRevealApisToFirestore({
    env,
    fetchImpl,
    projectId,
    databaseId,
    now,
    actorEmail: verification.email,
    enabledApis,
  });

  return {
    statusCode: 200,
    body: { ok: true, actorEmail: verification.email, ...result },
  };
}

export async function handleRevealLiveLocationsSyncRequest({
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

  const result = await syncRevealLiveLocationsToFirestore({
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

export async function syncRecommendedRevealApisToFirestore({
  env = process.env,
  fetchImpl = globalThis.fetch,
  projectId,
  databaseId,
  now = new Date(),
  actorEmail,
  enabledApis,
} = {}) {
  const enabledSet = Array.isArray(enabledApis) && enabledApis.length > 0 ? new Set(enabledApis) : null;
  const configuredApis = recommendedRevealApis.filter((definition) => {
    if (enabledSet && !enabledSet.has(definition.id)) return false;
    return Boolean(configuredRevealApiPath(definition, env));
  });
  const nowIso = normalizeIso(now);
  const writes = [];
  const apiSummaries = [];

  for (const definition of configuredApis) {
    const payload = await fetchRevealConfiguredApiResource(definition.id, { env, fetchImpl });
    const records = buildRevealRecommendedApiFirestoreRecords(definition.id, payload, { nowIso, actorEmail });
    records.forEach((record) => {
      writes.push({
        update: {
          name: firestoreDocumentName(projectId, databaseId, record.collection, record.id),
          fields: toFirestoreFields(record.data),
        },
      });
    });
    apiSummaries.push({
      id: definition.id,
      label: definition.label,
      fetched: getApiItems(payload, definition.itemAliases).length,
      written: records.length,
      targetCollections: [...new Set(records.map((record) => record.collection))],
    });
  }

  if (writes.length > 0) {
    const accessToken = await getGoogleAccessToken({ env, fetchImpl });
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
    apis: apiSummaries,
    totalFetched: apiSummaries.reduce((total, api) => total + api.fetched, 0),
    totalWritten: apiSummaries.reduce((total, api) => total + api.written, 0),
    skipped: recommendedRevealApis
      .filter((definition) => !configuredApis.includes(definition) && (!enabledSet || enabledSet.has(definition.id)))
      .map((definition) => ({ id: definition.id, label: definition.label, reason: 'Endpoint path not configured' })),
  };
}

export async function syncRevealLiveLocationsToFirestore({
  env = process.env,
  fetchImpl = globalThis.fetch,
  projectId,
  databaseId,
  now = new Date(),
  actorEmail,
} = {}) {
  const nowIso = normalizeIso(now);
  const [vehicles, equipment] = await Promise.all([
    fetchRevealVehicles({ env, fetchImpl }),
    fetchFirestoreCollection({
      collectionId: 'equipment',
      env,
      fetchImpl,
      projectId,
      databaseId,
    }),
  ]);
  const token = await fetchRevealApiToken({ env, fetchImpl });
  const revealVehiclesById = new Map(vehicles.map((vehicle) => [coerceText(vehicle.providerVehicleId), vehicle]).filter(([id]) => id));
  const revealEquipment = equipment.filter(isRevealLinkedEquipment);
  const accessToken = await getGoogleAccessToken({ env, fetchImpl });
  const writes = [];
  const synced = [];
  const skipped = [];

  for (const item of revealEquipment) {
    const revealVehicleId = coerceText(item.revealVehicleId || item.verizonVehicleId);
    const revealVehicle = revealVehiclesById.get(revealVehicleId) || {};
    const vehicleNumber = coerceText(item.revealVehicleNumber || item.vehicleNumber || revealVehicle.vehicleNumber);
    const equipmentName = equipmentDisplayName(item);

    if (!vehicleNumber) {
      skipped.push({
        equipmentId: item.id,
        name: equipmentName,
        revealVehicleId,
        reason: 'Missing Reveal Vehicle Number. Set a Vehicle Number in Verizon Reveal for live map polling.',
      });
      continue;
    }

    try {
      const payload = await fetchRevealVehicleLiveLocation(vehicleNumber, { token, env, fetchImpl });
      const locationItems = getApiItems(payload, ['VehicleLocation', 'vehicleLocation', 'VehicleLocations', 'vehicleLocations', 'Locations', 'locations', 'Items', 'items', 'Data', 'data']);
      const locationItem = locationItems[0] || payload;
      const eventRecord = buildRevealLiveLocationEventRecord({
        item: locationItem,
        equipment: item,
        vehicle: revealVehicle,
        vehicleNumber,
        nowIso,
        actorEmail,
      });

      if (typeof eventRecord?.data?.latitude !== 'number' || typeof eventRecord?.data?.longitude !== 'number') {
        skipped.push({
          equipmentId: item.id,
          name: equipmentName,
          revealVehicleId,
          vehicleNumber,
          reason: 'Reveal returned no latitude/longitude for this vehicle.',
        });
        continue;
      }

      writes.push({
        update: {
          name: firestoreDocumentName(projectId, databaseId, eventRecord.collection, eventRecord.id),
          fields: toFirestoreFields(eventRecord.data),
        },
      });

      const equipmentPatch = revealEquipmentPatchFromFleetEvent(eventRecord.data, nowIso);
      writes.push({
        update: {
          name: firestoreDocumentName(projectId, databaseId, 'equipment', item.id),
          fields: toFirestoreFields(equipmentPatch),
        },
        updateMask: {
          fieldPaths: Object.keys(equipmentPatch),
        },
      });

      synced.push({
        equipmentId: item.id,
        name: equipmentName,
        revealVehicleId,
        vehicleNumber,
        eventId: eventRecord.id,
        eventAt: eventRecord.data.eventAt,
      });
    } catch (error) {
      skipped.push({
        equipmentId: item.id,
        name: equipmentName,
        revealVehicleId,
        vehicleNumber,
        reason: error instanceof Error ? error.message : 'Reveal live location sync failed.',
      });
    }
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
    checked: revealEquipment.length,
    synced: synced.length,
    skipped,
    vehicles: synced,
    written: writes.length,
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

function bestRevealVehicleEquipmentMatch(vehicle, equipment = []) {
  const specs = [
    { field: 'revealVehicleId', confidence: 'Approved', vehicleValue: vehicle.providerVehicleId, equipmentFields: ['revealVehicleId', 'verizonVehicleId'] },
    { field: 'verizonVehicleId', confidence: 'Approved', vehicleValue: vehicle.providerVehicleId, equipmentFields: ['verizonVehicleId', 'revealVehicleId'] },
    { field: 'vehicleNumber', confidence: 'High', vehicleValue: vehicle.vehicleNumber, equipmentFields: ['revealVehicleNumber', 'vehicleNumber', 'assetId'] },
    { field: 'registrationNumber', confidence: 'High', vehicleValue: vehicle.registrationNumber, equipmentFields: ['registrationNumber', 'tag', 'licensePlate'] },
    { field: 'vin', confidence: 'High', vehicleValue: vehicle.vin, equipmentFields: ['vin'] },
    { field: 'name', confidence: 'Medium', vehicleValue: vehicle.name, equipmentFields: ['name', 'asset', 'title'] },
  ];

  for (const spec of specs) {
    const matchValue = cleanComparable(spec.vehicleValue);
    if (!matchValue) continue;
    for (const item of equipment) {
      const matchedField = spec.equipmentFields.find((field) => cleanComparable(item?.[field]) === matchValue);
      if (matchedField) {
        return {
          equipment: item,
          field: spec.field,
          equipmentField: matchedField,
          value: coerceText(spec.vehicleValue) || '',
          confidence: spec.confidence,
        };
      }
    }
  }

  return null;
}

function equipmentDisplayName(equipment) {
  return coerceText(equipment?.name)
    || coerceText(equipment?.title)
    || coerceText(equipment?.asset)
    || coerceText(equipment?.vehicleNumber)
    || coerceText(equipment?.assetId)
    || coerceText(equipment?.id)
    || 'JDT equipment';
}

async function fetchFirestoreCollection({ collectionId, env, fetchImpl, projectId, databaseId }) {
  const accessToken = await getGoogleAccessToken({ env, fetchImpl });
  const response = await firestoreRequest({
    method: 'GET',
    path: `documents/${encodeURIComponent(collectionId)}?pageSize=300`,
    accessToken,
    projectId,
    databaseId,
    fetchImpl,
  });

  return Array.isArray(response?.documents)
    ? response.documents.map((document) => ({
      id: firestoreDocumentId(document.name),
      ...fromFirestoreFields(document.fields || {}),
    }))
    : [];
}

function revealApiStatusItem(definition, env) {
  const configuredPath = configuredRevealApiPath(definition, env);
  return {
    id: definition.id,
    label: definition.label,
    configured: Boolean(configuredPath),
    targetCollection: definition.targetCollection,
    pathEnvNames: definition.envPathNames,
  };
}

function revealRecommendedApiDefinition(apiId) {
  const definition = recommendedRevealApis.find((api) => api.id === apiId);
  if (!definition) throw new Error(`Unsupported Reveal API: ${apiId}`);
  return definition;
}

function configuredRevealApiPath(definition, env) {
  return firstEnv(env, definition.envPathNames);
}

function buildDriverAssignmentRecord(item, nowIso, actorEmail) {
  const assignmentId = coerceText(firstValue(item, ['AssignmentId', 'assignmentId', 'Id', 'id']));
  const driverName = coerceText(firstValue(item, ['DriverName', 'driverName', 'Driver', 'driver']));
  const driverId = coerceText(firstValue(item, ['DriverId', 'driverId']));
  const vehicleName = coerceText(firstValue(item, ['VehicleName', 'vehicleName', 'Vehicle', 'vehicle', 'AssetName', 'assetName']));
  const vehicleId = coerceText(firstValue(item, ['VehicleId', 'vehicleId', 'AssetId', 'assetId']));
  const vehicleNumber = coerceText(firstValue(item, ['VehicleNumber', 'vehicleNumber', 'UnitNumber', 'unitNumber']));
  const assignedAt = normalizeOptionalIso(firstValue(item, ['StartDateTime', 'startDateTime', 'AssignedAt', 'assignedAt', 'DateTime', 'dateTime'])) || nowIso;
  const title = `${driverName || 'Reveal driver'} assigned to ${vehicleName || vehicleNumber || vehicleId || 'vehicle'}`;
  const id = `field-update-reveal-driver-assignment-${slugify(assignmentId || `${driverId}-${vehicleId || vehicleNumber}-${assignedAt}`)}`;

  return wrapFirestoreRecord('fieldUpdates', id, stripUndefined({
    id,
    title,
    name: title,
    relatedRecordType: 'equipment',
    relatedRecordId: vehicleId,
    relatedTitle: vehicleName || vehicleNumber,
    updateType: 'Driver Assignment',
    fieldStatus: 'Assigned',
    crewId: driverId,
    crewName: driverName,
    closeoutDate: assignedAt,
    userEmail: actorEmail,
    notes: `Reveal Driver Assignment API: ${driverName || '-'} assigned to ${vehicleName || vehicleNumber || vehicleId || '-'}.`,
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
    updatedBy: actorEmail,
    sourceSheetName: 'Reveal Driver Assignment API',
    sourceRowId: assignmentId,
    revealVehicleId: vehicleId,
    revealVehicleNumber: vehicleNumber,
  }));
}

function buildDriverStatusRecord(item, nowIso, actorEmail) {
  const statusId = coerceText(firstValue(item, ['StatusId', 'statusId', 'Id', 'id']));
  const driverName = coerceText(firstValue(item, ['DriverName', 'driverName', 'Driver', 'driver']));
  const driverId = coerceText(firstValue(item, ['DriverId', 'driverId']));
  const status = coerceText(firstValue(item, ['Status', 'status', 'DriverStatus', 'driverStatus'])) || 'Driver Status';
  const occurredAt = normalizeOptionalIso(firstValue(item, ['DateTime', 'dateTime', 'Timestamp', 'timestamp', 'StatusDateTime', 'statusDateTime'])) || nowIso;
  const title = `${driverName || 'Reveal driver'} ${status}`;
  const id = `field-update-reveal-driver-status-${slugify(statusId || `${driverId || driverName}-${status}-${occurredAt}`)}`;

  return wrapFirestoreRecord('fieldUpdates', id, stripUndefined({
    id,
    title,
    name: title,
    relatedRecordType: 'general',
    updateType: 'Driver Status',
    fieldStatus: status,
    crewId: driverId,
    crewName: driverName,
    closeoutDate: occurredAt,
    userEmail: actorEmail,
    notes: `Reveal Driver Status API: ${driverName || '-'} marked ${status}.`,
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
    updatedBy: actorEmail,
    sourceSheetName: 'Reveal Driver Status API',
    sourceRowId: statusId,
  }));
}

function buildFleetInspectionWorkOrderRecord(item, nowIso, actorEmail) {
  const inspectionId = coerceText(firstValue(item, ['InspectionId', 'inspectionId', 'Id', 'id']));
  const vehicleName = coerceText(firstValue(item, ['VehicleName', 'vehicleName', 'Name', 'name', 'AssetName', 'assetName']));
  const vehicleId = coerceText(firstValue(item, ['VehicleId', 'vehicleId', 'AssetId', 'assetId']));
  const vehicleNumber = coerceText(firstValue(item, ['VehicleNumber', 'vehicleNumber', 'UnitNumber', 'unitNumber']));
  const driverName = coerceText(firstValue(item, ['DriverName', 'driverName', 'Driver', 'driver']));
  const status = coerceText(firstValue(item, ['Status', 'status', 'InspectionStatus', 'inspectionStatus'])) || 'Needs Review';
  const safeToOperateValue = firstValue(item, ['SafeToOperate', 'safeToOperate', 'CanOperate', 'canOperate', 'Passed', 'passed']);
  const safeToOperate = safeToOperateValue === undefined ? undefined : truthy(safeToOperateValue);
  const notes = coerceText(firstValue(item, ['DefectNotes', 'defectNotes', 'Notes', 'notes', 'Description', 'description']));
  const category = coerceText(firstValue(item, ['DefectCategory', 'defectCategory', 'Category', 'category', 'Part', 'part']));
  const inspectedAt = normalizeOptionalIso(firstValue(item, ['InspectionDateTime', 'inspectionDateTime', 'InspectedAt', 'inspectedAt', 'DateTime', 'dateTime'])) || nowIso;
  const assetName = vehicleName || vehicleNumber || vehicleId || 'Reveal vehicle';
  const title = `${assetName} Reveal inspection issue`;
  const id = `work-order-reveal-inspection-${slugify(inspectionId || `${assetName}-${inspectedAt}`)}`;

  return wrapFirestoreRecord('workOrders', id, stripUndefined({
    id,
    title,
    name: title,
    workOrderType: 'equipment',
    division: 'Maintenance / Equipment',
    taskType: 'Reveal Fleet Inspection / DVIR',
    status: 'Ready',
    priority: safeToOperate === false ? 'Critical' : /fail|defect|repair|unsafe|critical/i.test(`${status} ${notes}`) ? 'High' : 'Normal',
    equipmentIds: vehicleId ? [vehicleId] : [],
    equipmentNames: [assetName],
    crewLeadName: driverName,
    scheduledDate: inspectedAt,
    sourceSheetName: 'Reveal Fleet Inspection API',
    sourceRowId: inspectionId,
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
    updatedBy: actorEmail,
    notes: [
      `Reveal inspection ID: ${inspectionId || '-'}`,
      `Vehicle: ${assetName}`,
      `Driver: ${driverName || '-'}`,
      `Inspected at: ${inspectedAt}`,
      `Safe to operate: ${safeToOperate === undefined ? 'Unknown' : safeToOperate ? 'Yes' : 'No'}`,
      `Category: ${category || '-'}`,
      notes,
    ].filter(Boolean).join('\n'),
  }));
}

function buildGeofenceLocationRecord(item, nowIso, actorEmail) {
  const geofenceId = coerceText(firstValue(item, ['GeofenceId', 'geofenceId', 'Id', 'id']));
  const name = coerceText(firstValue(item, ['Name', 'name', 'GeofenceName', 'geofenceName'])) || 'Reveal geofence';
  const address = coerceText(firstValue(item, ['Address', 'address', 'FormattedAddress', 'formattedAddress', 'Description', 'description']));
  const latitude = coerceNumber(firstValue(item, ['Latitude', 'latitude', 'Lat', 'lat']));
  const longitude = coerceNumber(firstValue(item, ['Longitude', 'longitude', 'Lng', 'lng', 'Lon', 'lon']));
  const id = `location-reveal-geofence-${slugify(geofenceId || name)}`;

  return wrapFirestoreRecord('locations', id, stripUndefined({
    id,
    name,
    title: name,
    locationId: geofenceId,
    locationType: 'Geofence',
    accessType: 'Reveal Geofence',
    mainAddress: address,
    sourceText: 'Reveal Geofence API',
    latitude,
    longitude,
    coordinateText: latitude !== undefined && longitude !== undefined ? `${latitude}, ${longitude}` : undefined,
    divisionUse: ['Freight', 'Equipment', 'Relocation & Installation'],
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
    updatedBy: actorEmail,
  }));
}

function buildNonPoweredAssetEquipmentRecord(item, nowIso, actorEmail) {
  const assetId = coerceText(firstValue(item, ['AssetId', 'assetId', 'Id', 'id']));
  const name = coerceText(firstValue(item, ['Name', 'name', 'AssetName', 'assetName', 'Description', 'description'])) || 'Reveal asset';
  const assetType = coerceText(firstValue(item, ['AssetType', 'assetType', 'Type', 'type']));
  const status = coerceText(firstValue(item, ['Status', 'status'])) || 'Available';
  const locationName = coerceText(firstValue(item, ['LastLocation', 'lastLocation', 'Location', 'location', 'Address', 'address']));
  const id = `equipment-reveal-asset-${slugify(assetId || name)}`;

  return wrapFirestoreRecord('equipment', id, stripUndefined({
    id,
    name,
    title: name,
    asset: name,
    assetId,
    category: categoryForRevealAsset(assetType || name),
    type: assetType,
    eqType: assetType,
    status,
    currentLocationName: locationName || jdtHomeBase.name,
    currentLocation: locationName || jdtHomeBase.address,
    currentLocationType: locationName ? 'GPS' : jdtHomeBase.locationType,
    telematicsProvider: 'Reveal',
    revealAssetId: assetId,
    verizonAssetId: assetId,
    revealSyncedAt: nowIso,
    revealSyncedBy: actorEmail,
  }));
}

function buildNonPoweredAssetLocationEventRecord(item, nowIso, actorEmail) {
  const assetId = coerceText(firstValue(item, ['AssetId', 'assetId', 'Id', 'id']));
  const assetName = coerceText(firstValue(item, ['AssetName', 'assetName', 'Name', 'name']));
  return buildFleetEventRecord({
    idPrefix: 'reveal-asset-location',
    providerVehicleId: assetId,
    vehicleName: assetName,
    vehicleNumber: coerceText(firstValue(item, ['AssetNumber', 'assetNumber', 'UnitNumber', 'unitNumber'])),
    latitude: coerceNumber(firstValue(item, ['Latitude', 'latitude', 'Lat', 'lat'])),
    longitude: coerceNumber(firstValue(item, ['Longitude', 'longitude', 'Lng', 'lng', 'Lon', 'lon'])),
    address: coerceText(firstValue(item, ['Address', 'address', 'Location', 'location'])),
    eventAt: normalizeOptionalIso(firstValue(item, ['DateTime', 'dateTime', 'Timestamp', 'timestamp', 'GPSDateTime', 'gpsDateTime'])) || nowIso,
    receivedAt: nowIso,
    status: 'Non-powered asset location',
    actorEmail,
  });
}

function buildVehicleGpsHistoryEventRecord(item, nowIso, actorEmail) {
  return buildFleetEventRecord({
    idPrefix: 'reveal-gps-history',
    providerVehicleId: coerceText(firstValue(item, ['VehicleId', 'vehicleId', 'VehicleID', 'vehicleID'])),
    vehicleName: coerceText(firstValue(item, ['VehicleName', 'vehicleName', 'Name', 'name'])),
    vehicleNumber: coerceText(firstValue(item, ['VehicleNumber', 'vehicleNumber', 'UnitNumber', 'unitNumber'])),
    registrationNumber: coerceText(firstValue(item, ['RegistrationNumber', 'registrationNumber', 'LicensePlate', 'licensePlate'])),
    vin: coerceText(firstValue(item, ['VIN', 'Vin', 'vin'])),
    latitude: coerceNumber(firstValue(item, ['Latitude', 'latitude', 'Lat', 'lat'])),
    longitude: coerceNumber(firstValue(item, ['Longitude', 'longitude', 'Lng', 'lng', 'Lon', 'lon'])),
    address: coerceText(firstValue(item, ['Address', 'address', 'Location', 'location'])),
    eventAt: normalizeOptionalIso(firstValue(item, ['EventDateTime', 'eventDateTime', 'GPSDateTime', 'gpsDateTime', 'DateTime', 'dateTime'])) || nowIso,
    receivedAt: nowIso,
    speedMph: coerceNumber(firstValue(item, ['Speed', 'speed', 'SpeedMph', 'speedMph'])),
    heading: coerceNumber(firstValue(item, ['Heading', 'heading', 'Direction', 'direction'])),
    status: coerceText(firstValue(item, ['Status', 'status'])) || 'GPS history',
    driverName: coerceText(firstValue(item, ['DriverName', 'driverName'])),
    actorEmail,
  });
}

function buildRevealLiveLocationEventRecord({ item, equipment, vehicle, vehicleNumber, nowIso, actorEmail }) {
  return buildFleetEventRecord({
    idPrefix: 'reveal-live-location',
    providerVehicleId: coerceText(equipment.revealVehicleId || equipment.verizonVehicleId || vehicle.providerVehicleId || firstValue(item, ['VehicleId', 'vehicleId', 'VehicleID', 'vehicleID'])),
    vehicleName: coerceText(equipment.name || vehicle.name || firstValue(item, ['VehicleName', 'vehicleName', 'Name', 'name'])),
    vehicleNumber: coerceText(vehicleNumber || equipment.vehicleNumber || equipment.revealVehicleNumber || vehicle.vehicleNumber || firstValue(item, ['VehicleNumber', 'vehicleNumber', 'UnitNumber', 'unitNumber'])),
    registrationNumber: coerceText(equipment.registrationNumber || vehicle.registrationNumber || firstValue(item, ['RegistrationNumber', 'registrationNumber', 'LicensePlate', 'licensePlate'])),
    vin: coerceText(equipment.vin || vehicle.vin || firstValue(item, ['VIN', 'Vin', 'vin'])),
    latitude: coerceNumber(firstValue(item, ['Latitude', 'latitude', 'Lat', 'lat'])),
    longitude: coerceNumber(firstValue(item, ['Longitude', 'longitude', 'Lng', 'lng', 'Lon', 'lon'])),
    address: coerceText(firstValue(item, ['Address', 'address', 'Location', 'location', 'FormattedAddress', 'formattedAddress'])),
    eventAt: normalizeOptionalIso(firstValue(item, ['EventDateTime', 'eventDateTime', 'GPSDateTime', 'gpsDateTime', 'DateTime', 'dateTime', 'Timestamp', 'timestamp'])) || nowIso,
    receivedAt: nowIso,
    speedMph: coerceNumber(firstValue(item, ['Speed', 'speed', 'SpeedMph', 'speedMph', 'MilesPerHour', 'mph'])),
    heading: coerceNumber(firstValue(item, ['Heading', 'heading', 'Direction', 'direction', 'Bearing', 'bearing'])),
    status: coerceText(firstValue(item, ['Status', 'status', 'IgnitionStatus', 'ignitionStatus', 'VehicleStatus', 'vehicleStatus'])) || 'Live location',
    driverName: coerceText(firstValue(item, ['DriverName', 'driverName', 'Driver', 'driver'])),
    actorEmail,
  });
}

function buildVehicleSegmentEventRecord(item, nowIso, actorEmail) {
  const segmentId = coerceText(firstValue(item, ['SegmentId', 'segmentId', 'Id', 'id']));
  const startAt = normalizeOptionalIso(firstValue(item, ['StartDateTime', 'startDateTime', 'StartTime', 'startTime'])) || nowIso;
  const endAt = normalizeOptionalIso(firstValue(item, ['EndDateTime', 'endDateTime', 'EndTime', 'endTime']));
  const providerVehicleId = coerceText(firstValue(item, ['VehicleId', 'vehicleId', 'VehicleID', 'vehicleID']));
  const vehicleName = coerceText(firstValue(item, ['VehicleName', 'vehicleName', 'Name', 'name']));
  const vehicleNumber = coerceText(firstValue(item, ['VehicleNumber', 'vehicleNumber', 'UnitNumber', 'unitNumber']));
  const id = `reveal-vehicle-segment-${slugify(segmentId || `${providerVehicleId || vehicleNumber || vehicleName}-${startAt}`)}`;

  return wrapFirestoreRecord('fleetTelematicsEvents', id, stripUndefined({
    id,
    eventId: id,
    provider: 'Reveal',
    providerVehicleId,
    vehicleName,
    vehicleNumber,
    eventAt: startAt,
    receivedAt: nowIso,
    status: 'Vehicle segment',
    segmentStartAt: startAt,
    segmentEndAt: endAt,
    ignitionStartAt: startAt,
    ignitionStopAt: endAt,
    address: coerceText(firstValue(item, ['Address', 'address', 'Location', 'location'])),
    odometerMiles: coerceNumber(firstValue(item, ['Odometer', 'odometer', 'OdometerMiles', 'odometerMiles'])),
    createdBy: actorEmail,
    updatedBy: actorEmail,
  }));
}

function buildFleetEventRecord(event) {
  const id = `${event.idPrefix}-${slugify(`${event.providerVehicleId || event.vehicleNumber || event.vehicleName}-${event.eventAt}`)}`;
  const latitude = event.latitude;
  const longitude = event.longitude;
  return wrapFirestoreRecord('fleetTelematicsEvents', id, stripUndefined({
    id,
    eventId: id,
    provider: 'Reveal',
    providerVehicleId: event.providerVehicleId,
    vehicleNumber: event.vehicleNumber,
    vehicleName: event.vehicleName,
    registrationNumber: event.registrationNumber,
    vin: event.vin,
    latitude,
    longitude,
    coordinateText: latitude !== undefined && longitude !== undefined ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : undefined,
    address: event.address,
    eventAt: event.eventAt,
    receivedAt: event.receivedAt,
    speedMph: event.speedMph,
    heading: event.heading,
    status: event.status,
    driverName: event.driverName,
    createdBy: event.actorEmail,
    updatedBy: event.actorEmail,
  }));
}

function revealEquipmentPatchFromFleetEvent(event, nowIso) {
  const locationText = event.address || event.coordinateText;
  const moving = typeof event.speedMph === 'number' && event.speedMph > 2;

  return stripUndefined({
    telematicsProvider: 'Reveal',
    revealVehicleId: event.providerVehicleId,
    verizonVehicleId: event.providerVehicleId,
    revealVehicleNumber: event.vehicleNumber,
    vehicleNumber: event.vehicleNumber,
    currentLocationType: locationText ? (moving ? 'In Transit' : 'GPS') : undefined,
    currentLocationName: locationText,
    currentLocation: locationText,
    lastTelematicsAt: event.eventAt || event.receivedAt || nowIso,
    revealLastReceivedAt: event.receivedAt || nowIso,
    lastTelematicsLatitude: event.latitude,
    lastTelematicsLongitude: event.longitude,
    lastTelematicsAddress: event.address,
    lastTelematicsSpeedMph: event.speedMph,
    lastTelematicsHeading: event.heading,
    lastTelematicsStatus: event.status,
    lastTelematicsDriverName: event.driverName,
    updatedBy: event.updatedBy || event.createdBy,
  });
}

function wrapFirestoreRecord(collection, id, data) {
  return { collection, id, data };
}

function getApiItems(payload, aliases) {
  if (Array.isArray(payload)) return payload.filter((item) => item && typeof item === 'object');
  if (!payload || typeof payload !== 'object') return [];

  for (const alias of aliases || []) {
    const value = payload[alias];
    if (Array.isArray(value)) return value.filter((item) => item && typeof item === 'object');
    const matchingKey = Object.keys(payload).find((candidate) => candidate.toLowerCase() === String(alias).toLowerCase());
    if (matchingKey && Array.isArray(payload[matchingKey])) return payload[matchingKey].filter((item) => item && typeof item === 'object');
  }

  return [payload];
}

function categoryForRevealAsset(value) {
  const text = String(value || '').toLowerCase();
  if (/trailer|lowboy|drop\s*deck|tag\s*along|gooseneck/.test(text)) return 'Trailer';
  if (/implement|attachment|bucket|fork|grapple|blade/.test(text)) return 'Implement';
  if (/tool|saw|pump|generator/.test(text)) return 'Tool';
  return 'Support';
}

function isRevealLinkedEquipment(item) {
  const provider = String(coerceText(item?.telematicsProvider) || '').toLowerCase();
  return Boolean(
    item
    && (provider === 'reveal'
      || coerceText(item.revealVehicleId)
      || coerceText(item.verizonVehicleId)
      || coerceText(item.revealVehicleNumber)
      || coerceText(item.vehicleNumber))
  );
}

function normalizeOptionalIso(value) {
  if (!hasValue(value)) return undefined;
  const date = typeof value === 'number'
    ? new Date(value > 100000000000 ? value : value * 1000)
    : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function truthy(value) {
  if (typeof value === 'boolean') return value;
  return ['true', 'yes', '1', 'passed', 'pass', 'safe'].includes(String(value || '').trim().toLowerCase());
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

function getRevealVehicleLiveLocationPathTemplate(env) {
  return firstEnv(env, ['REVEAL_VEHICLE_LIVE_LOCATION_PATH_TEMPLATE', 'VERIZON_REVEAL_VEHICLE_LIVE_LOCATION_PATH_TEMPLATE']) || defaultVehicleLiveLocationPathTemplate;
}

function buildRevealVehicleLiveLocationPath(vehicleNumber, env) {
  const encodedVehicleNumber = encodeURIComponent(String(vehicleNumber || '').trim());
  return getRevealVehicleLiveLocationPathTemplate(env)
    .replace(/\{vehicleNumber\}/g, encodedVehicleNumber)
    .replace(/\{vehicleNo\}/g, encodedVehicleNumber);
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

function fromFirestoreFields(fields) {
  return Object.fromEntries(
    Object.entries(fields || {}).map(([key, value]) => [key, fromFirestoreValue(value)]),
  );
}

function fromFirestoreValue(value) {
  if (!value || typeof value !== 'object') return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in value) return fromFirestoreFields(value.mapValue.fields || {});
  return undefined;
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

function cleanComparable(value) {
  return String(coerceText(value) || '').trim().toLowerCase();
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
