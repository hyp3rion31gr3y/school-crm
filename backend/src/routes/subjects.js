const express = require('express');
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
router.use(authenticateToken);

// GET /api/subjects - subject master list for assignment pickers.
router.get('/', requireRole(['TEACHER', 'PRINCIPAL', 'RECEPTION']), async (req, res) => {
  const subjects = await prisma.subjects.findMany({ orderBy: { name: 'asc' } });
  res.json(subjects);
});

// POST /api/subjects - add a custom subject (code auto-derived when omitted).
router.post('/', requireRole(['PRINCIPAL', 'RECEPTION']), async (req, res) => {
  const name = String(req.body?.name || '').trim();
  let code = String(req.body?.code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  if (!name) return res.status(400).json({ error: 'Subject name required' });
  if (!code) {
    code = name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'SUB';
  }
  const dupe = await prisma.subjects.findUnique({ where: { code } });
  if (dupe) return res.status(409).json({ error: `Subject code ${code} already exists` });
  const created = await prisma.subjects.create({ data: { name, code } });
  res.status(201).json(created);
});

module.exports = router;
