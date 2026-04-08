import React, { useEffect, useState } from 'react';
import BrandBanner from '../components/BrandBanner.jsx';
import StudentDetailsPanel from '../components/StudentDetailsPanel.jsx';
import { API_BASE_URL } from '../config.js';
import TeacherAttendancePage from './teacherattendancepage.jsx';
import TeacherExamPage from './teacherexampage.jsx';

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

function TeacherClassroomPage({ classId, teacherUser, onBack }) {
  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [examSubject, setExamSubject] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('');
  const [examRoom, setExamRoom] = useState('');
  const [examMaxMarks, setExamMaxMarks] = useState('100');
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentSubject, setAssignmentSubject] = useState('');
  const [assignmentDeadline, setAssignmentDeadline] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const [selectedStudentDetails, setSelectedStudentDetails] = useState(null);
  const [loadingStudentDetails, setLoadingStudentDetails] = useState(false);
  const [studentDetailsError, setStudentDetailsError] = useState('');
  const [protectedDetailsMessage, setProtectedDetailsMessage] = useState('');
  const [protectedDetailsError, setProtectedDetailsError] = useState('');
  const [isProtectedDetailsSaving, setIsProtectedDetailsSaving] = useState(false);
  const [openedExam, setOpenedExam] = useState(null);
  const [attendancePageOpen, setAttendancePageOpen] = useState(false);
  const orderedScheduledExams = [...(classroom?.scheduledExams || [])].sort((first, second) => {
    const firstValue = `${first.date} ${first.time}`;
    const secondValue = `${second.date} ${second.time}`;

    return secondValue.localeCompare(firstValue);
  });

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
        setError(data.message || 'Unable to load class details.');
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

  async function handleAddStudent(event) {
    event.preventDefault();

    if (!studentName.trim() || !studentEmail.trim() || !studentPassword.trim()) {
      setError('Please enter student name, email, and password.');
      setFeedback('');
      return;
    }

    setBusyKey('student');
    setError('');
    setFeedback('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/students/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherEmail: teacherUser.email,
          name: studentName.trim(),
          email: studentEmail.trim(),
          password: studentPassword
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Unable to add student to this class.');
        return;
      }

      setFeedback(data.message);
      setStudentName('');
      setStudentEmail('');
      setStudentPassword('');
      await loadClassroom();
    } catch (requestError) {
      setError('Could not connect to the backend server.');
    } finally {
      setBusyKey('');
    }
  }

  async function handleScheduleExam(event) {
    event.preventDefault();

    if (!examSubject.trim() || !examDate.trim() || !examTime.trim() || !examRoom.trim()) {
      setError('Please enter exam subject, date, time, and room.');
      setFeedback('');
      return;
    }

    setBusyKey('exam');
    setError('');
    setFeedback('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherEmail: teacherUser.email,
          subject: examSubject.trim(),
          date: examDate.trim(),
          time: examTime.trim(),
          room: examRoom.trim(),
          maxMarks: examMaxMarks
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Unable to schedule exam.');
        return;
      }

      setFeedback(data.message);
      setExamSubject('');
      setExamDate('');
      setExamTime('');
      setExamRoom('');
      setExamMaxMarks('100');
      await loadClassroom();
    } catch (requestError) {
      setError('Could not connect to the backend server.');
    } finally {
      setBusyKey('');
    }
  }

  async function handleScheduleAssignment(event) {
    event.preventDefault();

    if (!assignmentTitle.trim() || !assignmentSubject.trim() || !assignmentDeadline.trim()) {
      setError('Please enter assignment title, subject, and deadline.');
      setFeedback('');
      return;
    }

    setBusyKey('assignment');
    setError('');
    setFeedback('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherEmail: teacherUser.email,
          title: assignmentTitle.trim(),
          subject: assignmentSubject.trim(),
          dueDate: assignmentDeadline.trim(),
          status: 'Pending'
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Unable to schedule assignment.');
        return;
      }

      setFeedback(data.message);
      setAssignmentTitle('');
      setAssignmentSubject('');
      setAssignmentDeadline('');
      await loadClassroom();
    } catch (requestError) {
      setError('Could not connect to the backend server.');
    } finally {
      setBusyKey('');
    }
  }

  async function handlePostAnnouncement(event) {
    event.preventDefault();

    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      setError('Please enter announcement title and message.');
      setFeedback('');
      return;
    }

    setBusyKey('announcement');
    setError('');
    setFeedback('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherEmail: teacherUser.email,
          title: announcementTitle.trim(),
          message: announcementMessage.trim()
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Unable to post announcement.');
        return;
      }

      setFeedback(data.message);
      setAnnouncementTitle('');
      setAnnouncementMessage('');
      await loadClassroom();
    } catch (requestError) {
      setError('Could not connect to the backend server.');
    } finally {
      setBusyKey('');
    }
  }

  async function openStudentDetails(studentEmail) {
    setLoadingStudentDetails(true);
    setStudentDetailsError('');
    setProtectedDetailsMessage('');
    setProtectedDetailsError('');

    try {
      const encodedStudentEmail = encodeURIComponent(studentEmail);
      const encodedTeacherEmail = encodeURIComponent(teacherUser.email);
      const response = await fetch(
        `${API_BASE_URL}/api/students/${encodedStudentEmail}/details?teacherEmail=${encodedTeacherEmail}`
      );
      const data = await response.json();

      if (!response.ok) {
        setStudentDetailsError(data.message || 'Unable to load student details.');
        setSelectedStudentDetails(null);
        return;
      }

      setSelectedStudentDetails(data);
    } catch (requestError) {
      setStudentDetailsError('Could not connect to the backend server.');
      setSelectedStudentDetails(null);
    } finally {
      setLoadingStudentDetails(false);
    }
  }

  function updateProtectedDetail(field, value) {
    setSelectedStudentDetails((currentDetails) => {
      if (!currentDetails) {
        return currentDetails;
      }

      return {
        ...currentDetails,
        protectedDetails: {
          ...(currentDetails.protectedDetails || {}),
          [field]: value
        }
      };
    });
  }

  async function saveProtectedDetails() {
    if (!selectedStudentDetails?.student?.email) {
      return;
    }

    setIsProtectedDetailsSaving(true);
    setProtectedDetailsError('');
    setProtectedDetailsMessage('');

    try {
      const encodedStudentEmail = encodeURIComponent(selectedStudentDetails.student.email);
      const response = await fetch(`${API_BASE_URL}/api/students/${encodedStudentEmail}/protected-details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherEmail: teacherUser.email,
          protectedDetails: selectedStudentDetails.protectedDetails || {}
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setProtectedDetailsError(data.message || 'Unable to update parent details.');
        return;
      }

      setSelectedStudentDetails((currentDetails) => currentDetails ? {
        ...currentDetails,
        protectedDetails: data.protectedDetails || currentDetails.protectedDetails
      } : currentDetails);
      setProtectedDetailsMessage(data.message);
    } catch (requestError) {
      setProtectedDetailsError('Could not connect to the backend server.');
    } finally {
      setIsProtectedDetailsSaving(false);
    }
  }

  if (openedExam) {
    return (
      <TeacherExamPage
        classId={classId}
        teacherUser={teacherUser}
        exam={openedExam}
        onBack={() => {
          setOpenedExam(null);
          loadClassroom();
        }}
      />
    );
  }

  if (attendancePageOpen) {
    return (
      <TeacherAttendancePage
        classId={classId}
        teacherUser={teacherUser}
        onBack={() => {
          setAttendancePageOpen(false);
          loadClassroom();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-7xl">
        <BrandBanner subtitle="Teacher Class Page" textClassName="text-blue-950" subtextClassName="text-blue-700" className="mb-6" />
        <button
          type="button"
          onClick={onBack}
          className="mb-6 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Back To Teacher Dashboard
        </button>

        {loading ? <p className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">Loading class page...</p> : null}
        {error ? <p className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {feedback ? <p className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</p> : null}

        {classroom ? (
          <>
            <section className="rounded-3xl bg-blue-950 p-8 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">Class Page</p>
              <h1 className="mt-3 text-4xl font-bold">
                {classroom.className} - {classroom.section}
              </h1>
              <p className="mt-2 text-blue-100">{classroom.subject}</p>
              <p className="mt-4 text-sm text-blue-100">{classroom.students.length} students enrolled</p>
            </section>

            <section className="mt-8 grid gap-6 xl:grid-cols-2">
              <form className="rounded-3xl bg-white p-6 shadow-sm" onSubmit={handleAddStudent}>
                <h2 className="text-2xl font-semibold text-slate-900">Add Student To This Class</h2>
                <div className="mt-6 space-y-4">
                  <input type="text" value={studentName} onChange={(event) => setStudentName(event.target.value)} placeholder="Student full name" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <input type="email" value={studentEmail} onChange={(event) => setStudentEmail(event.target.value)} placeholder="student@schoolerp.com" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <input type="password" value={studentPassword} onChange={(event) => setStudentPassword(event.target.value)} placeholder="Temporary password" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <button type="submit" disabled={busyKey === 'student'} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-400">
                    {busyKey === 'student' ? 'Adding Student...' : 'Add Student'}
                  </button>
                </div>
              </form>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">Class Attendance</h2>
                <p className="mt-3 text-sm text-slate-500">
                  Open a separate page to mark today&apos;s attendance for every student in this class.
                </p>
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">Students in class: {classroom.students.length}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAttendancePageOpen(true)}
                  className="mt-6 w-full rounded-2xl bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800"
                >
                  Open Attendance Page
                </button>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm xl:col-span-2">
                <h2 className="text-2xl font-semibold text-slate-900">Class Announcements</h2>
                <div className="mt-6 space-y-3">
                  {classroom.announcements.length ? classroom.announcements.map((announcement) => (
                    <div key={`${announcement.title}-${announcement.postedAt}`} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{announcement.title}</p>
                          <p className="mt-2 text-sm text-slate-600">{announcement.message}</p>
                        </div>
                        <span className="text-xs text-slate-500">{new Date(announcement.postedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  )) : <p className="text-sm text-slate-500">No announcements posted yet.</p>}
                </div>
              </div>

              <form className="rounded-3xl bg-white p-6 shadow-sm" onSubmit={handleScheduleExam}>
                <h2 className="text-2xl font-semibold text-slate-900">Schedule Exam In Class</h2>
                <div className="mt-6 space-y-4">
                  <input type="text" value={examSubject} onChange={(event) => setExamSubject(event.target.value)} placeholder="Exam subject" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <input type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <input type="time" value={examTime} onChange={(event) => setExamTime(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <input type="text" value={examRoom} onChange={(event) => setExamRoom(event.target.value)} placeholder="Room" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <input type="number" min="1" value={examMaxMarks} onChange={(event) => setExamMaxMarks(event.target.value)} placeholder="Max marks" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <button type="submit" disabled={busyKey === 'exam'} className="w-full rounded-2xl bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:bg-blue-300">
                    {busyKey === 'exam' ? 'Scheduling Exam...' : 'Schedule Exam'}
                  </button>
                </div>
              </form>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">Scheduled Exams</h2>
                <div className="mt-6 h-96 space-y-3 overflow-y-scroll pr-2">
                  {orderedScheduledExams.length ? (
                    orderedScheduledExams.map((exam) => (
                      <button
                        type="button"
                        key={`${exam.subject}-${exam.date}-${exam.time}`}
                        onClick={() => setOpenedExam(exam)}
                        className="w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                      >
                        <p className="font-semibold text-slate-900">{exam.subject}</p>
                        <p className="mt-2 text-sm text-slate-500">Date: {exam.date}</p>
                        <p className="text-sm text-slate-500">Time: {formatDisplayTime(exam.time)}</p>
                        <p className="text-sm text-slate-500">Room: {exam.room}</p>
                        <p className="mt-3 text-sm font-medium text-blue-700">Open exam page</p>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No class exams have been scheduled yet.</p>
                  )}
                </div>
              </div>

              <form className="rounded-3xl bg-white p-6 shadow-sm" onSubmit={handleScheduleAssignment}>
                <h2 className="text-2xl font-semibold text-slate-900">Schedule Assignment In Class</h2>
                <div className="mt-6 space-y-4">
                  <input type="text" value={assignmentTitle} onChange={(event) => setAssignmentTitle(event.target.value)} placeholder="Assignment title" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <input type="text" value={assignmentSubject} onChange={(event) => setAssignmentSubject(event.target.value)} placeholder="Subject" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <input type="datetime-local" value={assignmentDeadline} onChange={(event) => setAssignmentDeadline(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <button type="submit" disabled={busyKey === 'assignment'} className="w-full rounded-2xl bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:bg-blue-300">
                    {busyKey === 'assignment' ? 'Scheduling Assignment...' : 'Schedule Assignment'}
                  </button>
                </div>
              </form>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">Scheduled Assignments</h2>
                <div className="mt-6 h-96 space-y-3 overflow-y-scroll pr-2">
                  {classroom.scheduledAssignments?.length ? (
                    classroom.scheduledAssignments.map((assignment) => (
                      <div key={`${assignment.title}-${assignment.subject}-${assignment.dueDate}`} className="rounded-2xl border border-slate-200 p-4">
                        <p className="font-semibold text-slate-900">{assignment.title}</p>
                        <p className="mt-2 text-sm text-slate-500">Subject: {assignment.subject}</p>
                        <p className="text-sm text-slate-500">Deadline: {formatDisplayDateTime(assignment.dueDate)}</p>
                        <p className="text-sm text-slate-500">Status: {assignment.status}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No class assignments have been scheduled yet.</p>
                  )}
                </div>
              </div>

              <form className="rounded-3xl bg-white p-6 shadow-sm xl:col-span-2" onSubmit={handlePostAnnouncement}>
                <h2 className="text-2xl font-semibold text-slate-900">Make Announcement In Class</h2>
                <div className="mt-6 space-y-4">
                  <input type="text" value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} placeholder="Announcement title" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <textarea value={announcementMessage} onChange={(event) => setAnnouncementMessage(event.target.value)} placeholder="Write announcement for the class" rows="4" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <button type="submit" disabled={busyKey === 'announcement'} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-400">
                    {busyKey === 'announcement' ? 'Posting Announcement...' : 'Post Announcement'}
                  </button>
                </div>
              </form>

              <div className="rounded-3xl bg-white p-6 shadow-sm xl:col-span-2">
                <h2 className="text-2xl font-semibold text-slate-900">Students In This Class</h2>
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {classroom.students.length ? classroom.students.map((student) => (
                    <button
                      type="button"
                      key={student.email}
                      onClick={() => openStudentDetails(student.email)}
                      className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {student.profileImage ? (
                            <img src={student.profileImage} alt={student.name} className="h-12 w-12 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-600">
                              {student.name.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                            <div>
                              <p className="font-semibold text-blue-900">{student.name}</p>
                              <p className="text-sm text-slate-500">{student.email}</p>
                              <p className="text-xs text-slate-500">Today: {student.todayAttendance}</p>
                            </div>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                          {student.presentDays}/{student.totalDays} Present
                        </span>
                      </div>
                    </button>
                  )) : <p className="text-sm text-slate-500">No students added to this class yet.</p>}
                </div>
              </div>
            </section>

            {(selectedStudentDetails || loadingStudentDetails || studentDetailsError) ? (
              <div className="mt-8">
                <StudentDetailsPanel
                  title="Student Details"
                  accentClasses={{ info: 'border-blue-200 bg-blue-50 text-blue-700' }}
                  details={selectedStudentDetails}
                  loading={loadingStudentDetails}
                  error={studentDetailsError}
                  onProtectedDetailsChange={updateProtectedDetail}
                  onProtectedDetailsSave={saveProtectedDetails}
                  isProtectedDetailsSaving={isProtectedDetailsSaving}
                  protectedDetailsMessage={protectedDetailsMessage}
                  protectedDetailsError={protectedDetailsError}
                  onClose={() => {
                    setSelectedStudentDetails(null);
                    setStudentDetailsError('');
                    setProtectedDetailsMessage('');
                    setProtectedDetailsError('');
                  }}
                />
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

export default TeacherClassroomPage;
