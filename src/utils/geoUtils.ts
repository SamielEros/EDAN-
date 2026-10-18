import { DamageAssessment } from '../types/edan';

// Haversine formula to compute distance in km between two GPS coordinates
export function computeDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Generate direct Google Maps single navigation URL
export function generateGoogleMapsSingleUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

// Generate Google Maps Multi-Waypoint Route URL
export function generateGoogleMapsRouteUrl(assessments: DamageAssessment[]): string {
  if (assessments.length === 0) {
    return 'https://www.google.com/maps/search/?api=1&query=20.8167,-102.7667';
  }

  const sorted = [...assessments].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const origin = `${sorted[0].location.lat},${sorted[0].location.lng}`;
  const destination = `${sorted[sorted.length - 1].location.lat},${sorted[sorted.length - 1].location.lng}`;

  if (sorted.length <= 2) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  }

  const waypoints = sorted
    .slice(1, -1)
    .slice(0, 8)
    .map((item) => `${item.location.lat},${item.location.lng}`)
    .join('|');

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${encodeURIComponent(
    waypoints
  )}&travelmode=driving`;
}
