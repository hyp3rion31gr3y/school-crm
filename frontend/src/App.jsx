import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import Dashboard from './pages/Dashboard';
import ClassTeacherAttendance from './pages/teacher/ClassTeacherAttendance';
import SubjectTeacherWorksheets from './pages/teacher/SubjectTeacherWorksheets';
import SubjectTeacherMarks from './pages/teacher/SubjectTeacherMarks';
import StudentDashboard from './pages/student/StudentDashboard';
import PeonDashboard from './pages/staff/PeonDashboard';
import MyAttendance from './pages/shared/MyAttendance';
import ReceptionDashboard from './pages/reception/ReceptionDashboard';
import PrincipalOverview from './pages/principal/PrincipalOverview';

function Placeholder({ title }) {
  return <h1>{title} — Phase 5 builds here</h1>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route
            element={
              <ProtectedRoute allowedRoles={['PRINCIPAL', 'TEACHER', 'STUDENT', 'RECEPTION', 'PEON']}>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            {/* Teacher */}
            <Route
              path="worksheets"
              element={
                <ProtectedRoute allowedRoles={['TEACHER', 'PRINCIPAL']}>
                  <SubjectTeacherWorksheets />
                </ProtectedRoute>
              }
            />
            <Route
              path="marks"
              element={
                <ProtectedRoute allowedRoles={['TEACHER', 'PRINCIPAL']}>
                  <SubjectTeacherMarks />
                </ProtectedRoute>
              }
            />
            {/* Student */}
            <Route
              path="my-worksheets"
              element={
                <ProtectedRoute allowedRoles={['STUDENT', 'PRINCIPAL']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="my-marks"
              element={
                <ProtectedRoute allowedRoles={['STUDENT', 'PRINCIPAL']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            {/* Shared attendance */}
            <Route
              path="attendance"
              element={
                <ProtectedRoute allowedRoles={['TEACHER', 'PRINCIPAL', 'RECEPTION']}>
                  <ClassTeacherAttendance />
                </ProtectedRoute>
              }
            />
            <Route path="my-attendance" element={<MyAttendance />} />
            {/* Reception / Principal */}
            <Route
              path="overview"
              element={
                <ProtectedRoute allowedRoles={['PRINCIPAL']}>
                  <PrincipalOverview />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <ProtectedRoute allowedRoles={['RECEPTION', 'PRINCIPAL']}>
                  <ReceptionDashboard initialTab="students" />
                </ProtectedRoute>
              }
            />
            <Route
              path="students/new"
              element={
                <ProtectedRoute allowedRoles={['RECEPTION', 'PRINCIPAL']}>
                  <ReceptionDashboard initialTab="students" createMode="student" />
                </ProtectedRoute>
              }
            />
            <Route
              path="teachers/new"
              element={
                <ProtectedRoute allowedRoles={['RECEPTION', 'PRINCIPAL']}>
                  <ReceptionDashboard initialTab="teachers" createMode="teacher" />
                </ProtectedRoute>
              }
            />
            <Route
              path="fees"
              element={<Navigate to="/users" replace />}
            />
            <Route
              path="payroll"
              element={
                <ProtectedRoute allowedRoles={['RECEPTION', 'PRINCIPAL']}>
                  <ReceptionDashboard initialTab="payroll" />
                </ProtectedRoute>
              }
            />
            <Route
              path="my-payroll"
              element={
                <ProtectedRoute allowedRoles={['PEON', 'TEACHER', 'RECEPTION', 'PRINCIPAL', 'STUDENT']}>
                  <PeonDashboard />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
