import React, { useState } from 'react';
import './index.css';

export default function StartPanel() {
    const [userRole, setUserRole] = useState(null);

    return (
        <div className="start-panel">
            <div className="start-panel__container">

                <h1 className="start-panel__title">
                    Welcome to School ERP
                </h1>

                <p>Select your role:</p>

                <button 
                    className="start-panel__button"
                    onClick={() => setUserRole('teacher')}
                >
                    Teacher
                </button>

                <button 
                    className="start-panel__button"
                    onClick={() => setUserRole('admin')}
                >
                    Admin
                </button>

                <button 
                    className="start-panel__button"
                    onClick={() => setUserRole('student')}
                >
                    Student
                </button>

                {userRole && <p>You selected: {userRole}</p>}

            </div>
        </div>
    );
}