import { CheckCircle2, ChevronRight, MessageCircle, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function BookingSuccess({ params }: { params: { id: string } }) {
  return (
    <div className="w-full max-w-full min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-2xl min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-lg sm:p-10">
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-32 bg-primary/5 -z-10 rounded-t-3xl"></div>
        
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
        </div>
        
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl sm:text-4xl mb-2">Booking Confirmed!</h1>
          <p className="text-muted-foreground">Your reservation is secured. We're excited to welcome you.</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-secondary/10 px-4 py-2 rounded-full font-medium text-sm">
            Booking ID: <span className="font-semibold font-mono">{params.id}</span>
          </div>
        </div>

        <div className="mb-8 min-w-0 overflow-hidden rounded-2xl border border-border bg-background p-4 sm:p-6">
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Booking Summary</h3>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <span className="block text-muted-foreground mb-1">Property</span>
              <span className="font-medium">The Grand Residence</span>
            </div>
            <div>
              <span className="block text-muted-foreground mb-1">Room / Bed</span>
              <span className="font-medium">Room 201, Bed A</span>
            </div>
            <div>
              <span className="block text-muted-foreground mb-1">Check-in</span>
              <span className="font-medium">Sep 1, 2026</span>
            </div>
            <div>
              <span className="block text-muted-foreground mb-1">Status</span>
              <span className="inline-flex items-center gap-1 text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded">
                Paid & Confirmed
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Next Steps</h3>
          
          <Link href="/student" className="group flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary">
            <div className="flex min-w-0 items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-medium text-sm group-hover:text-primary transition-colors">Access Student Portal</div>
                <div className="text-xs text-muted-foreground">View your contract and upload remaining documents</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>

          <a href="#" className="group flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-xl border border-border bg-background p-4 transition-colors hover:border-[#25D366]">
            <div className="flex min-w-0 items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-medium text-sm group-hover:text-[#25D366] transition-colors">WhatsApp Support</div>
                <div className="text-xs text-muted-foreground">Connect with your property manager</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-[#25D366] transition-colors" />
          </a>
        </div>
        
        <div className="mt-10 text-center">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors">
            Return to Homepage <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
