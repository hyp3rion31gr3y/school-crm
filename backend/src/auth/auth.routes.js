const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login -> { token, user }
// Accepts full email or bare login id (e.g. aman1111 -> aman1111@school.local).
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }

  let key = String(email).trim().toLowerCase();
  if (!key.includes('@')) key += '@school.local';
  const user = await prisma.users.findUnique({ where: { email: key } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { user_id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role },
  });
});

// PATCH /api/auth/password - logged-in user changes their own password.
router.patch('/password', authenticateToken, async (req, res) => {
  const { current_password, new_password } = req.body || {};
  const next = String(new_password || '');
  if (next.length < 6 || next.length > 72) {
    return res.status(400).json({ error: 'New password must be 6-72 characters' });
  }
  const user = await prisma.users.findUnique({ where: { id: req.user.user_id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const ok = await bcrypt.compare(String(current_password || ''), user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
  await prisma.users.update({
    where: { id: user.id },
    data: { password_hash: await bcrypt.hash(next, 10) },
  });
  res.json({ ok: true });
});

// GET /api/me -> profile + dashboard metadata
router.get('/me', authenticateToken, async (req, res) => {
  const user = await prisma.users.findUnique({
    where: { id: req.user.user_id },
    select: { id: true, email: true, role: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  let dashboard = {};
  if (user.role === 'STUDENT') {
    const profile = await prisma.students.findUnique({
      where: { user_id: user.id },
      select: { id: true, roll_number: true, current_class_id: true },
    });
    dashboard = {
      student_id: profile?.id || null,
      class_id: profile?.current_class_id || null,
      roll_number: profile?.roll_number || null,
    };
  } else if (user.role === 'TEACHER') {
    const classOwned = await prisma.classes.findMany({
      where: { class_teacher_id: user.id },
      select: { id: true, name: true, section: true },
    });
    const subjects = await prisma.classSubjects.findMany({
      where: { subject_teacher_id: user.id },
      select: { id: true, class_id: true, subject_id: true },
    });
    dashboard = { classTeacherOf: classOwned, subjectAssignments: subjects };
  } else if (user.role === 'PEON') {
    dashboard = { links: ['/attendance/me', '/payroll/me'] };
  } else if (user.role === 'RECEPTION') {
    dashboard = { links: ['/users', '/fees', '/attendance'] };
  } else if (user.role === 'PRINCIPAL') {
    dashboard = { links: ['*'], unrestricted: true };
  }

  res.json({ user, dashboard });
});

module.exports = router;
