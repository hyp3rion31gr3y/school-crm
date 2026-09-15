const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
router.use(authenticateToken);

const LOGIN_DOMAIN = '@school.local';
// 3-32 chars: letters/digits, may contain . _ - inside, never leading/trailing.
const LOGIN_ID_RE = /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/;

// Default student login: firstname + last 4 of aadhar, e.g. "aman" + "1111" -> aman1111.
function defaultLoginId(studentName, aadhar) {
  const first = String(studentName || '')
    .trim()
    .split(/\s+/)[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return `${first || 'st'}${String(aadhar).slice(-4)}`;
}
function loginIdOf(email) {
  const e = String(email || '').toLowerCase();
  return e.endsWith(LOGIN_DOMAIN) ? e.slice(0, -LOGIN_DOMAIN.length) : e;
}

// POST /api/users - Reception/Principal only
// Teacher/Staff body: { email, password, role: TEACHER|PEON|RECEPTION,
//   display_name?, phone?, class_teacher_class_id? (TEACHER only: assign as class teacher) }
// Student admission body: { student_name, father_name, father_phone, mother_name,
//   mother_phone, aadhar_number (12 digits), gender (MALE|FEMALE|OTHER), current_class_id,
//   optional: login_id (custom bare login, 3-32 chars) | email (full, back-compat),
//   password, roll_number (auto-generated when omitted) }
router.post('/', requireRole(['RECEPTION', 'PRINCIPAL']), async (req, res) => {
  const {
    email, password, role, login_id, gender,
    roll_number, current_class_id,
    student_name, father_name, father_phone,
    mother_name, mother_phone, aadhar_number,
    display_name, teacher_name, phone, teacher_phone,
    class_teacher_class_id,
  } = req.body || {};
  if (!role) {
    return res.status(400).json({ error: 'role required' });
  }

  // Reception may only onboard TEACHER, STUDENT, PEON. Principal unrestricted.
  if (req.user.role === 'RECEPTION' && !['TEACHER', 'STUDENT', 'PEON'].includes(role)) {
    return res.status(403).json({ error: 'Reception can only onboard TEACHER, STUDENT, PEON' });
  }
  if (!['TEACHER', 'STUDENT', 'PEON', 'RECEPTION', 'PRINCIPAL'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  // ---- STUDENT admission: new required fields, credentials auto-generated ----
  if (role === 'STUDENT') {
    const digits = (v) => String(v || '').replace(/\D/g, '');
    const aadhar = digits(aadhar_number);
    const fatherPhone = digits(father_phone);
    const motherPhone = digits(mother_phone);

    if (!String(student_name || '').trim()) {
      return res.status(400).json({ error: 'student_name required' });
    }
    if (!String(father_name || '').trim() || fatherPhone.length !== 10) {
      return res.status(400).json({ error: "father_name and 10-digit father_phone required" });
    }
    if (!String(mother_name || '').trim() || motherPhone.length !== 10) {
      return res.status(400).json({ error: "mother_name and 10-digit mother_phone required" });
    }
    if (aadhar.length !== 12) {
      return res.status(400).json({ error: 'aadhar_number must be 12 digits' });
    }
    const genderNorm = String(gender || '').trim().toUpperCase();
    if (!['MALE', 'FEMALE', 'OTHER'].includes(genderNorm)) {
      return res.status(400).json({ error: 'gender required — Male, Female or Other' });
    }
    if (!current_class_id) {
      return res.status(400).json({ error: 'current_class_id (class) required' });
    }

    const cls = await prisma.classes.findUnique({ where: { id: current_class_id } });
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    const dupeAadhar = await prisma.students.findUnique({ where: { aadhar_number: aadhar } });
    if (dupeAadhar) return res.status(409).json({ error: 'Aadhar number already registered' });

    // Login resolution: explicit full email (back-compat) > custom login_id >
    // default firstname+last4-aadhar. Custom collisions 409; defaults auto-suffix.
    const emailRaw = String(email || '').trim();
    // Bare email without @ counts as a custom login id (back-compat).
    const customRaw = String(login_id || (/[@]/.test(emailRaw) ? '' : emailRaw)).trim().toLowerCase();
    let loginId;
    let finalEmail;
    let customLogin = false;
    if (emailRaw.includes('@')) {
      finalEmail = emailRaw;
      loginId = loginIdOf(finalEmail);
    } else if (customRaw) {
      customLogin = true;
      if (!LOGIN_ID_RE.test(customRaw)) {
        return res.status(400).json({ error: 'Login name: 3-32 chars, letters/digits, may contain . _ -' });
      }
      loginId = customRaw;
      finalEmail = `${loginId}${LOGIN_DOMAIN}`;
    } else {
      loginId = defaultLoginId(student_name, aadhar);
      finalEmail = `${loginId}${LOGIN_DOMAIN}`;
    }

    let emailTaken = await prisma.users.findUnique({ where: { email: finalEmail } });
    if (emailTaken && customLogin) {
      return res.status(409).json({ error: 'Login name already taken' });
    }
    if (emailTaken) {
      let n = 1;
      while (emailTaken && n < 50) {
        n += 1;
        loginId = `${defaultLoginId(student_name, aadhar)}${n}`;
        finalEmail = `${loginId}${LOGIN_DOMAIN}`;
        emailTaken = await prisma.users.findUnique({ where: { email: finalEmail } });
      }
      if (emailTaken) return res.status(409).json({ error: 'Login name already taken' });
    }

    const finalPassword = String(password || '') || randomPassword();
    let finalRoll = String(roll_number || '').trim() || `R-${aadhar.slice(-6)}`;
    const rollTaken = await prisma.students.findFirst({
      where: { current_class_id, roll_number: finalRoll },
    });
    if (rollTaken) finalRoll = `R-${aadhar.slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const password_hash = await bcrypt.hash(finalPassword, 10);
    const user = await prisma.users.create({
      data: { email: finalEmail, password_hash, role },
    });
    const studentProfile = await prisma.students.create({
      data: {
        user_id: user.id,
        roll_number: finalRoll,
        current_class_id,
        student_name: String(student_name).trim(),
        father_name: String(father_name).trim(),
        father_phone: fatherPhone,
        mother_name: String(mother_name).trim(),
        mother_phone: motherPhone,
        aadhar_number: aadhar,
        gender: genderNorm,
      },
    });

    const generated = !emailRaw || !password || !roll_number;
    return res.status(201).json({
      user: { id: user.id, email: user.email, role: user.role, login_id: loginIdOf(user.email) },
      studentProfile,
      ...(generated
        ? { credentials: { login_id: loginId, email: finalEmail, password: finalPassword, roll_number: finalRoll } }
        : {}),
    });
  }

  // ---- Staff onboarding: email + password still required ----
  if (!email || !password) {
    return res.status(400).json({ error: 'email, password required' });
  }

  // ---- TEACHER profile: name + 10-digit phone required; optional class-teacher post ----
  // subject_assignments: [{ class_id, subject_id }] - each pair unique to one teacher.
  let teacherName = null;
  let teacherPhone = null;
  let assignedClass = null;
  let subjectPairs = [];
  if (role === 'TEACHER') {
    const digits = (v) => String(v || '').replace(/\D/g, '');
    teacherName = String(display_name || teacher_name || '').trim();
    teacherPhone = digits(phone || teacher_phone);
    if (!teacherName) {
      return res.status(400).json({ error: 'teacher name required' });
    }
    if (teacherPhone.length !== 10) {
      return res.status(400).json({ error: '10-digit teacher phone required' });
    }
    if (class_teacher_class_id) {
      const cls = await prisma.classes.findUnique({ where: { id: class_teacher_class_id } });
      if (!cls) return res.status(404).json({ error: 'Class not found' });
      if (cls.class_teacher_id) {
        return res.status(409).json({ error: 'Class already has a class teacher. Unmark them first.' });
      }
    }
    try {
      subjectPairs = await checkSubjectConflicts(req.body?.subject_assignments || [], null);
    } catch (e) {
      return res.status(e.status || 400).json({ error: e.message });
    }
  }

  const exists = await prisma.users.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: 'Email already exists' });

  const password_hash = await bcrypt.hash(password, 10);
  const user = await prisma.users.create({
    data: {
      email,
      password_hash,
      role,
      ...(role === 'TEACHER' ? { display_name: teacherName, phone: teacherPhone } : {}),
    },
  });

  if (role === 'TEACHER' && class_teacher_class_id) {
    assignedClass = await prisma.classes.update({
      where: { id: class_teacher_class_id },
      data: { class_teacher_id: user.id },
      select: { id: true, name: true, section: true },
    });
  }

  let assignedSubjects = [];
  if (role === 'TEACHER' && subjectPairs.length) {
    assignedSubjects = await applySubjectAssignments(user.id, subjectPairs);
  }

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      display_name: user.display_name,
      phone: user.phone,
    },
    studentProfile: null,
    assignedClass,
    assignedSubjects,
  });
});

// 8-char alphanumeric temp password for auto-generated student logins.
function randomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// Subject-teacher assignment: one teacher per (class, subject) pair.
// checkSubjectConflicts dedupes + verifies existence; teacherId null = pre-create check
// (any occupied pair conflicts), otherwise pairs held by other teachers conflict.
async function checkSubjectConflicts(rawPairs, teacherId) {
  if (!rawPairs) return [];
  if (!Array.isArray(rawPairs)) throw { status: 400, message: 'subject_assignments must be an array' };
  const seen = new Set();
  const pairs = [];
  for (const p of rawPairs) {
    if (!p?.class_id || !p?.subject_id) {
      throw { status: 400, message: 'Each subject assignment needs class_id + subject_id' };
    }
    const key = `${p.class_id}:${p.subject_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ class_id: p.class_id, subject_id: p.subject_id });
  }
  if (!pairs.length) return pairs;

  const classIds = [...new Set(pairs.map((p) => p.class_id))];
  const subjectIds = [...new Set(pairs.map((p) => p.subject_id))];
  const [clsCount, subCount] = await Promise.all([
    prisma.classes.count({ where: { id: { in: classIds } } }),
    prisma.subjects.count({ where: { id: { in: subjectIds } } }),
  ]);
  if (clsCount !== classIds.length) throw { status: 404, message: 'Class not found' };
  if (subCount !== subjectIds.length) throw { status: 404, message: 'Subject not found' };

  const rows = await prisma.classSubjects.findMany({
    where: { OR: pairs.map((p) => ({ class_id: p.class_id, subject_id: p.subject_id })) },
    include: {
      classObj: { select: { name: true, section: true } },
      subject: { select: { name: true } },
    },
  });
  for (const r of rows) {
    if (r.subject_teacher_id && r.subject_teacher_id !== teacherId) {
      throw {
        status: 409,
        message: `${r.subject.name} of ${r.classObj.name} ${r.classObj.section} already has a subject teacher. Unassign them first.`,
      };
    }
  }
  return pairs;
}

// Replace-set a teacher's subject assignments; returns detailed list.
async function applySubjectAssignments(teacherId, pairs) {
  await prisma.classSubjects.updateMany({
    where: { subject_teacher_id: teacherId },
    data: { subject_teacher_id: null },
  });
  for (const p of pairs) {
    await prisma.classSubjects.upsert({
      where: { class_id_subject_id: { class_id: p.class_id, subject_id: p.subject_id } },
      update: { subject_teacher_id: teacherId },
      create: { class_id: p.class_id, subject_id: p.subject_id, subject_teacher_id: teacherId },
    });
  }
  // Drop orphan rows nobody owns and nothing references.
  await prisma.classSubjects.deleteMany({
    where: { subject_teacher_id: null, marks: { none: {} }, worksheets: { none: {} } },
  });
  return prisma.classSubjects.findMany({
    where: { subject_teacher_id: teacherId },
    select: {
      id: true,
      class_id: true,
      subject_id: true,
      classObj: { select: { id: true, name: true, section: true } },
      subject: { select: { id: true, name: true, code: true } },
    },
    orderBy: [{ classObj: { name: 'asc' } }, { subject: { name: 'asc' } }],
  });
}

// PATCH /api/users/:id/class-teacher - mark/unmark a TEACHER as class teacher.
// Body: { class_id: string | null }. null clears any current post.
router.patch('/:id/class-teacher', requireRole(['RECEPTION', 'PRINCIPAL']), async (req, res) => {
  const { class_id } = req.body || {};
  const target = await prisma.users.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role !== 'TEACHER') {
    return res.status(400).json({ error: 'Only TEACHER users can hold a class-teacher post' });
  }

  if (class_id) {
    const cls = await prisma.classes.findUnique({ where: { id: class_id } });
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    if (cls.class_teacher_id && cls.class_teacher_id !== target.id) {
      return res.status(409).json({ error: 'Class already has a class teacher. Unmark them first.' });
    }
    const updated = await prisma.classes.update({
      where: { id: class_id },
      data: { class_teacher_id: target.id },
      select: { id: true, name: true, section: true },
    });
    return res.json({ assignedClass: updated });
  }

  const cleared = await prisma.classes.updateMany({
    where: { class_teacher_id: target.id },
    data: { class_teacher_id: null },
  });
  res.json({ cleared: cleared.count });
});

// PATCH /api/users/:id/subjects - replace-set a TEACHER's subject assignments.
// Body: { assignments: [{ class_id, subject_id }] }. Empty array clears all.
// Each (class, subject) pair admits only one teacher - occupied pairs 409.
router.patch('/:id/subjects', requireRole(['RECEPTION', 'PRINCIPAL']), async (req, res) => {
  const target = await prisma.users.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role !== 'TEACHER') {
    return res.status(400).json({ error: 'Only TEACHER users can hold subject assignments' });
  }
  try {
    const pairs = await checkSubjectConflicts(req.body?.assignments || [], target.id);
    const assignedSubjects = await applySubjectAssignments(target.id, pairs);
    res.json({ assignedSubjects });
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message });
  }
});

