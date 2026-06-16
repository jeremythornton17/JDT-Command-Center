import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const outputDir = join(repoRoot, 'arcgis-seeds');
const { jdtArcGisHostedLayerConfigs } = await import('../src/commandCenter/arcgisLayerConfig.ts');

const homeBase = { lon: -80.91809, lat: 26.75505 };

await mkdir(outputDir, { recursive: true });

for (const layer of jdtArcGisHostedLayerConfigs) {
  const featureCollection = {
    type: 'FeatureCollection',
    name: layer.serviceName,
    features: [seedFeatureForLayer(layer)],
  };
  const outputPath = join(outputDir, `${layer.serviceName}.geojson`);
  await writeFile(outputPath, `${JSON.stringify(featureCollection, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${outputPath}`);
}

function seedFeatureForLayer(layer) {
  return {
    type: 'Feature',
    properties: propertiesForLayer(layer),
    geometry: geometryForLayer(layer.geometryType),
  };
}

function geometryForLayer(geometryType) {
  if (geometryType === 'polygon') {
    const size = 0.00035;
    return {
      type: 'Polygon',
      coordinates: [[
        [homeBase.lon - size, homeBase.lat - size],
        [homeBase.lon - size, homeBase.lat + size],
        [homeBase.lon + size, homeBase.lat + size],
        [homeBase.lon + size, homeBase.lat - size],
        [homeBase.lon - size, homeBase.lat - size],
      ]],
    };
  }

  if (geometryType === 'polyline') {
    return {
      type: 'LineString',
      coordinates: [
        [homeBase.lon - 0.0003, homeBase.lat - 0.0003],
        [homeBase.lon + 0.0003, homeBase.lat + 0.0003],
      ],
    };
  }

  return {
    type: 'Point',
    coordinates: [homeBase.lon, homeBase.lat],
  };
}

function propertiesForLayer(layer) {
  const properties = {};
  for (const field of layer.fields) {
    if (field.type === 'oid') continue;
    properties[field.name] = seedValueForField(layer, field);
  }
  return properties;
}

function seedValueForField(layer, field) {
  if (field.type === 'double') return 0;
  if (field.type === 'integer') return 0;
  if (field.type === 'date') return '2026-06-15T00:00:00.000Z';
  if (field.name === 'Project_ID') return 'SCHEMA-SEED';
  if (field.name === 'Project_Name') return 'Schema Seed - Replace';
  if (field.name === 'Client_ID') return 'SCHEMA-SEED';
  if (field.name === 'Client_Name') return 'Schema Seed - Replace';
  if (field.name === 'Tree_Asset_ID') return 'SCHEMA-SEED-TREE';
  if (field.name === 'Tree_Tag') return 'SEED';
  if (field.name === 'Tree_Type') return 'Live Oak';
  if (field.name === 'Tree_Relocation_Status') return 'Not Started';
  if (field.name.endsWith('_ID')) return `${layer.serviceName}-SEED`;
  if (field.name === 'Status' || field.name.endsWith('_Status')) return 'Schema Seed';
  if (field.name === 'Map_Geometry_Status') return 'Seed Geometry';
  return 'Schema Seed - Replace';
}
