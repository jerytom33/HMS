'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './StudentLayout.module.css';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/student' },
  { label: 'Profile', href: '/student/profile' },
  { label: 'Stay Management', href: '/student/stay' },
  { label: 'Contracts', href: '/student/contracts' },
  { label: 'Payments', href: '/student/payments' },
  { label: 'Documents', href: '/student/documents' },
  { label: 'Requests', href: '/student/requests' },
];

export const StudentLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>Polska Veed Portal</div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${pathname === item.href ? styles.active : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      
      <div className={styles.contentWrapper}>
        <header className={styles.header}>
          <div className={styles.userProfile}>
            <span className={styles.userName}>Student Name</span>
            <div className={styles.avatar}></div>
          </div>
        </header>
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
};
