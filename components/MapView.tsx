'use client';

import { useEffect, useRef } from 'react';
import type { PharmacyWithStock } from '@/types';
import type { UserLocation } from '@/lib/location';

interface Props {
  pharmacies: PharmacyWithStock[];
  userLocation?: UserLocation;
  selectedId?: string;
  onSelect?: (pharmacy: PharmacyWithStock) => void;
}

// Dynamically import leaflet to avoid SSR issues
let L: typeof import('leaflet') | null = null;

export default function MapView({ pharmacies, userLocation, selectedId, onSelect }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null);
  const markersRef = useRef<import('leaflet').Marker[]>([]);
  const userMarkerRef = useRef<import('leaflet').Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      L = await import('leaflet');

      const map = L.map(mapRef.current!, {
        center: userLocation
          ? [userLocation.lat, userLocation.lng]
          : [32.0853, 34.7818], // Tel Aviv
        zoom: userLocation ? 13 : 9,
        zoomControl: false,
      });

      // Add zoom control on left (RTL-friendly)
      L.control.zoom({ position: 'bottomleft' }).addTo(map);

      // OpenStreetMap tiles (free, no API key)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    };

    initMap();

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update user location marker
  useEffect(() => {
    if (!mapInstanceRef.current || !L || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    const userIcon = L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 3px rgba(37,99,235,0.3)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(mapInstanceRef.current)
      .bindPopup('המיקום שלי');

    mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 13);
  }, [userLocation]);

  // Update pharmacy markers
  useEffect(() => {
    if (!mapInstanceRef.current || !L) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (pharmacies.length === 0) return;

    const bounds: [number, number][] = [];

    for (const ph of pharmacies) {
      if (!ph.lat || !ph.lng) continue;

      const isClalitBranch = ph.type === 'clalit';
      const isSelected = ph.id === selectedId;

      const color = isClalitBranch ? '#2563eb' : '#16a34a';
      const stockDot = ph.stock === 'in_stock' ? '🟢'
        : ph.stock === 'limited' ? '🟡'
        : ph.stock === 'out_of_stock' ? '🔴' : '⚪';

      const icon = L!.divIcon({
        className: '',
        html: `<div style="
          background:${color};color:white;
          border:${isSelected ? '3px solid #fbbf24' : '2px solid white'};
          border-radius:8px;
          padding:4px 8px;
          font-size:11px;font-weight:600;
          white-space:nowrap;
          box-shadow:0 2px 8px rgba(0,0,0,0.25);
          font-family:Heebo,Arial,sans-serif;
          transform:scale(${isSelected ? 1.15 : 1});
          transition:transform 0.15s;
        ">${stockDot} ${ph.name.split(' ').slice(0, 2).join(' ')}</div>`,
        iconAnchor: [0, 0],
      });

      const marker = L!.marker([ph.lat, ph.lng], { icon })
        .addTo(mapInstanceRef.current!)
        .bindPopup(`
          <div dir="rtl" style="font-family:Heebo,Arial,sans-serif;min-width:160px">
            <strong>${ph.name}</strong><br/>
            ${ph.address ? `<span style="color:#64748b;font-size:12px">${ph.address}</span><br/>` : ''}
            ${ph.phone ? `<a href="tel:${ph.phone}" style="color:#2563eb">${ph.phone}</a><br/>` : ''}
            ${ph.stockLabel ? `<span style="font-size:12px">${ph.stockLabel}</span>` : ''}
          </div>
        `);

      marker.on('click', () => onSelect?.(ph));
      markersRef.current.push(marker);
      bounds.push([ph.lat, ph.lng]);
    }

    if (bounds.length > 0 && !userLocation) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [pharmacies, selectedId, userLocation, onSelect]);

  // Pan to selected pharmacy
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedId) return;
    const ph = pharmacies.find((p) => p.id === selectedId);
    if (ph?.lat && ph?.lng) {
      mapInstanceRef.current.setView([ph.lat, ph.lng], 15, { animate: true });
    }
  }, [selectedId, pharmacies]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-slate-200">
      <div ref={mapRef} className="w-full h-full" />
      {pharmacies.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80">
          <p className="text-slate-400 text-sm">חפש תרופה כדי לראות בתי מרקחת על המפה</p>
        </div>
      )}
    </div>
  );
}
