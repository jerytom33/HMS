'use client';
import { useState } from 'react';
import { ChevronRight, ChevronLeft, Check, Sparkles, Building, Calendar, Bed, User, FileText, CheckSquare, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RentIncludedNote } from '@/components/ui/RentIncludedNote';
import { formatPLN } from '@/lib/currency';

export default function BookingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 7;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      router.push('/booking/BKG-102938');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const steps = [
    { id: 1, title: 'Hostel', icon: Building },
    { id: 2, title: 'Dates', icon: Calendar },
    { id: 3, title: 'Bed', icon: Bed },
    { id: 4, title: 'Details', icon: User },
    { id: 5, title: 'Docs', icon: FileText },
    { id: 6, title: 'Terms', icon: CheckSquare },
    { id: 7, title: 'Payment', icon: CreditCard },
  ];

  return (
    <div className="w-full max-w-full min-h-screen bg-background flex flex-col">
      {/* Simple Header */}
      <header className="border-b border-border bg-background py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full border border-gold">
              <span className="font-display text-lg leading-none text-gold">PV</span>
            </span>
            <span className="font-display text-xl tracking-wide hidden sm:block">Polska Veed Booking</span>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary">Cancel</Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Progress Bar */}
        <div className="bg-secondary/5 border-b border-border py-4">
          <div className="mx-auto max-w-4xl px-4">
            <div className="flex justify-between relative">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -z-10 -translate-y-1/2"></div>
              <div 
                className="absolute top-1/2 left-0 h-0.5 bg-primary -z-10 -translate-y-1/2 transition-all duration-300"
                style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
              ></div>
              
              {steps.map((s) => {
                const Icon = s.icon;
                const isActive = step === s.id;
                const isPast = step > s.id;
                return (
                  <div key={s.id} className="flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isActive ? 'border-primary bg-background text-primary' :
                      isPast ? 'border-primary bg-primary text-primary-foreground' :
                      'border-border bg-background text-muted-foreground'
                    }`}>
                      {isPast ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold hidden sm:block ${
                      isActive ? 'text-primary' : isPast ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {s.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Wizard Content */}
        <div className="flex-1 mx-auto w-full max-w-2xl px-4 py-12">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="font-display text-3xl">Choose your hostel</h2>
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center p-4 border border-border rounded-xl cursor-pointer hover:border-primary transition-colors bg-card">
                    <div className="w-24 h-24 rounded-lg bg-muted mr-4 overflow-hidden">
                      <img src={`https://images.unsplash.com/photo-${i === 1 ? '1522708323590-d24dbb6b0267' : '1502672260266-1c1f52d11018'}?auto=format&fit=crop&q=80&w=200`} className="w-full h-full object-cover" alt="Hostel" />
                    </div>
                    <div>
                      <h3 className="font-medium text-lg">{i === 1 ? 'The Grand Residence' : 'Riverside Student Halls'}</h3>
                      <p className="text-sm text-muted-foreground">From {formatPLN(400)}/month</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="font-display text-3xl">Student Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <input type="text" className="w-full p-3 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary outline-none" placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <input type="email" className="w-full p-3 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary outline-none" placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone / WhatsApp</label>
                  <input type="tel" className="w-full p-3 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary outline-none" placeholder="+1 234 567 890" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nationality</label>
                  <select className="w-full p-3 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary outline-none">
                    <option>Select...</option>
                    <option>International</option>
                    <option>Domestic</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-display text-3xl">Secure Payment</h2>
              <p className="text-muted-foreground">Please complete your payment to finalize the booking.</p>
              
              <div className="bg-card border border-border rounded-xl p-6 text-left max-w-sm mx-auto">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Rent (1st Month)</span>
                  <span className="font-medium">{formatPLN(400, { decimals: true })}</span>
                </div>
                <RentIncludedNote variant="inline" className="mb-3" />
                <div className="flex justify-between mb-4 pb-4 border-b border-border">
                  <span className="text-sm text-muted-foreground">Security Deposit</span>
                  <span className="font-medium">{formatPLN(400, { decimals: true })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Total Due</span>
                  <span className="font-semibold text-lg">{formatPLN(800, { decimals: true })}</span>
                </div>
              </div>
            </div>
          )}

          {step !== 1 && step !== 4 && step !== 7 && (
            <div className="space-y-6 text-center py-20">
              <h2 className="font-display text-3xl">Step {step}: {steps[step-1].title}</h2>
              <p className="text-muted-foreground">This step is part of the wizard flow.</p>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="border-t border-border bg-background py-4 mt-auto">
          <div className="mx-auto flex max-w-2xl justify-between px-4">
            <button 
              onClick={handleBack}
              disabled={step === 1}
              className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            
            <button 
              onClick={handleNext}
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground text-sm font-medium transition-colors hover:bg-primary/90 shadow-md"
            >
              {step === totalSteps ? 'Complete Payment' : 'Continue'} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
