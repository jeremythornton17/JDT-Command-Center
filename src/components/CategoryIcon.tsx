import React from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  FileText,
  HardHat,
  Leaf,
  LucideIcon,
  MapPin,
  Tractor,
  Truck,
} from 'lucide-react';
import { categoryLabel, categoryPillClass, type OperatingCategory } from '../commandCenter/visualLanguage';

const categoryIconMap: Record<OperatingCategory, LucideIcon> = {
  crew: HardHat,
  equipment: Tractor,
  freight: Truck,
  nursery: Leaf,
  relocation: MapPin,
  alert: AlertTriangle,
  client: Building2,
  document: FileText,
  schedule: Calendar,
  general: MapPin,
};

type CategoryIconProps = {
  category: OperatingCategory;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
};

const sizeClasses = {
  xs: 'h-6 w-6 rounded-md',
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-10 w-10 rounded-lg',
};

const iconSizeClasses = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
};

export function CategoryIcon({ category, className = '', size = 'sm' }: CategoryIconProps) {
  const Icon = categoryIconMap[category];
  const label = categoryLabel(category);

  return (
    <span
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center border ${categoryPillClass(category)} ${sizeClasses[size]} ${className}`}
      data-category={category}
      title={label}
    >
      <Icon className={iconSizeClasses[size]} aria-hidden="true" />
    </span>
  );
}

type CategoryPillProps = {
  category: OperatingCategory;
  label?: string;
  compact?: boolean;
  className?: string;
};

export function CategoryPill({ category, label, compact = false, className = '' }: CategoryPillProps) {
  const displayLabel = label || categoryLabel(category);
  const Icon = categoryIconMap[category];

  return (
    <span
      aria-label={compact ? displayLabel : undefined}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-wide ${categoryPillClass(category)} ${className}`}
      data-category={category}
      title={displayLabel}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {!compact && <span>{displayLabel}</span>}
    </span>
  );
}
