'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Photo carousel that fills its (relative, sized) parent: previous/next arrows, dots, swipe on
 * touch screens and arrow keys when focused; optional auto-advance that pauses while hovered.
 * `onOpen` is called with the photo when it is clicked (e.g. to show it full size).
 */
export function PhotoCarousel({ images, name, autoMs = 0, onOpen, fit = 'cover', dotsClass = 'bottom-2' }: { images: string[]; name: string; autoMs?: number; onOpen?: (src: string) => void; fit?: 'cover' | 'contain'; dotsClass?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = images?.length || 0;
  const current = count ? Math.min(index, count - 1) : 0;

  useEffect(() => {
    if (!autoMs || count <= 1 || paused) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), autoMs);
    return () => clearInterval(timer);
  }, [autoMs, count, paused]);

  if (!count) return <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700" />;

  const go = (step: number) => setIndex((current + step + count) % count);
  // The carousel often sits inside a clickable card: its controls must not trigger the card
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div
      className="absolute inset-0 group/carousel select-none"
      role="group" aria-roledescription="carousel" aria-label={`${name} photos`} tabIndex={count > 1 ? 0 : -1}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') { e.stopPropagation(); go(-1); } if (e.key === 'ArrowRight') { e.stopPropagation(); go(1); } }}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) { e.stopPropagation(); go(dx < 0 ? 1 : -1); }
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={current} src={images[current]} alt={`${name} – photo ${current + 1} of ${count}`}
        onClick={onOpen ? (e) => { e.stopPropagation(); onOpen(images[current]); } : undefined}
        className={`w-full h-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} animate-in fade-in duration-500 ${onOpen ? 'cursor-zoom-in' : ''}`}
      />
      {count > 1 && (
        <>
          <button type="button" aria-label="Previous photo" onClick={(e) => { stop(e); go(-1); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:opacity-0 sm:group-hover/carousel:opacity-100 sm:focus-visible:opacity-100 transition-opacity">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" aria-label="Next photo" onClick={(e) => { stop(e); go(1); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:opacity-0 sm:group-hover/carousel:opacity-100 sm:focus-visible:opacity-100 transition-opacity">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute top-2 left-2 z-20 rounded-md bg-black/60 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm" data-no-translate>
            {current + 1} / {count}
          </div>
          <div className={`absolute ${dotsClass} left-1/2 -translate-x-1/2 z-20 flex max-w-[80%] gap-1.5 rounded-full bg-black/40 px-2 py-1.5 backdrop-blur-md`} onClick={stop}>
            {images.map((_, i) => (
              <button key={i} type="button" aria-label={`Photo ${i + 1}`} aria-current={i === current} onClick={(e) => { stop(e); setIndex(i); }}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-4 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
