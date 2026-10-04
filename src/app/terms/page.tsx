import React from 'react';
import { PublicLayout } from '@/components/layouts/PublicLayout';

export default function TermsPage() {
  return (
    <PublicLayout>
      <div style={{ padding: '6rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '3rem', marginBottom: '2rem' }}>Terms & Conditions</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          These terms and conditions govern your use of the Polska Veed website and services.
        </p>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          By booking accommodation through this platform, you agree to be bound by the tenancy agreement provided during the booking process.
        </p>
      </div>
    </PublicLayout>
  );
}
