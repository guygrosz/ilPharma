// Haversine distance in km
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} מ'`;
  return `${km.toFixed(1)} ק"מ`;
}

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

export function getCurrentLocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS לא זמין בדפדפן זה'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      (err) => reject(new Error(getGeoErrorMessage(err.code))),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

function getGeoErrorMessage(code: number): string {
  switch (code) {
    case 1: return 'הגישה למיקום נדחתה. אנא אפשר גישה למיקום בהגדרות.';
    case 2: return 'לא ניתן לקבוע את המיקום.';
    case 3: return 'זמן קצוב לאיתור המיקום. נסה שוב.';
    default: return 'שגיאה באיתור המיקום.';
  }
}

// Default center of Israel (roughly Tel Aviv area)
export const ISRAEL_CENTER = { lat: 31.7683, lng: 35.2137 };
export const ISRAEL_DEFAULT_ZOOM = 9;
export const PHARMACY_ZOOM = 14;

export const RADIUS_OPTIONS = [5, 10, 15, 20, 25, 30];
