import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyArcGisHostedLayerEdit,
  arcGisServerCredentialsConfigured,
  handleArcGisTreeAssetApplyEditsRequest,
  normalizeArcGisEditableLayerUrl,
} from './arcgisApi.js';

describe('ArcGIS hosted layer API helpers', () => {
  it('requires server-side ArcGIS client credentials before hosted edits are enabled', () => {
    assert.equal(arcGisServerCredentialsConfigured({}), false);
    assert.equal(arcGisServerCredentialsConfigured({ ARCGIS_CLIENT_ID: 'client-id' }), false);
    assert.equal(arcGisServerCredentialsConfigured({
      ARCGIS_CLIENT_ID: 'client-id',
      ARCGIS_CLIENT_SECRET: 'client-secret',
    }), true);
  });

  it('normalizes hosted feature service roots to editable layer URLs', () => {
    assert.equal(
      normalizeArcGisEditableLayerUrl('https://services.arcgis.com/example/arcgis/rest/services/JDT_Tree_Assets/FeatureServer'),
      'https://services.arcgis.com/example/arcgis/rest/services/JDT_Tree_Assets/FeatureServer/0',
    );
    assert.equal(
      normalizeArcGisEditableLayerUrl('https://services.arcgis.com/example/arcgis/rest/services/JDT_Tree_Assets/FeatureServer/0/'),
      'https://services.arcgis.com/example/arcgis/rest/services/JDT_Tree_Assets/FeatureServer/0',
    );
  });

  it('applies a tree asset add through an OAuth app token and returns the ArcGIS feature id', async () => {
    const calls = [];
    const result = await applyArcGisHostedLayerEdit({
      env: {
        ARCGIS_CLIENT_ID: 'client-id',
        ARCGIS_CLIENT_SECRET: 'client-secret',
      },
      layerUrl: 'https://services.arcgis.com/example/arcgis/rest/services/JDT_Tree_Assets/FeatureServer',
      edit: {
        geometry: {
          type: 'point',
          latitude: 26.85703,
          longitude: -80.05794,
          spatialReference: { wkid: 4326 },
        },
        attributes: {
          Tree_Asset_ID: 'WAT-001',
          Project_ID: 'WATERFORD',
          Tree_Type: 'Live Oak',
          Tree_Relocation_Status: 'Not Started',
        },
      },
      fetchImpl: async (url, options = {}) => {
        calls.push({ url: String(url), options });
        if (String(url).endsWith('/oauth2/token/')) {
          return responseJson({ access_token: 'ARC_TOKEN', expires_in: 3600 });
        }
        if (String(url).endsWith('/FeatureServer/0/applyEdits')) {
          return responseJson({ addResults: [{ objectId: 1234, success: true }] });
        }
        throw new Error(`Unexpected URL ${url}`);
      },
    });

    assert.equal(result.featureId, '1234');
    assert.equal(result.layerUrl, 'https://services.arcgis.com/example/arcgis/rest/services/JDT_Tree_Assets/FeatureServer/0');
    assert.equal(calls.length, 2);
    assert.equal(calls[0].options.method, 'POST');
    assert.match(calls[0].options.body.toString(), /grant_type=client_credentials/);
    assert.doesNotMatch(JSON.stringify(result), /client-secret|ARC_TOKEN/i);

    const editBody = new URLSearchParams(calls[1].options.body);
    assert.equal(editBody.get('token'), 'ARC_TOKEN');
    const adds = JSON.parse(editBody.get('adds'));
    assert.deepEqual(adds[0].geometry, { x: -80.05794, y: 26.85703, spatialReference: { wkid: 4326 } });
    assert.equal(adds[0].attributes.Tree_Asset_ID, 'WAT-001');
  });

  it('requires an authorized Firebase user before applying hosted tree edits', async () => {
    const result = await handleArcGisTreeAssetApplyEditsRequest({
      headers: {},
      body: {},
      firebaseApiKey: 'firebase-api-key',
      env: {},
      fetchImpl: async () => {
        throw new Error('should not call ArcGIS without auth');
      },
    });

    assert.equal(result.statusCode, 401);
    assert.equal(result.body.ok, false);
  });

  it('handles a signed-in JDT user and applies the hosted tree edit', async () => {
    const calls = [];
    const result = await handleArcGisTreeAssetApplyEditsRequest({
      headers: { authorization: 'Bearer FIREBASE_TOKEN' },
      firebaseApiKey: 'firebase-api-key',
      env: {
        ARCGIS_CLIENT_ID: 'client-id',
        ARCGIS_CLIENT_SECRET: 'client-secret',
      },
      body: {
        layerUrl: 'https://services.arcgis.com/example/arcgis/rest/services/JDT_Tree_Assets/FeatureServer/0',
        edit: {
          geometry: {
            type: 'point',
            latitude: 26.85703,
            longitude: -80.05794,
            spatialReference: { wkid: 4326 },
          },
          attributes: {
            Tree_Asset_ID: 'WAT-001',
            Project_ID: 'WATERFORD',
          },
        },
      },
      fetchImpl: async (url, options = {}) => {
        calls.push({ url: String(url), options });
        if (String(url).includes('identitytoolkit.googleapis.com')) {
          return responseJson({ users: [{ email: 'crewlead@jdtnurseries.com' }] });
        }
        if (String(url).endsWith('/oauth2/token/')) {
          return responseJson({ access_token: 'ARC_TOKEN', expires_in: 3600 });
        }
        if (String(url).endsWith('/FeatureServer/0/applyEdits')) {
          return responseJson({ addResults: [{ objectId: 5678, success: true }] });
        }
        throw new Error(`Unexpected URL ${url}`);
      },
    });

    assert.equal(result.statusCode, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.featureId, '5678');
    assert.equal(calls.some((call) => call.url.includes('identitytoolkit.googleapis.com')), true);
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
