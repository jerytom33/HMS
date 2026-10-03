import React from 'react';
import { BedSingle } from 'lucide-react';
import { bedTypeLabel, type BedType } from '@/lib/propertyTypes';

interface IconProps {
  className?: string;
}

/** Two stacked bed frames between posts, drawn to match lucide's 24px stroke style. */
export const BunkBedIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M3 2v20" />
    <path d="M21 2v20" />
    <path d="M3 10h18" />
    <path d="M3 19h18" />
    <path d="M6 10V7.5A1.5 1.5 0 0 1 7.5 6h2A1.5 1.5 0 0 1 11 7.5V10" />
    <path d="M6 19v-2.5A1.5 1.5 0 0 1 7.5 15h2a1.5 1.5 0 0 1 1.5 1.5V19" />
  </svg>
);

interface BedTypeIconProps extends IconProps {
  type?: BedType | string;
  /** Show the type name next to the icon. */
  withLabel?: boolean;
}

export const BedTypeIcon = ({ type, className = 'w-4 h-4', withLabel = false }: BedTypeIconProps) => {
  const icon = type === 'bunk' ? <BunkBedIcon className={className} /> : <BedSingle className={className} aria-hidden="true" />;
  if (!withLabel) {
    return (
      <span title={bedTypeLabel(type)} className="inline-flex items-center">
        {icon}
        <span className="sr-only">{bedTypeLabel(type)}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      {icon}
      <span>{bedTypeLabel(type)}</span>
    </span>
  );
};

export default BedTypeIcon;
