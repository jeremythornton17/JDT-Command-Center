# Project Google Earth Maps Design

## Goal

Add a project-level Google Earth workflow to JDT Command Center while keeping Firestore and the in-app Maps page as the source of truth for tree locations.

## Product Behavior

Each relocation or installation job map can export the visible project tree pins as a Google Earth-ready KML file. The export includes source pins, destination pins, and source-to-destination move paths for trees that have both coordinates. The Maps page also provides an "Open Google Earth" action centered on the selected project map area.

## Data Flow

Tree pin data continues to live on `treeRelocationRecords` and nursery tree records through `relocationMap.source` and `relocationMap.destination`. The export layer reads the same filtered records that the Maps page displays, so project scoping stays consistent between the app and Google Earth.

## Implementation

Create a pure KML builder in `src/treeRelocationMap.ts` so the behavior can be tested without a browser. The Maps page will use that helper to generate a downloadable `.kml` file from the selected job and visible tree records. No Google Earth project becomes the app database; Google Earth remains a view/export companion.

## Validation

Tests should verify that generated KML is valid KML 2.2 XML, uses longitude-latitude-altitude coordinate order, escapes project/tree text, includes source and destination placemarks, and includes move paths only when both pins exist.
