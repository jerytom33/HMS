import { AlertCircle, CreditCard, Calendar, FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { formatPLN } from '@/lib/currency';

export default function StudentDashboard() {
  return (
    <div className="max-w-4xl space-y-8 pb-10">
      <div>
        <h1 className="font-display text-3xl font-medium mb-1">Welcome back, John</h1>
        <p className="text-muted-foreground text-sm">Here's an overview of your stay at The Grand Residence.</p>
      </div>

      {/* Current Stay Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10"></div>
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-primary bg-primary/10 px-2 py-1 rounded">Current Stay</span>
              <h2 className="font-display text-2xl mt-3">The Grand Residence</h2>
              <p className="text-sm text-muted-foreground mt-1">City Center Campus</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-1">Room / Bed</div>
              <div className="font-semibold text-lg">201 / A</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 border-t border-border pt-6 mt-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Check-in</div>
              <div className="font-medium text-sm">Sep 1, 2026</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Check-out</div>
              <div className="font-medium text-sm">Jun 30, 2027</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Next Payment */}
        <Link href="/student/payments" className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-primary transition-colors group">
          <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <CreditCard className="w-5 h-5" />
          </div>
          <h3 className="font-semibold mb-1">Next Payment</h3>
          <p className="text-2xl font-display mb-1">{formatPLN(400, { decimals: true })}</p>
          <p className="text-xs text-orange-600 font-medium">Due in 5 days (Oct 1)</p>
        </Link>

        {/* Pending Documents */}
        <Link href="/student/documents" className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-primary transition-colors group">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h3 className="font-semibold mb-1">Action Required</h3>
          <p className="text-sm text-muted-foreground mb-3">Please upload your Student ID to verify your enrollment status.</p>
          <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
            Upload now <ChevronRight className="w-3 h-3" />
          </span>
        </Link>
      </div>

      {/* Quick Links */}
      <h3 className="font-medium text-lg mt-8 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/student/maintenance" className="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:bg-secondary/5 transition-colors">
          <span className="text-sm font-medium">Report Issue</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Link href="/student/contracts" className="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:bg-secondary/5 transition-colors">
          <span className="text-sm font-medium">View Contract</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Link href="/student/room" className="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:bg-secondary/5 transition-colors">
          <span className="text-sm font-medium">My Roommates</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
