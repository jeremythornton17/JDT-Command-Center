import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildRevealApiAuthorizationHeader,
  fetchRevealApiToken,
  fetchRevealVehicles,
  normalizeRevealVehicleRecords,
  revealApiCredentialsConfigured,
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
});
