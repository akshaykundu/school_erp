import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './startpanel.css';
import logo from '../assets/logo3.jpeg';

export default function StartPanel() {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  useEffect(() => {
    if (user && role) {
      navigate(`/${role}`);
    }
  }, [user, role, navigate]);

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

        <button className="start-panel__button" onClick={() => navigate('/admin-login')}>
          Admin
        </button>

        <button className="start-panel__button" onClick={() => navigate('/teacher-login')}>
          Teacher
        </button>

        <button className="start-panel__button" onClick={() => navigate('/student-login')}>
          Student
        </button>
      </div>
    </div>
  );
}
