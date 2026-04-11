import React, { useEffect, useState } from 'react';
import BrandBanner from '../components/BrandBanner.jsx';
import StudentDetailsPanel from '../components/StudentDetailsPanel.jsx';
import { API_BASE_URL } from '../config.js';
import TeacherAttendancePage from './teacherattendancepage.jsx';
import TeacherAssignmentPage from './teacherassignmentpage.jsx';
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

function TeacherClassroomPage({ classId, teacherUser, onBack }) {
  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFeeAmount, setStudentFeeAmount] = useState('');
  const [studentFeeDueDate, setStudentFeeDueDate] = useState('');
  const [studentFeeMonths, setStudentFeeMonths] = useState('12');
  const [studentFeeAllowedPaymentMethods, setStudentFeeAllowedPaymentMethods] = useState(['UPI', 'Card', 'Bank Transfer']);
  const [examSubject, setExamSubject] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('');
  const [examRoom, setExamRoom] = useState('');
  const [examMaxMarks, setExamMaxMarks] = useState('100');
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentSubject, setAssignmentSubject] = useState('');
  const [assignmentDeadline, setAssignmentDeadline] = useState('');
  const [assignmentAttachments, setAssignmentAttachments] = useState([]);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteAttachments, setNoteAttachments] = useState([]);
  const [busyKey, setBusyKey] = useState('');
  const [currentSection, setCurrentSection] = useState('students');
  const [openedStudentEmail, setOpenedStudentEmail] = useState('');
  const [selectedStudentDetails, setSelectedStudentDetails] = useState(null);
  const [loadingStudentDetails, setLoadingStudentDetails] = useState(false);
  const [studentDetailsError, setStudentDetailsError] = useState('');
  const [protectedDetailsMessage, setProtectedDetailsMessage] = useState('');
  const [protectedDetailsError, setProtectedDetailsError] = useState('');
  const [isProtectedDetailsSaving, setIsProtectedDetailsSaving] = useState(false);
  const [openedExam, setOpenedExam] = useState(null);
  const [openedAssignment, setOpenedAssignment] = useState(null);
  const [attendancePageOpen, setAttendancePageOpen] = useState(false);
  const orderedScheduledExams = [...(classroom?.scheduledExams || [])].sort((first, second) => {
    const firstValue = `${first.date} ${first.time}`;
    const secondValue = `${second.date} ${second.time}`;

    return secondValue.localeCompare(firstValue);
  });
  const filteredStudents = (classroom?.students || []).filter((student) => {
    const searchValue = studentSearch.trim().toLowerCase();

    if (!searchValue) {
      return true;
    }

    return (
      student.name.toLowerCase().includes(searchValue) ||
      student.email.toLowerCase().includes(searchValue)
    );
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

    if (
      !studentName.trim() ||
      !studentEmail.trim() ||
      !studentPassword.trim() ||
      !studentFeeAmount.trim() ||
      !studentFeeDueDate.trim() ||
      !studentFeeMonths.trim() ||
      !studentFeeAllowedPaymentMethods.length
    ) {
      setError('Please enter student details, monthly fee details, and at least one payment method.');
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
          password: studentPassword,
          feeAmount: studentFeeAmount.trim(),
          feeDueDate: studentFeeDueDate.trim(),
          feeMonths: studentFeeMonths.trim(),
          allowedPaymentMethods: studentFeeAllowedPaymentMethods
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
      setStudentFeeAmount('');
      setStudentFeeDueDate('');
      setStudentFeeMonths('12');
      setStudentFeeAllowedPaymentMethods(['UPI', 'Card', 'Bank Transfer']);
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
          attachments: assignmentAttachments,
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
      setAssignmentAttachments([]);
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

  async function handleAddNote(event) {
    event.preventDefault();

    if (!noteTitle.trim() || !noteContent.trim()) {
      setError('Please enter note title and content.');
      setFeedback('');
      return;
    }

    setBusyKey('note');
    setError('');
    setFeedback('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherEmail: teacherUser.email,
          title: noteTitle.trim(),
          content: noteContent.trim(),
          attachments: noteAttachments
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Unable to add class note.');
        return;
      }

      setFeedback(data.message);
      setNoteTitle('');
      setNoteContent('');
      setNoteAttachments([]);
      await loadClassroom();
    } catch (requestError) {
      setError('Could not connect to the backend server.');
    } finally {
      setBusyKey('');
    }
  }

  async function handleRemoveStudent(studentEmail) {
    const studentName = classroom?.students?.find((student) => student.email === studentEmail)?.name || studentEmail;

    if (!window.confirm(`Remove ${studentName} from this class?`)) {
      return;
    }

    setBusyKey(`remove-student-${studentEmail}`);
    setError('');
    setFeedback('');

    try {
      const encodedTeacherEmail = encodeURIComponent(teacherUser.email);
      const encodedStudentEmail = encodeURIComponent(studentEmail);
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/students/${encodedStudentEmail}?teacherEmail=${encodedTeacherEmail}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Unable to remove student from class.');
        return;
      }

      if (selectedStudentDetails?.student?.email === studentEmail) {
        setOpenedStudentEmail('');
        setSelectedStudentDetails(null);
        setStudentDetailsError('');
        setProtectedDetailsMessage('');
        setProtectedDetailsError('');
      }

      setFeedback(data.message);
      await loadClassroom();
    } catch (requestError) {
      setError('Could not connect to the backend server.');
    } finally {
      setBusyKey('');
    }
  }

  async function openStudentDetails(studentEmail) {
    setOpenedStudentEmail(studentEmail);
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

  function toggleStudentFeePaymentMethod(method) {
    setStudentFeeAllowedPaymentMethods((currentMethods) =>
      currentMethods.includes(method)
        ? currentMethods.filter((currentMethod) => currentMethod !== method)
        : [...currentMethods, method]
    );
  }

  async function handleNoteAttachmentChange(event) {
    const selectedFiles = Array.from(event.target.files || []);

    if (!selectedFiles.length) {
      setNoteAttachments([]);
      return;
    }

    try {
      const attachments = await Promise.all(
        selectedFiles.map((file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                name: file.name,
                type: file.type || 'application/octet-stream',
                size: file.size,
                dataUrl: typeof reader.result === 'string' ? reader.result : ''
              });
            reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
            reader.readAsDataURL(file);
          })
        )
      );

      setNoteAttachments(attachments.filter((attachment) => attachment.dataUrl));
    } catch (requestError) {
      setError(requestError.message || 'Unable to attach files to this note.');
      setFeedback('');
    }

    event.target.value = '';
  }

  async function handleAssignmentAttachmentChange(event) {
    const selectedFiles = Array.from(event.target.files || []);

    if (!selectedFiles.length) {
      setAssignmentAttachments([]);
      return;
    }

    try {
      const attachments = await Promise.all(
        selectedFiles.map((file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                name: file.name,
                type: file.type || 'application/octet-stream',
                size: file.size,
                dataUrl: typeof reader.result === 'string' ? reader.result : ''
              });
            reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
            reader.readAsDataURL(file);
          })
        )
      );

      setAssignmentAttachments(attachments.filter((attachment) => attachment.dataUrl));
    } catch (requestError) {
      setError(requestError.message || 'Unable to attach files to this assignment.');
      setFeedback('');
    }

    event.target.value = '';
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

  if (openedAssignment) {
    return (
      <TeacherAssignmentPage
        classId={classId}
        teacherUser={teacherUser}
        assignment={openedAssignment}
        onBack={() => {
          setOpenedAssignment(null);
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

  function sectionNavClass(section) {
    return currentSection === section
      ? 'rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-800'
      : 'rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10';
  }

  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4 lg:p-4">
      <div className="mx-auto max-w-7xl">
        <BrandBanner subtitle="Teacher Class Page" textClassName="text-blue-950" subtextClassName="text-blue-700" className="mb-4" />
        <button
          type="button"
          onClick={onBack}
          className="mb-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto sm:py-2"
        >
          Back To Teacher Dashboard
        </button>

        {loading ? <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">Loading class page...</p> : null}
        {error ? <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {feedback ? <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{feedback}</p> : null}

        {classroom ? (
          <>
            <section className="rounded-xl bg-blue-950 p-5 text-white sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">Class Page</p>
              <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
                {classroom.className}
              </h1>
              <p className="mt-2 text-blue-100">{classroom.subject}</p>
              <p className="mt-4 text-sm text-blue-100">{classroom.students.length} students enrolled</p>
              <div className="-mx-2 mt-3 flex gap-3 overflow-x-auto px-2 pb-2">
                <button type="button" onClick={() => setCurrentSection('students')} className={sectionNavClass('students')}>Students</button>
                <button type="button" onClick={() => setAttendancePageOpen(true)} className={sectionNavClass('attendance')}>Attendance</button>
                <button type="button" onClick={() => setCurrentSection('exams')} className={sectionNavClass('exams')}>Exams</button>
                <button type="button" onClick={() => setCurrentSection('assignments')} className={sectionNavClass('assignments')}>Assignments</button>
                <button type="button" onClick={() => setCurrentSection('announcements')} className={sectionNavClass('announcements')}>Announcements</button>
                <button type="button" onClick={() => setCurrentSection('notes')} className={sectionNavClass('notes')}>Notes</button>
              </div>
            </section>

            <section className="mt-4 grid gap-6 xl:grid-cols-2">
              <form className={currentSection === 'students' ? 'card-scrollbar max-h-[44rem] overflow-y-auto rounded-xl bg-white p-6 shadow-sm' : 'hidden'} onSubmit={handleAddStudent}>
                <h2 className="text-2xl font-semibold text-slate-900">Add Student To This Class</h2>
                <div className="mt-3 space-y-4">
                  <input type="text" value={studentName} onChange={(event) => setStudentName(event.target.value)} placeholder="Student full name" className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <input type="email" value={studentEmail} onChange={(event) => setStudentEmail(event.target.value)} placeholder="student@schoolerp.com" className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <input type="password" value={studentPassword} onChange={(event) => setStudentPassword(event.target.value)} placeholder="Temporary password" className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">Initial Fee Details</p>
                    <p className="mt-1 text-sm text-slate-500">Set the monthly fee amount, first due date, and how many months should be created.</p>
                    <div className="mt-4 space-y-3">
                      <input type="text" value={studentFeeAmount} onChange={(event) => setStudentFeeAmount(event.target.value)} placeholder="Amount" className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                      <input type="date" value={studentFeeDueDate} onChange={(event) => setStudentFeeDueDate(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                      <input type="number" min="1" value={studentFeeMonths} onChange={(event) => setStudentFeeMonths(event.target.value)} placeholder="Number of months" className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-700">Allowed Payment Methods</p>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {['UPI', 'Card', 'Bank Transfer'].map((method) => (
                            <label key={method} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={studentFeeAllowedPaymentMethods.includes(method)}
                                onChange={() => toggleStudentFeePaymentMethod(method)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span>{method}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button type="submit" disabled={busyKey === 'student'} className="w-full rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-400">
                    {busyKey === 'student' ? 'Adding Student...' : 'Add Student'}
                  </button>
                </div>
              </form>

              <div className={currentSection === 'announcements' ? 'rounded-xl bg-white p-6 shadow-sm xl:col-span-2' : 'hidden'}>
                <h2 className="text-2xl font-semibold text-slate-900">Class Announcements</h2>
                <div className="mt-3 space-y-3">
                  {classroom.announcements.length ? classroom.announcements.map((announcement) => (
                    <div key={`${announcement.title}-${announcement.postedAt}`} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
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

              <div className={currentSection === 'notes' ? 'rounded-xl bg-white p-6 shadow-sm xl:col-span-2' : 'hidden'}>
                <h2 className="text-2xl font-semibold text-slate-900">Class Notes</h2>
                <div className="mt-3 space-y-3">
                  {classroom.notes?.length ? classroom.notes.map((note) => (
                    <div key={`${note.title}-${note.postedAt}`} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{note.title}</p>
                          <p className="mt-2 text-sm whitespace-pre-wrap text-slate-600">{note.content}</p>
                          {note.attachments?.length ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {note.attachments.map((attachment) => (
                                <a
                                  key={`${note.postedAt}-${attachment.name}`}
                                  href={attachment.dataUrl}
                                  download={attachment.name}
                                  className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800 transition hover:bg-blue-100"
                                >
                                  {attachment.name} ({formatFileSize(attachment.size)})
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <span className="text-xs text-slate-500">{new Date(note.postedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  )) : <p className="text-sm text-slate-500">No class notes added yet.</p>}
                </div>
              </div>

              <form className={currentSection === 'exams' ? 'rounded-xl bg-white p-6 shadow-sm' : 'hidden'} onSubmit={handleScheduleExam}>
                <h2 className="text-2xl font-semibold text-slate-900">Schedule Exam In Class</h2>
                <div className="mt-3 space-y-4">
                  <input type="text" value={examSubject} onChange={(event) => setExamSubject(event.target.value)} placeholder="Exam subject" className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <input type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <input type="time" value={examTime} onChange={(event) => setExamTime(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <input type="text" value={examRoom} onChange={(event) => setExamRoom(event.target.value)} placeholder="Room" className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <input type="number" min="1" value={examMaxMarks} onChange={(event) => setExamMaxMarks(event.target.value)} placeholder="Max marks" className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <button type="submit" disabled={busyKey === 'exam'} className="w-full rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white transition hover:bg-blue-800 disabled:bg-blue-300">
                    {busyKey === 'exam' ? 'Scheduling Exam...' : 'Schedule Exam'}
                  </button>
                </div>
              </form>

              <div className={currentSection === 'exams' ? 'rounded-xl bg-white p-6 shadow-sm' : 'hidden'}>
                <h2 className="text-2xl font-semibold text-slate-900">Scheduled Exams</h2>
                <div className="mt-3 h-96 space-y-3 overflow-y-auto pr-2">
                  {orderedScheduledExams.length ? (
                    orderedScheduledExams.map((exam) => (
                      <button
                        type="button"
                        key={`${exam.subject}-${exam.date}-${exam.time}`}
                        onClick={() => setOpenedExam(exam)}
                        className="w-full rounded-lg border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
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

              <form className={currentSection === 'assignments' ? 'rounded-xl bg-white p-6 shadow-sm' : 'hidden'} onSubmit={handleScheduleAssignment}>
                <h2 className="text-2xl font-semibold text-slate-900">Schedule Assignment In Class</h2>
                <div className="mt-3 space-y-4">
                  <input type="text" value={assignmentTitle} onChange={(event) => setAssignmentTitle(event.target.value)} placeholder="Assignment title" className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <input type="text" value={assignmentSubject} onChange={(event) => setAssignmentSubject(event.target.value)} placeholder="Subject" className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <input type="datetime-local" value={assignmentDeadline} onChange={(event) => setAssignmentDeadline(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <label className="block text-sm font-medium text-slate-700">
                      Attach files for this assignment
                      <input type="file" multiple onChange={handleAssignmentAttachmentChange} className="mt-3 block w-full text-sm text-slate-600" />
                    </label>
                    {assignmentAttachments.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {assignmentAttachments.map((attachment) => (
                          <span key={`${attachment.name}-${attachment.size}`} className="rounded-xl bg-white px-3 py-2 text-xs text-slate-700">
                            {attachment.name} ({formatFileSize(attachment.size)})
                          </span>
                        ))}
                      </div>
                    ) : <p className="mt-2 text-xs text-slate-500">No files attached yet.</p>}
                  </div>
                  <button type="submit" disabled={busyKey === 'assignment'} className="w-full rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white transition hover:bg-blue-800 disabled:bg-blue-300">
                    {busyKey === 'assignment' ? 'Scheduling Assignment...' : 'Schedule Assignment'}
                  </button>
                </div>
              </form>

              <div className={currentSection === 'assignments' ? 'rounded-xl bg-white p-6 shadow-sm' : 'hidden'}>
                <h2 className="text-2xl font-semibold text-slate-900">Scheduled Assignments</h2>
                <div className="mt-3 h-96 space-y-3 overflow-y-auto pr-2">
                  {classroom.scheduledAssignments?.length ? (
                    classroom.scheduledAssignments.map((assignment) => (
                      <button
                        type="button"
                        key={`${assignment.title}-${assignment.subject}-${assignment.dueDate}`}
                        onClick={() => setOpenedAssignment(assignment)}
                        className="w-full rounded-lg border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                      >
                        <p className="font-semibold text-slate-900">{assignment.title}</p>
                        <p className="mt-2 text-sm text-slate-500">Subject: {assignment.subject}</p>
                        <p className="text-sm text-slate-500">Deadline: {formatDisplayDateTime(assignment.dueDate)}</p>
                        <p className="text-sm text-slate-500">Submitted: {assignment.submittedCount} / {assignment.totalCount}</p>
                        <p className="text-sm text-slate-500">Pending: {assignment.pendingCount}</p>
                        <p className="mt-3 text-sm font-medium text-blue-700">Open assignment details</p>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No class assignments have been scheduled yet.</p>
                  )}
                </div>
              </div>

              <form className={currentSection === 'announcements' ? 'rounded-xl bg-white p-6 shadow-sm xl:col-span-2' : 'hidden'} onSubmit={handlePostAnnouncement}>
                <h2 className="text-2xl font-semibold text-slate-900">Make Announcement In Class</h2>
                <div className="mt-3 space-y-4">
                  <input type="text" value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} placeholder="Announcement title" className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <textarea value={announcementMessage} onChange={(event) => setAnnouncementMessage(event.target.value)} placeholder="Write announcement for the class" rows="4" className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <button type="submit" disabled={busyKey === 'announcement'} className="w-full rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-400">
                    {busyKey === 'announcement' ? 'Posting Announcement...' : 'Post Announcement'}
                  </button>
                </div>
              </form>

              <form className={currentSection === 'notes' ? 'rounded-xl bg-white p-6 shadow-sm xl:col-span-2' : 'hidden'} onSubmit={handleAddNote}>
                <h2 className="text-2xl font-semibold text-slate-900">Add Note In Class</h2>
                <div className="mt-3 space-y-4">
                  <input type="text" value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="Note title" className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <textarea value={noteContent} onChange={(event) => setNoteContent(event.target.value)} placeholder="Write note for this class" rows="4" className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <label className="block text-sm font-medium text-slate-700">
                      Attach PDF or files
                      <input type="file" multiple onChange={handleNoteAttachmentChange} className="mt-3 block w-full text-sm text-slate-600" />
                    </label>
                    {noteAttachments.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {noteAttachments.map((attachment) => (
                          <span key={attachment.name} className="rounded-xl bg-white px-3 py-2 text-xs text-slate-700">
                            {attachment.name} ({formatFileSize(attachment.size)})
                          </span>
                        ))}
                      </div>
                    ) : <p className="mt-2 text-xs text-slate-500">No files attached yet.</p>}
                  </div>
                  <button type="submit" disabled={busyKey === 'note'} className="w-full rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white transition hover:bg-blue-800 disabled:bg-blue-300">
                    {busyKey === 'note' ? 'Adding Note...' : 'Add Note'}
                  </button>
                </div>
              </form>

              <div className={currentSection === 'students' ? 'rounded-xl bg-white p-6 shadow-sm xl:col-span-2' : 'hidden'}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <h2 className="text-2xl font-semibold text-slate-900">Students In This Class</h2>
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(event) => setStudentSearch(event.target.value)}
                    placeholder="Search student by name or email"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 lg:max-w-md"
                  />
                </div>
                <div className="mt-3 space-y-4">
                  {filteredStudents.length ? filteredStudents.map((student) => (
                    <div key={student.email} className="space-y-4">
                      <div className="block w-full rounded-lg border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <button
                            type="button"
                            onClick={() => openStudentDetails(student.email)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
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
                          </button>
                          <div className="flex flex-col gap-3 sm:items-end">
                            <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                              {student.presentDays}/{student.totalDays} Present
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveStudent(student.email)}
                              disabled={busyKey === `remove-student-${student.email}`}
                              className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:bg-rose-100 disabled:text-rose-400 sm:w-auto"
                            >
                              {busyKey === `remove-student-${student.email}` ? 'Removing...' : 'Remove Student'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {(
                        (loadingStudentDetails && openedStudentEmail === student.email) ||
                        (studentDetailsError && openedStudentEmail === student.email) ||
                        selectedStudentDetails?.student?.email === student.email
                      ) ? (
                        <StudentDetailsPanel
                          title="Student Details"
                          accentClasses={{ info: 'border-blue-200 bg-blue-50 text-blue-700' }}
                          details={selectedStudentDetails?.student?.email === student.email ? selectedStudentDetails : null}
                          loading={loadingStudentDetails && openedStudentEmail === student.email}
                          error={openedStudentEmail === student.email ? studentDetailsError : ''}
                          onProtectedDetailsChange={updateProtectedDetail}
                          onProtectedDetailsSave={saveProtectedDetails}
                          isProtectedDetailsSaving={isProtectedDetailsSaving}
                          protectedDetailsMessage={protectedDetailsMessage}
                          protectedDetailsError={protectedDetailsError}
                          onClose={() => {
                            setOpenedStudentEmail('');
                            setSelectedStudentDetails(null);
                            setStudentDetailsError('');
                            setProtectedDetailsMessage('');
                            setProtectedDetailsError('');
                          }}
                        />
                      ) : null}
                    </div>
                  )) : (
                    <p className="text-sm text-slate-500">
                      {classroom.students.length ? 'No students match your search.' : 'No students added to this class yet.'}
                    </p>
                  )}
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default TeacherClassroomPage;
