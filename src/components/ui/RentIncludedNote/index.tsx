import React from 'react';
import { Droplets, Flame, Zap, type LucideIcon } from 'lucide-react';
import { RENT_INCLUDES, RENT_INCLUDES_TEXT } from '@/lib/propertyTypes';

const ICONS: Record<string, LucideIcon> = {
  Water: Droplets,
  Electricity: Zap,
  'Winter Heating': Flame,
};

interface RentIncludedNoteProps {
  /** 'full': boxed note; 'inline': one small line; 'icons': icons only (with tooltip) */
  variant?: 'full' | 'inline' | 'icons';
  className?: string;
}

/** Note that water, electricity and winter heating are included in the rent. */
export const RentIncludedNote = ({ variant = 'inline', className = '' }: RentIncludedNoteProps) => {
  const icons = RENT_INCLUDES.map((name) => {
    const Icon = ICONS[name];
    return Icon ? <Icon key={name} className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> : null;
  });

  if (variant === 'icons') {
    return (
      <span title={RENT_INCLUDES_TEXT} className={`inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 ${className}`}>
        {icons}
        <span className="text-[10px] font-semibold uppercase tracking-wide">Bills incl.</span>
        <span className="sr-only">{RENT_INCLUDES_TEXT}</span>
      </span>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex items-start gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300 ${className}`}>
        <span className="flex items-center gap-1 pt-0.5">{icons}</span>
        <span><span className="font-semibold">Included in rent:</span> {RENT_INCLUDES.join(', ')}</span>
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 ${className}`}>
      <span className="flex items-center gap-0.5">{icons}</span>
      Rent includes {RENT_INCLUDES.join(', ')}
    </span>
  );
};

export default RentIncludedNote;
