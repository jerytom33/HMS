import { Wrench } from 'lucide-react';
import { adminEmptyCard, adminPage } from '@/components/staff/adminStyles';

export default function AdminMaintenance() {
  return (
    <div className={adminPage}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Maintenance</h1>
        <button className="min-h-11 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 sm:w-auto">
          Create Ticket
        </button>
      </div>
      <div className={`${adminEmptyCard} text-gray-500 dark:text-gray-400`}>
        <Wrench className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>Manage and track facility maintenance requests.</p>
      </div>
    </div>
  );
}
