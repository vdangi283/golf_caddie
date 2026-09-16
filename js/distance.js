export const METERS_TO_YARDS = 1.0936133;

export function distanceYards(a, b) {
  const R = 6371000;
  const toRad = value => value * Math.PI / 180;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h)) * METERS_TO_YARDS;
}

export function interpolateGeo(a, b, fraction) {
  return {
    lat: a.lat + (b.lat - a.lat) * fraction,
    lng: a.lng + (b.lng - a.lng) * fraction
  };
}

export function elevationPlayingAdjustmentYards(deltaMeters) {
  // Common caddie approximation: about one playing yard per yard of vertical change.
  return deltaMeters * METERS_TO_YARDS;
}
