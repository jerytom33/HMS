'use client';

import { Building2, Users, FileCheck, Wrench, Settings, Search, Bell, Menu, LogOut, CheckSquare, MessageSquare, X, Moon, Sun, Home, BedDouble, Layers, CalendarCheck, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { AutoTranslate, LanguageToggle } from '@/components/i18n/Language';

function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse"></div>;
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-full transition-colors"
      title="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

interface SearchResult {
  type: 'property' | 'student' | 'room' | 'floor';
  label: string;
  sublabel: string;
  href: string;
  icon: React.ReactNode;
}

function UniversalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [properties, setProperties] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [roomOverrides, setRoomOverrides] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load data once on focus
  const loadData = useCallback(() => {
    if (loaded) return;
    setLoaded(true);
    fetch('/api/v1-properties?limit=500').then(r => r.json()).then(d => {
      if (d?.docs) setProperties(d.docs);
    }).catch(() => {});
    fetch('/api/v1-students?limit=500').then(r => r.json()).then(d => {
      if (d?.docs) setStudents(d.docs);
    }).catch(() => {});
    fetch('/api/v1-room-overrides?limit=500').then(r => r.json()).then(d => {
      if (d?.docs) setRoomOverrides(d.docs);
    }).catch(() => {});
  }, [loaded]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Build search results
  const results = useMemo<SearchResult[]>(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const items: SearchResult[] = [];

    // Search properties
    properties.forEach(p => {
      if (p.name?.toLowerCase().includes(q) || p.location?.toLowerCase().includes(q)) {
        items.push({
          type: 'property',
          label: p.name,
          sublabel: p.location || `${p.rooms || 0} rooms · ${p.floors || 0} floors`,
          href: '/staff/properties',
          icon: <Home className="h-4 w-4 text-blue-500" />,
        });
      }
      // Search floors within properties
      if (p.floors) {
        for (let f = 1; f <= p.floors; f++) {
          const floorLabel = `Floor ${f}`;
          if (floorLabel.toLowerCase().includes(q) || `${p.name} floor ${f}`.toLowerCase().includes(q)) {
            items.push({
              type: 'floor',
              label: `${p.name} — Floor ${f}`,
              sublabel: `${p.roomsPerFloor?.[f - 1] || '?'} rooms`,
              href: '/staff/properties',
              icon: <Layers className="h-4 w-4 text-purple-500" />,
            });
          }
        }
      }
    });

    // Search students
    students.forEach(s => {
      const nameMatch = s.name?.toLowerCase().includes(q);
      const emailMatch = s.email?.toLowerCase().includes(q);
      const phoneMatch = s.phone?.toLowerCase().includes(q);
      const roomMatch = s.room?.toLowerCase().includes(q);
      if (nameMatch || emailMatch || phoneMatch || roomMatch) {
        items.push({
          type: 'student',
          label: s.name || 'Unnamed',
          sublabel: [s.property, s.room].filter(Boolean).join(' · ') || s.email || s.phone || 'No details',
          href: `/staff/students/${s.id}`,
          icon: <Users className="h-4 w-4 text-green-500" />,
        });
      }
    });

    // Search room overrides (Room 101, etc.)
    roomOverrides.forEach(r => {
      const key = r.overrideKey || '';
      const parts = key.split('-');
      if (parts.length >= 2) {
        const propId = parts[0];
        const roomNum = parts.slice(1).join('-');
        const prop = properties.find(p => String(p.id) === String(propId));
        const roomLabel = `Room ${roomNum}`;
        if (roomLabel.toLowerCase().includes(q) || `room ${roomNum}`.includes(q)) {
          items.push({
            type: 'room',
            label: roomLabel,
            sublabel: `${prop?.name || 'Unknown'} · ${r.status || 'available'} · ${r.beds || '?'} beds`,
            href: '/staff/properties',
            icon: <BedDouble className="h-4 w-4 text-orange-500" />,
          });
        }
      }
    });

    return items.slice(0, 12);
  }, [query, properties, students, roomOverrides]);

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    router.push(result.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0 && results[activeIdx]) {
      e.preventDefault();
      handleSelect(results[activeIdx]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const typeLabels: Record<string, string> = {
    property: 'Properties',
    floor: 'Floors',
    student: 'Students',
    room: 'Rooms',
  };

  // Group results by type
  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach(r => {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    });
    return groups;
  }, [results]);

  // Flat index for keyboard nav
  let flatIdx = -1;

  return (
    <div className="relative hidden sm:block max-w-md w-full">
      <div className={`flex items-center w-full bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5 transition-all ${isOpen && query ? 'ring-2 ring-blue-500 bg-white dark:bg-gray-900' : ''}`}>
        <Search className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search properties, students, rooms, floors..."
          className="bg-transparent border-none outline-none w-full text-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100"
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); setActiveIdx(-1); }}
          onFocus={() => { loadData(); setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {query && (
          <button onClick={() => { setQuery(''); setIsOpen(false); }} className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && query.trim() && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden max-h-[420px] overflow-y-auto"
        >
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Search className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try searching by property name, student name, room number, or floor</p>
            </div>
          ) : (
            Object.entries(grouped).map(([type, items]) => (
              <div key={type}>
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  {typeLabels[type] || type}
                </div>
                {items.map((result) => {
                  flatIdx++;
                  const idx = flatIdx;
                  return (
                    <button
                      key={`${result.type}-${result.label}-${idx}`}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        activeIdx === idx
                          ? 'bg-blue-50 dark:bg-blue-950/30'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setActiveIdx(idx)}
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        {result.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{result.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{result.sublabel}</p>
                      </div>
                      <span className={`flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                        result.type === 'property' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        result.type === 'student' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        result.type === 'room' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {result.type}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
          <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{results.length} result{results.length !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500">
              <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[9px]">↑↓</kbd>
              <span>navigate</span>
              <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[9px] ml-1">↵</kbd>
              <span>select</span>
              <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[9px] ml-1">esc</kbd>
              <span>close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navItems = [
    { name: 'Dashboard', href: '/staff', icon: Building2 },
    { name: 'Properties', href: '/staff/properties', icon: Building2 },
    { name: 'Students', href: '/staff/students', icon: Users },
    { name: 'Bookings', href: '/staff/bookings', icon: CalendarCheck },
    { name: 'Payments', href: '/staff/payments', icon: CheckSquare },
    { name: 'Rent', href: '/staff/rent', icon: Wallet },
    { name: 'Settings', href: '/staff/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 overflow-hidden">
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
        w-64 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex
      `}>
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800">
          <Link href="/staff" className="flex items-center gap-2 font-bold text-xl tracking-tight text-gray-900 dark:text-white" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="bg-blue-600 text-white p-1.5 rounded-md">
              <Building2 className="w-5 h-5" />
            </div>
            Polska Veed Admin
          </Link>
          <button 
            className="lg:hidden text-gray-500 hover:text-gray-900"
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
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={async () => {
              await fetch('/api/users/logout', { method: 'POST' }).catch(() => {});
              router.replace('/login');
              router.refresh();
            }}
            className="flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 sm:px-6 z-10">
          <div className="flex items-center flex-1" suppressHydrationWarning>
            <button 
              className="p-2 -ml-2 mr-2 lg:hidden text-gray-500 hover:text-gray-900"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <UniversalSearch />
          </div>
          
          <div className="flex items-center gap-4">
            <LanguageToggle className="text-gray-600 dark:text-gray-300" />
            <ThemeToggle />
            <button className="relative p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-full transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
              AM
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
