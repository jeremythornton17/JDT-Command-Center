import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');

test('App shell exposes dedicated online map routes and navigation entries', () => {
  assert.match(appSource, /ArcGisMapBoard/);
  assert.match(appSource, /const mapNav = \[/);
  assert.match(appSource, /id:\s*'jdtLocations',\s*label:\s*'JDT Locations'/);
  assert.match(appSource, /id:\s*'treeGisMap',\s*label:\s*'Tree GIS Map'/);
  assert.match(appSource, /id:\s*'fleetGps',\s*label:\s*'Fleet GPS'/);
  assert.match(appSource, /id:\s*'mapImports',\s*label:\s*'Map Imports'/);
  assert.match(appSource, /label="Maps"\s+items={mapNav}/);
  assert.ok(appSource.includes('pathname.match(/^\\/projects\\/([^/]+)\\/map\\/?$/)'));
  assert.ok(appSource.includes('/^\\/maps\\/locations\\/?$/.test(pathname)'));
  assert.ok(appSource.includes('/^\\/maps\\/tree-gis\\/?$/.test(pathname)'));
  assert.ok(appSource.includes('/^\\/maps\\/fleet-gps\\/?$/.test(pathname)'));
  assert.ok(appSource.includes('/^\\/maps\\/imports\\/?$/.test(pathname)'));
  assert.ok(appSource.includes('/^\\/map\\/?$/.test(pathname)'));
  assert.match(appSource, /case\s+'jdtLocations'/);
  assert.match(appSource, /case\s+'treeGisMap'/);
  assert.match(appSource, /case\s+'fleetGps'/);
  assert.match(appSource, /case\s+'mapImports'/);
  assert.doesNotMatch(appSource, /label:\s*'GIS Map'/);
});

test('App shell supports a collapsible desktop sidebar across every board', () => {
  assert.match(appSource, /isSidebarCollapsed/);
  assert.match(appSource, /setIsSidebarCollapsed/);
  assert.match(appSource, /aria-label="Collapse sidebar"/);
  assert.match(appSource, /aria-label="Expand sidebar"/);
  assert.match(appSource, /lg:w-20/);
  assert.match(appSource, /lg:w-72/);
  assert.match(appSource, /NavGroup[\s\S]*collapsed={isSidebarCollapsed}/);
  assert.match(appSource, /title={item\.label}/);
  assert.match(appSource, /activeNav\.label/);
});
