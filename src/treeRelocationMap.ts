import type { LocationRecord } from "./commandCenter/records";

export type TreeRelocationPointType = "source" | "destination";

export type SiteLocationAccessType =
  | "Main Jobsite Address"
  | "Crew Access"
  | "Truck / Equipment Access"
  | "Construction / Equipment Access Pin"
  | "Load / Unload Pin"
  | "Additional Load / Unload Pin"
  | "Farm"
  | "Shop"
  | "Holding Area"
  | string;

export interface TreeRelocationPoint {
  lat: number;
  lng: number;
  label?: string;
  recordedAt?: string;
  recordedBy?: string;
  accuracyMeters?: number;
}

export interface RelocationJobMapTarget {
  label: string;
  point?: TreeRelocationPoint;
  searchText?: string;
  sourceField?: string;
}

export interface TreeRelocationMapData {
  source?: TreeRelocationPoint;
  destination?: TreeRelocationPoint;
  notes?: string;
}

export interface RelocationJobOption {
  id: string;
  label: string;
  title: string;
  projectId?: string;
  projectName?: string;
  clientId?: string;
  clientName?: string;
}

export interface TreeRelocationTask {
  id: string;
  label: string;
  assignedRole: string;
  status: "Complete" | "Ready" | "Waiting";
  detail: string;
}

export type RelocationTree = {
  id?: string;
  treeId?: string;
  status?: string;
  type?: string;
  treeType?: string;
  ranchOakType?: string;
  species?: string;
  farm?: string;
  zone?: string;
  existingLocationDescription?: string;
  proposedFinalLocationDescription?: string;
  clientId?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  jobId?: string;
  jobName?: string;
  relocationMap?: TreeRelocationMapData;
  rootPruneDate1?: string;
  rootPruneDate2?: string;
  rootPruneDate3?: string;
  rootPruneDate4?: string;
  lastFertilized?: string;
  lastSprayed?: string;
};

export type RelocationJobLike = {
  id?: string;
  title?: string;
  name?: string;
  clientId?: string;
  clientName?: string;
  client?: string;
  projectId?: string;
  projectName?: string;
  jobId?: string;
  jobName?: string;
  division?: string;
  jobType?: string;
  workTypes?: string[];
  location?: string;
  mainAddress?: string;
  locationAddress?: string;
  address?: string;
  siteAddress?: string;
  jobsiteAddress?: string;
  crewAccessAddress?: string;
  truckAccessAddress?: string;
  constructionAccessPin?: string;
  loadUnloadPin?: string;
  secondaryLoadUnloadPin?: string;
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lng?: number | string;
  mapLatitude?: number | string;
  mapLongitude?: number | string;
  jobLatitude?: number | string;
  jobLongitude?: number | string;
};

export interface ParsedGoogleMapsLocation {
  lat: number;
  lng: number;
  sourceText: string;
}

export interface SavedSiteLocationInput {
  label: string;
  accessType: SiteLocationAccessType;
  sourceText: string;
  job?: RelocationJobLike | null;
  divisionUse?: string[];
  savedBy?: string;
  savedAt?: string;
}

export interface ProjectGoogleEarthMapPackageOptions<T extends RelocationTree = RelocationTree> {
  name?: string;
  description?: string;
  job?: RelocationJobLike | null;
  trees?: T[];
  generatedAt?: string;
  fallbackCenter?: TreeRelocationPoint;
}

export interface ProjectGoogleEarthMapPackage {
  documentName: string;
  fileName: string;
  kml: string;
  placemarkCount: number;
  pathCount: number;
  pinnedTreeCount: number;
  center?: TreeRelocationPoint;
  googleEarthUrl: string;
}

export interface KmlTreePlacemark {
  id?: string;
  name: string;
  treeId: string;
  treeType: string;
  description?: string;
  lat: number;
  lng: number;
  altitude?: number;
  caliperInches?: number;
  relocationCost?: number;
}

export interface KmlTreeImportOptions {
  placemarks: KmlTreePlacemark[];
  job?: RelocationJobLike | null;
  importedBy?: string;
  importedAt?: string;
  sourceFileName?: string;
}

const defaultMapBounds = {
  north: 26.8,
  south: 26.2,
  west: -80.7,
  east: -80.0,
};

type MapsEnv = Partial<Record<"VITE_GOOGLE_MAPS_API_KEY" | "VITE_GOOGLE_MAPS_MAP_ID", string>>;

declare global {
  interface Window {
    google?: any;
    JDT_RUNTIME_CONFIG?: MapsEnv & { APP_URL?: string };
  }
}

function viteEnv(): MapsEnv {
  return ((import.meta as unknown as { env?: MapsEnv }).env ?? {}) as MapsEnv;
}

