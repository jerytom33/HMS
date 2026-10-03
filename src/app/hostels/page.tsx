import { Sparkles, MapPin, Search, Filter, Bed, Wifi, Shield } from 'lucide-react';
import Link from 'next/link';
import { RentIncludedNote } from '@/components/ui/RentIncludedNote';

export default function HostelsList() {
  const hostels = [
    { id: 1, name: 'The Grand Residence', location: 'City Center Campus', price: 400, beds: 12, img: '1522708323590-d24dbb6b0267' },
    { id: 2, name: 'Riverside Student Halls', location: 'North University District', price: 350, beds: 8, img: '1502672260266-1c1f52d11018' },
    { id: 3, name: 'Heritage House', location: 'Old Town Square', price: 550, beds: 3, img: '1600596542815-ffad4c1539a9' },
    { id: 4, name: 'Modern Suites', location: 'Tech Park Avenue', price: 480, beds: 24, img: '1560448204-e02f11c3d0e2' },
  ];

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-background pb-20">
      {/* Header (Simplified for subpages) */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link className="active" href="/">
            <span className="inline-flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full border" style={{ borderColor: 'var(--color-gold)' }}>
                <span className="font-display text-lg leading-none" style={{ color: 'var(--color-gold)' }}>H</span>
              </span>
              <span className="hidden sm:flex flex-col leading-none">
                <span className="font-display text-xl tracking-wide">HMS</span>
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 lg:flex">
            <Link className="text-sm hover:text-primary" href="/">Home</Link>
            <Link className="text-sm hover:text-primary text-primary" href="/hostels">Hostels</Link>
            <Link className="text-sm hover:text-primary" href="/availability">Availability</Link>
            <Link className="text-sm hover:text-primary" href="/about">About</Link>
            <Link className="text-sm hover:text-primary" href="/contact">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <button className="text-sm flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full">
              <Filter className="h-4 w-4" /> Filters
            </button>
          </div>
        </div>
      </header>

      {/* Page Title */}
      <div className="border-b border-border/60 bg-secondary/5 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="mb-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">Our Portfolio</p>
          <h1 className="font-display text-4xl sm:text-5xl">Explore Hostels</h1>
          <p className="mt-3 mx-auto max-w-lg text-sm text-muted-foreground">Find the perfect premium accommodation tailored to your needs.</p>
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {hostels.map((h) => (
            <div key={h.id} className="group relative rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="relative h-64 overflow-hidden">
                <img src={`https://images.unsplash.com/photo-${h.img}?auto=format&fit=crop&q=80&w=800`} alt={h.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                <div className="absolute top-3 left-3 bg-background/90 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                  {h.beds} beds available
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-display text-2xl">{h.name}</h3>
                  <div className="text-right">
                    <span className="block text-xl font-semibold">€{h.price}</span>
                    <span className="text-xs text-muted-foreground">/ month</span>
                    <RentIncludedNote variant="icons" className="flex justify-end mt-1" />
                  </div>
                </div>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                  <MapPin className="h-4 w-4" /> {h.location}
                </p>
                <div className="flex gap-4 mb-6">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"><Wifi className="h-4 w-4" /> High-Speed</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"><Shield className="h-4 w-4" /> 24/7 Security</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"><Bed className="h-4 w-4" /> En-suite</div>
                </div>
                <Link href={`/hostels/${h.id}`} className="block w-full text-center bg-secondary text-secondary-foreground py-3 rounded-xl text-sm font-medium hover:bg-secondary/90 transition-colors">
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
