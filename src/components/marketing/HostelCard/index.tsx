import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Wifi, Shield, Dumbbell } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import styles from './HostelCard.module.css';
import { formatPLN } from '@/lib/currency';

export interface HostelCardProps {
  id: string;
  slug: string;
  name: string;
  location: string;
  imageUrl: string;
  startingPrice: number;
  availableBeds?: number;
}

export const HostelCard = ({
  slug,
  name,
  location,
  imageUrl,
  startingPrice,
  availableBeds = 0,
}: HostelCardProps) => {
  const isAvailable = availableBeds > 0;

  return (
    <Link href={`/hostels/${slug}`} className={styles.cardWrapper}>
      <Card hoverable className={styles.card}>
        <div className={styles.imageContainer}>
          <div className={`${styles.badge} ${!isAvailable ? styles.unavailable : ''}`}>
            {isAvailable ? `${availableBeds} Beds Available` : 'Waitlist Open'}
          </div>
          <Image
            src={imageUrl}
            alt={name}
            fill
            className={styles.image}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        
        <div className={styles.content}>
          <h3 className={styles.title}>{name}</h3>
          <div className={styles.location}>
            <MapPin size={16} />
            <span>{location}</span>
          </div>
          
          <div className={styles.amenities}>
            <span title="High-Speed WiFi"><Wifi size={18} /></span>
            <span title="24/7 Security"><Shield size={18} /></span>
            <span title="Fitness Center"><Dumbbell size={18} /></span>
          </div>
          
          <div className={styles.footer}>
            <div>
              <div className={styles.priceLabel}>Starting from</div>
              <div className={styles.priceValue}>
                {formatPLN(startingPrice)} <span className={styles.priceUnit}>/ month</span>
              </div>
            </div>
            {/* Arrow icon can be added here if desired */}
          </div>
        </div>
      </Card>
    </Link>
  );
};
