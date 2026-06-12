import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildEquipmentPatchFromRevealEvent,
  buildFirestoreCommitBody,
  buildRevealTelematicsEventId,
  normalizeRevealGpsPayloads,
  parseBasicAuthorization,
  revealEquipmentMatchCandidates,
} from './revealTelematics.js';

describe('Reveal telematics webhook helpers', () => {
  it('normalizes GPS webhook batches into app-ready vehicle location events', () => {
    const [event] = normalizeRevealGpsPayloads({
      GPSPlotData: [{
        VehicleId: 'veh-123',
        VehicleNumber: 'S1',
        VehicleName: 'Semi #1',
        Latitude: '26.7539482',
        Longitude: '-80.9166488',
        EventDateTime: '2026-06-12T13:14:15Z',
        Speed: '34',
        Heading: '187',
        Address: '1010 E Sugarland Hwy, Clewiston, FL 33440',
        DriverName: 'Christian Crespo',
      }],
    }, '2026-06-12T13:15:00Z');

    assert.equal(event.provider, 'Reveal');
    assert.equal(event.providerVehicleId, 'veh-123');
    assert.equal(event.vehicleNumber, 'S1');
    assert.equal(event.vehicleName, 'Semi #1');
    assert.equal(event.latitude, 26.7539482);
    assert.equal(event.longitude, -80.9166488);
    assert.equal(event.coordinateText, '26.753948, -80.916649');
    assert.equal(event.eventAt, '2026-06-12T13:14:15.000Z');
    assert.equal(event.speedMph, 34);
    assert.equal(event.heading, 187);
    assert.equal(event.address, '1010 E Sugarland Hwy, Clewiston, FL 33440');
    assert.equal(event.driverName, 'Christian Crespo');
    assert.equal(event.receivedAt, '2026-06-12T13:15:00.000Z');
  });

  it('normalizes single vehicle location payloads with lowercase API field names', () => {
    const [event] = normalizeRevealGpsPayloads({
      vehicle: { id: 'abc-999', name: 'Dodge Ram 2500' },
      location: { lat: 26.75, lng: -80.91, address: 'Main Office' },
      timestamp: '2026-06-12T08:00:00-04:00',
      speedMph: 0,
    }, '2026-06-12T12:00:05Z');

    assert.equal(event.providerVehicleId, 'abc-999');
    assert.equal(event.vehicleName, 'Dodge Ram 2500');
    assert.equal(event.latitude, 26.75);
    assert.equal(event.longitude, -80.91);
    assert.equal(event.address, 'Main Office');
    assert.equal(event.eventAt, '2026-06-12T12:00:00.000Z');
    assert.equal(event.speedMph, 0);
  });

  it('builds deterministic Firestore event IDs without leaking raw credentials', () => {
    const [event] = normalizeRevealGpsPayloads({
      VehicleId: 'veh-123',
      Latitude: 26.7539482,
      Longitude: -80.9166488,
      EventDateTime: '2026-06-12T13:14:15Z',
    }, '2026-06-12T13:15:00Z');

    const id = buildRevealTelematicsEventId(event);

    assert.match(id, /^reveal-veh-123-2026-06-12t13-14-15-000z-[a-f0-9]{12}$/);
    assert.doesNotMatch(id, /password|secret|token/i);
  });

  it('updates equipment location fields from a GPS event while preserving assignment fields', () => {
    const [event] = normalizeRevealGpsPayloads({
      VehicleId: 'veh-123',
      VehicleName: 'Semi #1',
      Latitude: 26.7539482,
      Longitude: -80.9166488,
      EventDateTime: '2026-06-12T13:14:15Z',
      Speed: 12,
      Address: 'US-27 near Main Office',
    }, '2026-06-12T13:15:00Z');

    const patch = buildEquipmentPatchFromRevealEvent(event);

    assert.equal(patch.telematicsProvider, 'Reveal');
    assert.equal(patch.revealVehicleId, 'veh-123');
    assert.equal(patch.verizonVehicleId, 'veh-123');
    assert.equal(patch.currentLocationType, 'In Transit');
    assert.equal(patch.currentLocationName, 'US-27 near Main Office');
    assert.equal(patch.currentLocation, 'US-27 near Main Office');
    assert.equal(patch.lastTelematicsLatitude, 26.7539482);
    assert.equal(patch.lastTelematicsLongitude, -80.9166488);
    assert.equal(patch.lastTelematicsSpeedMph, 12);
    assert.equal(Object.hasOwn(patch, 'assignedProjectName'), false);
    assert.equal(Object.hasOwn(patch, 'assignedCrewName'), false);
  });

  it('prioritizes stable matching fields before display names', () => {
    const [event] = normalizeRevealGpsPayloads({
      VehicleId: 'veh-123',
      VehicleNumber: 'S1',
      VehicleName: 'Semi #1',
      RegistrationNumber: 'ABC123',
      VIN: '1HTMMAAL0XH000001',
      Latitude: 26.7539482,
      Longitude: -80.9166488,
    }, '2026-06-12T13:15:00Z');

    assert.deepEqual(revealEquipmentMatchCandidates(event), [
      ['revealVehicleId', 'veh-123'],
      ['verizonVehicleId', 'veh-123'],
      ['revealVehicleNumber', 'S1'],
      ['vehicleNumber', 'S1'],
      ['registrationNumber', 'ABC123'],
      ['vin', '1HTMMAAL0XH000001'],
      ['name', 'Semi #1'],
      ['asset', 'Semi #1'],
      ['assetId', 'S1'],
    ]);
  });

  it('builds Firestore commit writes for the event and a masked equipment update', () => {
    const [event] = normalizeRevealGpsPayloads({
      VehicleId: 'veh-123',
      VehicleName: 'Semi #1',
      Latitude: 26.7539482,
      Longitude: -80.9166488,
      EventDateTime: '2026-06-12T13:14:15Z',
      Address: 'Main Office',
    }, '2026-06-12T13:15:00Z');

    const commit = buildFirestoreCommitBody({
      projectId: 'jdt-command-board',
      databaseId: 'ai-studio-aaf65ee2-61ca-4360-af29-1c862096338e',
      event,
      rawPayload: { redacted: true },
      matchedEquipmentDocumentName: 'projects/jdt-command-board/databases/ai-studio-aaf65ee2-61ca-4360-af29-1c862096338e/documents/equipment/equipment-semi-1',
    });

    assert.equal(commit.writes.length, 2);
    assert.match(commit.writes[0].update.name, /documents\/fleetTelematicsEvents\/reveal-veh-123-/);
    assert.equal(commit.writes[0].update.fields.provider.stringValue, 'Reveal');
    assert.equal(commit.writes[0].update.fields.rawPayload.mapValue.fields.redacted.booleanValue, true);
    assert.equal(commit.writes[1].update.name.endsWith('/documents/equipment/equipment-semi-1'), true);
    assert.deepEqual(commit.writes[1].updateMask.fieldPaths.sort(), [
      'currentLocation',
      'currentLocationName',
      'currentLocationType',
      'lastTelematicsAddress',
      'lastTelematicsAt',
      'lastTelematicsLatitude',
      'lastTelematicsLongitude',
      'revealLastReceivedAt',
      'revealVehicleId',
      'telematicsProvider',
      'verizonVehicleId',
    ].sort());
  });

  it('parses webhook basic auth safely', () => {
    const encoded = Buffer.from('jdt-reveal:top-secret').toString('base64');

    assert.deepEqual(parseBasicAuthorization(`Basic ${encoded}`), {
      username: 'jdt-reveal',
      password: 'top-secret',
    });
    assert.equal(parseBasicAuthorization('Bearer abc'), null);
    assert.equal(parseBasicAuthorization(''), null);
  });
});
