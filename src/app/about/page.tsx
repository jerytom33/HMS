import { Info, Shield, Users, Sparkles } from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 sm:py-32 bg-secondary/10 overflow-hidden">
          <div className="absolute inset-0 z-0">
             <img src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover opacity-10" alt="University Campus" />
          </div>
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="text-[var(--color-gold)] font-bold tracking-widest uppercase text-sm mb-4 block">About Polska Veed</span>
            <h1 className="font-display text-5xl md:text-7xl mb-6">Redefining Student Living.</h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              We believe that your university years should be spent in an environment that inspires, supports, and elevates you. Welcome to the future of student accommodation.
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card border border-border/50 p-8 rounded-3xl shadow-sm text-center">
              <div className="h-16 w-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Sparkles className="h-8 w-8 text-[var(--color-gold)]" />
              </div>
              <h3 className="font-display text-2xl mb-3">Premium Comfort</h3>
              <p className="text-muted-foreground">Luxury amenities, designer furnishings, and spaces crafted for optimal study and relaxation.</p>
            </div>
            
            <div className="bg-card border border-border/50 p-8 rounded-3xl shadow-sm text-center">
              <div className="h-16 w-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Shield className="h-8 w-8 text-[var(--color-gold)]" />
              </div>
              <h3 className="font-display text-2xl mb-3">Unmatched Security</h3>
              <p className="text-muted-foreground">24/7 on-site staff, secure key-fob entry, and comprehensive CCTV for total peace of mind.</p>
            </div>

            <div className="bg-card border border-border/50 p-8 rounded-3xl shadow-sm text-center">
              <div className="h-16 w-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Users className="h-8 w-8 text-[var(--color-gold)]" />
              </div>
              <h3 className="font-display text-2xl mb-3">Thriving Community</h3>
              <p className="text-muted-foreground">Curated social events, wellness workshops, and networking spaces to build lifelong friendships.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