// PATCH /api/users/:id/login - Reception/Principal rename a STUDENT login name.
// Body: { login_id }. Email becomes <login_id>@school.local.
router.patch('/:id/login', requireRole(['RECEPTION', 'PRINCIPAL']), async (req, res) => {
  const loginId = String(req.body?.login_id || '').trim().toLowerCase();
  if (!LOGIN_ID_RE.test(loginId)) {
    return res.status(400).json({ error: 'Login name: 3-32 chars, letters/digits, may contain . _ -' });
  }
  const target = await prisma.users.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role !== 'STUDENT') {
    return res.status(400).json({ error: 'Only student logins can be renamed here' });
  }
  const finalEmail = `${loginId}${LOGIN_DOMAIN}`;
  if (finalEmail !== target.email) {
    const taken = await prisma.users.findUnique({ where: { email: finalEmail } });
    if (taken) return res.status(409).json({ error: 'Login name already taken' });
    await prisma.users.update({ where: { id: target.id }, data: { email: finalEmail } });
  }
  res.json({ id: target.id, email: finalEmail, login_id: loginId });
});

// PATCH /api/users/:id/password - Reception/Principal reset a STUDENT password.
// Body: { new_password? }. Omitted -> auto-generated temp password.
// Returns the password so staff can share it with the family.
router.patch('/:id/password', requireRole(['RECEPTION', 'PRINCIPAL']), async (req, res) => {
  const target = await prisma.users.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role !== 'STUDENT') {
    return res.status(400).json({ error: 'Only student passwords can be reset here' });
  }
  let newPass = String(req.body?.new_password || '');
  let generated = false;
  if (!newPass) {
    newPass = randomPassword();
    generated = true;
  }
  if (newPass.length < 6 || newPass.length > 72) {
    return res.status(400).json({ error: 'Password must be 6-72 characters' });
  }
  const password_hash = await bcrypt.hash(newPass, 10);
  await prisma.users.update({ where: { id: target.id }, data: { password_hash } });
  res.json({ id: target.id, login_id: loginIdOf(target.email), password: newPass, generated });
});

// GET /api/users?role= - Reception/Principal directory (teachers/students list)
router.get('/', requireRole(['RECEPTION', 'PRINCIPAL', 'TEACHER']), async (req, res) => {
  const { role } = req.query;
  const where = role ? { role } : {};
  const users = await prisma.users.findMany({
    where,
    select: {
      id: true, email: true, role: true, display_name: true, phone: true, createdAt: true,
      classesOwned: { select: { id: true, name: true, section: true } },
      classesTeaching: {
        select: {
          id: true, class_id: true, subject_id: true,
          classObj: { select: { id: true, name: true, section: true } },
          subject: { select: { id: true, name: true, code: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
});

module.exports = router;
