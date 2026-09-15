require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./auth/auth.routes');
const worksheetsRoutes = require('./routes/worksheets');
const marksRoutes = require('./routes/marks');
const attendanceRoutes = require('./routes/attendance');
const usersRoutes = require('./routes/users');
const feesRoutes = require('./routes/fees');
const payrollRoutes = require('./routes/payroll');
const classesRoutes = require('./routes/classes');
const subjectsRoutes = require('./routes/subjects');
const adminRoutes = require('./routes/admin');

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : false,
    credentials: true,
  })
);
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

// Phase 2 endpoints:
// POST /api/auth/login
// GET  /api/me
app.use('/api/auth', authRoutes);
app.use('/api', authRoutes);

// Phase 3 endpoints with RBAC inside each router:
// POST+GET /api/worksheets, POST+GET /api/marks,
// POST+GET /api/attendance + GET /api/attendance/me,
// POST+GET /api/users, POST+PATCH+GET /api/fees,
// POST+GET /api/payroll + GET /api/payroll/me
app.use('/api/worksheets', worksheetsRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/fees', feesRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 4000;
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => console.log(`backend listening on :${PORT}`));
}

module.exports = app;
