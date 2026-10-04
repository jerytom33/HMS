'use client';

import { Search, Home, User, Bed, Calendar, MessageCircle, Menu, LogOut, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { AutoTranslate, LanguageToggle } from '@/components/i18n/Language';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === '/student/login' || pathname === '/student/start') {
    return (
      <>
        <AutoTranslate />
        <div className="fixed right-4 top-4 z-50"><LanguageToggle className="bg-card text-muted-foreground" /></div>
        {children}
      </>
    );
  }

  const navItems = [
    { name: 'Find a Room', href: '/student/rooms', icon: Search },
    { name: 'Dashboard', href: '/student', icon: Home },
    { name: 'My Profile', href: '/student/profile', icon: User },
    { name: 'My Room', href: '/student/room', icon: Bed },
    { name: 'Bookings', href: '/student/bookings', icon: Calendar },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AutoTranslate />
      {/* Sidebar - Mobile & Desktop */}
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 flex-col border-r border-border bg-card
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex
      `}>
        <div className="flex h-16 items-center justify-between px-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
            <span className="grid h-8 w-8 place-items-center rounded-full border border-gold">
              <span className="font-display text-lg leading-none text-gold">PV</span>
            </span>
            <span className="font-display text-xl tracking-wide">Student</span>
          </Link>
          <LanguageToggle className="hidden lg:inline-flex text-muted-foreground" />
          <button 
            className="lg:hidden text-muted-foreground hover:text-primary"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link 
                  key={item.name} 
                  href={item.href} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/10 hover:text-primary transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-border">
          <button
            onClick={async () => {
              await fetch('/api/student-auth/logout', { method: 'POST' }).catch(() => {});
              router.replace('/student/login');
              router.refresh();
            }}
            className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden z-10">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full border border-gold">
              <span className="font-display text-lg leading-none text-gold">PV</span>
            </span>
            <span className="font-display text-xl tracking-wide">Student</span>
          </Link>
          <LanguageToggle className="ml-auto mr-2 text-muted-foreground" />
          <button 
            className="p-2 -mr-2"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5 text-muted-foreground" />
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8 relative">
          {children}

          {/* Floating WhatsApp Button */}
          <button className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[#25D366] text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-50">
            <MessageCircle className="h-7 w-7" />
          </button>
        </main>
      </div>
    </div>
  );
}
