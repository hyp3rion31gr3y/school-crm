const express = require('express');
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
router.use(authenticateToken);
router.use(requireRole(['PRINCIPAL', 'RECEPTION']));

// GET /api/admin/stats - high-level overview for Principal (Reception read-only)
router.get('/stats', async (req, res) => {
  const [totalStudents, usersByRole, fees, todayCount, worksheets, payrollMonth] = await Promise.all([
    prisma.students.count(),
    prisma.users.groupBy({ by: ['role'], _count: { role: true } }),
    prisma.fees.groupBy({ by: ['status'], _sum: { amount: true }, _count: { status: true } }),
    prisma.attendance.count({
      where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.worksheets.count(),
    prisma.payroll.aggregate({
      _sum: { amount_paid: true },
      where: { payment_date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
    }),
  ]);

  const staff = usersByRole
    .filter((r) => ['TEACHER', 'PEON', 'RECEPTION', 'PRINCIPAL'].includes(r.role))
    .reduce((sum, r) => sum + r._count.role, 0);

  res.json({
    totalStudents,
    totalStaff: staff,
    usersByRole: Object.fromEntries(usersByRole.map((r) => [r.role, r._count.role])),
    feesByStatus: fees.map((f) => ({
      status: f.status,
      count: f._count.status,
      total: f._sum.amount?.toString() || '0',
    })),
    attendanceToday: todayCount,
    totalWorksheets: worksheets,
    payrollThisMonth: payrollMonth._sum.amount_paid?.toString() || '0',
  });
});

// GET /api/admin/students - roster with class + fee summary for Reception datagrid
router.get('/students', async (req, res) => {
  const students = await prisma.students.findMany({
    include: {
      user: { select: { id: true, email: true } },
      currentClass: { select: { id: true, name: true, section: true } },
      fees: { select: { id: true, title: true, amount: true, status: true, due_date: true, payments: { orderBy: { paid_at: 'desc' } } }, orderBy: { createdAt: 'desc' } },
    },
    orderBy: { roll_number: 'asc' },
  });
  res.json(
    students.map((s) => ({
      student_id: s.id,
      user_id: s.user_id,
      email: s.user.email,
      login_id: String(s.user.email || '').toLowerCase().endsWith('@school.local')
        ? String(s.user.email).slice(0, -'@school.local'.length)
        : s.user.email,
      roll_number: s.roll_number,
      student_name: s.student_name,
      father_name: s.father_name,
      father_phone: s.father_phone,
      mother_name: s.mother_name,
      mother_phone: s.mother_phone,
      aadhar_number: s.aadhar_number,
      gender: s.gender || '',
      class: s.currentClass,
      fees: s.fees,
      due: s.fees.filter((f) => f.status !== 'PAID').length,
    }))
  );
});

// PATCH /api/admin/students/:id - update student profile fields (gender).
// Reception/Principal (router-level guard).
router.patch('/students/:id', async (req, res) => {
  const { gender } = req.body || {};
  const patch = {};
  if (gender !== undefined) {
    const g = String(gender || '').trim().toUpperCase();
    if (!['MALE', 'FEMALE', 'OTHER'].includes(g)) {
      return res.status(400).json({ error: 'gender must be Male, Female or Other' });
    }
    patch.gender = g;
  }
  if (!Object.keys(patch).length) {
    return res.status(400).json({ error: 'Nothing to update' });
  }
  try {
    const updated = await prisma.students.update({
      where: { id: req.params.id },
      data: patch,
      select: { id: true, gender: true },
    });
    res.json({ student_id: updated.id, gender: updated.gender });
  } catch {
    return res.status(404).json({ error: 'Student not found' });
  }
});

module.exports = router;
