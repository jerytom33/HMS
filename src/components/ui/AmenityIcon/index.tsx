import React from 'react';
import { CheckCircle2, CookingPot, LampDesk, Shirt, ShowerHead, Toilet, WashingMachine, Wifi, type LucideIcon } from 'lucide-react';

// First keyword match wins, so the more specific words come first
const ICONS: [RegExp, LucideIcon][] = [
  [/washing\s*machine|laundry/i, WashingMachine],
  [/study|desk|table/i, LampDesk],
  [/wardrobe|closet|cupboard/i, Shirt],
  [/kitchen|cook/i, CookingPot],
  [/toilet|wc/i, Toilet],
  [/wash\s*room|bath|shower/i, ShowerHead],
  [/wi-?fi|internet/i, Wifi],
];

/** Icon for an amenity, picked from keywords in its name; a check mark otherwise. */
export const AmenityIcon = ({ name, className = 'w-4 h-4' }: { name: string; className?: string }) => {
  const Icon = ICONS.find(([pattern]) => pattern.test(name))?.[1] ?? CheckCircle2;
  return <Icon className={className} aria-hidden="true" />;
};

export default AmenityIcon;
