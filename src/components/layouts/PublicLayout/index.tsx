import React from 'react';
import Link from 'next/link';
import styles from './PublicLayout.module.css';
import { Button } from '@/components/ui/Button';

export const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          Polska Veed
        </Link>
        <nav className={styles.nav}>
          <Link href="/hostels" className={styles.navLink}>Accommodations</Link>
          <Link href="/facilities" className={styles.navLink}>Facilities</Link>
          <Link href="/faq" className={styles.navLink}>FAQ</Link>
          <Link href="/contact" className={styles.navLink}>Contact</Link>
          <Link href="/student">
            <Button variant="outline" size="sm">Student Login</Button>
          </Link>
        </nav>
      </header>
      <main className={styles.main}>
        {children}
      </main>
      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} Hostel Management System. All rights reserved.</p>
      </footer>
    </div>
  );
};
