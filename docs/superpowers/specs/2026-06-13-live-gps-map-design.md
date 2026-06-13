# Live GPS Map Design

## Goal

Add a Verizon Reveal-style live GPS map inside JDT Command Center so Jeremy, Jennifer, Regina, dispatchers, and managers can see tracked vehicles, tracked equipment, and active freight movement in one operating view.

The map should not iframe Verizon Reveal. JDT Command Center should render its own Google Maps-based live map using Verizon Reveal telemetry, JDT equipment records, JDT freight records, project locations, farm locations, and saved site pins. Verizon provides GPS signals. JDT Command Center remains the operating source of truth.

## Chosen Approach

Build the live map as a JDT-owned map layer system:

- Verizon Reveal supplies last known GPS position, status, movement time, heading, fuel/odometer if available, and tracker identity.
- JDT equipment records decide whether the GPS asset is a truck, trailer, machine, implement, support vehicle, or unclassified tracker.
- Freight moves decide whether a vehicle or trailer is actively tied to a dispatch assignment.
- Project, farm, shop, and saved pin records provide the business context around where that asset is and why it matters.

This is better than embedding the Verizon page because it lets the app connect GPS data to JDT work orders, freight moves, equipment status, maintenance issues, project access points, and command board alerts.

## Product Behavior

The Maps page gains a Live GPS workspace that visually resembles the approved mockup:

- A full-width satellite map.
- A left asset list similar to Verizon Reveal.
- Search for vehicle, equipment, driver, asset ID, project, address, or saved place.
- Category filters for Vehicles, Equipment, Freight, and Unmatched GPS.
- Status filters for Moving, Idle, Stopped, Stale, No Signal, and Needs Match.
- A map layer panel for saved locations, farm locations, project pins, tree pins, equipment pins, vehicle pins, freight routes, and geofences later.
- Individual asset isolation so a user can select one truck, one machine, one trailer, or one freight move and hide the rest.
- Asset popups on the map with the critical dispatch details and action buttons.

## Live GPS Categories

### Vehicles

Vehicles include trucks, pickups, semis, support vehicles, and crew vehicles that have Verizon tracking or a matching equipment record.

Vehicle cards should show:

- Equipment name
- Driver or assigned crew member when known
- Last GPS status
- Last movement time
- Current location or nearest saved JDT place
- Assigned project or freight move when known
- Fuel/odometer if available from Verizon

### Equipment

Equipment includes machines that may eventually receive GPS trackers: loaders, excavators, track machines, telehandlers, and other tracked assets.

Equipment cards should show:

- Equipment name
- Equipment category and type
- Current location
- Assigned project
- Maintenance/service status
- Last GPS timestamp
- Whether GPS location agrees with the app's assigned location

### Freight

Freight shows active dispatch work rather than just raw trucks. A freight item may represent a truck, trailer, driver, route, and multiple stops.

Freight cards should show:

- Load title or move number
- Driver
- Truck and trailer
- Current stop status
- Next stop
- Project/client/job
- ETA or requested time
- Route/stop path when coordinates are available

### Unmatched GPS

Unmatched GPS records are Verizon assets that have telemetry but are not confidently linked to an equipment record.

The view should show these as a review queue, not as normal production assets. Owner/admin users can match them to existing equipment, create new equipment, or ignore them.

## Map Actions

Each asset popup should support the actions that make sense for its category.

Common actions:

- Zoom To
- Open In Google Maps
- Copy Coordinates
- View Asset Profile
- View Location History

Vehicle/Freight actions:

- View Freight Move
- Create Freight Move
- Assign Driver
- Mark Arrived
- Mark Departed
- Report Issue

Equipment actions:

- View Equipment Profile
- Change Current Location
- Request Equipment Change
- Create Maintenance Issue
- Mark Available / Assigned / Down

Unmatched GPS actions:

- Match To Equipment
- Create Equipment From GPS Asset
- Dismiss For Now

## Data Flow

The live GPS view reads from these app-owned records:

- `equipment` for assets, category, assignment, current location, compatibility, maintenance, and compliance.
- Reveal vehicle/equipment match records for linking Verizon asset IDs to JDT equipment IDs.
- Reveal telemetry snapshots for last known position and status.
- `freightMoves` and freight stops for active dispatch context.
- Project, farm, shop, saved location, and site pin records for location context.

