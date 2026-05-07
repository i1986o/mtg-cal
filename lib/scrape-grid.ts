// CONUS scrape grid — anchor points covering the lower 48 for the WotC
// store/event sweep. Each anchor pulls stores within `radiusMi` of its
// coordinates; overlap between anchors is fine (dedup happens by store ID).
//
// Spacing: ~150mi between anchors with a 100mi search radius gives reliable
// coverage with modest overlap. Population-dense regions (NE corridor, CA,
// TX, FL) get a few extra anchors. Alaska and Hawaii are skipped — add later
// if user demand warrants.

export interface ScrapeRegion {
  /** Human label for logs ("Philadelphia", "Houston grid #4"). */
  label: string;
  lat: number;
  lng: number;
  /** Search radius in miles. */
  radiusMi: number;
}

export const CONUS_GRID: ScrapeRegion[] = [
  // === Northeast ===
  { label: "Boston, MA", lat: 42.3601, lng: -71.0589, radiusMi: 100 },
  { label: "Portland, ME", lat: 43.6591, lng: -70.2568, radiusMi: 100 },
  { label: "Burlington, VT", lat: 44.4759, lng: -73.2121, radiusMi: 100 },
  { label: "Albany, NY", lat: 42.6526, lng: -73.7562, radiusMi: 100 },
  { label: "New York, NY", lat: 40.7128, lng: -74.0060, radiusMi: 100 },
  { label: "Philadelphia, PA", lat: 39.9526, lng: -75.1652, radiusMi: 100 },
  { label: "Pittsburgh, PA", lat: 40.4406, lng: -79.9959, radiusMi: 100 },
  { label: "Buffalo, NY", lat: 42.8864, lng: -78.8784, radiusMi: 100 },
  { label: "Washington, DC", lat: 38.9072, lng: -77.0369, radiusMi: 100 },
  { label: "Richmond, VA", lat: 37.5407, lng: -77.4360, radiusMi: 100 },

  // === Southeast ===
  { label: "Raleigh, NC", lat: 35.7796, lng: -78.6382, radiusMi: 100 },
  { label: "Charlotte, NC", lat: 35.2271, lng: -80.8431, radiusMi: 100 },
  { label: "Charleston, SC", lat: 32.7765, lng: -79.9311, radiusMi: 100 },
  { label: "Atlanta, GA", lat: 33.7490, lng: -84.3880, radiusMi: 100 },
  { label: "Savannah, GA", lat: 32.0809, lng: -81.0912, radiusMi: 100 },
  { label: "Jacksonville, FL", lat: 30.3322, lng: -81.6557, radiusMi: 100 },
  { label: "Orlando, FL", lat: 28.5383, lng: -81.3792, radiusMi: 100 },
  { label: "Miami, FL", lat: 25.7617, lng: -80.1918, radiusMi: 100 },
  { label: "Tampa, FL", lat: 27.9506, lng: -82.4572, radiusMi: 100 },
  { label: "Tallahassee, FL", lat: 30.4383, lng: -84.2807, radiusMi: 100 },

  // === Mid-Atlantic / Appalachia ===
  { label: "Roanoke, VA", lat: 37.2710, lng: -79.9414, radiusMi: 100 },
  { label: "Knoxville, TN", lat: 35.9606, lng: -83.9207, radiusMi: 100 },
  { label: "Nashville, TN", lat: 36.1627, lng: -86.7816, radiusMi: 100 },
  { label: "Memphis, TN", lat: 35.1495, lng: -90.0490, radiusMi: 100 },
  { label: "Louisville, KY", lat: 38.2527, lng: -85.7585, radiusMi: 100 },
  { label: "Birmingham, AL", lat: 33.5186, lng: -86.8104, radiusMi: 100 },
  { label: "Mobile, AL", lat: 30.6954, lng: -88.0399, radiusMi: 100 },

  // === Midwest ===
  { label: "Cleveland, OH", lat: 41.4993, lng: -81.6944, radiusMi: 100 },
  { label: "Columbus, OH", lat: 39.9612, lng: -82.9988, radiusMi: 100 },
  { label: "Cincinnati, OH", lat: 39.1031, lng: -84.5120, radiusMi: 100 },
  { label: "Detroit, MI", lat: 42.3314, lng: -83.0458, radiusMi: 100 },
  { label: "Indianapolis, IN", lat: 39.7684, lng: -86.1581, radiusMi: 100 },
  { label: "Chicago, IL", lat: 41.8781, lng: -87.6298, radiusMi: 100 },
  { label: "Milwaukee, WI", lat: 43.0389, lng: -87.9065, radiusMi: 100 },
  { label: "Madison, WI", lat: 43.0731, lng: -89.4012, radiusMi: 100 },
  { label: "Minneapolis, MN", lat: 44.9778, lng: -93.2650, radiusMi: 100 },
  { label: "St. Louis, MO", lat: 38.6270, lng: -90.1994, radiusMi: 100 },
  { label: "Kansas City, MO", lat: 39.0997, lng: -94.5786, radiusMi: 100 },
  { label: "Des Moines, IA", lat: 41.5868, lng: -93.6250, radiusMi: 100 },
  { label: "Omaha, NE", lat: 41.2565, lng: -95.9345, radiusMi: 100 },
  { label: "Fargo, ND", lat: 46.8772, lng: -96.7898, radiusMi: 100 },
  { label: "Sioux Falls, SD", lat: 43.5446, lng: -96.7311, radiusMi: 100 },

  // === South / Gulf Coast ===
  { label: "New Orleans, LA", lat: 29.9511, lng: -90.0715, radiusMi: 100 },
  { label: "Baton Rouge, LA", lat: 30.4515, lng: -91.1871, radiusMi: 100 },
  { label: "Little Rock, AR", lat: 34.7465, lng: -92.2896, radiusMi: 100 },
  { label: "Tulsa, OK", lat: 36.1540, lng: -95.9928, radiusMi: 100 },
  { label: "Oklahoma City, OK", lat: 35.4676, lng: -97.5164, radiusMi: 100 },

  // === Texas ===
  { label: "Dallas, TX", lat: 32.7767, lng: -96.7970, radiusMi: 100 },
  { label: "Houston, TX", lat: 29.7604, lng: -95.3698, radiusMi: 100 },
  { label: "Austin, TX", lat: 30.2672, lng: -97.7431, radiusMi: 100 },
  { label: "San Antonio, TX", lat: 29.4241, lng: -98.4936, radiusMi: 100 },
  { label: "El Paso, TX", lat: 31.7619, lng: -106.4850, radiusMi: 100 },
  { label: "Lubbock, TX", lat: 33.5779, lng: -101.8552, radiusMi: 100 },
  { label: "Corpus Christi, TX", lat: 27.8006, lng: -97.3964, radiusMi: 100 },

  // === Mountain / Southwest ===
  { label: "Denver, CO", lat: 39.7392, lng: -104.9903, radiusMi: 100 },
  { label: "Colorado Springs, CO", lat: 38.8339, lng: -104.8214, radiusMi: 100 },
  { label: "Albuquerque, NM", lat: 35.0844, lng: -106.6504, radiusMi: 100 },
  { label: "Santa Fe, NM", lat: 35.6870, lng: -105.9378, radiusMi: 100 },
  { label: "Phoenix, AZ", lat: 33.4484, lng: -112.0740, radiusMi: 100 },
  { label: "Tucson, AZ", lat: 32.2226, lng: -110.9747, radiusMi: 100 },
  { label: "Las Vegas, NV", lat: 36.1699, lng: -115.1398, radiusMi: 100 },
  { label: "Reno, NV", lat: 39.5296, lng: -119.8138, radiusMi: 100 },
  { label: "Salt Lake City, UT", lat: 40.7608, lng: -111.8910, radiusMi: 100 },
  { label: "Boise, ID", lat: 43.6150, lng: -116.2023, radiusMi: 100 },
  { label: "Billings, MT", lat: 45.7833, lng: -108.5007, radiusMi: 100 },
  { label: "Cheyenne, WY", lat: 41.1400, lng: -104.8202, radiusMi: 100 },

  // === West Coast ===
  { label: "Seattle, WA", lat: 47.6062, lng: -122.3321, radiusMi: 100 },
  { label: "Spokane, WA", lat: 47.6588, lng: -117.4260, radiusMi: 100 },
  { label: "Portland, OR", lat: 45.5152, lng: -122.6784, radiusMi: 100 },
  { label: "Eugene, OR", lat: 44.0521, lng: -123.0868, radiusMi: 100 },
  { label: "San Francisco, CA", lat: 37.7749, lng: -122.4194, radiusMi: 100 },
  { label: "Sacramento, CA", lat: 38.5816, lng: -121.4944, radiusMi: 100 },
  { label: "Fresno, CA", lat: 36.7378, lng: -119.7871, radiusMi: 100 },
  { label: "Los Angeles, CA", lat: 34.0522, lng: -118.2437, radiusMi: 100 },
  { label: "San Diego, CA", lat: 32.7157, lng: -117.1611, radiusMi: 100 },
];
