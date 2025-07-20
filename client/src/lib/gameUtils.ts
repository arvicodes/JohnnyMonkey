/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

/**
 * Format distance for display
 */
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
}

/**
 * Check if user is within range of a point
 */
export function isWithinRange(
  userLat: number,
  userLon: number,
  pointLat: number,
  pointLon: number,
  rangeMeters: number = 50
): boolean {
  const distance = calculateDistance(userLat, userLon, pointLat, pointLon);
  return distance * 1000 <= rangeMeters; // Convert km to meters
}

// Format time duration for display
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Generate random player starting position near school
export function getRandomStartPosition(): { lat: number; lng: number } {
  const schoolLat = 50.3101;
  const schoolLng = 7.5953;
  
  // Random offset within 100m of school
  const offsetLat = (Math.random() - 0.5) * 0.002; // ~100m
  const offsetLng = (Math.random() - 0.5) * 0.002;
  
  return {
    lat: schoolLat + offsetLat,
    lng: schoolLng + offsetLng,
  };
}
