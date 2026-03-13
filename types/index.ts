// Medication types
export interface Medication {
  catCode: number;
  omryName: string;
  genericName?: string;
  manufacturer?: string;
  activeIngredient?: string;
  isGeneric?: boolean;
  registrationNumber?: string;
}

export interface MedicationDetail extends Medication {
  sideEffects?: string[];
  indications?: string;
  contraindications?: string;
  interactions?: string[];
  dosageForm?: string;
  strength?: string;
  generics?: Medication[];
}

// Pharmacy types
export type PharmacyType = 'clalit' | 'private';
export type StockStatus = 'in_stock' | 'limited' | 'out_of_stock' | 'unknown';

export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone?: string;
  lat: number;
  lng: number;
  type: PharmacyType;
  chain?: string; // 'clalit' | 'super-pharm' | 'new-pharm' | 'pharmacy-one' | ...
  isOpen?: boolean;
  openingHours?: string;
  deptCode?: number; // Clalit dept code
  distance?: number; // km from user
}

export interface PharmacyWithStock extends Pharmacy {
  stock?: StockStatus;
  stockLabel?: string;
}

// Search types
export interface SearchFilters {
  radius: number; // km, default 5
  pharmacyType?: 'all' | 'clalit' | 'private';
  stockOnly: boolean;
  city?: string;
  sortBy: 'distance' | 'name' | 'stock';
  drugType?: 'all' | 'original' | 'generic';
}

export const DEFAULT_FILTERS: SearchFilters = {
  radius: 5,
  pharmacyType: 'all',
  stockOnly: false,
  sortBy: 'distance',
  drugType: 'all',
};

// API response types
export interface ClalitMedication {
  catCode: number;
  omryName: string;
}

export interface ClalitPharmacy {
  deptCode: number;
  deptName: string;
}

export interface ClalitCity {
  cityCode: number;
  cityName: string;
}

export interface ClalitStockPharmacy {
  pharmacyName: string;
  pharmacyAdress: string;
  pharmacyPhone: string;
  ifOpenedNow: boolean;
  lat?: number;
  lng?: number;
  deptCode?: number;
  medicationsList: Array<{
    medicationName: string;
    kodStatusMlay: number; // 30=in_stock, 20=limited, 0=out_of_stock, 10=unknown
  }>;
}

export interface StockResult {
  isEmptyResult: boolean;
  isWsError: boolean;
  pharmaciesList: ClalitStockPharmacy[];
}

// Map types
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Search history
export interface SearchHistoryItem {
  query: string;
  catCode?: number;
  timestamp: number;
}

// Notification subscription
export interface AlertSubscription {
  catCode: number;
  drugName: string;
  cityCode?: number;
  cityName?: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}
