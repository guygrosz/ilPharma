import Fuse from 'fuse.js';
import type { ClalitMedication } from '@/types';

let fuseInstance: Fuse<ClalitMedication> | null = null;
let cachedList: ClalitMedication[] = [];

export function initFuzzySearch(medications: ClalitMedication[]) {
  cachedList = medications;
  fuseInstance = new Fuse(medications, {
    keys: ['omryName'],
    threshold: 0.4,           // tolerates typos
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
  const results = fuseInstance.search(query.trim(), limit ? { limit } : undefined);
  return results.map((r) => r.item);
}

export function getCachedDrugs(): ClalitMedication[] {
  return cachedList;
}