function runtimeEnv(): MapsEnv {
  if (typeof window === "undefined") return {};
  return window.JDT_RUNTIME_CONFIG ?? {};
}

function firstConfiguredValue(...values: (string | undefined)[]): string {
  return values.map(value => value?.trim() ?? "").find(Boolean) ?? "";
}

export function getGoogleMapsConfig(env: MapsEnv = viteEnv(), runtimeConfig: MapsEnv = runtimeEnv()) {
  const apiKey = firstConfiguredValue(env.VITE_GOOGLE_MAPS_API_KEY, runtimeConfig.VITE_GOOGLE_MAPS_API_KEY);
  const mapId = firstConfiguredValue(env.VITE_GOOGLE_MAPS_MAP_ID, runtimeConfig.VITE_GOOGLE_MAPS_MAP_ID);

  return {
    apiKey,
    mapId,
    isReady: apiKey.length > 0,
  };
}

export function getTreeRelocationStatus(tree: RelocationTree): string {
  if (tree.status === "Relocated") return "Relocated";
  if (!tree.relocationMap?.source) return "Needs Source Pin";
  if (!tree.relocationMap?.destination) return "Needs Destination Pin";
  if (tree.rootPruneDate1 && tree.rootPruneDate2) return "Ready to Move";
  return "Root Pruning";
}

export function updateTreeRelocationPoint<T extends RelocationTree>(
  tree: T,
  pointType: TreeRelocationPointType,
  point: TreeRelocationPoint,
  recordedBy = "Command Center",
): T & { relocationMap: TreeRelocationMapData } {
  return {
    ...tree,
    relocationMap: {
      ...(tree.relocationMap ?? {}),
      [pointType]: {
        ...point,
        recordedAt: point.recordedAt ?? new Date().toISOString(),
        recordedBy,
      },
    },
  };
}

export function buildRelocationJobOptions(jobs: RelocationJobLike[] = []): RelocationJobOption[] {
  return jobs
    .filter(isRelocationMapJob)
    .map((job) => {
      const title = String(job.title || job.projectName || job.jobName || job.name || "Untitled relocation job");
      const clientName = String(job.clientName || job.client || "");
      return {
        id: String(job.id || job.jobId || job.projectId || slugify(title)),
        label: [title, clientName].filter(Boolean).join(" - "),
        title,
        projectId: job.projectId,
        projectName: job.projectName || title,
        clientId: job.clientId,
        clientName,
      };
    });
}

export function filterTreesForRelocationJob<T extends RelocationTree>(
  trees: T[] = [],
  selectedJobId = "all",
  jobs: RelocationJobLike[] = [],
): T[] {
  if (!selectedJobId || selectedJobId === "all") return trees;
  const job = jobs.find(candidate => String(candidate.id || candidate.jobId || candidate.projectId) === selectedJobId);
  if (!job) return trees;
  return trees.filter(tree => treeMatchesRelocationJob(tree, job));
}

export function relocationContextForJob(job?: RelocationJobLike | null): Partial<RelocationTree> {
  if (!job) return {};
  const title = String(job.title || job.projectName || job.jobName || job.name || "");
  return {
    clientId: job.clientId,
    clientName: job.clientName || job.client,
    projectId: job.projectId,
    projectName: job.projectName || title,
    jobId: job.id || job.jobId,
    jobName: job.jobName || title,
  };
}

export function pointFromDevicePosition(
  coords: { latitude: number; longitude: number; accuracy?: number | null },
  pointType: TreeRelocationPointType,
): TreeRelocationPoint {
  return {
    lat: roundCoordinate(coords.latitude),
    lng: roundCoordinate(coords.longitude),
    accuracyMeters: typeof coords.accuracy === "number" ? Math.round(coords.accuracy) : undefined,
    label: pointType === "source" ? "GPS source pin" : "GPS destination pin",
  };
}

export function mapTargetForRelocationJob(job?: RelocationJobLike | null): RelocationJobMapTarget | undefined {
  if (!job) return undefined;
  const record = job as RelocationJobLike & Record<string, unknown>;
  const label = cleanLabel(record.projectName)
    || cleanLabel(record.title)
    || cleanLabel(record.jobName)
    || cleanLabel(record.name)
    || "Selected relocation job";

  const directPoint = pointFromJobCoordinateFields(record, label);
  if (directPoint) return directPoint;

  const mainAddressFields = fieldCandidates(record, [
    "location",
    "mainAddress",
    "locationAddress",
    "address",
    "siteAddress",
    "jobsiteAddress",
  ]);
  const accessFields = fieldCandidates(record, [
    "constructionAccessPin",
    "loadUnloadPin",
    "secondaryLoadUnloadPin",
    "crewAccessAddress",
    "truckAccessAddress",
  ]);

  return coordinateTargetFromFields(mainAddressFields, label)
    || addressTargetFromFields(mainAddressFields.filter((field) => isSpecificMappableAddress(field.value)), label)
    || coordinateTargetFromFields(accessFields, label)
    || addressTargetFromFields(accessFields.filter((field) => isSpecificMappableAddress(field.value)), label)
    || addressTargetFromFields(mainAddressFields, label)
    || addressTargetFromFields(accessFields, label);
}

