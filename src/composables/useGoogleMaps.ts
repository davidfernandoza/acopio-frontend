import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

let mapsConfigured = false;

async function ensureGoogleMapsApi(): Promise<typeof google.maps> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GOOGLE_MAPS_API_KEY is not configured');
  }

  if (!mapsConfigured) {
    setOptions({
      key: apiKey,
      v: 'weekly',
    });
    mapsConfigured = true;
  }

  await importLibrary('maps');

  const googleMapsApi = (window as Window & { google: typeof google }).google?.maps;
  if (!googleMapsApi) {
    throw new Error('Google Maps failed to load');
  }

  return googleMapsApi;
}

export async function geocodeAddress(
  addressQuery: string
): Promise<{ latitude: number; longitude: number } | null> {
  await ensureGoogleMapsApi();
  await importLibrary('geocoding');

  const geocoder = new google.maps.Geocoder();
  const response = await geocoder.geocode({ address: addressQuery });
  const firstResult = response.results[0];
  if (!firstResult) {
    return null;
  }

  return {
    latitude: firstResult.geometry.location.lat(),
    longitude: firstResult.geometry.location.lng(),
  };
}

export async function renderMap(options: {
  element: HTMLElement;
  latitude: number;
  longitude: number;
  title?: string;
  zoom?: number;
}) {
  const googleMaps = await ensureGoogleMapsApi();
  const map = new googleMaps.Map(options.element, {
    center: { lat: options.latitude, lng: options.longitude },
    zoom: options.zoom ?? 14,
  });

  new googleMaps.Marker({
    map,
    position: { lat: options.latitude, lng: options.longitude },
    title: options.title || 'Acopio',
  });

  return map;
}

export async function renderEditableLocationMap(options: {
  element: HTMLElement;
  latitude: number;
  longitude: number;
  onPositionChange: (coords: { latitude: number; longitude: number }) => void;
  zoom?: number;
}) {
  const googleMaps = await ensureGoogleMapsApi();
  const map = new googleMaps.Map(options.element, {
    center: { lat: options.latitude, lng: options.longitude },
    zoom: options.zoom ?? 16,
  });

  const marker = new googleMaps.Marker({
    map,
    position: { lat: options.latitude, lng: options.longitude },
    draggable: true,
    title: 'Ubicación del acopio',
  });

  marker.addListener('dragend', () => {
    const position = marker.getPosition();
    if (!position) {
      return;
    }
    options.onPositionChange({
      latitude: position.lat(),
      longitude: position.lng(),
    });
  });

  return { map, marker };
}

export async function renderMarkersMap(options: {
  element: HTMLElement;
  markers: Array<{ latitude: number; longitude: number; title: string; onClick?: () => void }>;
  center?: { latitude: number; longitude: number };
  userLocation?: { latitude: number; longitude: number };
  zoom?: number;
}) {
  const googleMaps = await ensureGoogleMapsApi();
  const firstMarker = options.markers[0];
  const mapCenter = options.center
    ? { lat: options.center.latitude, lng: options.center.longitude }
    : firstMarker
      ? { lat: firstMarker.latitude, lng: firstMarker.longitude }
      : { lat: 4.711, lng: -74.0721 };
  const map = new googleMaps.Map(options.element, {
    center: mapCenter,
    zoom: options.zoom ?? 6,
  });

  if (options.userLocation) {
    new googleMaps.Marker({
      map,
      position: {
        lat: options.userLocation.latitude,
        lng: options.userLocation.longitude,
      },
      title: 'Tu ubicación',
      icon: {
        path: googleMaps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#1f6f5b',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });
  }

  for (const markerData of options.markers) {
    const marker = new googleMaps.Marker({
      map,
      position: { lat: markerData.latitude, lng: markerData.longitude },
      title: markerData.title,
    });

    if (markerData.onClick) {
      marker.addListener('click', markerData.onClick);
    }
  }

  return map;
}

export function getBrowserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  if (!navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  });
}

export function focusMapOnLocation(
  map: google.maps.Map,
  latitude: number,
  longitude: number,
  zoom = 15
) {
  map.panTo({ lat: latitude, lng: longitude });
  map.setZoom(zoom);
}
