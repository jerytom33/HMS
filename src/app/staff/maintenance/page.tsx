import { Wrench } from 'lucide-react';

export default function AdminMaintenance() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Maintenance</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm">
          Create Ticket
        </button>
      </div>
      <div className="bg-white dark:bg-gray-900 shadow-sm rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
        <Wrench className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>Manage and track facility maintenance requests.</p>
      </div>
    </div>
  );
}
