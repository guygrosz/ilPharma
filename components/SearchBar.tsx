'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { searchDrugs } from '@/lib/api';
import { fuzzySearchDrugs } from '@/lib/fuzzy';
import type { ClalitMedication } from '@/types';

interface Props {
  onSelect: (medication: ClalitMedication) => void;
  initialValue?: string;
  autoFocus?: boolean;
}

export default function SearchBar({ onSelect, initialValue = '', autoFocus = false }: Props) {
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

    // Try fuzzy first (instant, no network)
    const fuzzyResults = fuzzySearchDrugs(q, 8);
    if (fuzzyResults.length > 0) {
      setSuggestions(fuzzyResults);
      setIsOpen(true);
    }

    // Also fetch from API for fresh results
    setIsLoading(true);
    try {
      const apiResults = await searchDrugs(q);
      if (apiResults.length > 0) {
        setSuggestions(apiResults.slice(0, 10));
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
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
    <div className="relative w-full">
      <div className="relative flex items-center">
        {/* Search icon */}
        <span className="absolute end-3 text-slate-400 pointer-events-none">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
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
          className="search-input w-full rounded-2xl border-2 border-slate-200 bg-white py-4 pe-12 ps-4 text-base text-slate-900 placeholder-slate-400 focus:border-blue-500 transition-colors"
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
            onClick={handleClear}
            className="absolute start-3 text-slate-400 hover:text-slate-600 p-1"
            aria-label="נקה חיפוש"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Loading spinner */}
        {isLoading && (
          <span className="absolute start-10 animate-spin text-blue-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
            </svg>
          </span>
        )}
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
              onClick={() => handleSelect(med)}
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
    </div>
  );
}