The map should normalize all visible GPS assets into one `LiveGpsAsset` shape before rendering:

- `id`
- `source`
- `equipmentId`
- `revealVehicleId`
- `category`
- `name`
- `status`
- `lat`
- `lng`
- `heading`
- `lastUpdatedAt`
- `assignedDriver`
- `assignedProjectId`
- `assignedFreightMoveId`
- `currentLocationName`
- `currentAddress`
- `needsAttention`
- `actions`

The UI should render from this normalized shape so vehicles, equipment, freight, and unmatched GPS can share the same map infrastructure while still showing category-specific details.

## Location Truth Rules

GPS location and app-assigned location are related but not the same.

- GPS location is where the tracker last reported.
- Current Location is where JDT says the asset is assigned or expected to be.
- If GPS location is far from assigned location, the asset should show a location mismatch warning.
- If GPS has gone stale, the app should keep the assigned location visible and mark GPS as stale rather than pretending the asset is live.
- If an asset has no GPS tracker, it can still appear in Equipment or Freight lists, but not as a live GPS pin.

## Screen Placement

The first implementation should add this as a Live GPS mode inside the Maps page, not as a separate top-level menu item.

Recommended Maps modes:

- All Saved Locations
- Project / Job Map
- Farm Map
- Tree Relocation Map
- Live GPS Map

The Live GPS mode should also be reachable from Freight and Equipment through contextual actions:

- Freight page: "Open Live Map"
- Equipment page: "Show On Live Map"
- Equipment card: "Track Asset"

## Permissions

Owner/admin and operations users can see all GPS assets and perform matching actions.

Crew leaders and drivers should only see GPS information that is relevant to their assignment unless Jeremy decides all internal users can see all records.

Unmatched GPS matching, creating equipment from GPS, and dismissing GPS records should be admin-only.

## Error Handling

The map should clearly show:

- Verizon API credentials missing
- Verizon sync failed
- Last successful sync time
- Asset has no GPS tracker
- GPS report is stale
- GPS asset needs match approval
- Location mismatch between assigned location and live GPS

Errors should not blank the map. The app should still show saved locations, assigned equipment locations, and active freight context even when live Verizon data is unavailable.

## Testing

Tests should cover:

- Normalizing Reveal telemetry into `LiveGpsAsset` records.
- Matching telemetry to equipment records.
- Grouping assets by category.
- Filtering by category and status.
- Isolating one selected asset.
- Showing stale GPS state when timestamps are old.
- Showing unmatched GPS records without treating them as approved equipment.
- Showing freight context when a GPS-linked truck is assigned to an active freight move.

Manual browser verification should cover:

- Desktop map layout.
- Mobile/tablet map usability.
- Category toggles.
- Individual asset isolation.
- Asset popup actions.
- Empty state when no GPS data is available.
- Stale/error state when Verizon sync is unavailable.

## Deferred Until After First Slice

These are valuable but should not block the first shippable version:

- Geofence creation.
- Replay/history playback.
- Driver scorecards.
- Advanced route optimization.
- Automated ETA prediction.
- Street View actions.
- Verizon alert webhook automation beyond displaying/recording received alerts.
- Equipment tracker rollout to every machine.

## Rollout Plan

Phase 1 should ship the JDT-owned live map shell, mock telemetry fallback, category filters, individual asset isolation, and the normalized asset model.

Phase 2 should connect the map to existing Reveal telemetry, approved vehicle/equipment matches, and active freight moves.

Phase 3 should add equipment tracker support as Verizon trackers are installed on machines and trailers.

Phase 4 should add operational alerts, mismatch detection, stale tracker warnings, and map-driven command board cards.

## Success Criteria

The feature is successful when an admin user can open JDT Command Center, select Live GPS Map, and quickly answer:

- Where are the trucks right now?
- Which equipment is tracked?
- Which vehicle is tied to an active freight move?
- Which asset is stopped, moving, stale, or unmatched?
- Can I isolate one truck, trailer, machine, or freight move?
- Does the GPS position agree with the app's assigned location?
- Can I jump from the map into the equipment or freight record that explains what is happening?
