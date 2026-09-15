const express = require('express');
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
router.use(authenticateToken);

// POST /api/marks - Subject Teacher only, must own class_subject_id
// Body: { student_id, class_subject_id, score, max_score }
router.post('/', requireRole(['TEACHER']), async (req, res) => {
  const { student_id, class_subject_id, score, max_score } = req.body || {};
  if (!student_id || !class_subject_id || score == null || max_score == null) {
    return res.status(400).json({ error: 'student_id, class_subject_id, score, max_score required' });
  }
  if (Number(score) > Number(max_score)) {
    return res.status(400).json({ error: 'score cannot exceed max_score' });
  }

  // 1. Teacher must be assigned to this class_subject_id
  const assignment = await prisma.classSubjects.findFirst({
    where: { id: class_subject_id, subject_teacher_id: req.user.user_id },
  });
  if (!assignment) {
    return res.status(403).json({ error: 'Not assigned to this class_subject_id' });
  }

  // 2. Student must belong to the same class as the assignment
  const student = await prisma.students.findUnique({ where: { id: student_id } });
  if (!student) return res.status(404).json({ error: 'Student not found' });
  if (student.current_class_id !== assignment.class_id) {
    return res.status(403).json({ error: 'Student not in your assigned class' });
  }

  const mark = await prisma.marks.upsert({
    where: {
      student_id_class_subject_id: { student_id, class_subject_id },
    },
    create: { student_id, class_subject_id, score: Number(score), max_score: Number(max_score) },
    update: { score: Number(score), max_score: Number(max_score) },
  });
  res.status(201).json(mark);
});

// GET /api/marks?class_subject_id=xxx - TEACHER (own subjects), STUDENT (own), PRINCIPAL (all)
router.get('/', requireRole(['TEACHER', 'STUDENT', 'PRINCIPAL']), async (req, res) => {
  const { role, user_id } = req.user;
  const { class_subject_id, student_id } = req.query;

  if (role === 'STUDENT') {
    const profile = await prisma.students.findUnique({ where: { user_id } });
    if (!profile) return res.status(404).json({ error: 'Student profile not found' });
    const where = { student_id: profile.id };
    if (class_subject_id) where.class_subject_id = class_subject_id;
    return res.json(await prisma.marks.findMany({ where }));
  }

  if (role === 'TEACHER') {
    if (!class_subject_id) {
      // List teacher's assignments so UI can pick one
      const mine = await prisma.classSubjects.findMany({
        where: { subject_teacher_id: user_id },
        select: {
          id: true,
          class_id: true,
          subject_id: true,
          classObj: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
        },
      });
      return res.json({ assignments: mine, hint: 'pass ?class_subject_id=' });
    }
    const assignment = await prisma.classSubjects.findFirst({
      where: { id: class_subject_id, subject_teacher_id: user_id },
    });
    if (!assignment) return res.status(403).json({ error: 'Not assigned to this class_subject_id' });
    const where = { class_subject_id };
    if (student_id) where.student_id = student_id;
    return res.json(await prisma.marks.findMany({ where }));
  }

  // PRINCIPAL
  const where = {};
  if (class_subject_id) where.class_subject_id = class_subject_id;
  if (student_id) where.student_id = student_id;
  res.json(await prisma.marks.findMany({ where }));
});

module.exports = router;
