'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { searchDrugs } from '@/lib/api';
import { fuzzySearchDrugs, isHebrew, transliterateHebrew } from '@/lib/fuzzy';
import type { ClalitMedication } from '@/types';

interface Props {
  onSelect: (medication: ClalitMedication) => void;
  onSearch?: (query: string) => void;
  initialValue?: string;
  autoFocus?: boolean;
}

export default function SearchBar({ onSelect, onSearch, initialValue = '', autoFocus = false }: Props) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<ClalitMedication[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const fuzzyResults = fuzzySearchDrugs(q, 8);
    if (fuzzyResults.length > 0) {
      setSuggestions(fuzzyResults);
      setIsOpen(true);
    }

    setIsLoading(true);
    try {
      // Also search transliterated Hebrew (e.g. "רמוטיב" → "remotiv")
      const queries = [q];
      if (isHebrew(q)) queries.push(transliterateHebrew(q));

      const allResults = await Promise.all(queries.map(searchDrugs));
      const merged = allResults.flat();
      const seen = new Set<number>();
      const unique = merged.filter(m => {
        if (seen.has(m.catCode)) return false;
        seen.add(m.catCode);
        return true;
      });
      if (unique.length > 0) {
        setSuggestions(unique.slice(0, 10));
        setIsOpen(true);
      }
    } catch {
      // fuzzy results already shown
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setActiveIndex(-1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = (med: ClalitMedication) => {
    setQuery(med.omryName);
    setIsOpen(false);
    setSuggestions([]);
    onSelect(med);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setIsOpen(false);
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      handleSelect(suggestions[activeIndex]);
    } else if (suggestions.length > 0) {
      handleSelect(suggestions[0]);
    } else {
      onSearch?.(query.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      setIsOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          {/* Search icon */}
          <span className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {isLoading ? (
              <svg className="animate-spin w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            )}
          </span>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            placeholder="חפש תרופה בעברית או אנגלית..."
            dir="auto"
            className="w-full rounded-2xl border-2 border-slate-200 bg-white py-4 pe-12 ps-4 text-base text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
            autoComplete="off"
            spellCheck={false}
            aria-label="חיפוש תרופה"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            role="combobox"
          />

          {/* Clear button */}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              aria-label="נקה חיפוש"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Search button */}
        <button
          type="submit"
          disabled={!query.trim()}
          className="flex-shrink-0 rounded-2xl bg-blue-600 px-6 py-4 text-white font-semibold text-base hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          חפש
        </button>
      </div>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          className="absolute top-full mt-2 w-full bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden"
          role="listbox"
        >
          {suggestions.map((med, i) => (
            <li
              key={med.catCode}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={() => handleSelect(med)}
              className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                i === activeIndex
                  ? 'bg-blue-50 text-blue-700'
                  : 'hover:bg-slate-50 text-slate-900'
              } ${i < suggestions.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <span className="font-medium">{med.omryName}</span>
              <span className="text-xs text-slate-400 ms-2">#{med.catCode}</span>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
