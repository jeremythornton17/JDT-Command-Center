import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildRevealApiAuthorizationHeader,
  buildRevealEquipmentRecordForVehicle,
  fetchRevealApiToken,
  fetchRevealVehicles,
  handleRevealVehiclesSyncRequest,
  normalizeRevealVehicleRecords,
  revealApiCredentialsConfigured,
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
      'revealSyncedAt',
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
