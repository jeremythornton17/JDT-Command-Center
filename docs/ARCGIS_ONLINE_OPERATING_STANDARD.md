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

## Standard Tree Relocation Field Form

Field Maps is the field language. JDT Command Center is the operational, financial, and reporting layer. ArcGIS Online is the spatial system of record.

Every relocation project should use the same crew-facing tree form:

- Tree Tag: read-only.
- Tree Type: read-only choice/text.
- DBH: read-only number.
- Relocation Status: editable choice list for physical work progress only.
- Loader(s) Needed: editable JDT-controlled equipment selection.
- Additional Equipment Required: editable text, default `None`.
- Equipment Access: editable choice list.
- Equipment Access Notes: conditional notes, required when access is `Blocked` or `Requires Review`.
- Crew Notes: editable long text.
- Issue Alert: editable choice list, default `None`.
- Add Photo: editable attachment.

Crew-editable `Tree_Relocation_Status` values:

- `Not Started`
- `25% Cut`
- `50% Cut`
- `75% Cut`
- `100% Cut`
- `Ready for Relocation`
- `Moved to Holding Area`
- `Relocated`
- `Removed`
- `Remaining in Place`

Office-only `Billing_Status` values:

- `Not Invoiced`
- `Invoiced`
- `Paid`
- `Hold / Dispute`
- `Not Billable`

Do not use relocation status as an accounting field. A crew leader should never have to choose `Invoiced` or `Paid` in Field Maps. Jeremy, Jennifer, Regina, and approved JDT roles manage cost and billing in JDT Command Center or an admin-only ArcGIS view.

Standard `Equipment_Access` values:

- `Good`
- `Blocked`
- `Requires Review`

Standard `Issue_Alert` values:

- `None`
- `Stressed`
- `Damaged`
- `Dead`
- `Irrigation`
- `Blocked Access`
- `Needs Replanting`
- `Leaning`
- `Needs Jeremy Review`

Photos should be required by workflow when the issue alert is not `None`, when equipment access is `Blocked` or `Requires Review`, and when relocation status is `Relocated`, `Moved to Holding Area`, or `Removed`.

## Field Visibility And Views

Keep operational and integration fields in the master hosted layer, but hide them from crew forms. For stronger access control, publish crew-facing hosted feature layer views that exclude protected fields entirely.

Hide these from crew:

- `Project_ID`
- `Client_ID`
- `Tree_Asset_ID`
- Raw latitude/longitude fields
- Source northing/easting
- CRS/WKID and projection fields
- Source file and import batch fields
- `App_Record_ID`
- ArcGIS sync IDs
- Sync timestamps
- `ObjectID` / `GlobalID` display fields
- Cost fields
- Billing fields
- Internal QA/QC fields

Expose cost and billing only in manager/admin views shared with Jeremy, Jennifer, Regina, JDT admins, and approved cost viewers/editors. JDT Command Center should enforce matching permissions such as `relocation.cost.view`, `relocation.cost.edit`, `relocation.billing.view`, and `relocation.billing.edit`.

## Equipment Selection Sync

JDT Command Center owns the equipment master list. ArcGIS should not become a separate hand-maintained equipment list.

The first implementation exposes loader choices from active, field-selectable JDT equipment records. The long-term structure should store equipment selections as related records instead of a single comma-separated field:

- `tree_equipment_need_id`
- `tree_asset_id`
- `project_id`
- `equipment_id`
- `equipment_name_snapshot`
- `equipment_type`
- `requested_by`
- `requested_at`
- `status`
- `notes`

The user can still experience this as a clean multi-select in JDT Command Center. Underneath, one tree can have many equipment need records, which keeps equipment planning, dispatch, reporting, and costing clean.

## Webhook-First Sync

Use webhooks as the default synchronization model.

Field Maps to JDT:

1. Crew edits a tree, task, note, issue, or attachment in Field Maps.
2. Field Maps syncs to the ArcGIS hosted feature layer.
3. ArcGIS webhook posts to a JDT webhook receiver.
4. JDT queues the event, responds quickly, pulls changed feature data, and updates Firestore/JDT records.
5. JDT updates dashboards, alerts, project history, issue history, and reporting.

JDT to Field Maps:

1. JDT Command Center saves an approved operational edit.
2. A JDT internal event or Firestore trigger runs.
3. The sync service calls ArcGIS Feature Service `applyEdits`.
4. ArcGIS hosted layers update.
5. Field Maps receives the updated record on sync.

The receiver must be idempotent and loop-safe. Add and preserve these fields for sync protection and audit history:

- `Last_Updated_Source`
- `Last_Updated_By`
- `Last_Updated_At`
- `Last_Sync_Direction`
- `Sync_Transaction_ID`
- `ArcGIS_Last_Sync_At`
- `JDT_Last_Sync_At`

If an ArcGIS webhook arrives with a `Sync_Transaction_ID` that JDT already created, log it as confirmation and do not process it as a new field edit.

The webhook receiver should:

- Verify the ArcGIS webhook signature/secret.
- Save the payload to a queue.
- Return `200 OK` quickly.
- Process feature changes asynchronously.
- Handle offline Field Maps sync delays.
- Record `Last Field Maps Sync`, `Last JDT Sync`, and `Last Known Field Update` in JDT.

Cost and billing fields may sync to admin/manager views, but they must never be exposed through crew forms or crew feature layer views.

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
