import React from 'react';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export interface MaintenanceTicketProps {
  id: string;
  title: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  date: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export const MaintenanceTicket = ({ id, title, status, date, priority }: MaintenanceTicketProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'RESOLVED':
        return { color: 'var(--color-status-success)', icon: <CheckCircle2 size={16} />, label: 'Resolved' };
      case 'IN_PROGRESS':
        return { color: 'var(--color-status-warning)', icon: <Clock size={16} />, label: 'In Progress' };
      default:
        return { color: 'var(--text-secondary)', icon: <AlertCircle size={16} />, label: 'Pending Review' };
    }
  };

  const config = getStatusConfig();

  return (
    <Card style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', minWidth: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, flex: '1 1 14rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>#{id}</span>
          <span style={{ 
            fontSize: '0.75rem', 
            padding: '0.125rem 0.5rem', 
            borderRadius: '12px',
            backgroundColor: priority === 'HIGH' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-tertiary)',
            color: priority === 'HIGH' ? 'var(--color-status-danger)' : 'var(--text-secondary)'
          }}>
            {priority}
          </span>
        </div>
        <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>{title}</h4>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Submitted on {date}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: config.color, fontWeight: 500, fontSize: '0.875rem' }}>
        {config.icon}
        <span>{config.label}</span>
      </div>
    </Card>
  );
};
