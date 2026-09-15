const express = require('express');
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
router.use(authenticateToken);

// GET /api/classes/mine - TEACHER owned classes; RECEPTION/PRINCIPAL all with counts
router.get('/mine', requireRole(['TEACHER', 'PRINCIPAL', 'RECEPTION']), async (req, res) => {
  const where = req.user.role === 'TEACHER' ? { class_teacher_id: req.user.user_id } : {};
  const classes = await prisma.classes.findMany({
    where,
    include: { _count: { select: { students: true } } },
    orderBy: [{ name: 'asc' }, { section: 'asc' }],
  });
  res.json(classes);
});

// GET /api/classes/:id/students - roster with user_id + student_id for attendance/marks
// TEACHER: only own class. PRINCIPAL/RECEPTION: any.
router.get('/:id/students', requireRole(['TEACHER', 'PRINCIPAL', 'RECEPTION']), async (req, res) => {
  const cls = await prisma.classes.findUnique({ where: { id: req.params.id } });
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  if (req.user.role === 'TEACHER' && cls.class_teacher_id !== req.user.user_id) {
    return res.status(403).json({ error: 'Not your class' });
  }
  const students = await prisma.students.findMany({
    where: { current_class_id: req.params.id },
    include: { user: { select: { id: true, email: true } } },
    orderBy: { roll_number: 'asc' },
  });
  res.json(
    students.map((s) => ({
      student_id: s.id,
      user_id: s.user_id,
      roll_number: s.roll_number,
      student_name: s.student_name,
      email: s.user.email,
    }))
  );
});

module.exports = router;
