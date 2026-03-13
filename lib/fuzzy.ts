import Fuse from 'fuse.js';
import type { ClalitMedication } from '@/types';

let fuseInstance: Fuse<ClalitMedication> | null = null;
let cachedList: ClalitMedication[] = [];

// Hebrew → phonetic English transliteration for drug name search
const HEBREW_TO_LATIN: Record<string, string> = {
  'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h',
  'ו': 'o',  // Most common in drug names (used as vowel)
  'ז': 'z', 'ח': 'h', 'ט': 't', 'י': 'i',
  'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm', 'ם': 'm',
  'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': 'e', 'פ': 'p', 'ף': 'f',
  'צ': 'ts', 'ץ': 'ts', 'ק': 'k', 'ר': 'r', 'ש': 's', 'ת': 't',
};

export function isHebrew(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text);
}

export function transliterateHebrew(text: string): string {
  if (!text || !isHebrew(text)) return text;
  return text.split('').map(c => HEBREW_TO_LATIN[c] ?? c).join('');
}

export function initFuzzySearch(medications: ClalitMedication[]) {
  if (medications.length === 0) return;
  cachedList = medications;
  fuseInstance = new Fuse(medications, {
    keys: ['omryName'],
    threshold: 0.4,
    distance: 200,
    minMatchCharLength: 2,
    includeScore: true,
    shouldSort: true,
    isCaseSensitive: false,
  });
}

export function fuzzySearchDrugs(
  query: string,
  limit?: number
): ClalitMedication[] {
  if (!fuseInstance || !query.trim()) return [];
  const searchQuery = isHebrew(query) ? transliterateHebrew(query) : query;
  const results = fuseInstance.search(searchQuery.trim(), limit ? { limit } : undefined);
  return results.map((r) => r.item);
}

export function getCachedDrugs(): ClalitMedication[] {
  return cachedList;
}
