const express = require('express');
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
router.use(authenticateToken);

const STATUSES = ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'];

const num = (v) => Number(v);

// Attach paid_total + balance (numbers) to a fee with payments included.
function withTotals(fee) {
  const paid_total = (fee.payments || []).reduce((s, p) => s + num(p.amount), 0);
  const amount = num(fee.amount);
  return {
    ...fee,
    amount,
    payments: (fee.payments || []).map((p) => ({ ...p, amount: num(p.amount) })),
    paid_total,
    balance: Math.max(0, Math.round((amount - paid_total) * 100) / 100),
  };
}

const feeInclude = {
  payments: { orderBy: { paid_at: 'desc' } },
};

// POST /api/fees - Reception/Principal raise a bill against a student.
// Body: { student_id, amount (>0), title?, due_date? (YYYY-MM-DD), status? }
router.post('/', requireRole(['RECEPTION', 'PRINCIPAL']), async (req, res) => {
  const { student_id, amount, title, due_date, status } = req.body || {};
  if (!student_id || amount == null) {
    return res.status(400).json({ error: 'student_id, amount required' });
  }
  if (!(num(amount) > 0)) return res.status(400).json({ error: 'amount must be greater than 0' });
  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const student = await prisma.students.findUnique({ where: { id: student_id } });
  if (!student) return res.status(404).json({ error: 'Student not found' });
  let dueDate = null;
  if (due_date) {
    dueDate = new Date(due_date);
    if (Number.isNaN(dueDate.getTime())) return res.status(400).json({ error: 'Invalid due_date' });
  }
  const fee = await prisma.fees.create({
    data: {
      student_id,
      amount,
      title: String(title || '').trim() || 'Fee',
      due_date: dueDate,
      status: status || 'PENDING',
    },
    include: feeInclude,
  });
  res.status(201).json(withTotals(fee));
});

// POST /api/fees/:id/payments - Reception/Principal collect a payment.
// Body: { amount (>0, capped at balance), note? }. Status auto-updates.
router.post('/:id/payments', requireRole(['RECEPTION', 'PRINCIPAL']), async (req, res) => {
  const fee = await prisma.fees.findUnique({
    where: { id: req.params.id },
    include: feeInclude,
  });
  if (!fee) return res.status(404).json({ error: 'Fee not found' });
  const current = withTotals(fee);
  const pay = num(req.body?.amount);
  if (!(pay > 0)) return res.status(400).json({ error: 'amount must be greater than 0' });
  if (pay - current.balance > 0.009) {
    return res.status(400).json({ error: `Exceeds due balance of ${current.balance.toFixed(2)}` });
  }
  const payment = await prisma.feePayments.create({
    data: {
      fee_id: fee.id,
      amount: req.body.amount,
      received_by: req.user.user_id,
      note: String(req.body?.note || '').trim(),
    },
  });
  const updated = withTotals({
    ...fee,
    payments: [...fee.payments, { ...payment, amount: num(payment.amount) }],
  });
  const status = updated.balance <= 0.009 ? 'PAID' : updated.paid_total > 0 ? 'PARTIAL' : fee.status === 'PAID' || fee.status === 'PARTIAL' ? 'PENDING' : fee.status;
  const saved = await prisma.fees.update({
    where: { id: fee.id },
    data: { status },
    include: feeInclude,
  });
  res.status(201).json({ payment: { ...payment, amount: num(payment.amount) }, fee: withTotals(saved) });
});

// PATCH /api/fees/:id - Reception/Principal update title/amount/due_date/status.
router.patch('/:id', requireRole(['RECEPTION', 'PRINCIPAL']), async (req, res) => {
  const { amount, status, title, due_date } = req.body || {};
  const data = {};
  if (amount != null) {
    if (!(num(amount) > 0)) return res.status(400).json({ error: 'amount must be greater than 0' });
    data.amount = amount;
  }
  if (status) {
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    data.status = status;
  }
  if (title !== undefined) data.title = String(title || '').trim() || 'Fee';
  if (due_date !== undefined) {
    if (!due_date) {
      data.due_date = null;
    } else {
      const d = new Date(due_date);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid due_date' });
      data.due_date = d;
    }
  }
  try {
    const fee = await prisma.fees.update({ where: { id: req.params.id }, data, include: feeInclude });
    res.json(withTotals(fee));
  } catch {
    res.status(404).json({ error: 'Fee not found' });
  }
});

// GET /api/fees?student_id= - Reception/Principal (all/filtered), Student (own only).
router.get('/', requireRole(['RECEPTION', 'PRINCIPAL', 'STUDENT']), async (req, res) => {
  if (req.user.role === 'STUDENT') {
    const profile = await prisma.students.findUnique({ where: { user_id: req.user.user_id } });
    if (!profile) return res.status(404).json({ error: 'Student profile not found' });
    const fees = await prisma.fees.findMany({
      where: { student_id: profile.id },
      include: feeInclude,
      orderBy: { createdAt: 'desc' },
    });
    return res.json(fees.map(withTotals));
  }
  const where = req.query.student_id ? { student_id: req.query.student_id } : {};
  const fees = await prisma.fees.findMany({ where, include: feeInclude, orderBy: { createdAt: 'desc' } });
  res.json(fees.map(withTotals));
});

module.exports = router;