export function parseGoogleMapsLocationText(text: unknown): ParsedGoogleMapsLocation | null {
  const sourceText = String(text || "").trim();
  if (!sourceText) return null;

  const decodedText = safeDecodeURIComponent(sourceText);
  const coordinateMatches = [
    decodedText.match(/@(-?\d{1,3}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)(?:[,/?]|$)/),
    decodedText.match(/[?&](?:q|query|ll|center)=(-?\d{1,3}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)(?:&|$)/i),
    decodedText.match(/(^|[^\d.-])(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)(?=$|[^\d.])/),
  ].filter(Boolean) as RegExpMatchArray[];

  for (const match of coordinateMatches) {
    const latCandidate = Number(match.length === 4 ? match[2] : match[1]);
    const lngCandidate = Number(match.length === 4 ? match[3] : match[2]);
    if (isValidLatLng(latCandidate, lngCandidate)) {
      return {
        lat: roundCoordinate(latCandidate),
        lng: roundCoordinate(lngCandidate),
        sourceText,
      };
    }
  }

  return null;
}

export function buildSavedSiteLocationRecord(input: SavedSiteLocationInput): LocationRecord {
  const label = cleanLabel(input.label) || cleanLabel(input.accessType) || "Saved site location";
  const accessType = cleanLabel(input.accessType) || "Site Location";
  const context = relocationContextForJob(input.job);
  const parsed = parseGoogleMapsLocationText(input.sourceText);
  const googleMapsUrl = isUrl(input.sourceText) ? input.sourceText.trim() : undefined;
  const projectKey = context.projectId || context.jobId || context.clientId || "general";
  const id = `location-${slugify([projectKey, accessType, label].filter(Boolean).join("-"))}`;
  const coordinateText = parsed ? `${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}` : "";
  const savedAt = input.savedAt || new Date().toISOString();

  return {
    id,
    name: label,
    title: label,
    locationType: accessType,
    locationId: accessType,
    accessType,
    mainAddress: accessType === "Main Jobsite Address" && !googleMapsUrl ? input.sourceText.trim() : "",
    googleMapsUrl,
    sourceText: input.sourceText.trim(),
    latitude: parsed?.lat,
    longitude: parsed?.lng,
    coordinateText,
    divisionUse: uniqueStrings(input.divisionUse || []),
    clientId: context.clientId,
    clientName: context.clientName,
    projectId: context.projectId,
    projectName: context.projectName,
    jobId: context.jobId,
    jobName: context.jobName,
    status: "Available",
    createdAtIso: savedAt,
    createdBy: input.savedBy,
    updatedAtIso: savedAt,
    updatedBy: input.savedBy,
    notes: [
      "Saved from Maps view.",
      parsed ? `Coordinates: ${coordinateText}` : "",
      googleMapsUrl ? "Source: Google Maps link" : "",
    ].filter(Boolean).join("\n"),
  };
}

export function filterSavedSiteLocationsForJob<T extends Partial<LocationRecord>>(
  locations: T[] = [],
  job?: RelocationJobLike | null,
): T[] {
  if (!job) return locations;
  const context = relocationContextForJob(job);
  const candidates = [
    job.id,
    job.jobId,
    context.jobId,
    job.projectId,
    context.projectId,
    job.clientId,
    context.clientId,
    job.clientName,
    job.client,
    context.clientName,
  ].map(value => String(value || "").trim().toLowerCase()).filter(Boolean);

  return locations.filter((location) => {
    const scopedValues = [
      location.jobId,
      location.projectId,
      location.clientId,
      location.clientName,
    ].map(value => String(value || "").trim().toLowerCase()).filter(Boolean);
    if (!scopedValues.length) return true;
    return scopedValues.some(value => candidates.includes(value));
  });
}

