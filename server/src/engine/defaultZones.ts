/**
 * Default geographic zones seeded when the Zone table is empty.
 * These demonstrate both circle and polygon zone types.
 */
export const defaultZones = [
  {
    name: 'Lagos Airport Zone',
    description: 'Murtala Muhammed International Airport and surrounding approach corridors. Aviation-critical weather monitoring.',
    type: 'circle' as const,
    centerLat: 6.5774,
    centerLon: 3.3214,
    radiusKm: 15,
    polygon: null,
  },
  {
    name: 'Lagos Coastal Strip',
    description: 'Lagos lagoon and Atlantic coastline. Flood and storm surge monitoring zone.',
    type: 'polygon' as const,
    centerLat: null,
    centerLon: null,
    radiusKm: null,
    polygon: JSON.stringify({
      type: 'Polygon',
      coordinates: [[
        [3.20, 6.40],
        [3.55, 6.40],
        [3.55, 6.50],
        [3.45, 6.55],
        [3.30, 6.55],
        [3.20, 6.50],
        [3.20, 6.40],
      ]],
    }),
  },
  {
    name: 'Abuja Metro',
    description: 'Nnamdi Azikiwe International Airport and Federal Capital Territory. Covers key government and aviation infrastructure.',
    type: 'circle' as const,
    centerLat: 9.0069,
    centerLon: 7.2631,
    radiusKm: 20,
    polygon: null,
  },
];
