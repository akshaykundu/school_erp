import React, { useEffect, useState } from 'react';
import BrandBanner from '../components/BrandBanner.jsx';
import { API_BASE_URL } from '../config.js';

function TeacherAttendancePage({ classId, teacherUser, onBack }) {
  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busyStudent, setBusyStudent] = useState('');

  async function loadClassroom() {
    if (!classId || !teacherUser?.email) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const encodedTeacherEmail = encodeURIComponent(teacherUser.email);
      const response = await fetch(
        `${API_BASE_URL}/api/classes/${classId}?teacherEmail=${encodedTeacherEmail}`
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Unable to load attendance page.');
        return;
      }

      setClassroom(data.class);
    } catch (requestError) {
      setError('Could not connect to the backend server.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClassroom();
  }, [classId, teacherUser]);

  async function markAttendance(studentEmail, status) {
    setBusyStudent(studentEmail);
    setError('');
    setFeedback('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherEmail: teacherUser.email,
          studentEmail,
          status
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Unable to mark attendance.');
        return;
      }

      setFeedback(data.message);
      await loadClassroom();
    } catch (requestError) {
      setError('Could not connect to the backend server.');
    } finally {
      setBusyStudent('');
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-7xl">
        <BrandBanner subtitle="Teacher Attendance Page" textClassName="text-blue-950" subtextClassName="text-blue-700" className="mb-6" />
        <button
          type="button"
          onClick={onBack}
          className="mb-6 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Back To Class Page
        </button>

        {loading ? <p className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">Loading attendance page...</p> : null}
        {error ? <p className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {feedback ? <p className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</p> : null}

        {classroom ? (
          <>
            <section className="rounded-3xl bg-blue-950 p-8 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">Attendance Page</p>
              <h1 className="mt-3 text-4xl font-bold">
                {classroom.className} - {classroom.section}
              </h1>
              <p className="mt-2 text-blue-100">{classroom.subject}</p>
              <p className="mt-4 text-sm text-blue-100">{classroom.students.length} students available for today&apos;s attendance</p>
            </section>

            <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">Mark Today&apos;s Attendance</h2>
              <div className="mt-6 space-y-4">
                {classroom.students.length ? (
                  classroom.students.map((student) => (
                    <div key={student.email} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-3">
                          {student.profileImage ? (
                            <img src={student.profileImage} alt={student.name} className="h-12 w-12 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-600">
                              {student.name.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-900">{student.name}</p>
                            <p className="text-sm text-slate-500">{student.email}</p>
                            <p className="text-xs text-slate-500">Today: {student.todayAttendance}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => markAttendance(student.email, 'Present')}
                            disabled={busyStudent === student.email}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-emerald-300"
                          >
                            {busyStudent === student.email ? 'Saving...' : 'Present'}
                          </button>
                          <button
                            type="button"
                            onClick={() => markAttendance(student.email, 'Absent')}
                            disabled={busyStudent === student.email}
                            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:bg-rose-300"
                          >
                            {busyStudent === student.email ? 'Saving...' : 'Absent'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No students added to this class yet.</p>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default TeacherAttendancePage;
