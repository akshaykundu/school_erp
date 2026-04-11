import React, { useEffect, useState } from 'react';
import BrandBanner from '../components/BrandBanner.jsx';
import { API_BASE_URL } from '../config.js';

function formatDisplayTime(timeValue) {
  if (!timeValue) {
    return 'Not set';
  }

  const [hours = '00', minutes = '00'] = timeValue.split(':');
  const parsedHours = Number(hours);

  if (Number.isNaN(parsedHours)) {
    return timeValue;
  }

  const suffix = parsedHours >= 12 ? 'PM' : 'AM';
  const hour12 = parsedHours % 12 || 12;
  return `${hour12}:${minutes} ${suffix}`;
}

function AdminExamPage({ classId, adminUser, exam, onBack }) {
  const [examData, setExamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busyStudent, setBusyStudent] = useState('');

  async function loadExamData() {
    if (!classId || !adminUser?.email || !exam) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        adminEmail: adminUser.email,
        subject: exam.subject,
        date: exam.date,
        time: exam.time,
        room: exam.room
      });
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/exams/details?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Unable to load exam details.');
        return;
      }

      setExamData(data);
    } catch (requestError) {
      setError('Could not connect to the backend server.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExamData();
  }, [classId, adminUser, exam]);

  function updateLocalStudent(studentEmail, updates) {
    setExamData((currentData) => {
      if (!currentData) {
        return currentData;
      }

      return {
        ...currentData,
        students: currentData.students.map((student) =>
          student.email === studentEmail ? { ...student, ...updates } : student
        )
      };
    });
  }

  async function saveStudentResult(student) {
    if (student.attendanceStatus === 'Pending') {
      setError('Select Present or Absent before saving the exam result.');
      setFeedback('');
      return;
    }

    if (student.attendanceStatus === 'Present' && !String(student.marksObtained || '').trim()) {
      setError('Enter marks for present students before saving.');
      setFeedback('');
      return;
    }

    setBusyStudent(student.email);
    setError('');
    setFeedback('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/exams/marks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: adminUser.email,
          studentEmail: student.email,
          subject: exam.subject,
          date: exam.date,
          time: exam.time,
          room: exam.room,
          marksObtained: student.marksObtained,
          attendanceStatus: student.attendanceStatus
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Unable to update exam result.');
        return;
      }

      setFeedback(data.message);
      await loadExamData();
    } catch (requestError) {
      setError('Could not connect to the backend server.');
    } finally {
      setBusyStudent('');
    }
  }

  return (
    <div className="min-h-screen bg-orange-50 p-5">
      <div className="mx-auto max-w-7xl">
        <BrandBanner subtitle="Admin Exam Page" textClassName="text-orange-900" subtextClassName="text-orange-700" className="mb-4" />
        <button
          type="button"
          onClick={onBack}
          className="mb-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Back To Class Page
        </button>

        {loading ? <p className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">Loading exam page...</p> : null}
        {error ? <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {feedback ? <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{feedback}</p> : null}

        {examData ? (
          <>
            <section className="rounded-xl bg-slate-900 p-5 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">Exam Page</p>
              <h1 className="mt-2 text-4xl font-bold">{examData.exam.subject}</h1>
              <p className="mt-2 text-slate-200">
                {examData.class.className} | {examData.exam.date} | {formatDisplayTime(examData.exam.time)}
              </p>
              <p className="mt-2 text-slate-200">Room: {examData.exam.room} | Max Marks: {examData.exam.maxMarks}</p>
            </section>

            <section className="mt-4 rounded-xl bg-white p-4 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">Student Exam Results</h2>
              <div className="mt-3 space-y-4">
                {examData.students.length ? examData.students.map((student) => (
                  <div key={student.email} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex items-center gap-3">
                        {student.profileImage ? (
                          <img src={student.profileImage} alt={student.name} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-600">
                            {student.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900">{student.name}</p>
                          <p className="text-sm text-slate-500">{student.email}</p>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3 xl:min-w-[620px]">
                        <select
                          value={student.attendanceStatus}
                          onChange={(event) => {
                            const nextStatus = event.target.value;
                            updateLocalStudent(student.email, {
                              attendanceStatus: nextStatus,
                              marksObtained: nextStatus === 'Absent' ? 'Absent' : ''
                            });
                          }}
                          className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                        </select>

                        <input
                          type="number"
                          min="0"
                          max={student.maxMarks}
                          value={student.attendanceStatus === 'Absent' ? '' : student.marksObtained}
                          onChange={(event) => updateLocalStudent(student.email, {
                            attendanceStatus: 'Present',
                            marksObtained: event.target.value
                          })}
                          disabled={student.attendanceStatus === 'Absent'}
                          placeholder={`Marks / ${student.maxMarks}`}
                          className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100"
                        />

                        <button
                          type="button"
                          onClick={() => saveStudentResult(student)}
                          disabled={busyStudent === student.email}
                          className="rounded-lg bg-orange-600 px-3 py-2 font-semibold text-white transition hover:bg-orange-700 disabled:bg-orange-300"
                        >
                          {busyStudent === student.email ? 'Saving...' : 'Save Result'}
                        </button>
                      </div>
                    </div>
                  </div>
                )) : <p className="text-sm text-slate-500">No students found for this exam.</p>}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default AdminExamPage;
