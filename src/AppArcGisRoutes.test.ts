import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');

test('App shell exposes the JDT ArcGIS map route and navigation entry', () => {
  assert.match(appSource, /ArcGisMapBoard/);
  assert.match(appSource, /id:\s*'arcgisMap'/);
  assert.match(appSource, /label:\s*'GIS Map'/);
  assert.ok(appSource.includes('pathname.match(/^\\/projects\\/([^/]+)\\/map\\/?$/)'));
  assert.ok(appSource.includes('/^\\/map\\/?$/.test(pathname)'));
  assert.match(appSource, /case\s+'arcgisMap'/);
});
