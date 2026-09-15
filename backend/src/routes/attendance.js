const express = require('express');
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
router.use(authenticateToken);

const STAFF_ROLES = ['TEACHER', 'PEON', 'RECEPTION', 'PRINCIPAL'];

// POST /api/attendance
// - TEACHER (Class Teacher): mark students in own class only
// - RECEPTION/PRINCIPAL: mark staff (TEACHER/PEON/RECEPTION)
// Body: { user_id, date (YYYY-MM-DD), status: PRESENT|ABSENT|LEAVE|HALF_DAY }
router.post('/', requireRole(['TEACHER', 'RECEPTION', 'PRINCIPAL']), async (req, res) => {
  const { user_id, date, status } = req.body || {};
  if (!user_id || !date || !status) {
    return res.status(400).json({ error: 'user_id, date, status required' });
  }
  if (!['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const target = await prisma.users.findUnique({
    where: { id: user_id },
    include: { studentProfile: true },
  });
  if (!target) return res.status(404).json({ error: 'Target user not found' });

  if (req.user.role === 'TEACHER') {
    // Class Teacher may only mark students of classes they own
    if (target.role !== 'STUDENT' || !target.studentProfile) {
      return res.status(403).json({ error: 'Class Teacher can only mark students' });
    }
    const owned = await prisma.classes.findFirst({
      where: { id: target.studentProfile.current_class_id, class_teacher_id: req.user.user_id },
    });
    if (!owned) {
      return res.status(403).json({ error: 'Student not in your class' });
    }
  }

  if (req.user.role === 'RECEPTION') {
    // Reception marks staff only, never students
    if (!STAFF_ROLES.includes(target.role)) {
      return res.status(403).json({ error: 'Reception can only mark staff' });
    }
    if (target.role === 'STUDENT') {
      return res.status(403).json({ error: 'Reception cannot mark students' });
    }
  }
  // PRINCIPAL: unrestricted

  const record = await prisma.attendance.upsert({
    where: { user_id_date: { user_id, date: new Date(date) } },
    create: { user_id, date: new Date(date), status },
    update: { status },
  });
  res.status(201).json(record);
});

// GET /api/attendance/me?month=YYYY-MM - self stats (Peon, Student, all roles)
router.get('/me', async (req, res) => {
  const { month } = req.query;
  const where = { user_id: req.user.user_id };
  if (month) {
    // month=2026-09 -> gte 2026-09-01, lt 2026-10-01
    const [y, m] = month.split('-').map(Number);
    if (!y || !m) return res.status(400).json({ error: 'month must be YYYY-MM' });
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    where.date = { gte: start, lt: end };
  }
  const rows = await prisma.attendance.findMany({ where, orderBy: { date: 'desc' } });
  const summary = rows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  res.json({ rows, summary });
});

// GET /api/attendance?user_id=&month= - TEACHER (own class), RECEPTION/PRINCIPAL (all)
router.get('/', requireRole(['TEACHER', 'RECEPTION', 'PRINCIPAL']), async (req, res) => {
  const { user_id, month } = req.query;
  const where = {};
  if (user_id) where.user_id = user_id;
  if (month) {
    const [y, m] = month.split('-').map(Number);
    if (!y || !m) return res.status(400).json({ error: 'month must be YYYY-MM' });
    where.date = { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) };
  }
  if (req.user.role === 'TEACHER') {
    // Constrain to students of owned classes unless querying self
    if (!user_id) {
      const owned = await prisma.classes.findMany({
        where: { class_teacher_id: req.user.user_id },
        select: { id: true },
      });
      const classIds = owned.map((c) => c.id);
      const students = await prisma.students.findMany({
        where: { current_class_id: { in: classIds } },
        select: { user_id: true },
      });
      const ids = students.map((s) => s.user_id);
      ids.push(req.user.user_id);
      where.user_id = { in: ids };
    } else {
      const target = await prisma.users.findUnique({
        where: { id: user_id },
        include: { studentProfile: true },
      });
      if (target?.role === 'STUDENT' && target.studentProfile) {
        const owned = await prisma.classes.findFirst({
          where: { id: target.studentProfile.current_class_id, class_teacher_id: req.user.user_id },
        });
        if (!owned && user_id !== req.user.user_id) {
          return res.status(403).json({ error: 'Not your class student' });
        }
      } else if (user_id !== req.user.user_id) {
        return res.status(403).json({ error: 'Teachers can only view own class + self' });
      }
    }
  }
  res.json(await prisma.attendance.findMany({ where, orderBy: { date: 'desc' } }));
});

module.exports = router;
