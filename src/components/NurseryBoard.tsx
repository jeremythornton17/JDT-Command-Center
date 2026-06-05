import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Edit2, QrCode, MapPin, Trash2, X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { IconButton } from './IconBadge';
import { CategoryIcon } from './CategoryIcon';
import type { RanchOakRecord } from '../commandCenter/records';
import {
  isRanchOakInventoryRecord,
  nurseryInventoryCardTitle,
  nurseryInventorySearchText,
  nurseryInventoryTableTitle,
  ranchOakLocationName,
  ranchOakRowPosition,
  ranchOakStatusCounts,
  ranchOakTypeName,
} from '../commandCenter/nurseryDisplay';

type InventoryTab = 'all' | 'ranchOaks';
type ViewMode = 'cards' | 'table';

type NurseryBoardProps = {
  starterRanchOaks?: RanchOakRecord[];
  inventoryItems?: RanchOakRecord[];
  ranchOaks?: RanchOakRecord[];
  defaultInventoryTab?: InventoryTab;
  openDrawer: (type: string, id: string) => void;
  openModal: (type: string, data?: any) => void;
};

const allOption = 'All';
const ranchOakTypeOptions = ['Single trunk', 'Multi trunk', 'Split trunk'];

function cleanText(value: unknown): string {
  return String(value ?? '').replace(/\u00a0/g, ' ').trim();
}

