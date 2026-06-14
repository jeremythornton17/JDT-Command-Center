import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildRevealApiAuthorizationHeader,
  buildRevealEquipmentRecordForVehicle,
  buildRevealMatchApprovalWrites,
  buildRevealRecommendedApiFirestoreRecords,
  buildRevealRecommendedApiStatus,
  buildRevealVehicleMatchCandidates,
  fetchRevealApiToken,
  fetchRevealConfiguredApiResource,
  fetchRevealVehicleLiveLocation,
  fetchRevealVehicles,
  handleRevealLiveLocationsSyncRequest,
  handleRevealVehicleMatchApprovalRequest,
  handleRevealVehicleMatchPreviewRequest,
  handleRevealRecommendedApisSyncRequest,
  handleRevealVehiclesSyncRequest,
  normalizeRevealVehicleRecords,
  revealApiCredentialsConfigured,
  syncRecommendedRevealApisToFirestore,
  syncRevealLiveLocationsToFirestore,
  syncRevealVehiclesToFirestore,
} from './revealApi.js';

describe('Reveal API helpers', () => {
  it('requires integration username, password, and app id before API calls are enabled', () => {
    assert.equal(revealApiCredentialsConfigured({}), false);
    assert.equal(revealApiCredentialsConfigured({
      REVEAL_API_USERNAME: 'REST_JDT@example.com',
      REVEAL_API_PASSWORD: 'secret',
    }), false);
    assert.equal(revealApiCredentialsConfigured({
      REVEAL_API_USERNAME: 'REST_JDT@example.com',
      REVEAL_API_PASSWORD: 'secret',
      REVEAL_API_APP_ID: 'fleetmatics-p-us-app',
    }), true);
  });

  it('retrieves an API token with Basic auth and never returns the encoded credentials', async () => {
    const calls = [];
    const token = await fetchRevealApiToken({
      env: {
        REVEAL_API_USERNAME: 'REST_JDT@example.com',
        REVEAL_API_PASSWORD: 'top-secret',
      },
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return {
          ok: true,
          status: 200,
          text: async () => 'TOKEN_VALUE',
        };
      },
    });

    assert.equal(token, 'TOKEN_VALUE');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://fim.api.us.fleetmatics.com/token');
    assert.equal(calls[0].options.method, 'GET');
    assert.equal(calls[0].options.headers.Accept, 'text/plain');
    assert.equal(
      calls[0].options.headers.Authorization,
      `Basic ${Buffer.from('REST_JDT@example.com:top-secret').toString('base64')}`,
    );
    assert.doesNotMatch(token, /REST_JDT|top-secret/i);
  });

  it('builds the Vehicle API authorization header from app id and token', () => {
    assert.equal(
      buildRevealApiAuthorizationHeader('fleetmatics-p-us-app', 'TOKEN_VALUE'),
      'Atmosphere atmosphere_app_id=fleetmatics-p-us-app, Bearer TOKEN_VALUE',
    );
  });

  it('fetches the Reveal vehicle list with the Vehicle API header', async () => {
    const calls = [];
    const vehicles = await fetchRevealVehicles({
      env: {
        REVEAL_API_USERNAME: 'REST_JDT@example.com',
        REVEAL_API_PASSWORD: 'top-secret',
        REVEAL_API_APP_ID: 'fleetmatics-p-us-app',
      },
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        if (String(url).endsWith('/token')) {
          return {
            ok: true,
            status: 200,
            text: async () => 'TOKEN_VALUE',
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ([{
            Name: 'Semi #1',
            VehicleNumber: 'S1',
            RegistrationNumber: 'ABC123',
            VIN: '1HTMMAAL0XH000001',
            Make: 'Peterbilt',
            Model: '389',
            Year: 2018,
          }]),
        };
      },
    });

    assert.equal(calls.length, 2);
    assert.equal(calls[1].url, 'https://fim.api.us.fleetmatics.com/cmd/v1/vehicles');
    assert.equal(
      calls[1].options.headers.Authorization,
      'Atmosphere atmosphere_app_id=fleetmatics-p-us-app, Bearer TOKEN_VALUE',
    );
    assert.deepEqual(vehicles, [{
      name: 'Semi #1',
      vehicleNumber: 'S1',
      registrationNumber: 'ABC123',
      vin: '1HTMMAAL0XH000001',
      make: 'Peterbilt',
      model: '389',
      year: 2018,
      raw: {
        Name: 'Semi #1',
        VehicleNumber: 'S1',
        RegistrationNumber: 'ABC123',
        VIN: '1HTMMAAL0XH000001',
        Make: 'Peterbilt',
        Model: '389',
        Year: 2018,
      },
    }]);
  });

  it('normalizes common Vehicle API response wrappers', () => {
    assert.deepEqual(normalizeRevealVehicleRecords({
      Vehicles: [{
        Name: 'Chevy Colorado',
        VehicleNumber: 'MAX',
        RegistrationNumber: 'TAG-1',
      }],
    }), [{
      name: 'Chevy Colorado',
      vehicleNumber: 'MAX',
      registrationNumber: 'TAG-1',
      raw: {
        Name: 'Chevy Colorado',
        VehicleNumber: 'MAX',
        RegistrationNumber: 'TAG-1',
      },
    }]);
  });

  it('builds app equipment records from Reveal vehicles without marking credentials anywhere', () => {
    const record = buildRevealEquipmentRecordForVehicle({
      providerVehicleId: 'veh-123',
      name: 'Semi #1',
      vehicleNumber: 'S1',
      registrationNumber: 'ABC123',
      vin: '1HTMMAAL0XH000001',
      make: 'Peterbilt',
      model: '389',
      year: 2018,
    }, {
      documentId: 'equipment-reveal-veh-123',
      nowIso: '2026-06-12T23:45:00.000Z',
      createNew: true,
    });

    assert.equal(record.id, 'equipment-reveal-veh-123');
    assert.equal(record.name, 'Semi #1');
    assert.equal(record.category, 'Truck');
    assert.equal(record.telematicsProvider, 'Reveal');
    assert.equal(record.revealVehicleId, 'veh-123');
    assert.equal(record.verizonVehicleId, 'veh-123');
    assert.equal(record.revealVehicleNumber, 'S1');
    assert.equal(record.vehicleNumber, 'S1');
    assert.equal(record.revealTableId, 'Unit-1.0');
    assert.equal(record.revealAssetType, 'Unit');
    assert.equal(record.revealUnitId, 'veh-123');
    assert.equal(record.revealUnitTag, 'S1');
    assert.equal(record.revealTrackingStatus, 'Synced');
    assert.equal(record.registrationNumber, 'ABC123');
    assert.equal(record.vin, '1HTMMAAL0XH000001');
    assert.equal(record.currentLocationName, 'JD Thornton Nurseries Home Base');
    assert.equal(record.currentLocation, '1010 E Sugarland Hwy, Clewiston, FL 33440');
    assert.equal(record.revealSyncedAt, '2026-06-12T23:45:00.000Z');
    assert.doesNotMatch(JSON.stringify(record), /top-secret|REST_JDT|TOKEN_VALUE/i);
  });

  it('syncs Reveal vehicles into Firestore equipment and updates existing matches by mask', async () => {
    const calls = [];
    const result = await syncRevealVehiclesToFirestore({
      projectId: 'jdt-command-board',
      databaseId: 'database-1',
      now: new Date('2026-06-12T23:45:00Z'),
      env: {
        REVEAL_API_USERNAME: 'REST_JDT@example.com',
        REVEAL_API_PASSWORD: 'top-secret',
        REVEAL_API_APP_ID: 'fleetmatics-p-us-app',
        GOOGLE_OAUTH_ACCESS_TOKEN: 'GOOGLE_TOKEN',
      },
      fetchImpl: async (url, options = {}) => {
        calls.push({ url: String(url), options });
        if (String(url).endsWith('/token')) return responseText('TOKEN_VALUE');
        if (String(url).endsWith('/cmd/v1/vehicles')) {
          return responseJson([{
            VehicleId: 'veh-123',
            Name: 'Semi #1',
            VehicleNumber: 'S1',
            RegistrationNumber: 'ABC123',
            VIN: '1HTMMAAL0XH000001',
            Make: 'Peterbilt',
          }, {
            VehicleId: 'veh-999',
            Name: 'Chevy Colorado',
            VehicleNumber: 'MAX',
          }]);
        }
        if (String(url).endsWith('/documents:runQuery')) {
          const body = JSON.parse(options.body);
          const value = body.structuredQuery.where.fieldFilter.value.stringValue;
          if (value === 'veh-123') {
            return responseJson([{
              document: {
                name: 'projects/jdt-command-board/databases/database-1/documents/equipment/equipment-semi-1',
              },
            }]);
          }
          return responseJson([]);
        }
        if (String(url).endsWith('/documents:commit')) return responseJson({ commitTime: '2026-06-12T23:45:01Z' });
        throw new Error(`Unexpected URL ${url}`);
      },
    });

    assert.equal(result.fetched, 2);
    assert.equal(result.updated, 1);
    assert.equal(result.created, 1);
    assert.deepEqual(result.vehicles.map((vehicle) => [vehicle.name, vehicle.action]), [
      ['Semi #1', 'updated'],
      ['Chevy Colorado', 'created'],
    ]);

    const commitCall = calls.find((call) => call.url.endsWith('/documents:commit'));
    assert.ok(commitCall);
    const commit = JSON.parse(commitCall.options.body);
    assert.equal(commit.writes.length, 2);
    assert.equal(commit.writes[0].update.name.endsWith('/documents/equipment/equipment-semi-1'), true);
    assert.deepEqual(commit.writes[0].updateMask.fieldPaths.sort(), [
      'make',
      'registrationNumber',
      'revealAssetType',
      'revealSyncedAt',
      'revealTableId',
      'revealTrackingStatus',
      'revealUnitId',
      'revealUnitTag',
      'revealVehicleId',
      'revealVehicleNumber',
      'telematicsProvider',
      'vehicleNumber',
      'verizonVehicleId',
      'vin',
    ].sort());
    assert.equal(commit.writes[1].update.name.endsWith('/documents/equipment/equipment-reveal-veh-999'), true);
    assert.equal(commit.writes[1].update.fields.category.stringValue, 'Truck');
    assert.equal(commit.writes[1].update.fields.currentLocationName.stringValue, 'JD Thornton Nurseries Home Base');
  });

  it('builds a safe match review between Reveal vehicles and JDT equipment records', () => {
    const candidates = buildRevealVehicleMatchCandidates([
      {
        providerVehicleId: 'veh-123',
        name: 'Semi #1',
        vehicleNumber: 'S1',
        registrationNumber: 'ABC123',
        vin: '1HTMMAAL0XH000001',
      },
      {
        providerVehicleId: 'veh-456',
        name: 'Chevy Colorado',
        vehicleNumber: 'MAX',
      },
      {
        providerVehicleId: 'veh-789',
        name: 'Mystery Pickup',
        vehicleNumber: 'MPU',
      },
    ], [
      {
        id: 'equipment-semi-1',
        name: 'Semi #1',
        revealVehicleId: 'veh-123',
        vehicleNumber: 'S1',
      },
      {
        id: 'equipment-chevy-colorado',
        name: 'Chevy Colorado',
        asset: 'Chevy Colorado',
        vehicleNumber: 'MAX',
      },
    ]);

    assert.deepEqual(candidates.map((candidate) => [
      candidate.revealVehicleName,
      candidate.jdtEquipmentId,
      candidate.confidence,
      candidate.status,
      candidate.matchField,
    ]), [
      ['Semi #1', 'equipment-semi-1', 'Approved', 'matched', 'revealVehicleId'],
      ['Chevy Colorado', 'equipment-chevy-colorado', 'High', 'needsReview', 'vehicleNumber'],
      ['Mystery Pickup', '', 'New', 'newVehicle', ''],
    ]);
    assert.match(candidates[1].recommendedAction, /Review and approve/i);
    assert.match(candidates[2].recommendedAction, /Create or link/i);
    assert.doesNotMatch(JSON.stringify(candidates), /top-secret|TOKEN_VALUE|REST_JDT/i);
  });

  it('matches future Reveal tracker identities to existing JDT assets before creating duplicates', () => {
    const candidates = buildRevealVehicleMatchCandidates([
      {
        providerVehicleId: 'unit-komatsu-500-1',
        name: 'Komatsu 500 - 1',
        vehicleNumber: 'K500-1',
      },
      {
        providerVehicleId: 'asset-black-lowboy',
        name: 'Black Lowboy',
        vehicleNumber: 'LOWBOY-1',
      },
    ], [
      {
        id: 'equipment-komatsu-500-1',
        name: 'Komatsu 500 - 1',
        category: 'Machine',
        revealUnitId: 'unit-komatsu-500-1',
        revealTrackingStatus: 'Tracker Installed',
      },
      {
        id: 'equipment-black-lowboy',
        name: 'Black Lowboy',
        category: 'Trailer',
        revealAssetId: 'asset-black-lowboy',
        revealTrackingStatus: 'Requested',
      },
    ]);

    assert.deepEqual(candidates.map((candidate) => [
      candidate.revealVehicleName,
      candidate.jdtEquipmentId,
      candidate.confidence,
      candidate.status,
      candidate.matchField,
    ]), [
      ['Komatsu 500 - 1', 'equipment-komatsu-500-1', 'Approved', 'matched', 'revealUnitId'],
      ['Black Lowboy', 'equipment-black-lowboy', 'Approved', 'matched', 'revealAssetId'],
    ]);
  });

  it('previews Reveal vehicle matches for owner admins without writing Firestore data', async () => {
    const calls = [];
    const result = await handleRevealVehicleMatchPreviewRequest({
      headers: { authorization: 'Bearer OWNER_TOKEN' },
      firebaseApiKey: 'firebase-api-key',
      projectId: 'jdt-command-board',
      databaseId: 'database-1',
      env: {
        REVEAL_API_USERNAME: 'REST_JDT@example.com',
        REVEAL_API_PASSWORD: 'top-secret',
        REVEAL_API_APP_ID: 'fleetmatics-p-us-app',
        GOOGLE_OAUTH_ACCESS_TOKEN: 'GOOGLE_TOKEN',
      },
      fetchImpl: async (url, options = {}) => {
        calls.push({ url: String(url), options });
        if (String(url).includes('identitytoolkit.googleapis.com')) {
          return responseJson({ users: [{ email: 'jeremy@jdtnurseries.com' }] });
        }
        if (String(url).endsWith('/token')) return responseText('TOKEN_VALUE');
        if (String(url).endsWith('/cmd/v1/vehicles')) {
          return responseJson([{ VehicleId: 'veh-123', Name: 'Semi #1', VehicleNumber: 'S1' }]);
        }
        if (String(url).includes('/documents/equipment')) {
          return responseJson({
            documents: [{
              name: 'projects/jdt-command-board/databases/database-1/documents/equipment/equipment-semi-1',
              fields: {
                id: { stringValue: 'equipment-semi-1' },
                name: { stringValue: 'Semi #1' },
                vehicleNumber: { stringValue: 'S1' },
              },
            }],
          });
        }
        throw new Error(`Unexpected URL ${url}`);
      },
    });

    assert.equal(result.statusCode, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.fetchedRevealVehicles, 1);
    assert.equal(result.body.reviewCandidates.length, 1);
    assert.deepEqual(result.body.summary, {
      matched: 0,
      needsReview: 1,
      newVehicle: 0,
    });
    assert.equal(calls.some((call) => call.url.endsWith('/documents:commit')), false);
  });

  it('builds locked Reveal identity writes for approved vehicle matches', () => {
    const result = buildRevealMatchApprovalWrites({
      approvals: [{ revealVehicleId: 'veh-456', jdtEquipmentId: 'equipment-chevy-colorado' }],
      vehicles: [{
        providerVehicleId: 'veh-456',
        name: 'Chevy Colorado',
        vehicleNumber: 'MAX',
        registrationNumber: 'TAG-1',
        vin: 'VIN456',
        make: 'Chevrolet',
        model: 'Colorado',
        year: 2024,
      }],
      projectId: 'jdt-command-board',
      databaseId: 'database-1',
      nowIso: '2026-06-13T15:00:00.000Z',
      actorEmail: 'jeremy@jdtnurseries.com',
    });

    assert.equal(result.approved.length, 1);
    assert.deepEqual(result.skipped, []);
    assert.equal(result.writes.length, 1);
    assert.equal(result.writes[0].update.name.endsWith('/documents/equipment/equipment-chevy-colorado'), true);
    assert.equal(result.writes[0].update.fields.revealVehicleId.stringValue, 'veh-456');
    assert.equal(result.writes[0].update.fields.verizonVehicleId.stringValue, 'veh-456');
    assert.equal(result.writes[0].update.fields.revealVehicleNumber.stringValue, 'MAX');
    assert.equal(result.writes[0].update.fields.revealMatchStatus.stringValue, 'approved');
    assert.equal(result.writes[0].update.fields.revealMatchApprovedBy.stringValue, 'jeremy@jdtnurseries.com');
    assert.deepEqual(result.writes[0].updateMask.fieldPaths.sort(), [
      'make',
      'model',
      'registrationNumber',
      'revealAssetType',
      'revealMatchApprovedAt',
      'revealMatchApprovedBy',
      'revealMatchStatus',
      'revealSyncedAt',
      'revealTableId',
      'revealTrackingStatus',
      'revealUnitId',
      'revealUnitTag',
      'revealVehicleId',
      'revealVehicleNumber',
      'telematicsProvider',
      'vehicleNumber',
      'verizonVehicleId',
      'vin',
      'year',
    ].sort());
  });

  it('approves selected Reveal matches for owner admins and commits locked identity fields', async () => {
    const calls = [];
    const result = await handleRevealVehicleMatchApprovalRequest({
      headers: { authorization: 'Bearer OWNER_TOKEN' },
      firebaseApiKey: 'firebase-api-key',
      projectId: 'jdt-command-board',
      databaseId: 'database-1',
      now: new Date('2026-06-13T15:00:00Z'),
      body: {
        approvals: [
          { revealVehicleId: 'veh-456', jdtEquipmentId: 'equipment-chevy-colorado' },
          { revealVehicleId: 'missing-reveal-id', jdtEquipmentId: 'equipment-missing' },
        ],
      },
      env: {
        REVEAL_API_USERNAME: 'REST_JDT@example.com',
        REVEAL_API_PASSWORD: 'top-secret',
        REVEAL_API_APP_ID: 'fleetmatics-p-us-app',
        GOOGLE_OAUTH_ACCESS_TOKEN: 'GOOGLE_TOKEN',
      },
      fetchImpl: async (url, options = {}) => {
        calls.push({ url: String(url), options });
        if (String(url).includes('identitytoolkit.googleapis.com')) {
          return responseJson({ users: [{ email: 'jeremy@jdtnurseries.com' }] });
        }
        if (String(url).endsWith('/token')) return responseText('TOKEN_VALUE');
        if (String(url).endsWith('/cmd/v1/vehicles')) {
          return responseJson([{ VehicleId: 'veh-456', Name: 'Chevy Colorado', VehicleNumber: 'MAX' }]);
        }
        if (String(url).endsWith('/documents:commit')) return responseJson({ commitTime: '2026-06-13T15:00:01Z' });
        throw new Error(`Unexpected URL ${url}`);
      },
    });

    assert.equal(result.statusCode, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.approved.length, 1);
    assert.equal(result.body.skipped.length, 1);
    assert.equal(result.body.approved[0].jdtEquipmentId, 'equipment-chevy-colorado');
    assert.equal(result.body.skipped[0].reason, 'Reveal vehicle was not returned by the Vehicle API.');

    const commitCall = calls.find((call) => call.url.endsWith('/documents:commit'));
    assert.ok(commitCall);
    const commit = JSON.parse(commitCall.options.body);
    assert.equal(commit.writes.length, 1);
    assert.equal(commit.writes[0].update.fields.revealMatchStatus.stringValue, 'approved');
  });

  it('requires an owner admin Firebase user before running the live sync', async () => {
    const nonAdmin = await handleRevealVehiclesSyncRequest({
      headers: { authorization: 'Bearer FIELD_TOKEN' },
      firebaseApiKey: 'firebase-api-key',
      projectId: 'jdt-command-board',
      databaseId: 'database-1',
      env: {
        REVEAL_API_USERNAME: 'REST_JDT@example.com',
        REVEAL_API_PASSWORD: 'top-secret',
        REVEAL_API_APP_ID: 'fleetmatics-p-us-app',
      },
      fetchImpl: async (url) => {
        assert.match(String(url), /identitytoolkit\.googleapis\.com/);
        return responseJson({ users: [{ email: 'fieldlead@jdtnurseries.com' }] });
      },
    });

    assert.equal(nonAdmin.statusCode, 403);
    assert.equal(nonAdmin.body.ok, false);

    const missingToken = await handleRevealVehiclesSyncRequest({
      headers: {},
      firebaseApiKey: 'firebase-api-key',
      projectId: 'jdt-command-board',
      databaseId: 'database-1',
      env: {},
      fetchImpl: async () => {
        throw new Error('should not call external services without a token');
      },
    });

    assert.equal(missingToken.statusCode, 401);
  });

  it('reports which recommended Reveal APIs are configured by endpoint path', () => {
    const status = buildRevealRecommendedApiStatus({
      REVEAL_DRIVER_ASSIGNMENTS_PATH: '/driver-assignments',
      REVEAL_FLEET_INSPECTIONS_PATH: '/fleet-inspections',
      REVEAL_GEOFENCES_PATH: '/geofences',
    });

    assert.equal(status.supported.length, 8);
    assert.deepEqual(status.configured.map((api) => api.id), [
      'driverAssignments',
      'fleetInspections',
      'geofences',
    ]);
    assert.equal(status.missing.find((api) => api.id === 'vehicleSegments').label, 'Vehicle Segment Data API');
  });

  it('fetches a configurable recommended Reveal API resource using the same token and app authorization', async () => {
    const calls = [];
    const payload = await fetchRevealConfiguredApiResource('driverAssignments', {
      env: {
        REVEAL_API_USERNAME: 'REST_JDT@example.com',
        REVEAL_API_PASSWORD: 'top-secret',
        REVEAL_API_APP_ID: 'fleetmatics-p-us-app',
        REVEAL_DRIVER_ASSIGNMENTS_PATH: '/custom/driver-assignments',
      },
      fetchImpl: async (url, options = {}) => {
        calls.push({ url: String(url), options });
        if (String(url).endsWith('/token')) return responseText('TOKEN_VALUE');
        if (String(url).endsWith('/custom/driver-assignments')) {
          return responseJson({ DriverAssignments: [{ DriverName: 'Christian Crespo', VehicleName: 'Semi #1' }] });
        }
        throw new Error(`Unexpected URL ${url}`);
      },
    });

    assert.equal(calls.length, 2);
    assert.equal(calls[1].url, 'https://fim.api.us.fleetmatics.com/custom/driver-assignments');
    assert.equal(calls[1].options.headers.Authorization, 'Atmosphere atmosphere_app_id=fleetmatics-p-us-app, Bearer TOKEN_VALUE');
    assert.deepEqual(payload, { DriverAssignments: [{ DriverName: 'Christian Crespo', VehicleName: 'Semi #1' }] });
  });

  it('fetches Reveal live vehicle location by Vehicle Number', async () => {
    const calls = [];
    const payload = await fetchRevealVehicleLiveLocation('S1', {
      env: {
        REVEAL_API_USERNAME: 'REST_JDT@example.com',
        REVEAL_API_PASSWORD: 'top-secret',
        REVEAL_API_APP_ID: 'fleetmatics-p-us-app',
      },
      fetchImpl: async (url, options = {}) => {
        calls.push({ url: String(url), options });
        if (String(url).endsWith('/token')) return responseText('TOKEN_VALUE');
        if (String(url).endsWith('/rad/v1/vehicles/S1/location')) {
          return responseJson({ Latitude: 26.755, Longitude: -80.918, EventDateTime: '2026-06-13T20:00:00Z' });
        }
        throw new Error(`Unexpected URL ${url}`);
      },
    });

    assert.equal(calls.length, 2);
    assert.equal(calls[1].url, 'https://fim.api.us.fleetmatics.com/rad/v1/vehicles/S1/location');
    assert.equal(calls[1].options.headers.Authorization, 'Atmosphere atmosphere_app_id=fleetmatics-p-us-app, Bearer TOKEN_VALUE');
    assert.deepEqual(payload, { Latitude: 26.755, Longitude: -80.918, EventDateTime: '2026-06-13T20:00:00Z' });
  });

  it('syncs Reveal live locations into GPS events and patches matching equipment', async () => {
    const calls = [];
    const result = await syncRevealLiveLocationsToFirestore({
      projectId: 'jdt-command-board',
      databaseId: 'database-1',
      now: new Date('2026-06-13T20:05:00Z'),
      actorEmail: 'jeremy@jdtnurseries.com',
      env: {
        REVEAL_API_USERNAME: 'REST_JDT@example.com',
        REVEAL_API_PASSWORD: 'top-secret',
        REVEAL_API_APP_ID: 'fleetmatics-p-us-app',
        GOOGLE_OAUTH_ACCESS_TOKEN: 'GOOGLE_TOKEN',
      },
      fetchImpl: async (url, options = {}) => {
        calls.push({ url: String(url), options });
        if (String(url).endsWith('/token')) return responseText('TOKEN_VALUE');
        if (String(url).endsWith('/cmd/v1/vehicles')) return responseJson([{ VehicleId: 6358051, Name: 'Colorado', VehicleNumber: 'S1' }]);
        if (String(url).includes('/documents/equipment?pageSize=300')) {
          return responseJson({
            documents: [{
              name: 'projects/jdt-command-board/databases/database-1/documents/equipment/equipment-colorado',
              fields: {
                id: { stringValue: 'equipment-colorado' },
                name: { stringValue: 'Colorado' },
                category: { stringValue: 'Truck' },
                telematicsProvider: { stringValue: 'Reveal' },
                revealVehicleId: { stringValue: '6358051' },
                vehicleNumber: { stringValue: 'S1' },
              },
            }],
          });
        }
        if (String(url).endsWith('/rad/v1/vehicles/S1/location')) {
          return responseJson({ Latitude: 26.755, Longitude: -80.918, Speed: 0, EventDateTime: '2026-06-13T20:00:00Z', Address: '1010 E Sugarland Hwy' });
        }
        if (String(url).endsWith('/documents:commit')) return responseJson({ commitTime: '2026-06-13T20:05:01Z' });
        throw new Error(`Unexpected URL ${url}`);
      },
    });

    assert.equal(result.checked, 1);
    assert.equal(result.synced, 1);
    assert.equal(result.skipped.length, 0);

    const commitCall = calls.find((call) => call.url.endsWith('/documents:commit'));
    assert.ok(commitCall);
    const commit = JSON.parse(commitCall.options.body);
    assert.equal(commit.writes.length, 2);
    assert.match(commit.writes[0].update.name, /\/documents\/fleetTelematicsEvents\/reveal-live-location-6358051-2026-06-13t20-00-00-000z/);
    assert.equal(commit.writes[1].update.name.endsWith('/documents/equipment/equipment-colorado'), true);
    assert.deepEqual(commit.writes[1].updateMask.fieldPaths.includes('lastTelematicsLatitude'), true);
  });

  it('reports missing Reveal Vehicle Numbers instead of silently leaving live map empty', async () => {
    const calls = [];
    const result = await syncRevealLiveLocationsToFirestore({
      projectId: 'jdt-command-board',
      databaseId: 'database-1',
      now: new Date('2026-06-13T20:05:00Z'),
      actorEmail: 'jeremy@jdtnurseries.com',
      env: {
        REVEAL_API_USERNAME: 'REST_JDT@example.com',
        REVEAL_API_PASSWORD: 'top-secret',
        REVEAL_API_APP_ID: 'fleetmatics-p-us-app',
        GOOGLE_OAUTH_ACCESS_TOKEN: 'GOOGLE_TOKEN',
      },
      fetchImpl: async (url, options = {}) => {
        calls.push({ url: String(url), options });
        if (String(url).endsWith('/token')) return responseText('TOKEN_VALUE');
        if (String(url).endsWith('/cmd/v1/vehicles')) return responseJson([{ VehicleId: 6358051, Name: 'Colorado', VehicleNumber: null }]);
        if (String(url).includes('/documents/equipment?pageSize=300')) {
          return responseJson({
            documents: [{
              name: 'projects/jdt-command-board/databases/database-1/documents/equipment/equipment-colorado',
              fields: {
                id: { stringValue: 'equipment-colorado' },
                name: { stringValue: 'Colorado' },
                telematicsProvider: { stringValue: 'Reveal' },
                revealVehicleId: { stringValue: '6358051' },
              },
            }],
          });
        }
        throw new Error(`Unexpected URL ${url}`);
      },
    });

    assert.equal(result.checked, 1);
    assert.equal(result.synced, 0);
    assert.equal(result.skipped[0].reason.includes('Missing Reveal Vehicle Number'), true);
    assert.equal(calls.some((call) => call.url.includes('/rad/v1/vehicles/')), false);
  });

  it('requires owner admin auth before syncing Reveal live locations', async () => {
    const result = await handleRevealLiveLocationsSyncRequest({
      headers: {},
      firebaseApiKey: 'firebase-api-key',
      projectId: 'jdt-command-board',
      databaseId: 'database-1',
      env: {},
      fetchImpl: async () => {
        throw new Error('should not call external services without a token');
      },
    });

    assert.equal(result.statusCode, 401);
    assert.equal(result.body.ok, false);
  });

  it('maps recommended Reveal API payloads into existing app collections', () => {
    const nowIso = '2026-06-13T12:00:00.000Z';
    const cases = [
      ['driverAssignments', { DriverAssignments: [{ AssignmentId: 'assign-1', DriverName: 'Christian Crespo', VehicleName: 'Semi #1', StartDateTime: '2026-06-13T07:00:00Z' }] }, 'fieldUpdates'],
      ['driverStatuses', { DriverStatuses: [{ DriverId: 'driver-1', DriverName: 'Christian Crespo', Status: 'On Duty', DateTime: '2026-06-13T07:05:00Z' }] }, 'fieldUpdates'],
      ['fleetInspections', { Inspections: [{ InspectionId: 'insp-1', VehicleName: 'Semi #1', DriverName: 'Christian Crespo', SafeToOperate: false, DefectNotes: 'Air leak on trailer line' }] }, 'workOrders'],
      ['geofences', { Geofences: [{ GeofenceId: 'geo-1', Name: '25 Acre Farm', Address: '25 Acre Farm', Latitude: 26.75, Longitude: -80.91 }] }, 'locations'],
      ['nonPoweredAssets', { Assets: [{ AssetId: 'trailer-1', Name: 'Black Lowboy', AssetType: 'Trailer', LastLocation: 'Main Office' }] }, 'equipment'],
      ['nonPoweredAssetLocations', { AssetLocations: [{ AssetId: 'trailer-1', AssetName: 'Black Lowboy', Latitude: 26.75, Longitude: -80.91, DateTime: '2026-06-13T08:00:00Z' }] }, 'fleetTelematicsEvents'],
      ['vehicleGpsHistory', { GPSPlotData: [{ VehicleId: 'veh-1', VehicleName: 'Semi #1', Latitude: 26.75, Longitude: -80.91, EventDateTime: '2026-06-13T08:00:00Z' }] }, 'fleetTelematicsEvents'],
      ['vehicleSegments', { Segments: [{ SegmentId: 'seg-1', VehicleId: 'veh-1', VehicleName: 'Semi #1', StartDateTime: '2026-06-13T07:00:00Z', EndDateTime: '2026-06-13T07:45:00Z' }] }, 'fleetTelematicsEvents'],
    ];

    for (const [apiId, payload, collection] of cases) {
      const records = buildRevealRecommendedApiFirestoreRecords(apiId, payload, { nowIso, actorEmail: 'jeremy@jdtnurseries.com' });
      assert.equal(records.length, 1, apiId);
      assert.equal(records[0].collection, collection, apiId);
      assert.doesNotMatch(JSON.stringify(records), /top-secret|TOKEN_VALUE|REST_JDT/i);
    }
  });

  it('syncs every configured recommended Reveal API into Firestore with deterministic document ids', async () => {
    const calls = [];
    const result = await syncRecommendedRevealApisToFirestore({
      projectId: 'jdt-command-board',
      databaseId: 'database-1',
      now: new Date('2026-06-13T12:00:00Z'),
      actorEmail: 'jeremy@jdtnurseries.com',
      env: {
        REVEAL_API_USERNAME: 'REST_JDT@example.com',
        REVEAL_API_PASSWORD: 'top-secret',
        REVEAL_API_APP_ID: 'fleetmatics-p-us-app',
        REVEAL_DRIVER_ASSIGNMENTS_PATH: '/driver-assignments',
        REVEAL_FLEET_INSPECTIONS_PATH: '/fleet-inspections',
        GOOGLE_OAUTH_ACCESS_TOKEN: 'GOOGLE_TOKEN',
      },
      fetchImpl: async (url, options = {}) => {
        calls.push({ url: String(url), options });
        if (String(url).endsWith('/token')) return responseText('TOKEN_VALUE');
        if (String(url).endsWith('/driver-assignments')) return responseJson({ DriverAssignments: [{ AssignmentId: 'assign-1', DriverName: 'Christian Crespo', VehicleName: 'Semi #1' }] });
        if (String(url).endsWith('/fleet-inspections')) return responseJson({ Inspections: [{ InspectionId: 'insp-1', VehicleName: 'Semi #1', SafeToOperate: false, DefectNotes: 'Air leak' }] });
        if (String(url).endsWith('/documents:commit')) return responseJson({ commitTime: '2026-06-13T12:00:01Z' });
        throw new Error(`Unexpected URL ${url}`);
      },
    });

    assert.equal(result.apis.length, 2);
    assert.equal(result.totalWritten, 2);
    assert.deepEqual(result.apis.map((api) => [api.id, api.written]), [
      ['driverAssignments', 1],
      ['fleetInspections', 1],
    ]);

    const commitCall = calls.find((call) => call.url.endsWith('/documents:commit'));
    assert.ok(commitCall);
    const commit = JSON.parse(commitCall.options.body);
    assert.equal(commit.writes.length, 2);
    assert.equal(commit.writes[0].update.name.includes('/documents/fieldUpdates/field-update-reveal-driver-assignment-assign-1'), true);
    assert.equal(commit.writes[1].update.name.includes('/documents/workOrders/work-order-reveal-inspection-insp-1'), true);
  });

  it('requires owner admin auth before syncing recommended Reveal APIs', async () => {
    const result = await handleRevealRecommendedApisSyncRequest({
      headers: {},
      firebaseApiKey: 'firebase-api-key',
      projectId: 'jdt-command-board',
      databaseId: 'database-1',
      env: {},
      fetchImpl: async () => {
        throw new Error('should not call external services without a token');
      },
    });

    assert.equal(result.statusCode, 401);
    assert.equal(result.body.ok, false);
  });
});

function responseJson(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function responseText(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    text: async () => body,
    json: async () => JSON.parse(body),
  };
}
