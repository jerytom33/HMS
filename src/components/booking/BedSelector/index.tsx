'use client';

import React from 'react';
import { Bed } from 'lucide-react';
import styles from './BedSelector.module.css';
import { formatPLN } from '@/lib/currency';

export interface BedData {
  id: string;
  name: string; // e.g. "Bed 201-A"
  price: number;
  availableDates: string;
}

export interface RoomData {
  id: string;
  name: string; // e.g. "Room 201"
  type: string; // e.g. "2-Bed Shared"
  beds: BedData[];
}

export interface BedSelectorProps {
  rooms: RoomData[];
  selectedBedId: string | null;
  onSelectBed: (bedId: string) => void;
}

export const BedSelector = ({ rooms, selectedBedId, onSelectBed }: BedSelectorProps) => {
  // Filter out rooms that have no available beds
  const availableRooms = rooms.filter(room => room.beds.length > 0);

  if (availableRooms.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No beds available for the selected dates.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {availableRooms.map((room) => (
        <div key={room.id} className={styles.roomGroup}>
          <div className={styles.roomHeader}>
            <h4 className={styles.roomTitle}>{room.name}</h4>
            <span className={styles.roomInfo}>{room.type}</span>
          </div>
          <div className={styles.bedList}>
            {room.beds.map((bed) => {
              const isSelected = selectedBedId === bed.id;
              return (
                <div
                  key={bed.id}
                  className={`${styles.bedItem} ${isSelected ? styles.selected : ''}`}
                  onClick={() => onSelectBed(bed.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onSelectBed(bed.id);
                    }
                  }}
                >
                  <div className={styles.bedInfo}>
                    <div className={styles.bedTitle}>
                      <Bed size={18} />
                      {bed.name}
                    </div>
                    <div className={styles.bedAvailability}>Available from: {bed.availableDates}</div>
                  </div>
                  <div className={styles.bedPrice}>
                    <span className={styles.priceValue}>{formatPLN(bed.price)}</span>
                    <span className={styles.priceUnit}>/ month</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
