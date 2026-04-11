import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import StartPanel from "./StartPanel/startpanel.jsx";
import AdminLogin from "./AdminPanel/adminlogin.jsx";
import AdminPanel from "./AdminPanel/adminpanel.jsx";
import TeacherLogin from "./TeacherPanel/teacherlogin.jsx";
import TeacherPanel from "./TeacherPanel/teacherpanel.jsx";
import StudentLogin from "./StudentPanel/studentlogin.jsx";
import StudentPanel from "./StudentPanel/studentpanel.jsx";

const ProtectedRoute = ({ role, children }) => {
  const { user, role: userRole } = useAuth();
  if (!user || userRole !== role) {
    return <Navigate to={`/${role}-login`} replace />;
  }
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<StartPanel />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin/*" element={<ProtectedRoute role="admin"><AdminPanel /></ProtectedRoute>} />
      
      <Route path="/teacher-login" element={<TeacherLogin />} />
      <Route path="/teacher/*" element={<ProtectedRoute role="teacher"><TeacherPanel /></ProtectedRoute>} />
      
      <Route path="/student-login" element={<StudentLogin />} />
      <Route path="/student/*" element={<ProtectedRoute role="student"><StudentPanel /></ProtectedRoute>} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;