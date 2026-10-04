'use client';

import { useEffect, useState } from 'react';
import { toPolish, type Lang } from '@/i18n/translate';

// The chosen language is remembered per browser and shared by every open page
const KEY = 'pv-lang';
const EVENT = 'pv-lang-change';

function readLang(): Lang {
  try {
    return localStorage.getItem(KEY) === 'pl' ? 'pl' : 'en';
  } catch {
    return 'en';
  }
}

export function useLang(): [Lang, (lang: Lang) => void] {
  const [lang, setLangState] = useState<Lang>('en');
  useEffect(() => {
    setLangState(readLang());
    const sync = () => setLangState(readLang());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  const setLang = (next: Lang) => {
    try { localStorage.setItem(KEY, next); } catch {}
    window.dispatchEvent(new Event(EVENT));
  };
  return [lang, setLang];
}

/** EN | PL switch. */
export function LanguageToggle({ className = '' }: { className?: string }) {
  const [lang, setLang] = useLang();
  return (
    <div role="group" aria-label="Language / Język" data-no-translate className={`inline-flex rounded-full border border-current/20 p-0.5 text-xs font-semibold ${className}`}>
      {(['en', 'pl'] as const).map((l) => (
        <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l}
          className={`rounded-full px-2.5 py-1 uppercase transition-colors ${lang === l ? 'bg-blue-600 text-white' : 'opacity-70 hover:opacity-100'}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

const ATTRS = ['placeholder', 'title', 'aria-label'] as const;
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE', 'NOSCRIPT']);

// What each node showed in English and what we put there, so English comes back on switching
// and a new English text from React (re-render) is translated again
type Swap = { en: string; pl: string };
const texts = new WeakMap<Node, Swap>();
const attrs = new WeakMap<Element, Record<string, Swap>>();

function skipped(el: Element | null) {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP.has(e.tagName) || e.hasAttribute('data-no-translate') || (e as HTMLElement).isContentEditable) return true;
  }
  return false;
}

function apply(root: HTMLElement, lang: Lang) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const value = node.nodeValue || '';
    const swap = texts.get(node);
    if (lang === 'en') {
      if (swap && value === swap.pl) node.nodeValue = swap.en;
      texts.delete(node);
      continue;
    }
    if (swap && value === swap.pl) continue;
    if (skipped(node.parentElement)) continue;
    const pl = toPolish(value);
    if (pl !== null && pl !== value) {
      texts.set(node, { en: value, pl });
      node.nodeValue = pl;
    }
  }
  root.querySelectorAll<HTMLElement>(ATTRS.map((a) => `[${a}]`).join(',')).forEach((el) => {
    const done = attrs.get(el) || {};
    for (const a of ATTRS) {
      const value = el.getAttribute(a);
      if (value === null) continue;
      const swap = done[a];
      if (lang === 'en') {
        if (swap && value === swap.pl) el.setAttribute(a, swap.en);
        delete done[a];
        continue;
      }
      if (swap && value === swap.pl) continue;
      if (skipped(el)) continue;
      const pl = toPolish(value);
      if (pl !== null && pl !== value) {
        done[a] = { en: value, pl };
        el.setAttribute(a, pl);
      }
    }
    attrs.set(el, done);
  });
}

/** Keeps the page in the chosen language, including content that appears later. */
export function AutoTranslate() {
  const [lang] = useLang();
  useEffect(() => {
    document.documentElement.lang = lang;
    apply(document.body, lang);
    if (lang === 'en') return;
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; apply(document.body, lang); });
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
    return () => observer.disconnect();
  }, [lang]);
  return null;
}
