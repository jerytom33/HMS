import { Sparkles, MapPin, Search, Filter, Bed, Wifi, Shield, ArrowRight, CheckCircle2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { RentIncludedNote } from '@/components/ui/RentIncludedNote';
import { formatPLN } from '@/lib/currency';

export default function HostelDetail({ params }: { params: { slug: string } }) {
  const hostel = {
    id: params.slug,
    name: 'The Grand Residence',
    location: 'City Center Campus',
    description: 'Experience premium student living in the heart of the city. The Grand Residence offers unparalleled comfort, community, and convenience with state-of-the-art facilities.',
    price: 400,
    beds: 12,
    images: [
      '1522708323590-d24dbb6b0267',
      '1502672260266-1c1f52d11018',
      '1600596542815-ffad4c1539a9'
    ],
    amenities: ['High-Speed Wi-Fi', '24/7 Security', 'En-suite Bathrooms', 'Gym & Fitness Center', 'Study Rooms', 'Cinema Room', 'Laundry Facilities', 'Bike Storage'],
    rules: ['No smoking indoors', 'Quiet hours 11 PM - 7 AM', 'Guests allowed until 10 PM'],
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link href="/hostels" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ChevronLeft className="h-4 w-4" /> Back to Hostels
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-10">
            {/* Hero Gallery */}
            <div className="grid grid-cols-2 gap-4 h-[500px]">
              <div className="col-span-2 sm:col-span-1 h-full rounded-2xl overflow-hidden">
                <img src={`https://images.unsplash.com/photo-${hostel.images[0]}?auto=format&fit=crop&q=80&w=1000`} className="w-full h-full object-cover" alt="Primary" />
              </div>
              <div className="hidden sm:grid grid-rows-2 gap-4 h-full">
                <div className="rounded-2xl overflow-hidden">
                  <img src={`https://images.unsplash.com/photo-${hostel.images[1]}?auto=format&fit=crop&q=80&w=800`} className="w-full h-full object-cover" alt="Secondary" />
                </div>
                <div className="rounded-2xl overflow-hidden relative">
                  <img src={`https://images.unsplash.com/photo-${hostel.images[2]}?auto=format&fit=crop&q=80&w=800`} className="w-full h-full object-cover" alt="Tertiary" />
                  <button className="absolute bottom-4 right-4 bg-background/90 px-4 py-2 rounded-lg text-sm font-medium shadow backdrop-blur">
                    View all photos
                  </button>
                </div>
              </div>
            </div>

            {/* Title & Info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">Premium</span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl mb-4">{hostel.name}</h1>
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-5 w-5" /> {hostel.location}
              </p>
            </div>

            <hr className="border-border" />

            {/* About */}
            <section>
              <h2 className="font-display text-2xl mb-4">About this property</h2>
              <p className="text-muted-foreground leading-relaxed">{hostel.description}</p>
            </section>

            {/* Amenities */}
            <section>
              <h2 className="font-display text-2xl mb-4">What this place offers</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4">
                {hostel.amenities.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-primary" /> {item}
                  </div>
                ))}
              </div>
            </section>
            
            {/* Rules */}
            <section>
              <h2 className="font-display text-2xl mb-4">House Rules</h2>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                {hostel.rules.map((rule, i) => (
                  <li key={i}>{rule}</li>
                ))}
              </ul>
            </section>

          </div>

          {/* Sidebar Booking Card */}
          <div className="relative">
            <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-lg">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <span className="text-3xl font-display font-semibold">{formatPLN(hostel.price)}</span>
                  <span className="text-muted-foreground"> / month</span>
                </div>
              </div>
              <RentIncludedNote variant="full" className="mb-6" />
              
              <div className="rounded-xl border border-border p-4 mb-6">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-border">
                  <span className="text-sm font-medium">Availability</span>
                  <span className="text-sm text-green-600 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> {hostel.beds} beds left
                  </span>
                </div>
                <div className="pt-2 text-xs text-muted-foreground">
                  Select your move-in date in the next step to confirm exact bed availability.
                </div>
              </div>

              <Link href="/booking" className="block w-full text-center bg-primary text-primary-foreground py-4 rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-md">
                Reserve a Bed
              </Link>
              
              <p className="text-center text-xs text-muted-foreground mt-4">
                You won't be charged yet
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
