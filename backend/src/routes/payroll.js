const express = require('express');
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
router.use(authenticateToken);

// POST /api/payroll - Reception/Principal pay staff
// Body: { user_id, amount_paid, payment_date (YYYY-MM-DD) }
router.post('/', requireRole(['RECEPTION', 'PRINCIPAL']), async (req, res) => {
  const { user_id, amount_paid, payment_date } = req.body || {};
  if (!user_id || amount_paid == null || !payment_date) {
    return res.status(400).json({ error: 'user_id, amount_paid, payment_date required' });
  }
  const target = await prisma.users.findUnique({ where: { id: user_id } });
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'STUDENT') {
    return res.status(403).json({ error: 'Cannot pay a student' });
  }
  const row = await prisma.payroll.create({
    data: { user_id, amount_paid, payment_date: new Date(payment_date) },
  });
  res.status(201).json(row);
});

// GET /api/payroll/me?months=12 - Peon (and any staff) views own payroll history
router.get('/me', async (req, res) => {
  const months = Math.min(Number(req.query.months) || 12, 24);
  const rows = await prisma.payroll.findMany({
    where: { user_id: req.user.user_id },
    orderBy: { payment_date: 'desc' },
    take: months,
  });
  res.json(rows);
});

// GET /api/payroll?user_id= - Reception/Principal view any staff payroll
router.get('/', requireRole(['RECEPTION', 'PRINCIPAL']), async (req, res) => {
  const where = req.query.user_id ? { user_id: req.query.user_id } : {};
  res.json(await prisma.payroll.findMany({ where, orderBy: { payment_date: 'desc' } }));
});

module.exports = router;
