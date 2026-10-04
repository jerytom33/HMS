// English -> Polish for the staff panel and student portal. The UI is written in English;
// with Polish switched on, AutoTranslate swaps each text it finds in PL (exact text) or
// PL_PATTERNS (texts with names, numbers or dates in them). Anything unknown stays English,
// and nothing leaves the browser (no translation service sees names or passport details).
import { PL, PL_INLINE, PL_PATTERNS } from './pl'

export type Lang = 'en' | 'pl'

const exact = new Map(Object.entries(PL).map(([en, pl]) => [norm(en), pl]))

function norm(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function translateLine(line: string): string | null {
  const key = norm(line)
  if (!key || !/[A-Za-z]/.test(key)) return null
  const hit = exact.get(key)
  if (hit !== undefined) return hit
  for (const [re, to] of PL_PATTERNS) {
    if (re.test(key)) {
      // A pattern may contain other known texts (e.g. "Booked {date}"): translate those parts too
      const out = key.replace(re, (...m: string[]) =>
        typeof to === 'function' ? to(...(m.slice(1, -2) as string[])) : to.replace(/\$(\d)/g, (_, i) => translatePart(m[Number(i)] ?? '')),
      )
      if (out !== key) return out
    }
  }
  // Lists joined with " · " (amenities, "Bedroom 2 · Bed A"): translate each part
  if (key.includes(' · ')) {
    const parts = key.split(' · ')
    const out = parts.map((p) => translateLine(p) ?? p)
    if (out.some((t, i) => t !== parts[i])) return out.join(' · ')
  }
  // Finally, system-built labels (Room 101, Bed A, Bedroom 2) inside other texts
  let inline = key
  for (const [re, to] of PL_INLINE) inline = inline.replace(re, to)
  return inline !== key ? inline : null
}

/** A captured part of a pattern: translated when it is itself a known text, else kept. */
export function translatePart(part: string) {
  return exact.get(norm(part)) ?? translateLine(part) ?? part
}

/** Polish for an English UI text, keeping its surrounding spaces; null when unknown. */
export function toPolish(text: string): string | null {
  if (text.includes('\n')) {
    const lines = text.split('\n')
    const out = lines.map((l) => translateLine(l))
    if (out.every((t) => t === null)) return null
    return lines.map((l, i) => (out[i] === null ? l : l.match(/^\s*/)![0] + out[i] + l.match(/\s*$/)![0])).join('\n')
  }
  const t = translateLine(text)
  return t === null ? null : text.match(/^\s*/)![0] + t + text.match(/\s*$/)![0]
}
