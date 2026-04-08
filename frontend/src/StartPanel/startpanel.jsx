import React, { useEffect, useState } from 'react';
import './startpanel.css';
import logo from '../assets/logo3.jpeg';
import TeacherPanel from '../TeacherPanel/teacherpanel.jsx';
import TeacherLogin from '../TeacherPanel/teacherlogin.jsx';
import AdminPanel from '../AdminPanel/adminpanel.jsx';
import AdminLogin from '../AdminPanel/adminlogin.jsx';
import StudentPanel from '../StudentPanel/studentpanel.jsx';
import StudentLogin from '../StudentPanel/studentlogin.jsx';

const STORAGE_KEY = 'school-erp-session';

function saveSession(role, user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ role, user }));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export default function StartPanel() {
  const [currentView, setCurrentView] = useState('start');
  const [teacherUser, setTeacherUser] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [studentUser, setStudentUser] = useState(null);

  useEffect(() => {
    const savedSession = localStorage.getItem(STORAGE_KEY);

    if (!savedSession) {
      return;
    }

    try {
      const session = JSON.parse(savedSession);

      if (session.role === 'teacher' && session.user) {
        setTeacherUser(session.user);
        setCurrentView('teacher-panel');
      }

      if (session.role === 'admin' && session.user) {
        setAdminUser(session.user);
        setCurrentView('admin-panel');
      }

      if (session.role === 'student' && session.user) {
        setStudentUser(session.user);
        setCurrentView('student-panel');
      }
    } catch (error) {
      clearSession();
    }
  }, []);

  if (currentView === 'teacher-login') {
    return (
      <TeacherLogin
        onBack={() => setCurrentView('start')}
        onLogin={(user) => {
          setTeacherUser(user);
          saveSession('teacher', user);
          setCurrentView('teacher-panel');
        }}
      />
    );
  }

  if (currentView === 'teacher-panel') {
    return (
      <TeacherPanel
        teacherUser={teacherUser}
        onLogout={() => {
          setTeacherUser(null);
          clearSession();
          setCurrentView('start');
        }}
      />
    );
  }

  if (currentView === 'admin-login') {
    return (
      <AdminLogin
        onBack={() => setCurrentView('start')}
        onLogin={(user) => {
          setAdminUser(user);
          saveSession('admin', user);
          setCurrentView('admin-panel');
        }}
      />
    );
  }

  if (currentView === 'admin-panel') {
    return (
      <AdminPanel
        adminUser={adminUser}
        onLogout={() => {
          setAdminUser(null);
          clearSession();
          setCurrentView('start');
        }}
      />
    );
  }

  if (currentView === 'student-login') {
    return (
      <StudentLogin
        onBack={() => setCurrentView('start')}
        onLogin={(user) => {
          setStudentUser(user);
          saveSession('student', user);
          setCurrentView('student-panel');
        }}
      />
    );
  }

  if (currentView === 'student-panel') {
    return (
      <StudentPanel
        studentUser={studentUser}
        onLogout={() => {
          setStudentUser(null);
          clearSession();
          setCurrentView('start');
        }}
      />
    );
  }

  return (
    <div className="start-panel">
      <div className="start-panel__container">
        <div className="start-panel__brand">
          <img src={logo} alt="Chetan Classes logo" className="start-panel__logo" />
          <div>
            <p className="start-panel__brand-title">CHETAN CLASSES</p>
            <p className="start-panel__brand-subtitle">ERP Portal</p>
          </div>
        </div>

        <h1 className="start-panel__title">Welcome to ERP</h1>

        <p>Select your role:</p>

        <button className="start-panel__button" onClick={() => setCurrentView('admin-login')}>
          Admin
        </button>

        <button className="start-panel__button" onClick={() => setCurrentView('teacher-login')}>
          Teacher
        </button>

        <button className="start-panel__button" onClick={() => setCurrentView('student-login')}>
          Student
        </button>
      </div>
    </div>
  );
}
