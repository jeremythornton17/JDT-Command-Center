export type TreeRelocationPointType = "source" | "destination";

export interface TreeRelocationPoint {
  lat: number;
  lng: number;
  label?: string;
  recordedAt?: string;
  recordedBy?: string;
  accuracyMeters?: number;
}

export interface TreeRelocationMapData {
  source?: TreeRelocationPoint;
  destination?: TreeRelocationPoint;
  notes?: string;
}

export interface TreeRelocationTask {
  id: string;
  label: string;
  assignedRole: string;
  status: "Complete" | "Ready" | "Waiting";
  detail: string;
}

type RelocationTree = {
  treeId?: string;
  status?: string;
  relocationMap?: TreeRelocationMapData;
  rootPruneDate1?: string;
  rootPruneDate2?: string;
  rootPruneDate3?: string;
  rootPruneDate4?: string;
  lastFertilized?: string;
  lastSprayed?: string;
};

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
  }
}

function viteEnv(): MapsEnv {
  return ((import.meta as unknown as { env?: MapsEnv }).env ?? {}) as MapsEnv;
}

export function getGoogleMapsConfig(env: MapsEnv = viteEnv()) {
  const apiKey = env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? "";
  const mapId = env.VITE_GOOGLE_MAPS_MAP_ID?.trim() ?? "";

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
