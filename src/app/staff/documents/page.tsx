import { FileCheck } from 'lucide-react';
import { adminEmptyCard, adminPage } from '@/components/staff/adminStyles';

export default function AdminDocuments() {
  return (
    <div className={adminPage}>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Documents</h1>
      </div>
      <div className={`${adminEmptyCard} text-gray-500 dark:text-gray-400`}>
        <FileCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>Pending document verifications and bulk approvals will be managed here.</p>
      </div>
    </div>
  );
}
