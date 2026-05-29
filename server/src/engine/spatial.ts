import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Ensures the PostGIS extension is enabled on the database.
 * Called once at server startup.
 */
export async function ensurePostGIS(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS postgis;');
    const result: any[] = await prisma.$queryRawUnsafe('SELECT PostGIS_Version() as version;');
    console.log(`   PostGIS:     v${result[0]?.version || 'unknown'}`);
  } catch (error) {
    console.warn('⚠️  PostGIS extension could not be enabled. Spatial queries will use fallback math.');
    console.warn('   Error:', (error as Error).message);
  }
}

/**
 * Finds all active zones that contain the given coordinate point.
 * Uses PostGIS ST_DWithin for circle zones and ST_Contains for polygon zones.
 * Falls back to Haversine math if PostGIS is unavailable.
 */
export async function findZonesContainingPoint(
  lat: number,
  lon: number
): Promise<Array<{ id: string; name: string; type: string; description: string }>> {
  try {
    // Try PostGIS spatial query first
    const zones = await prisma.$queryRawUnsafe<
      Array<{ id: string; name: string; type: string; description: string }>
    >(`
      SELECT z.id, z.name, z.type, z.description
      FROM "Zone" z
      WHERE z."isActive" = true
      AND (
        -- Circle zones: check if point is within radius
        (
          z.type = 'circle'
          AND z."centerLat" IS NOT NULL
          AND z."centerLon" IS NOT NULL
          AND z."radiusKm" IS NOT NULL
          AND ST_DWithin(
            ST_SetSRID(ST_MakePoint(z."centerLon", z."centerLat"), 4326)::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            z."radiusKm" * 1000
          )
        )
        OR
        -- Polygon zones: check if point is inside polygon
        (
          z.type = 'polygon'
          AND z.polygon IS NOT NULL
          AND ST_Contains(
            ST_SetSRID(ST_GeomFromGeoJSON(z.polygon), 4326),
            ST_SetSRID(ST_MakePoint($1, $2), 4326)
          )
        )
      )
    `, lon, lat);

    return zones;
  } catch (error) {
    // Fallback: use Haversine math for circle zones, skip polygon zones
    console.warn('PostGIS spatial query failed, using Haversine fallback:', (error as Error).message);
    return findZonesContainingPointFallback(lat, lon);
  }
}

/**
 * Haversine fallback for environments without PostGIS.
 * Only supports circle zones (can't do polygon containment without PostGIS).
 */
async function findZonesContainingPointFallback(
  lat: number,
  lon: number
): Promise<Array<{ id: string; name: string; type: string; description: string }>> {
  const allZones = await prisma.zone.findMany({
    where: { isActive: true },
  });

  return allZones.filter((zone) => {
    if (zone.type === 'circle' && zone.centerLat && zone.centerLon && zone.radiusKm) {
      const distance = haversineKm(lat, lon, zone.centerLat, zone.centerLon);
      return distance <= zone.radiusKm;
    }
    // Polygon zones can't be evaluated without PostGIS — skip
    return false;
  }).map(z => ({
    id: z.id,
    name: z.name,
    type: z.type,
    description: z.description,
  }));
}

/**
 * Haversine formula: calculates distance in km between two lat/lon points.
 */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
