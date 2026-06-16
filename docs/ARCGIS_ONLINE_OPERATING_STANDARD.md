# ArcGIS Online Operating Standard

JDT Command Center uses ArcGIS Online as the GIS/spatial system of record. The app should not depend on ArcGIS Pro desktop projects, local geodatabases, or files stored on one workstation.

## Source Of Truth

- JDT Command Center is the operations record for clients, projects, work orders, crews, freight, equipment, costs, notes, photos, and workflow status.
- ArcGIS Online hosted feature layers are the GIS record for geometry: tree points, final tree locations, project boundaries, holding areas, work zones, root-prune events, relocation work, nutrient care tasks, and equipment locations.
- Google Sheets remains a backup and bulk-entry staging path.
- KML/KMZ remains an import/export bridge, not a database.

## ArcGIS Online Account Pattern

- Jeremy keeps organization admin ownership.
- Jennifer should be invited into the `jdtnurseries.maps.arcgis.com` organization as an organizational member, not left as a free public ArcGIS account.
- Jennifer should not need full administrator rights for daily work. Use a role with privileges to create, edit, publish, and share hosted feature layers and web maps in the JDT GIS group.
- Field users should receive narrower editing roles only after the map workflow is stable.

## Group And Sharing Pattern

- Store JDT operational GIS layers in a private JDT GIS group.
- Share hosted feature layers and web maps to the JDT GIS group first.
- Share to the full organization only when all JDT staff should see the layer.
- Avoid public sharing for editable operational layers.
- Enable delete protection on production hosted layers.
- Enable editor tracking and sync where offline/mobile workflows require it.

## Field Maps Crew Workflow

ArcGIS Field Maps is the field execution app. Mobile Worker is the likely user type for crew leaders who need to open assigned maps, update geometry/status, add GPS points, add photos, and enter notes from phones or tablets.

Recommended pilot pattern:

- Jeremy: Professional/admin GIS user for ArcGIS Online administration and optional ArcGIS Pro cleanup.
- Jennifer and Regina: creator/editor-level office users for web maps, hosted layers, and review workflows.
- Crew leaders: Field Maps access with Mobile Worker or equivalent editor-level licensing.
- Regular crew members: no ArcGIS account unless they need to edit, add photos, or update task status themselves.
- View-only users: Viewer accounts only when they need map visibility without edits.

Operational flow:

1. JDT Command Center creates the work order and assignment.
2. The assignment is tied to `Project_ID`, `Tree_Asset_ID`, task IDs, crew, and due dates.
3. ArcGIS Online/Field Maps shows only the assigned project map, trees, work zones, source pins, destination pins, holding areas, and task layers needed by that crew.
4. Crew leaders update status, GPS, notes, and photos in Field Maps.
5. JDT Command Center syncs those edits back to tree records, work orders, field updates, reports, and dashboard alerts.

Do not give field users broad admin maps. Publish focused maps such as:

- `JDT Field Map - Boca West`
- `JDT Field Map - Frenchman's Creek`
- `JDT Field Map - Bellaire`
- `JDT Field Map - Today's Assigned Trees`

Each field map should only show the layers and records that crew needs for the assigned work.

## KML/KMZ Bridge Workflow

Use KML/KMZ for:

- Client-provided tree points, boundaries, routes, and access pins.
- Legacy Google Earth files.
- ArcGIS Online export/share files.
- Quick field map backup or handoff files.

Import path:

1. Upload or paste KML/KMZ content.
2. Choose the target JDT project.
3. Preview points, lines, and polygons before saving.
4. Match pins to `Tree_Asset_ID` when possible.
5. Save unmatched pins as draft tree assets, saved site locations, holding areas, or work zones.
6. Save clean records into JDT Command Center.
7. Sync geometry to ArcGIS Online hosted layers.

Export path:

1. Select a project, farm, tree set, holding area, or work zone.
2. Export KML/KMZ for backup, client sharing, or field review.
3. Keep JDT and ArcGIS Online as the records of truth after export.

## App Integration Rule

The app should connect to ArcGIS Online hosted FeatureServer URLs through environment variables. It should not read desktop ArcGIS Pro project files directly.
