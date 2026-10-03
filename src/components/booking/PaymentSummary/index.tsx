import React from 'react';
import styles from './PaymentSummary.module.css';
import { formatPLN } from '@/lib/currency';

export interface PaymentSummaryProps {
  rentAmount: number;
  depositAmount: number;
}

export const PaymentSummary = ({ rentAmount, depositAmount }: PaymentSummaryProps) => {
  const total = rentAmount + depositAmount;

  return (
    <div className={styles.summaryCard}>
      <h3 className={styles.title}>Payment Summary</h3>
      
      <div className={styles.row}>
        <span>First Month Rent</span>
        <span>{formatPLN(rentAmount)}</span>
      </div>
      <div className={styles.row}>
        <span>Security Deposit</span>
        <span>{formatPLN(depositAmount)}</span>
      </div>
      
      <div className={`${styles.row} ${styles.total}`}>
        <span>Total Due (Upon Move-in)</span>
        <span>{formatPLN(total)}</span>
      </div>

      <div className={styles.notice}>
        <strong>Cash Payment Workflow:</strong> Your booking will be marked as "Pending Verification". You are required to pay the Total Due amount in cash at the hostel reception upon arrival.
      </div>
    </div>
  );
};