export function pointFromSavedSiteLocation(location: Partial<LocationRecord>): TreeRelocationPoint | undefined {
  const record = location as Partial<LocationRecord> & Record<string, unknown>;
  const directLat = Number(record.latitude ?? record.lat);
  const directLng = Number(record.longitude ?? record.lng);
  const label = String(record.name || record.title || record.locationType || record.accessType || "Saved site location").trim();

  if (isValidLatLng(directLat, directLng)) {
    return {
      lat: roundCoordinate(directLat),
      lng: roundCoordinate(directLng),
      label,
    };
  }

  const parsed = [
    record.coordinateText,
    record.googleMapsUrl,
    record.sourceText,
    record.mainAddress,
    record.locationAddress,
    record.address,
    record.crewAccessPoint,
    record.equipmentAccessPoint,
    record.crewAccessAddress,
    record.truckAccessAddress,
    record.constructionAccessPin,
    record.loadUnloadPin,
    record.secondaryLoadUnloadPin,
  ].map(parseGoogleMapsLocationText).find(Boolean);

  if (!parsed) return undefined;

  return {
    lat: parsed.lat,
    lng: parsed.lng,
    label,
  };
}

export function googleMapsUrlForSavedSiteLocation(location: Partial<LocationRecord>): string | undefined {
  const record = location as Partial<LocationRecord> & Record<string, unknown>;
  const explicitUrl = [record.googleMapsUrl, record.sourceText, record.url]
    .map((value) => String(value || "").trim())
    .find((value) => isUrl(value));
  if (explicitUrl) return explicitUrl;

  const point = pointFromSavedSiteLocation(location);
  if (point) return `https://www.google.com/maps/@${point.lat},${point.lng},19z`;

  const query = [
    record.mainAddress,
    record.locationAddress,
    record.address,
    record.sourceText,
    record.name,
    record.title,
  ].map((value) => String(value || "").trim()).find(Boolean);
  if (!query) return undefined;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function searchTextForSavedSiteLocation(location: Partial<LocationRecord>): string {
  const record = location as Partial<LocationRecord> & Record<string, unknown>;
  return [
    record.mainAddress,
    record.locationAddress,
    record.address,
    record.sourceText,
    record.name,
    record.title,
  ].map((value) => String(value || "").trim()).find((value) => Boolean(value) && !isUrl(value)) || "";
}

export function buildProjectGoogleEarthMapPackage<T extends RelocationTree = RelocationTree>(
  options: ProjectGoogleEarthMapPackageOptions<T>,
): ProjectGoogleEarthMapPackage {
  const trees = options.trees ?? [];
  const documentName = projectEarthDocumentName(options);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const sourcePlacemarks: string[] = [];
  const destinationPlacemarks: string[] = [];
  const pathPlacemarks: string[] = [];
  const pointsForCenter: TreeRelocationPoint[] = [];
  let pinnedTreeCount = 0;

  trees.forEach((tree) => {
    const source = validPoint(tree.relocationMap?.source);
    const destination = validPoint(tree.relocationMap?.destination);
    if (!source && !destination) return;

    pinnedTreeCount += 1;
    const treeName = treeMapName(tree);
    const treeDescription = treeKmlDescription(tree, options.job);

    if (source) {
      pointsForCenter.push(source);
      sourcePlacemarks.push(pointPlacemark(`${treeName} Source`, "sourcePin", source, treeDescription));
    }

    if (destination) {
      pointsForCenter.push(destination);
      destinationPlacemarks.push(pointPlacemark(`${treeName} Destination`, "destinationPin", destination, treeDescription));
    }

    if (source && destination) {
      pathPlacemarks.push(pathPlacemark(`${treeName} Move Path`, source, destination, treeDescription));
    }
  });

  const center = projectMapCenter(pointsForCenter) ?? options.fallbackCenter;
  const placemarkCount = sourcePlacemarks.length + destinationPlacemarks.length;
  const pathCount = pathPlacemarks.length;
  const description = options.description
    || `Generated from JDT Command Center on ${generatedAt}. Import this KML into Google Earth to view project tree source and destination locations.`;

  const folders = [
    kmlFolder("Source Pins", sourcePlacemarks),
    kmlFolder("Destination Pins", destinationPlacemarks),
    kmlFolder("Relocation Paths", pathPlacemarks),
  ].join("\n");

  return {
    documentName,
    fileName: `${slugify(documentName)}.kml`,
    kml: [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<kml xmlns="http://www.opengis.net/kml/2.2">',
      '<Document>',
      `<name>${escapeXml(documentName)}</name>`,
      `<description>${escapeXml(description)}</description>`,
      kmlStyles(),
      folders,
      '</Document>',
      '</kml>',
    ].join("\n"),
    placemarkCount,
    pathCount,
    pinnedTreeCount,
    center,
    googleEarthUrl: googleEarthUrlForPoint(center),
  };
}

export function buildTreeRelocationTasks(tree: RelocationTree): TreeRelocationTask[] {
  const firstRootPruneComplete = Boolean(tree.rootPruneDate1);
  const secondRootPruneComplete = Boolean(tree.rootPruneDate2);
  const hasTreatment = Boolean(tree.lastFertilized || tree.lastSprayed);
  const hasSource = Boolean(tree.relocationMap?.source);
  const hasDestination = Boolean(tree.relocationMap?.destination);
  const relocated = tree.status === "Relocated";

  return [
    {
      id: `${tree.treeId ?? "tree"}-root-prune-1`,
      label: "1st root prune",
      assignedRole: "Crew Leader",
      status: firstRootPruneComplete ? "Complete" : hasSource ? "Ready" : "Waiting",
      detail: firstRootPruneComplete ? `Completed ${tree.rootPruneDate1}` : "Mark source pin before dispatch.",
    },
    {
      id: `${tree.treeId ?? "tree"}-root-prune-2`,
      label: "2nd root prune",
      assignedRole: "Crew Leader",
      status: secondRootPruneComplete ? "Complete" : firstRootPruneComplete ? "Ready" : "Waiting",
      detail: secondRootPruneComplete ? `Completed ${tree.rootPruneDate2}` : "Second cut follows first prune window.",
    },
    {
      id: `${tree.treeId ?? "tree"}-treatment`,
      label: "Treatment check",
      assignedRole: "Irrigation Tech",
      status: hasTreatment ? "Complete" : firstRootPruneComplete ? "Ready" : "Waiting",
      detail: hasTreatment ? "Treatment history is present." : "Confirm water, spray, or fertilizer needs.",
    },
    {
      id: `${tree.treeId ?? "tree"}-dig-load`,
      label: "Dig and load",
      assignedRole: "Project Manager",
      status: secondRootPruneComplete && hasDestination ? "Ready" : "Waiting",
      detail: hasDestination ? "Destination pin is set." : "Destination pin required before move.",
    },
    {
      id: `${tree.treeId ?? "tree"}-transport`,
      label: "Transport tree",
      assignedRole: "Driver",
      status: secondRootPruneComplete && hasDestination ? "Ready" : "Waiting",
      detail: "Coordinate truck, trailer, escort, and route.",
    },
    {
      id: `${tree.treeId ?? "tree"}-plant-confirm`,
      label: "Confirm planted location",
      assignedRole: "Crew Leader",
      status: relocated ? "Complete" : hasDestination ? "Ready" : "Waiting",
      detail: relocated ? "Tree marked relocated." : "Verify final planting pin in the field.",
    },
  ];
}

export function mapPercentToLatLng(xPercent: number, yPercent: number): TreeRelocationPoint {
  const clampedX = clamp(xPercent, 0, 100);
  const clampedY = clamp(yPercent, 0, 100);
  const lat = defaultMapBounds.north - ((defaultMapBounds.north - defaultMapBounds.south) * clampedY) / 100;
  const lng = defaultMapBounds.west + ((defaultMapBounds.east - defaultMapBounds.west) * clampedX) / 100;

  return { lat: roundCoordinate(lat), lng: roundCoordinate(lng) };
}

export function latLngToMapPercent(point: TreeRelocationPoint) {
  const x = ((point.lng - defaultMapBounds.west) / (defaultMapBounds.east - defaultMapBounds.west)) * 100;
  const y = ((defaultMapBounds.north - point.lat) / (defaultMapBounds.north - defaultMapBounds.south)) * 100;

  return {
    x: clamp(x, 4, 96),
    y: clamp(y, 4, 96),
  };
}

export function formatTreeCoordinate(point?: TreeRelocationPoint): string {
  if (!point) return "Not pinned";
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}

export function googleEarthUrlForPoint(point?: TreeRelocationPoint): string {
  if (!point) return "https://earth.google.com/web/";
  return `https://earth.google.com/web/@${point.lat.toFixed(5)},${point.lng.toFixed(5)},150a,900d,35y,0h,0t,0r`;
}

export function parseKmlTreePlacemarks(kmlText: unknown): KmlTreePlacemark[] {
  const sourceText = String(kmlText || "").trim();
  if (!sourceText) return [];

  const rawPlacemarks = parseKmlRawPlacemarks(sourceText);
  return rawPlacemarks
    .map((placemark) => {
      const name = cleanKmlText(placemark.name);
      if (!name) return null;
      const point = pointFromKmlCoordinates(placemark.coordinates);
      if (!point) return null;
      const description = cleanKmlText(placemark.description);
      const parsedName = parseTreeLabelFromKmlName(name, description);
      return {
        id: placemark.id || undefined,
        name,
        treeId: parsedName.treeId,
        treeType: parsedName.treeType,
        description,
        lat: point.lat,
        lng: point.lng,
        altitude: point.altitude,
        caliperInches: parseCaliperInches(description || name),
        relocationCost: parseMoneyValue(description),
      } satisfies KmlTreePlacemark;
    })
    .filter(Boolean) as KmlTreePlacemark[];
}

export function buildTreeRelocationRecordsFromKmlImport(
  options: KmlTreeImportOptions,
): Array<RelocationTree & Record<string, unknown>> {
  const context = relocationContextForJob(options.job);
  const importedAt = options.importedAt || new Date().toISOString();
  const importedBy = options.importedBy || "Command Center";
  const projectKey = String(context.projectId || context.jobId || context.projectName || options.job?.title || options.sourceFileName || "project");

  return options.placemarks.map((placemark) => {
    const id = `kml-${slugify([projectKey, placemark.name].filter(Boolean).join("-"))}`;
    return {
      id,
      treeId: placemark.treeId || placemark.name,
      tag: placemark.treeId || placemark.name,
      name: placemark.name,
      title: placemark.name,
      type: placemark.treeType,
      treeType: placemark.treeType,
      ranchOakType: placemark.treeType,
      dbh: placemark.caliperInches,
      relocationCost: placemark.relocationCost,
      status: "Not Started",
      relocationStatus: "Not Started",
      existingLocationDescription: formatTreeCoordinate({ lat: placemark.lat, lng: placemark.lng }),
      notes: placemark.description,
      projectId: context.projectId,
      projectsId: context.projectId,
      projectName: context.projectName,
      jobId: context.jobId,
      jobName: context.jobName,
      clientId: context.clientId,
      clientName: context.clientName,
      relocationMap: {
        source: {
          lat: placemark.lat,
          lng: placemark.lng,
          label: placemark.name,
          recordedAt: importedAt,
          recordedBy: importedBy,
        },
      },
      sourceSheetName: "KML Import",
      sourceSheet: options.sourceFileName || "KML Import",
      sourceRowId: placemark.id || placemark.name,
      sourceRefs: [
        [
          "KML Import",
          options.sourceFileName || "",
          placemark.id || placemark.name,
        ].filter(Boolean).join(" / "),
      ],
      importedAtIso: importedAt,
      importedBy,
    };
  });
}

export function getRelocationStatusTone(status: string): string {
  switch (status) {
    case "Relocated":
      return "bg-emerald-100 text-emerald-800";
    case "Ready to Move":
      return "bg-blue-100 text-blue-800";
    case "Root Pruning":
      return "bg-orange-100 text-orange-800";
    case "Needs Source Pin":
    case "Needs Destination Pin":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

export function getTaskStatusTone(status: TreeRelocationTask["status"]): string {
  switch (status) {
    case "Complete":
      return "bg-emerald-100 text-emerald-800";
    case "Ready":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

export async function loadGoogleMaps(apiKey: string): Promise<any> {
  if (window.google?.maps) return window.google.maps;

  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("google-maps-js") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Google Maps.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-js";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=marker&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Google Maps."));
    document.head.appendChild(script);
  });

  if (!window.google?.maps) throw new Error("Google Maps did not initialize.");
  return window.google.maps;
}

function roundCoordinate(value: number): number {
  return Number(value.toFixed(5));
}

function isValidLatLng(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function cleanLabel(value: unknown): string {
  return String(value || "").trim();
}

function isUrl(value: unknown): boolean {
  return /^https?:\/\//i.test(String(value || "").trim());
}

type MapTargetFieldCandidate = {
  field: string;
  value: string;
};

function pointFromJobCoordinateFields(
  record: Record<string, unknown>,
  label: string,
): RelocationJobMapTarget | undefined {
  const coordinatePairs = [
    ["latitude", "longitude"],
    ["lat", "lng"],
    ["mapLatitude", "mapLongitude"],
    ["jobLatitude", "jobLongitude"],
  ];

  for (const [latField, lngField] of coordinatePairs) {
    const lat = Number(record[latField]);
    const lng = Number(record[lngField]);
    if (isValidLatLng(lat, lng)) {
      return {
        label,
        point: { lat: roundCoordinate(lat), lng: roundCoordinate(lng), label },
        sourceField: `${latField}/${lngField}`,
      };
    }
  }
  return undefined;
}

function fieldCandidates(record: Record<string, unknown>, fields: string[]): MapTargetFieldCandidate[] {
  return fields
    .map((field) => ({ field, value: cleanLabel(record[field]) }))
    .filter((candidate) => Boolean(candidate.value));
}

function coordinateTargetFromFields(
  candidates: MapTargetFieldCandidate[],
  label: string,
): RelocationJobMapTarget | undefined {
  for (const candidate of candidates) {
    const parsed = parseGoogleMapsLocationText(candidate.value);
    if (parsed) {
      return {
        label,
        point: { lat: parsed.lat, lng: parsed.lng, label },
        sourceField: candidate.field,
      };
    }
  }
  return undefined;
}

function addressTargetFromFields(
  candidates: MapTargetFieldCandidate[],
  label: string,
): RelocationJobMapTarget | undefined {
  const candidate = candidates.find((field) => !isUrl(field.value));
  if (!candidate) return undefined;
  return {
    label,
    searchText: candidate.value,
    sourceField: candidate.field,
  };
}

function isSpecificMappableAddress(value: string): boolean {
  const address = cleanLabel(value);
  if (!address || isUrl(address)) return false;
  return /\d/.test(address) && /,|\b(?:ave|avenue|blvd|boulevard|cir|circle|court|ct|dr|drive|hwy|highway|lane|ln|pkwy|parkway|pl|place|rd|road|st|street|terrace|ter|trail|trl|way)\b/i.test(address);
}

function parseKmlRawPlacemarks(kmlText: string): Array<{ id?: string; name: string; description: string; coordinates: string }> {
  if (typeof DOMParser !== "undefined") {
    const document = new DOMParser().parseFromString(kmlText, "application/xml");
    const parserError = document.getElementsByTagName("parsererror")[0];
    if (!parserError) {
      return Array.from(document.getElementsByTagName("Placemark")).map((placemark) => ({
        id: placemark.getAttribute("id") || undefined,
        name: firstElementText(placemark, "name"),
        description: firstElementText(placemark, "description"),
        coordinates: firstElementText(placemark, "coordinates"),
      }));
    }
  }

  const placemarks: Array<{ id?: string; name: string; description: string; coordinates: string }> = [];
  const placemarkPattern = /<Placemark\b([^>]*)>([\s\S]*?)<\/Placemark>/gi;
  let match: RegExpExecArray | null;
  while ((match = placemarkPattern.exec(kmlText))) {
    const attrs = match[1] || "";
    const block = match[2] || "";
    const id = attrs.match(/\bid=(?:"([^"]+)"|'([^']+)')/i)?.[1] || attrs.match(/\bid=(?:"([^"]+)"|'([^']+)')/i)?.[2] || undefined;
    placemarks.push({
      id,
      name: xmlTagText(block, "name"),
      description: xmlTagText(block, "description"),
      coordinates: xmlTagText(block, "coordinates"),
    });
  }
  return placemarks;
}

function firstElementText(parent: Element, tagName: string): string {
  const direct = parent.getElementsByTagName(tagName)[0];
  return direct?.textContent || "";
}

function xmlTagText(block: string, tagName: string): string {
  const match = block.match(new RegExp(`<(?:[\\w-]+:)?${tagName}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${tagName}>`, "i"));
  return match?.[1] || "";
}

function pointFromKmlCoordinates(coordinates: string): (TreeRelocationPoint & { altitude?: number }) | undefined {
  const firstCoordinate = String(coordinates || "").trim().split(/\s+/)[0];
  if (!firstCoordinate) return undefined;
  const [lngText, latText, altitudeText] = firstCoordinate.split(",");
  const lng = Number(lngText);
  const lat = Number(latText);
  const altitude = Number(altitudeText);
  if (!isValidLatLng(lat, lng)) return undefined;
  return {
    lat: roundCoordinate(lat),
    lng: roundCoordinate(lng),
    altitude: Number.isFinite(altitude) ? altitude : undefined,
  };
}

function cleanKmlText(value: unknown): string {
  return decodeXmlEntities(String(value || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
}

function decodeXmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: "\"",
  };
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (_, name) => namedEntities[String(name).toLowerCase()] || `&${name};`);
}

function parseTreeLabelFromKmlName(name: string, description = ""): { treeId: string; treeType: string } {
  const treeId = name.match(/^#?\d+/)?.[0] || name;
  const typeFromName = name.replace(/^#?\d+\s*/, "").trim();
  const typeFromDescription = description.match(/^([A-Za-z][A-Za-z\s-]+?)\s+\d+(?:\.\d+)?\s*(?:"|”|in|cal)/i)?.[1]?.trim();
  return {
    treeId,
    treeType: typeFromName || typeFromDescription || "Tree",
  };
}

function parseCaliperInches(value: string): number | undefined {
  const match = value.match(/(\d+(?:\.\d+)?)\s*(?:"|”|in\b|cal\b)/i);
  const parsed = match ? Number(match[1]) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseMoneyValue(value: string): number | undefined {
  const match = value.match(/\$\s*([\d,]+(?:\.\d+)?)/);
  const parsed = match ? Number(match[1].replace(/,/g, "")) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isRelocationMapJob(job: RelocationJobLike): boolean {
  const haystack = [
    job.division,
    job.jobType,
    ...(job.workTypes || []),
    job.title,
    job.projectName,
    job.jobName,
  ].join(" ");
  return /relocation|install/i.test(haystack);
}

function treeMatchesRelocationJob(tree: RelocationTree, job: RelocationJobLike): boolean {
  const jobId = String(job.id || job.jobId || "");
  const projectId = String(job.projectId || "");
  const jobName = String(job.jobName || job.title || "");
  const projectName = String(job.projectName || job.title || "");
  const clientName = String(job.clientName || job.client || "");
  const values = [
    tree.jobId,
    tree.projectId,
    tree.jobName,
    tree.projectName,
    tree.clientName,
  ].map(value => String(value || "").trim().toLowerCase()).filter(Boolean);
  const candidates = [jobId, projectId, jobName, projectName, clientName]
    .map(value => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  return values.some(value => candidates.includes(value));
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function projectEarthDocumentName(options: ProjectGoogleEarthMapPackageOptions): string {
  const job = options.job;
  const baseName = options.name
    || job?.title
    || job?.projectName
    || job?.jobName
    || job?.name
    || "JDT Project";
  return `${baseName} Tree Map`;
}

function treeMapName(tree: RelocationTree): string {
  return String(tree.treeId || tree.id || tree.type || tree.treeType || "Project Tree");
}

function treeSpeciesName(tree: RelocationTree): string {
  return String(tree.type || tree.treeType || tree.ranchOakType || tree.species || "Tree asset");
}

function validPoint(point?: TreeRelocationPoint): TreeRelocationPoint | undefined {
  if (!point) return undefined;
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return undefined;
  return point;
}

function projectMapCenter(points: TreeRelocationPoint[]): TreeRelocationPoint | undefined {
  if (!points.length) return undefined;
  const totals = points.reduce((acc, point) => ({
    lat: acc.lat + point.lat,
    lng: acc.lng + point.lng,
  }), { lat: 0, lng: 0 });
  return {
    lat: roundCoordinate(totals.lat / points.length),
    lng: roundCoordinate(totals.lng / points.length),
    label: "Project map center",
  };
}

function pointPlacemark(name: string, styleId: string, point: TreeRelocationPoint, description: string): string {
  return [
    '<Placemark>',
    `<name>${escapeXml(name)}</name>`,
    `<description>${escapeXml(description)}</description>`,
    `<styleUrl>#${styleId}</styleUrl>`,
    '<Point>',
    `<coordinates>${kmlCoordinate(point)}</coordinates>`,
    '</Point>',
    '</Placemark>',
  ].join("\n");
}

function pathPlacemark(name: string, source: TreeRelocationPoint, destination: TreeRelocationPoint, description: string): string {
  return [
    '<Placemark>',
    `<name>${escapeXml(name)}</name>`,
    `<description>${escapeXml(description)}</description>`,
    '<styleUrl>#movePath</styleUrl>',
    '<LineString>',
    '<tessellate>1</tessellate>',
    `<coordinates>${kmlCoordinate(source)} ${kmlCoordinate(destination)}</coordinates>`,
    '</LineString>',
    '</Placemark>',
  ].join("\n");
}

function treeKmlDescription(tree: RelocationTree, job?: RelocationJobLike | null): string {
  const parts = [
    `Tree: ${treeMapName(tree)}`,
    `Type: ${treeSpeciesName(tree)}`,
    tree.status ? `Status: ${tree.status}` : "",
    tree.farm || tree.zone ? `Location: ${[tree.farm, tree.zone].filter(Boolean).join(" - ")}` : "",
    tree.existingLocationDescription ? `Existing location: ${tree.existingLocationDescription}` : "",
    tree.proposedFinalLocationDescription ? `Proposed location: ${tree.proposedFinalLocationDescription}` : "",
    job?.clientName || job?.client ? `Client: ${job.clientName || job.client}` : "",
    job?.title || job?.projectName || job?.jobName ? `Project: ${job.title || job.projectName || job.jobName}` : "",
  ].filter(Boolean);
  return parts.join("\n");
}

function kmlCoordinate(point: TreeRelocationPoint): string {
  return `${point.lng.toFixed(5)},${point.lat.toFixed(5)},0`;
}

function kmlFolder(name: string, placemarks: string[]): string {
  return [
    '<Folder>',
    `<name>${escapeXml(name)}</name>`,
    ...placemarks,
    '</Folder>',
  ].join("\n");
}

function kmlStyles(): string {
  return [
    '<Style id="sourcePin">',
    '<IconStyle><color>ff227a22</color><scale>1.1</scale><Icon><href>http://maps.google.com/mapfiles/kml/paddle/grn-circle.png</href></Icon></IconStyle>',
    '</Style>',
    '<Style id="destinationPin">',
    '<IconStyle><color>ffb36618</color><scale>1.1</scale><Icon><href>http://maps.google.com/mapfiles/kml/paddle/blu-circle.png</href></Icon></IconStyle>',
    '</Style>',
    '<Style id="movePath">',
    '<LineStyle><color>ff0b6abf</color><width>4</width></LineStyle>',
    '</Style>',
  ].join("\n");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
