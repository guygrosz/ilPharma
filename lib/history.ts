import type { SearchHistoryItem } from '@/types';

const HISTORY_KEY = 'pharma-finder-history';
const MAX_HISTORY = 20;

export function getSearchHistory(): SearchHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToHistory(item: Omit<SearchHistoryItem, 'timestamp'>) {
  if (typeof window === 'undefined') return;
  try {
    const history = getSearchHistory();
    const filtered = history.filter((h) => h.query !== item.query);
    const updated = [{ ...item, timestamp: Date.now() }, ...filtered].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
}

export function clearHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HISTORY_KEY);
}
