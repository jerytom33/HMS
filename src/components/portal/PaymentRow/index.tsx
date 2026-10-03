import React from 'react';
import { Download, CreditCard, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPLN } from '@/lib/currency';

export interface PaymentRowProps {
  id: string;
  description: string;
  amount: number;
  date: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
}

export const PaymentRow = ({ id, description, amount, date, status }: PaymentRowProps) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'PAID':
        return <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-status-success)' }}>Paid</span>;
      case 'OVERDUE':
        return <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-status-danger)' }}>Overdue</span>;
      default:
        return <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>Pending</span>;
    }
  };

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '2fr 1fr 1fr 1fr auto', 
      alignItems: 'center', 
      padding: '1.25rem', 
      borderBottom: '1px solid var(--border-light)',
      backgroundColor: 'var(--bg-primary)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-navy)' }}>
          {status === 'PAID' ? <CreditCard size={20} /> : <DollarSign size={20} />}
        </div>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{description}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ref: {id}</div>
        </div>
      </div>
      
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{date}</div>
      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatPLN(amount, { decimals: true })}</div>
      <div>{getStatusBadge()}</div>
      
      <div>
        <Button variant="ghost" size="sm" disabled={status !== 'PAID'} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Download size={16} />
          Invoice
        </Button>
      </div>
    </div>
  );
};
