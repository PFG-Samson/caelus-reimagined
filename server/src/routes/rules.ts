import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET all rules
router.get('/', async (req, res) => {
  try {
    const rules = await prisma.rule.findMany();
    res.json(rules);
  } catch (error) {
    console.error('Error fetching rules:', error);
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

// POST a new rule
router.post('/', async (req, res) => {
  try {
    const { name, signal, operator, threshold, severity, message, category } = req.body;
    
    // Basic validation
    if (!name || !signal || !operator || threshold === undefined || !severity || !message || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const rule = await prisma.rule.create({
      data: {
        name,
        signal,
        operator,
        threshold: Number(threshold),
        severity,
        message,
        category,
      },
    });
    res.status(201).json(rule);
  } catch (error) {
    console.error('Error creating rule:', error);
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

// PUT update an existing rule
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, signal, operator, threshold, severity, message, category } = req.body;
    
    const rule = await prisma.rule.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(signal && { signal }),
        ...(operator && { operator }),
        ...(threshold !== undefined && { threshold: Number(threshold) }),
        ...(severity && { severity }),
        ...(message && { message }),
        ...(category && { category }),
      },
    });
    res.json(rule);
  } catch (error) {
    console.error('Error updating rule:', error);
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

// DELETE a rule
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.rule.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting rule:', error);
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

export default router;
