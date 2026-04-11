import React, { useEffect, useState } from 'react';
import BrandBanner from '../components/BrandBanner.jsx';
import { API_BASE_URL } from '../config.js';

function formatDisplayDateTime(dateTimeValue) {
  if (!dateTimeValue) {
    return 'Not set';
  }

  const date = new Date(dateTimeValue);

  if (Number.isNaN(date.getTime())) {
    return dateTimeValue;
  }

  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatFileSize(sizeValue) {
  const size = Number(sizeValue) || 0;

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
}

function TeacherAssignmentPage({ classId, teacherUser, assignment, onBack }) {
  const [assignmentData, setAssignmentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadAssignmentData() {
    if (!classId || !teacherUser?.email || !assignment) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        teacherEmail: teacherUser.email,
        title: assignment.title,
        subject: assignment.subject,
        dueDate: assignment.dueDate
      });
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/assignments/details?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Unable to load assignment details.');
        return;
      }

      setAssignmentData(data);
    } catch (requestError) {
      setError('Could not connect to the backend server.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssignmentData();
  }, [classId, teacherUser, assignment]);

  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4 lg:p-4">
      <div className="mx-auto max-w-7xl">
        <BrandBanner subtitle="Teacher Assignment Page" textClassName="text-blue-950" subtextClassName="text-blue-700" className="mb-4" />
        <button
          type="button"
          onClick={onBack}
          className="mb-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto sm:py-2"
        >
          Back To Class Page
        </button>

        {loading ? <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">Loading assignment page...</p> : null}
        {error ? <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        {assignmentData ? (
          <>
            <section className="rounded-xl bg-blue-950 p-5 text-white sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">Assignment Page</p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{assignmentData.assignment.title}</h1>
              <p className="mt-2 text-blue-100">
                {assignmentData.class.className} | {assignmentData.assignment.subject}
              </p>
              <p className="mt-2 text-blue-100">Deadline: {formatDisplayDateTime(assignmentData.assignment.dueDate)}</p>
              <p className="mt-2 text-blue-100">
                Submitted: {assignmentData.summary.submittedCount} / {assignmentData.summary.totalStudents}
              </p>
            </section>

            <section className="mt-4 rounded-xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">Assignment Files</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {assignmentData.assignment.attachments?.length ? assignmentData.assignment.attachments.map((attachment) => (
                  <a
                    key={`${attachment.name}-${attachment.size}`}
                    href={attachment.dataUrl}
                    download={attachment.name}
                    className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 transition hover:bg-blue-100"
                  >
                    {attachment.name} ({formatFileSize(attachment.size)})
                  </a>
                )) : <p className="text-sm text-slate-500">No assignment files were attached.</p>}
              </div>
            </section>

            <section className="mt-4 rounded-xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">Student Submissions</h2>
              <div className="mt-3 space-y-4">
                {assignmentData.students.length ? assignmentData.students.map((student) => (
                  <div key={student.email} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
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

                      <span className={student.status === 'Submitted'
                        ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700'
                        : 'rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700'}
                      >
                        {student.status}
                      </span>
                    </div>

                    {student.status === 'Submitted' ? (
                      <div className="mt-4 space-y-3">
                        <p className="text-sm text-slate-500">Submitted At: {formatDisplayDateTime(student.submittedAt)}</p>
                        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          {student.submissionNote || 'No submission note added.'}
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {student.submittedAttachments?.length ? student.submittedAttachments.map((attachment) => (
                            <a
                              key={`${student.email}-${attachment.name}-${attachment.size}`}
                              href={attachment.dataUrl}
                              download={attachment.name}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              {attachment.name} ({formatFileSize(attachment.size)})
                            </a>
                          )) : <p className="text-sm text-slate-500">No files uploaded by this student.</p>}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        This student has not submitted the assignment yet.
                      </p>
                    )}
                  </div>
                )) : <p className="text-sm text-slate-500">No students found for this assignment.</p>}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default TeacherAssignmentPage;
