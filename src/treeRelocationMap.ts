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

type RelocationTree = {
  id?: string;
  treeId?: string;
  status?: string;
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

type RelocationJobLike = {
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
