const express = require('express');
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
router.use(authenticateToken);

async function verifySubjectTeacher(userId, classSubjectId) {
  const assignment = await prisma.classSubjects.findFirst({
    where: { id: classSubjectId, subject_teacher_id: userId },
  });
  return !!assignment;
}

// POST /api/worksheets - Subject Teacher only, verifies class_subject_id
router.post('/', requireRole(['TEACHER']), async (req, res) => {
  const { title, file_url, class_subject_id } = req.body || {};
  if (!title || !file_url || !class_subject_id) {
    return res.status(400).json({ error: 'title, file_url, class_subject_id required' });
  }

  const ok = await verifySubjectTeacher(req.user.user_id, class_subject_id);
  if (!ok) {
    return res.status(403).json({ error: 'Not assigned to this class_subject_id' });
  }

  const ws = await prisma.worksheets.create({
    data: {
      title,
      file_url,
      class_subject_id,
      uploaded_by: req.user.user_id,
    },
  });
  res.status(201).json(ws);
});

// GET /api/worksheets - filtered by role
router.get('/', requireRole(['TEACHER', 'STUDENT', 'PRINCIPAL', 'RECEPTION']), async (req, res) => {
  const { role, user_id } = req.user;

  if (role === 'TEACHER') {
    // Subject Teacher sees own uploads; other teachers get read-only list.
    // canEdit flag drives UI hide/show of Edit/Delete.
    const all = await prisma.worksheets.findMany({
      include: {
        classSubject: { select: { id: true, class_id: true, subject_id: true, subject_teacher_id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const shaped = all.map((w) => ({
      ...w,
      canEdit: w.uploaded_by === user_id,
    }));
    if (req.query.mine === '1') return res.json(shaped.filter((w) => w.uploaded_by === user_id));
    return res.json(shaped);
  }

  if (role === 'STUDENT') {
    const profile = await prisma.students.findUnique({ where: { user_id } });
    if (!profile) return res.status(404).json({ error: 'Student profile not found' });
    const assignments = await prisma.classSubjects.findMany({
      where: { class_id: profile.current_class_id },
      select: { id: true },
    });
    const ids = assignments.map((a) => a.id);
    const list = await prisma.worksheets.findMany({
      where: { class_subject_id: { in: ids } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(list.map((w) => ({ ...w, canEdit: false })));
  }

  // PRINCIPAL + RECEPTION: full read-only access
  const list = await prisma.worksheets.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(list.map((w) => ({ ...w, canEdit: role === 'PRINCIPAL' })));
});

// DELETE /api/worksheets/:id - uploader or Principal only
router.delete('/:id', requireRole(['TEACHER', 'PRINCIPAL']), async (req, res) => {
  const ws = await prisma.worksheets.findUnique({ where: { id: req.params.id } });
  if (!ws) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'PRINCIPAL' && ws.uploaded_by !== req.user.user_id) {
    return res.status(403).json({ error: 'Only uploader or Principal can delete' });
  }
  await prisma.worksheets.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = router;
