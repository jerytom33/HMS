'use client';

/** A student's round photo, or their initial when they have none. */
export function StudentAvatar({ name, src, size = 40, className = '', title }: { name?: string; src?: string | null; size?: number; className?: string; title?: string }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.42)) };
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name || 'Student'} title={title ?? name} style={style} className={`rounded-full object-cover bg-gray-100 shrink-0 ${className}`} />
  ) : (
    <span title={title ?? name} style={style} data-no-translate className={`rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center shrink-0 ${className}`}>
      {initial}
    </span>
  );
}
