export interface AuthUser {
  id: number;
  email: string;
  name: string;
  authProvider?: string;
  mustChangePassword?: boolean;
  hasSeenWelcome?: boolean;
  isManager?: boolean;
  canCreateAcopio?: boolean;
  canManageUsers?: boolean;
}

export interface Country {
  id: number;
  name: string;
  code: string;
  phoneCode: string;
}

export interface Department {
  id: number;
  idCountry: number;
  name: string;
  code: string | null;
}

export interface City {
  id: number;
  idDepartment: number;
  name: string;
  latitude: number | string;
  longitude: number | string;
}

export interface AcopioContact {
  id: number;
  idAcopio: number;
  type: 'whatsapp' | 'email' | 'landline';
  value: string;
  idCountry: number | null;
  localPrefix?: string | null;
  extension?: string | null;
  label: string | null;
  phoneCode?: string | null;
  whatsappLink?: string | null;
  telLink?: string | null;
  mailtoLink?: string | null;
}

export interface AcopioNeed {
  id: number;
  idAcopio: number;
  needType: 'product' | 'money' | 'talent';
  idCategory?: number | null;
  categoryKey?: string | null;
  categoryName?: string | null;
  iconKey: string;
  name: string;
  unit: string | null;
  hasLimit: boolean;
  targetQuantity: number | null;
  receivedQuantity: number;
  description: string | null;
  qrPath?: string | null;
  qrUrl?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
  documentType?: 'cc' | 'ce' | 'nit' | 'passport' | 'ti' | null;
  documentNumber?: string | null;
  limitReached: boolean;
}

export interface AcopioOffer {
  id: number;
  idAcopio: number;
  category: string;
  iconKey: string;
  name: string;
  description: string | null;
  isAvailable: boolean;
}

export interface AcopioImage {
  id: number;
  idAcopio: number;
  sortOrder: number;
  filePath: string;
  imageUrl: string;
}

export interface Acopio {
  id: number;
  idOwner: number;
  name: string;
  description: string | null;
  status: 'open' | 'closed';
  openingMode: 'indefinite' | 'scheduled';
  startsAt: string | null;
  endsAt: string | null;
  responsibleName: string;
  avatarUrl?: string | null;
  avatarPath?: string | null;
  address?: {
    id?: number;
    idCity?: number;
    street: string;
    neighborhood: string | null;
    reference: string | null;
    latitude: number | string;
    longitude: number | string;
    city?: City & {
      department?: Department & {
        country?: Country;
      };
    };
  };
  contacts?: AcopioContact[];
  needs?: AcopioNeed[];
  offers?: AcopioOffer[];
  images?: AcopioImage[];
  owner?: AuthUser;
  canManage?: boolean;
}

export interface CarouselSlide {
  id: number;
  imageUrl: string;
  idAcopio: number;
  acopioName: string;
  shortDescription: string | null;
  status: string;
  cityName: string | null;
  avatarUrl: string;
}

export interface UserMapLocation {
  latitude: number;
  longitude: number;
  cityName: string | null;
}

export interface CarouselResponse {
  matchedCity: { id: number; name: string } | null;
  userLocation: UserMapLocation | null;
  clientIp: string | null;
  slides: CarouselSlide[];
}

export interface MapData {
  idAcopio: number;
  name: string;
  latitude: number;
  longitude: number;
  address: {
    street: string;
    neighborhood: string | null;
    reference: string | null;
    cityName: string | null;
  };
}
