interface Props {
  lat: number;
  lng: number;
  name: string;
}

export default function NavigationButtons({ lat, lng, name }: Props) {
  const encodedName = encodeURIComponent(name);

  const wazeUrl = `https://waze.com/ul?navigate=yes&ll=${lat},${lng}&q=${encodedName}`;
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_name=${encodedName}`;

  return (
    <div className="flex gap-2 flex-wrap">
      <a
        href={wazeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#33CCFF] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#00bfeb] transition-colors"
        aria-label={`נווט ל-${name} עם Waze`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.54 6.63C19.38 4.43 17.39 2.8 15 2.21V2a1 1 0 0 0-2 0v.21C10.61 2.8 8.62 4.43 7.46 6.63A7.94 7.94 0 0 0 6 11c0 4.27 3.37 7.75 7.6 7.97L14 20h-2a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-1.92l.38-1.04C20.12 18.38 22 15.47 22 12c0-1.89-.5-3.71-1.46-5.37z"/>
        </svg>
        Waze
      </a>
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        aria-label={`נווט ל-${name} עם Google Maps`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#EA4335"/>
        </svg>
        Google Maps
      </a>
    </div>
  );
}