function uniqueRecords(records: RanchOakRecord[]): RanchOakRecord[] {
  const seen = new Set<string>();
  return records.filter((record) => {
    const key = cleanText(record.id || record.treeId || record.name || record.title);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueText(values: unknown[]): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  for (const value of values) {
    const clean = cleanText(value);
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    results.push(clean);
  }
  return results.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function statusColor(status: string) {
  switch (status) {
    case 'Available': return 'bg-emerald-100 text-emerald-800';
    case 'Sold': return 'bg-blue-100 text-blue-800';
    case 'On Hold': return 'bg-yellow-100 text-yellow-800';
    case 'Dig Queue': return 'bg-orange-100 text-orange-800';
    case 'Harvested': return 'bg-zinc-200 text-zinc-800';
    case 'Assigned': return 'bg-purple-100 text-purple-800';
    default: return 'bg-jdt-sand text-zinc-800';
  }
}

function formatMoney(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  const amount = Number(String(value).replace(/[$,]/g, ''));
  if (!Number.isFinite(amount)) return cleanText(value);
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function recordId(record: RanchOakRecord): string {
  return cleanText(record.treeId || record.id || record.name || record.title);
}

function ranchOakImages(record: RanchOakRecord): string[] {
  const urls = [
    record.mainImageUrl || record.photoUrl,
    ...(Array.isArray(record.imageUrls) ? record.imageUrls : []),
    record.imageUrl2,
    record.imageUrl3,
    record.imageUrl4,
    record.imageUrl5,
  ].map(cleanText).filter(Boolean);
  return [...new Set(urls)].slice(0, 5);
}

function ranchOakFormSeed(): Partial<RanchOakRecord> {
  return {
    treeId: 'RO-',
    ranchOakType: 'Single trunk',
    commonName: 'Ranch Oak Live Oak',
    status: 'Available',
    quantity: 1,
    farm: 'Main Office',
    fieldLocation: 'Main Office',
    sourceCollection: 'ranchOaks',
    inventoryClass: 'Ranch Oaks',
  };
}

function editTreeType(record: RanchOakRecord): string {
  return isRanchOakInventoryRecord(record) ? 'ranch_oak' : 'tree';
}

function AllInventoryCards({ records, openDrawer, openModal }: { records: RanchOakRecord[]; openDrawer: NurseryBoardProps['openDrawer']; openModal: NurseryBoardProps['openModal'] }) {
  if (records.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm font-bold text-zinc-400">No inventory found matching criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {records.map((item) => {
        const title = nurseryInventoryCardTitle(item);
        const isRanchOak = isRanchOakInventoryRecord(item);
        const id = recordId(item);
        return (
          <article key={item.id || item.treeId || title} className="flex flex-col rounded-lg border border-jdt-border bg-jdt-panel p-4 shadow-sm transition-colors hover:border-zinc-400">
            <button
              type="button"
              onClick={() => openDrawer('tree', id)}
              className="mb-3 border-b border-zinc-100 pb-3 text-left"
            >
              <h3 className="break-words text-lg font-black leading-tight text-jdt-primary">{title}</h3>
              {isRanchOak && id && <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-400">Tree ID: {id}</p>}
            </button>

            <div className="flex-1 space-y-3">
              <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider ${statusColor(cleanText(item.status || 'Available'))}`}>
                {cleanText(item.status || 'Available')}
              </span>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="mb-0.5 text-[10px] font-black uppercase text-zinc-500">Dimensions</p>
                  <p className="font-bold text-zinc-800">Qty: {item.quantity ?? '-'}</p>
                  <p className="font-bold text-zinc-800">H: {item.height || '-'} / S: {item.spread || '-'}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-[10px] font-black uppercase text-zinc-500">Location</p>
                  <p className="flex items-center gap-1 font-bold text-zinc-800"><MapPin className="h-3 w-3 text-zinc-400" /> {item.farm || item.fieldLocation || '-'}</p>
                  <p className="ml-4 font-bold text-zinc-800">{item.zone || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3 text-sm">
                <div>
                  <p className="mb-0.5 text-[10px] font-black uppercase text-zinc-500">Rootball</p>
                  <p className="text-xs font-bold text-zinc-700">{item.rootballSize || '-'}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-[10px] font-black uppercase text-zinc-500">Type</p>
                  <p className="text-xs font-bold text-zinc-700">{item.species || item.ranchOakType || '-'}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
              <button type="button" onClick={() => openModal(editTreeType(item), item)} className="rounded bg-white px-3 py-1.5 text-[10px] font-black uppercase text-zinc-700 ring-1 ring-jdt-border hover:ring-jdt-olive">Edit</button>
              <button type="button" onClick={() => openModal('delete_tree', item)} className="rounded bg-red-50 px-3 py-1.5 text-[10px] font-black uppercase text-red-700 ring-1 ring-red-100 hover:ring-red-300">Delete</button>
              <button type="button" onClick={() => openModal('assign_tree', item)} className="flex-1 rounded bg-jdt-sand py-1.5 text-[10px] font-black uppercase text-zinc-700 transition-colors hover:bg-zinc-200">Reserve / Assign</button>
              <IconButton onClick={() => openModal('qr', item)} icon={QrCode} size="sm" variant="ghost" colorClass="text-zinc-700" title="QR Code" className="bg-jdt-sand" />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function AllInventoryTable({ records, openModal }: { records: RanchOakRecord[]; openModal: NurseryBoardProps['openModal'] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-jdt-border bg-jdt-panel">
      <table className="w-full whitespace-nowrap text-left text-sm">
        <thead className="border-b border-jdt-border bg-jdt-sand text-zinc-500">
          <tr>
            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide">Tree Name</th>
            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide">Status</th>
            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide">Dimensions</th>
            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide">Location</th>
            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide">Rootball</th>
            <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {records.map((oak) => (
            <tr key={oak.id || oak.treeId || oak.name} className="align-top transition-colors hover:bg-jdt-panel">
              <td className="px-4 py-3">
                <p className="font-black text-jdt-text">{nurseryInventoryTableTitle(oak)}</p>
                {isRanchOakInventoryRecord(oak) && recordId(oak) && <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-400">Tree ID: {recordId(oak)}</p>}
              </td>
              <td className="px-4 py-3"><span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${statusColor(cleanText(oak.status || 'Available'))}`}>{cleanText(oak.status || 'Available')}</span></td>
              <td className="px-4 py-3">
                <p className="font-bold text-zinc-700">Qty: {oak.quantity ?? '-'}</p>
                <p className="mt-1 text-[11px] font-bold text-zinc-500">H: {oak.height || '-'} / S: {oak.spread || '-'}</p>
              </td>
              <td className="px-4 py-3">
                <p className="font-bold text-zinc-700">{oak.farm || oak.fieldLocation || '-'}</p>
                <p className="mt-1 text-[11px] font-bold text-zinc-500">{oak.zone || '-'}</p>
              </td>
              <td className="px-4 py-3"><p className="font-bold text-zinc-700">{oak.rootballSize || '-'}</p></td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <IconButton onClick={() => openModal('delete_tree', oak)} icon={Trash2} title="Delete Tree" colorClass="text-red-600" />
                  <IconButton onClick={() => openModal(editTreeType(oak), oak)} icon={Edit2} title="Edit Tree" colorClass="text-zinc-500" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RanchOakCards({
  records,
  openDrawer,
  openModal,
  openGallery,
}: {
  records: RanchOakRecord[];
  openDrawer: NurseryBoardProps['openDrawer'];
  openModal: NurseryBoardProps['openModal'];
  openGallery: (record: RanchOakRecord, index?: number) => void;
}) {
  if (records.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm font-bold text-zinc-400">No Ranch Oaks found matching criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {records.map((oak) => {
        const id = recordId(oak);
        const images = ranchOakImages(oak);
        const mainImage = images[0];
        return (
          <article key={oak.id || id} className="rounded-lg border border-jdt-border bg-jdt-panel p-4 shadow-sm">
            {mainImage ? (
              <button
                type="button"
                onClick={() => openGallery(oak, 0)}
                className="group mb-4 block w-full overflow-hidden rounded-lg border border-jdt-border bg-zinc-100 text-left"
              >
                <div className="relative aspect-[4/3] w-full">
                  <img src={mainImage} alt={`${id || 'Ranch Oak'} main image`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  <span className="absolute bottom-2 left-2 rounded bg-jdt-primary/85 px-2 py-1 text-[10px] font-black uppercase text-white">Tap image to view gallery</span>
                  <span className="absolute right-2 top-2 rounded bg-white/90 px-2 py-1 text-[10px] font-black uppercase text-jdt-primary">{images.length} photos</span>
                </div>
              </button>
            ) : (
              <div className="mb-4 flex aspect-[4/3] w-full flex-col items-center justify-center rounded-lg border border-dashed border-jdt-border bg-jdt-sand text-center">
                <ImageIcon className="mb-2 h-7 w-7 text-zinc-400" />
                <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">No Ranch Oak image</p>
              </div>
            )}

            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-3">
              <button type="button" onClick={() => openDrawer('tree', id)} className="min-w-0 text-left">
                <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">{ranchOakTypeName(oak)}</p>
                <h3 className="break-words text-xl font-black leading-tight text-jdt-primary">{id || 'Ranch Oak'}</h3>
              </button>
              <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider ${statusColor(cleanText(oak.status || 'Available'))}`}>
                {cleanText(oak.status || 'Available')}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-500">Location</p>
                <p className="mt-1 font-bold text-zinc-800">{ranchOakLocationName(oak)}</p>
                <p className="text-xs font-bold text-zinc-500">Zone {oak.zone || '-'} - Row / Position {ranchOakRowPosition(oak)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-500">Size</p>
                <p className="mt-1 font-bold text-zinc-800">DBH: {oak.dbh || '-'}</p>
                <p className="text-xs font-bold text-zinc-500">H: {oak.height || '-'} / S: {oak.spread || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-500">Rootball</p>
                <p className="mt-1 font-bold text-zinc-800">{oak.rootballSize || '-'}</p>
                <p className="text-xs font-bold text-zinc-500">Weight: {oak.estimatedWeight || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-500">Root Prune</p>
                <p className="mt-1 font-bold text-zinc-800">{oak.rootPruneDate || '-'}</p>
                <p className="text-xs font-bold text-zinc-500">Harvest: {oak.dateHarvested || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-500">Value</p>
                <p className="mt-1 font-bold text-zinc-800">{formatMoney(oak.price)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-500">Project / Customer</p>
                <p className="mt-1 font-bold text-zinc-800">{oak.customerName || oak.projectName || 'Unassigned'}</p>
              </div>
            </div>

            {oak.notes && <p className="mt-3 rounded bg-jdt-sand px-3 py-2 text-xs font-bold text-zinc-700">{oak.notes}</p>}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
              <button type="button" onClick={() => openModal('ranch_oak', oak)} className="rounded bg-white px-3 py-1.5 text-[10px] font-black uppercase text-zinc-700 ring-1 ring-jdt-border hover:ring-jdt-olive">Edit</button>
              <button type="button" onClick={() => openModal('delete_tree', oak)} className="rounded bg-red-50 px-3 py-1.5 text-[10px] font-black uppercase text-red-700 ring-1 ring-red-100 hover:ring-red-300">Delete</button>
              <button type="button" onClick={() => openModal('assign_tree', oak)} className="rounded bg-jdt-sand px-3 py-1.5 text-[10px] font-black uppercase text-zinc-700 hover:bg-zinc-200">Reserve / Assign</button>
              <button type="button" onClick={() => openModal('qr', oak)} className="rounded bg-jdt-sand px-3 py-1.5 text-[10px] font-black uppercase text-zinc-700 hover:bg-zinc-200">QR Code</button>
              <button type="button" onClick={() => openDrawer('tree', id)} className="rounded bg-jdt-primary px-3 py-1.5 text-[10px] font-black uppercase text-white hover:bg-jdt-dark">Map</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function RanchOakTable({ records, openModal }: { records: RanchOakRecord[]; openModal: NurseryBoardProps['openModal'] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-jdt-border bg-jdt-panel">
      <table className="w-full whitespace-nowrap text-left text-sm">
        <thead className="border-b border-jdt-border bg-jdt-sand text-zinc-500">
          <tr>
            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide">Tree ID</th>
            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide">Type / Status</th>
            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide">Location</th>
            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide">Dimensions</th>
            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide">Root Prune / Harvest</th>
            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wide">Project</th>
            <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {records.map((oak) => (
            <tr key={oak.id || oak.treeId} className="align-top transition-colors hover:bg-jdt-panel">
              <td className="px-4 py-3 font-black text-jdt-text">{recordId(oak)}</td>
              <td className="px-4 py-3">
                <p className="font-bold text-zinc-700">{ranchOakTypeName(oak)}</p>
                <span className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${statusColor(cleanText(oak.status || 'Available'))}`}>{cleanText(oak.status || 'Available')}</span>
              </td>
              <td className="px-4 py-3">
                <p className="font-bold text-zinc-700">{ranchOakLocationName(oak)}</p>
                <p className="mt-1 text-[11px] font-bold text-zinc-500">Zone {oak.zone || '-'} - Row / Position {ranchOakRowPosition(oak)}</p>
              </td>
              <td className="px-4 py-3">
                <p className="font-bold text-zinc-700">DBH: {oak.dbh || '-'}</p>
                <p className="mt-1 text-[11px] font-bold text-zinc-500">H: {oak.height || '-'} / S: {oak.spread || '-'} / RB: {oak.rootballSize || '-'}</p>
              </td>
              <td className="px-4 py-3">
                <p className="font-bold text-zinc-700">Root Prune: {oak.rootPruneDate || '-'}</p>
                <p className="mt-1 text-[11px] font-bold text-zinc-500">Harvest: {oak.dateHarvested || '-'}</p>
              </td>
              <td className="px-4 py-3"><p className="font-bold text-zinc-700">{oak.customerName || oak.projectName || 'Unassigned'}</p></td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <IconButton onClick={() => openModal('delete_tree', oak)} icon={Trash2} title="Delete Tree" colorClass="text-red-600" />
                  <IconButton onClick={() => openModal('edit_tree', oak)} icon={Edit2} title="Edit Tree" colorClass="text-zinc-500" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function NurseryBoard({
  starterRanchOaks = [],
  inventoryItems,
  ranchOaks,
  defaultInventoryTab = 'all',
  openDrawer,
  openModal,
}: NurseryBoardProps) {
  const [activeInventoryTab, setActiveInventoryTab] = useState<InventoryTab>(defaultInventoryTab);
  const [inventoryFarm, setInventoryFarm] = useState(allOption);
  const [inventoryZone, setInventoryZone] = useState(allOption);
  const [inventoryQuery, setInventoryQuery] = useState('');
  const [ranchLocation, setRanchLocation] = useState(allOption);
  const [ranchType, setRanchType] = useState(allOption);
  const [ranchStatus, setRanchStatus] = useState(allOption);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [gallerySelection, setGallerySelection] = useState<{ record: RanchOakRecord; index: number } | null>(null);

  const genericInventory = useMemo(() => (
    inventoryItems
      ? inventoryItems
      : starterRanchOaks.filter((item) => !isRanchOakInventoryRecord(item))
  ), [inventoryItems, starterRanchOaks]);

  const ranchOakInventory = useMemo(() => (
    ranchOaks
      ? ranchOaks
      : starterRanchOaks.filter(isRanchOakInventoryRecord)
  ), [ranchOaks, starterRanchOaks]);

  const allInventory = useMemo(() => uniqueRecords([...genericInventory, ...ranchOakInventory]), [genericInventory, ranchOakInventory]);
  const inventoryFarms = useMemo(() => [allOption, ...uniqueText(allInventory.map((item) => item.farm || item.fieldLocation))], [allInventory]);
  const inventoryZones = useMemo(() => [allOption, ...uniqueText(allInventory.filter((item) => inventoryFarm === allOption || item.farm === inventoryFarm || item.fieldLocation === inventoryFarm).map((item) => item.zone))], [allInventory, inventoryFarm]);
  const ranchLocations = useMemo(() => [allOption, ...uniqueText(ranchOakInventory.map(ranchOakLocationName))], [ranchOakInventory]);
  const ranchTypes = useMemo(() => [allOption, ...uniqueText([...ranchOakTypeOptions, ...ranchOakInventory.map(ranchOakTypeName)])], [ranchOakInventory]);
  const ranchStatuses = useMemo(() => [allOption, ...uniqueText(['Available', 'Sold', 'On Hold', 'Dig Queue', 'Harvested', ...ranchOakInventory.map((item) => item.status || 'Available')])], [ranchOakInventory]);

  useEffect(() => {
    if (!inventoryFarms.includes(inventoryFarm)) {
      setInventoryFarm(allOption);
      setInventoryZone(allOption);
    }
  }, [inventoryFarms, inventoryFarm]);

  useEffect(() => {
    if (!inventoryZones.includes(inventoryZone)) setInventoryZone(allOption);
  }, [inventoryZones, inventoryZone]);

  useEffect(() => {
    if (!ranchLocations.includes(ranchLocation)) setRanchLocation(allOption);
  }, [ranchLocations, ranchLocation]);

  const filteredInventory = allInventory.filter((item) => (
    (inventoryFarm === allOption || item.farm === inventoryFarm || item.fieldLocation === inventoryFarm)
    && (inventoryZone === allOption || item.zone === inventoryZone)
    && nurseryInventorySearchText(item).toLowerCase().includes(inventoryQuery.toLowerCase())
  ));

  const filteredRanchOaks = ranchOakInventory.filter((item) => (
    (ranchLocation === allOption || ranchOakLocationName(item) === ranchLocation)
    && (ranchType === allOption || ranchOakTypeName(item) === ranchType)
    && (ranchStatus === allOption || cleanText(item.status || 'Available') === ranchStatus)
    && nurseryInventorySearchText(item).toLowerCase().includes(inventoryQuery.toLowerCase())
  ));
  const isRanchOakTab = activeInventoryTab === 'ranchOaks';
  const galleryImages = gallerySelection ? ranchOakImages(gallerySelection.record) : [];
  const galleryIndex = galleryImages.length > 0 ? Math.min(gallerySelection?.index || 0, galleryImages.length - 1) : 0;
  const galleryRecordId = gallerySelection ? recordId(gallerySelection.record) : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <CategoryIcon category="nursery" size="md" />
          <div>
            <h2 className="text-2xl font-black text-jdt-primary">Nursery & Inventory</h2>
            <p className="mt-1 text-sm font-bold text-zinc-500">Production board, stock tracking, and Ranch Oaks inventory</p>
          </div>
        </div>
        <button type="button" onClick={() => openModal(isRanchOakTab ? 'ranch_oak' : 'tree', isRanchOakTab ? ranchOakFormSeed() : undefined)} className="inline-flex items-center gap-2 rounded-lg bg-jdt-primary px-4 py-2.5 text-xs font-black uppercase text-white hover:bg-jdt-dark">
          <Plus className="h-4 w-4" /> {isRanchOakTab ? 'Add Ranch Oak' : 'Add Tree'}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all' as const, label: 'All Nursery Inventory', count: allInventory.length },
            { id: 'ranchOaks' as const, label: 'Ranch Oaks', count: ranchOakInventory.length },
          ].map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveInventoryTab(tab.id)}
              className={`rounded-lg border px-4 py-2 text-xs font-black uppercase tracking-wide ${activeInventoryTab === tab.id ? 'border-jdt-primary bg-jdt-primary text-white' : 'border-jdt-border bg-jdt-panel text-zinc-600 hover:border-jdt-olive'}`}
            >
              {tab.label} <span className="ml-1 opacity-75">{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-zinc-200 p-1">
          <button type="button" onClick={() => setViewMode('cards')} className={`rounded-md px-3 py-1 text-xs font-black uppercase ${viewMode === 'cards' ? 'bg-jdt-panel text-jdt-text shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>Cards</button>
          <button type="button" onClick={() => setViewMode('table')} className={`rounded-md px-3 py-1 text-xs font-black uppercase ${viewMode === 'table' ? 'bg-jdt-panel text-jdt-text shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>Table</button>
        </div>
      </div>

      {activeInventoryTab === 'ranchOaks' ? (
        <section className="overflow-hidden rounded-xl border border-jdt-border bg-jdt-panel shadow-sm">
          <div className="border-b border-jdt-border bg-jdt-panel/50 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-lime-700">Ranch Oaks</p>
                <h3 className="text-2xl font-black text-jdt-text">Ranch Oaks Inventory</h3>
                <p className="mt-1 text-xs font-bold text-zinc-500">Special inventory for Ranch Oaks across farm locations, zones, rows, positions, and customer assignments.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {ranchOakStatusCounts(ranchOakInventory).map((item) => (
                  <div key={item.label} className="rounded-lg border border-jdt-border bg-white px-3 py-2">
                    <p className="text-[9px] font-black uppercase text-zinc-400">{item.label}</p>
                    <p className="text-lg font-black text-jdt-primary">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <select value={ranchLocation} onChange={(event) => setRanchLocation(event.target.value)} className="rounded-md border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text focus:border-zinc-500 focus:outline-none">
                {ranchLocations.map((location) => <option key={location} value={location}>{location === allOption ? 'All Locations' : location}</option>)}
              </select>
              <select value={ranchType} onChange={(event) => setRanchType(event.target.value)} className="rounded-md border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text focus:border-zinc-500 focus:outline-none">
                {ranchTypes.map((type) => <option key={type} value={type}>{type === allOption ? 'All Ranch Oak Types' : type}</option>)}
              </select>
              <select value={ranchStatus} onChange={(event) => setRanchStatus(event.target.value)} className="rounded-md border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text focus:border-zinc-500 focus:outline-none">
                {ranchStatuses.map((status) => <option key={status} value={status}>{status === allOption ? 'All Statuses' : status}</option>)}
              </select>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search Ranch Oaks..."
                  className="w-full rounded-md border border-jdt-border bg-jdt-panel py-2 pl-9 pr-4 text-sm font-bold text-jdt-text focus:border-zinc-500 focus:outline-none"
                  value={inventoryQuery}
                  onChange={(event) => setInventoryQuery(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="bg-jdt-sand/50 p-4">
            {viewMode === 'cards'
              ? <RanchOakCards records={filteredRanchOaks} openDrawer={openDrawer} openModal={openModal} openGallery={(record, index = 0) => setGallerySelection({ record, index })} />
              : <RanchOakTable records={filteredRanchOaks} openModal={openModal} />}
          </div>
        </section>
      ) : (
        <section className="flex flex-col overflow-hidden rounded-xl border border-jdt-border bg-jdt-panel shadow-sm">
          <div className="flex flex-col gap-4 border-b border-jdt-border bg-jdt-panel/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-lime-700">Nursery - {inventoryFarm}</p>
              <h3 className="text-2xl font-black text-jdt-text">All Nursery Inventory</h3>
              <p className="mt-1 text-xs font-bold text-zinc-500">All plant and tree inventory, including Ranch Oaks, from the Command Center inventory collections.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select value={inventoryFarm} onChange={(event) => { setInventoryFarm(event.target.value); setInventoryZone(allOption); }} className="rounded-md border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text focus:border-zinc-500 focus:outline-none">
                {inventoryFarms.map((farm) => <option key={farm} value={farm}>{farm === allOption ? 'All Farms' : farm}</option>)}
              </select>
              <select value={inventoryZone} onChange={(event) => setInventoryZone(event.target.value)} className="rounded-md border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text focus:border-zinc-500 focus:outline-none">
                {inventoryZones.map((zone) => <option key={zone} value={zone}>{zone === allOption ? 'All Zones' : zone}</option>)}
              </select>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search trees..."
                  className="w-48 rounded-md border border-jdt-border bg-jdt-panel py-2 pl-9 pr-4 text-sm font-bold text-jdt-text focus:border-zinc-500 focus:outline-none"
                  value={inventoryQuery}
                  onChange={(event) => setInventoryQuery(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="bg-jdt-sand/50 p-4">
            {viewMode === 'cards'
              ? <AllInventoryCards records={filteredInventory} openDrawer={openDrawer} openModal={openModal} />
              : <AllInventoryTable records={filteredInventory} openModal={openModal} />}
          </div>
        </section>
      )}
      {gallerySelection && galleryImages.length > 0 ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-label={`${galleryRecordId} image gallery`}>
          <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-jdt-panel shadow-2xl">
            <div className="flex items-center justify-between border-b border-jdt-border px-4 py-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-zinc-500">Ranch Oak Gallery</p>
                <h3 className="text-lg font-black text-jdt-primary">{galleryRecordId}</h3>
              </div>
              <button type="button" onClick={() => setGallerySelection(null)} className="rounded-lg border border-jdt-border bg-white p-2 text-zinc-600 hover:text-jdt-primary" aria-label="Close image gallery">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black">
              <img src={galleryImages[galleryIndex]} alt={`${galleryRecordId} gallery image ${galleryIndex + 1}`} className="max-h-[68vh] w-full object-contain" />
              {galleryImages.length > 1 ? (
                <>
                  <button type="button" onClick={() => setGallerySelection((current) => current ? { ...current, index: (galleryIndex - 1 + galleryImages.length) % galleryImages.length } : current)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-jdt-primary shadow" aria-label="Previous Ranch Oak image">
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button type="button" onClick={() => setGallerySelection((current) => current ? { ...current, index: (galleryIndex + 1) % galleryImages.length } : current)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-jdt-primary shadow" aria-label="Next Ranch Oak image">
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              ) : null}
            </div>
            <div className="flex gap-2 overflow-x-auto border-t border-jdt-border bg-jdt-sand p-3">
              {galleryImages.map((image, index) => (
                <button
                  type="button"
                  key={image}
                  onClick={() => setGallerySelection((current) => current ? { ...current, index } : current)}
                  className={`h-16 w-20 shrink-0 overflow-hidden rounded border ${galleryIndex === index ? 'border-jdt-primary ring-2 ring-jdt-primary/30' : 'border-jdt-border'}`}
                >
                  <img src={image} alt={`${galleryRecordId} thumbnail ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
