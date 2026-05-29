import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ─── GET /api/zones ──────────────────────────────────────────────
// List all zones
router.get('/', async (_req, res) => {
  try {
    const zones = await prisma.zone.findMany({
      include: {
        zoneRules: {
          include: { rule: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(zones);
  } catch (error) {
    console.error('Error fetching zones:', error);
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
});

// ─── GET /api/zones/:id ──────────────────────────────────────────
// Get a single zone with its attached rules
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const zone = await prisma.zone.findUnique({
      where: { id },
      include: {
        zoneRules: {
          include: { rule: true },
        },
      },
    });

    if (!zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    res.json(zone);
  } catch (error) {
    console.error('Error fetching zone:', error);
    res.status(500).json({ error: 'Failed to fetch zone' });
  }
});

// ─── POST /api/zones ─────────────────────────────────────────────
// Create a new zone
router.post('/', async (req, res) => {
  try {
    const { name, description, type, centerLat, centerLon, radiusKm, polygon } = req.body;

    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({ error: 'name and type are required' });
    }

    if (type === 'circle' && (centerLat === undefined || centerLon === undefined || radiusKm === undefined)) {
      return res.status(400).json({ error: 'Circle zones require centerLat, centerLon, and radiusKm' });
    }

    if (type === 'polygon' && !polygon) {
      return res.status(400).json({ error: 'Polygon zones require a polygon GeoJSON string' });
    }

    const zone = await prisma.zone.create({
      data: {
        name,
        description: description || '',
        type,
        centerLat: centerLat !== undefined ? Number(centerLat) : null,
        centerLon: centerLon !== undefined ? Number(centerLon) : null,
        radiusKm: radiusKm !== undefined ? Number(radiusKm) : null,
        polygon: typeof polygon === 'object' ? JSON.stringify(polygon) : polygon || null,
      },
    });

    res.status(201).json(zone);
  } catch (error) {
    console.error('Error creating zone:', error);
    res.status(500).json({ error: 'Failed to create zone' });
  }
});

// ─── PUT /api/zones/:id ──────────────────────────────────────────
// Update a zone
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, type, centerLat, centerLon, radiusKm, polygon, isActive } = req.body;

    const zone = await prisma.zone.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(centerLat !== undefined && { centerLat: Number(centerLat) }),
        ...(centerLon !== undefined && { centerLon: Number(centerLon) }),
        ...(radiusKm !== undefined && { radiusKm: Number(radiusKm) }),
        ...(polygon !== undefined && { polygon: typeof polygon === 'object' ? JSON.stringify(polygon) : polygon }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    res.json(zone);
  } catch (error) {
    console.error('Error updating zone:', error);
    res.status(500).json({ error: 'Failed to update zone' });
  }
});

// ─── DELETE /api/zones/:id ───────────────────────────────────────
// Delete a zone (cascades to ZoneRule associations)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.zone.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting zone:', error);
    res.status(500).json({ error: 'Failed to delete zone' });
  }
});

// ─── POST /api/zones/:id/rules ───────────────────────────────────
// Attach a rule to a zone
router.post('/:id/rules', async (req, res) => {
  try {
    const { id: zoneId } = req.params;
    const { ruleId, thresholdOverride } = req.body;

    if (!ruleId) {
      return res.status(400).json({ error: 'ruleId is required' });
    }

    // Verify both zone and rule exist
    const [zone, rule] = await Promise.all([
      prisma.zone.findUnique({ where: { id: zoneId } }),
      prisma.rule.findUnique({ where: { id: ruleId } }),
    ]);

    if (!zone) return res.status(404).json({ error: 'Zone not found' });
    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    const zoneRule = await prisma.zoneRule.create({
      data: {
        zoneId,
        ruleId,
        thresholdOverride: thresholdOverride !== undefined ? Number(thresholdOverride) : null,
      },
      include: { rule: true, zone: true },
    });

    res.status(201).json(zoneRule);
  } catch (error: any) {
    // Handle unique constraint violation (rule already attached)
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'This rule is already attached to this zone' });
    }
    console.error('Error attaching rule to zone:', error);
    res.status(500).json({ error: 'Failed to attach rule to zone' });
  }
});

// ─── DELETE /api/zones/:id/rules/:ruleId ─────────────────────────
// Detach a rule from a zone
router.delete('/:id/rules/:ruleId', async (req, res) => {
  try {
    const { id: zoneId, ruleId } = req.params;

    await prisma.zoneRule.deleteMany({
      where: { zoneId, ruleId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error detaching rule from zone:', error);
    res.status(500).json({ error: 'Failed to detach rule from zone' });
  }
});

export default router;
