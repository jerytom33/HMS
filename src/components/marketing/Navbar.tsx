'use client';

import { Sparkles, Menu, Search, User, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  return (
    <>
      {/* Announcement Bar */}
      <div className="w-full border-b border-border/60 bg-gradient-to-r from-primary/10 via-background to-primary/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-1.5 px-3 py-2 text-xs sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <div className="hidden items-center gap-2 text-muted-foreground sm:flex">
            <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--color-gold)' }} />
            <span className="tracking-wide">Premium Student Accommodation · All-inclusive bills · 24/7 Security</span>
          </div>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
            <Link href="/staff" className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary transition hover:bg-primary hover:text-primary-foreground">
              <User className="h-3 w-3" /> Admin Panel
            </Link>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button 
            aria-label="Menu" 
            className="lg:hidden" 
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link className="mr-4 active" href="/">
            <span className="inline-flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full border" style={{ borderColor: 'var(--color-gold)' }}>
                <span className="font-display text-lg leading-none" style={{ color: 'var(--color-gold)' }}>PV</span>
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-display text-2xl tracking-wide whitespace-nowrap">Polska Veed</span>
                <span className="text-[9px] uppercase tracking-[0.28em] opacity-70">Premium Living</span>
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 lg:flex">
            <Link className="text-sm hover:text-primary text-primary" href="/">Home</Link>
            <Link className="text-sm hover:text-primary" href="/hostels">Hostels</Link>
            <Link className="text-sm hover:text-primary" href="/availability">Availability</Link>
            <Link className="text-sm hover:text-primary" href="/about">About</Link>
            <Link className="text-sm hover:text-primary" href="/contact">Contact</Link>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <button aria-label="Search" className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted">
              <Search className="h-4 w-4" />
            </button>
            <Link aria-label="Account" href="/student" className="hidden sm:grid h-9 w-9 place-items-center rounded-full hover:bg-muted">
              <User className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <div 
              className="fixed inset-y-0 left-0 w-full max-w-xs bg-background p-6 shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <Link className="mr-4 active" href="/" onClick={() => setIsMobileMenuOpen(false)}>
                  <span className="inline-flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-full border" style={{ borderColor: 'var(--color-gold)' }}>
                      <span className="font-display text-lg leading-none" style={{ color: 'var(--color-gold)' }}>PV</span>
                    </span>
                    <span className="flex flex-col leading-none">
                      <span className="font-display text-2xl tracking-wide whitespace-nowrap">Polska Veed</span>
                    </span>
                  </span>
                </Link>
                <button type="button" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="h-6 w-6" />
                </button>
              </div>
              <nav className="flex flex-col gap-6 text-lg">
                <Link className="hover:text-primary" href="/" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
                <Link className="hover:text-primary" href="/hostels" onClick={() => setIsMobileMenuOpen(false)}>Hostels</Link>
                <Link className="hover:text-primary" href="/availability" onClick={() => setIsMobileMenuOpen(false)}>Availability</Link>
                <Link className="hover:text-primary" href="/about" onClick={() => setIsMobileMenuOpen(false)}>About</Link>
                <Link className="hover:text-primary" href="/contact" onClick={() => setIsMobileMenuOpen(false)}>Contact</Link>
                <Link className="hover:text-primary flex items-center gap-2" href="/student" onClick={() => setIsMobileMenuOpen(false)}>
                  <User className="h-5 w-5" /> Student Login
                </Link>
              </nav>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
