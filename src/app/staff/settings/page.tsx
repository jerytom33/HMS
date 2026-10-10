import { Settings } from 'lucide-react';
import { adminEmptyCard, adminPage } from '@/components/staff/adminStyles';

export default function AdminSettings() {
  return (
    <div className={adminPage}>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Settings</h1>
      </div>
      <div className={`${adminEmptyCard} text-gray-500 dark:text-gray-400`}>
        <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>Global application settings and staff permissions.</p>
      </div>
    </div>
  );
}
