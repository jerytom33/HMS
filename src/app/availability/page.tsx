'use client';
import { useState } from 'react';
import { Sparkles, Calendar, MapPin, Search, ChevronRight, Check, Bed } from 'lucide-react';
import Link from 'next/link';
import { RentIncludedNote } from '@/components/ui/RentIncludedNote';
import { formatPLN } from '@/lib/currency';

export default function AvailabilityPage() {
  const [selectedProperty, setSelectedProperty] = useState('');
  
  // Mock data for availability
  const availabilityData = [
    {
      building: 'Block A - Premium',
      floors: [
        {
          floor: 'Floor 1',
          rooms: [
            {
              room: 'Room 101',
              price: 400,
              beds: [
                { id: '101-A', status: 'available' },
                { id: '101-B', status: 'occupied' },
                { id: '101-C', status: 'maintenance' },
              ]
            },
            {
              room: 'Room 102',
              price: 420,
              beds: [
                { id: '102-A', status: 'available' },
                { id: '102-B', status: 'available' },
              ]
            }
          ]
        }
      ]
    }
  ];

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link className="active" href="/">
            <span className="inline-flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full border" style={{ borderColor: 'var(--color-gold)' }}>
                <span className="font-display text-lg leading-none" style={{ color: 'var(--color-gold)' }}>PV</span>
              </span>
              <span className="hidden sm:flex flex-col leading-none">
                <span className="font-display text-xl tracking-wide whitespace-nowrap">Polska Veed</span>
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 lg:flex ml-8">
            <Link className="text-sm hover:text-primary" href="/hostels">Hostels</Link>
            <Link className="text-sm hover:text-primary text-primary" href="/availability">Availability</Link>
          </nav>
        </div>
      </header>

      {/* Page Title & Search */}
      <div className="border-b border-border/60 bg-secondary/5 py-12">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="font-display text-3xl sm:text-4xl mb-8">Check Room Availability</h1>
          
          <div className="bg-card p-2 rounded-full border border-border shadow-sm flex flex-col sm:flex-row gap-2 max-w-3xl mx-auto">
            <div className="flex-1 flex items-center px-4 border-r border-border">
              <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
              <select 
                className="w-full bg-transparent border-none outline-none text-sm focus:ring-0"
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
              >
                <option value="">Select Property...</option>
                <option value="1">The Grand Residence</option>
                <option value="2">Riverside Student Halls</option>
              </select>
            </div>
            <div className="flex-1 flex items-center px-4 border-r border-border">
              <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
              <input type="month" className="w-full bg-transparent border-none outline-none text-sm focus:ring-0 text-muted-foreground" />
            </div>
            <button className="bg-primary text-primary-foreground rounded-full px-6 py-3 text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
              <Search className="h-4 w-4" /> Search
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        {selectedProperty ? (
          <div className="space-y-8">
            {availabilityData.map((bldg, bIdx) => (
              <div key={bIdx} className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="bg-secondary/5 px-6 py-4 border-b border-border">
                  <h2 className="font-display text-xl">{bldg.building}</h2>
                </div>
                <div className="p-6">
                  {bldg.floors.map((fl, fIdx) => (
                    <div key={fIdx} className="mb-8 last:mb-0">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">{fl.floor}</h3>
                      <div className="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                        {fl.rooms.map((room, rIdx) => (
                          <div key={rIdx} className="flex h-full min-w-0 flex-col rounded-xl border border-border p-4">
                            <div className="flex justify-between items-center mb-4">
                              <span className="font-medium">{room.room}</span>
                              <span className="text-sm font-semibold text-primary">{formatPLN(room.price)}/mo</span>
                            </div>
                            <RentIncludedNote variant="inline" className="mb-3" />
                            <div className="space-y-2">
                              {room.beds.map((bed, bdIdx) => (
                                <div 
                                  key={bdIdx} 
                                  className={`flex justify-between items-center p-3 rounded-lg border ${
                                    bed.status === 'available' 
                                      ? 'bg-green-50 border-green-200 cursor-pointer hover:border-green-400 hover:bg-green-100 transition-colors' 
                                      : bed.status === 'occupied'
                                        ? 'bg-secondary/5 border-border/50 opacity-60 cursor-not-allowed'
                                        : 'bg-orange-50 border-orange-200 opacity-60 cursor-not-allowed'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <Bed className={`h-4 w-4 ${bed.status === 'available' ? 'text-green-600' : 'text-muted-foreground'}`} />
                                    <span className={`text-sm font-medium ${bed.status === 'available' ? 'text-green-900' : 'text-muted-foreground'}`}>
                                      Bed {bed.id}
                                    </span>
                                  </div>
                                  <span className={`text-xs uppercase tracking-wider font-semibold ${
                                    bed.status === 'available' ? 'text-green-600' : 
                                    bed.status === 'occupied' ? 'text-muted-foreground' : 'text-orange-600'
                                  }`}>
                                    {bed.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-auto flex justify-end border-t border-border pt-4">
                              <Link href="/booking" className="text-xs font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                                Book Room
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/10 text-muted-foreground mb-4">
              <Search className="h-8 w-8" />
            </div>
            <h3 className="font-display text-2xl mb-2">Select a property</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">Use the search bar above to select a property and check real-time bed availability.</p>
          </div>
        )}
      </div>
    </div>
  );
}
