import React, { useEffect, useState } from 'react';
import BrandBanner from '../components/BrandBanner.jsx';
import StudentAnnouncementsPage from './studentannouncementspage.jsx';
import StudentAssignmentsPage from './studentassignmentspage.jsx';
import StudentExamsPage from './studentexamspage.jsx';
import StudentFeesPage from './studentfeespage.jsx';
import StudentProfilePage from './studentprofilepage.jsx';
import { API_BASE_URL } from '../config.js';

function StudentPanel({ studentUser, onLogout }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState('overview');
  const [profileName, setProfileName] = useState(studentUser?.name || '');
  const [profile, setProfile] = useState({
    phone: '',
    address: '',
    dateOfBirth: '',
    gender: '',
    bio: '',
    profileImage: ''
  });
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      if (!studentUser?.email) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const encodedEmail = encodeURIComponent(studentUser.email);
        const response = await fetch(`${API_BASE_URL}/api/students/${encodedEmail}/dashboard`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.message || 'Unable to load student dashboard.');
          return;
        }

        setDashboardData(data);
        setProfileName(data.student?.name || studentUser?.name || '');
        setProfile(data.profile || {});
      } catch (requestError) {
        setError('Could not connect to the backend server.');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [studentUser]);

  const summary = dashboardData?.summary;
  const dailyAttendance = dashboardData?.dailyAttendance || [];
  const feeDetails = dashboardData?.feeDetails || [];
  const examDetails = dashboardData?.examDetails || [];
  const assignmentDetails = dashboardData?.assignmentDetails || [];
  const announcementDetails = dashboardData?.announcementDetails || [];
  const pendingFeeDetails = feeDetails.filter((item) => item.status === 'Pending');
  const pendingFees = pendingFeeDetails.length;
  const upcomingExams = examDetails.length;
  const pendingAssignments = assignmentDetails.filter((item) => item.status === 'Pending').length;
  const totalAnnouncements = announcementDetails.length;
  const attendancePercentage = summary?.attendancePercentage ?? 0;
  const pieStyle = {
    background: `conic-gradient(#10b981 0% ${attendancePercentage}%, #f1f5f9 ${attendancePercentage}% 100%)`
  };

  function getFeeMonth(dateValue) {
    const parsedDate = new Date(dateValue);

    if (Number.isNaN(parsedDate.getTime())) {
      return 'Unknown Month';
    }

    return parsedDate.toLocaleString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  }

  const pendingFeeMonths = [...new Set(pendingFeeDetails.map((item) => getFeeMonth(item.dueDate)))];
  const pendingFeeSummary =
    pendingFeeMonths.length > 0 ? pendingFeeMonths.join(', ') : 'No pending months';

  function navClass(page) {
    return currentPage === page
      ? 'block rounded-2xl bg-emerald-50 px-4 py-3 font-semibold text-emerald-800 transition hover:bg-emerald-100'
      : 'block rounded-2xl px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100';
  }

  function updateProfileField(field, value) {
    setProfile((currentProfile) => ({
      ...currentProfile,
      [field]: value
    }));
  }

  function handleProfileImageChange(event) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateProfileField('profileImage', typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsDataURL(selectedFile);
  }

  async function handleSaveProfile(event) {
    event.preventDefault();

    if (!profileName.trim()) {
      setProfileError('Please enter your name.');
      setProfileMessage('');
      return;
    }

    setIsProfileSubmitting(true);
    setProfileError('');
    setProfileMessage('');

    try {
      const encodedEmail = encodeURIComponent(studentUser.email);
      const response = await fetch(`${API_BASE_URL}/api/students/${encodedEmail}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName.trim(),
          profile
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setProfileError(data.message || 'Unable to update student profile.');
        return;
      }

      setProfileName(data.user.name);
      setProfile(data.user.profile || profile);
      setProfileMessage(data.message);
      setDashboardData((currentData) =>
        currentData
          ? {
              ...currentData,
              student: {
                ...currentData.student,
                name: data.user.name
              },
              profile: data.user.profile || currentData.profile
            }
          : currentData
      );
    } catch (requestError) {
      setProfileError('Could not connect to the backend server.');
    } finally {
      setIsProfileSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-emerald-50 font-sans text-gray-800">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-white/90 px-8 py-4 backdrop-blur">
        <BrandBanner subtitle="Student Dashboard" textClassName="text-emerald-900" subtextClassName="text-emerald-700" />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentPage('profile')}
            className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-2 py-1.5 transition hover:bg-slate-50"
          >
            {profile.profileImage ? (
              <img
                src={profile.profileImage}
                alt={profileName || 'Student profile'}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800">
                {(profileName || studentUser?.name || 'S').slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="pr-2 text-sm font-medium text-slate-700">Profile</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-[73px] hidden h-[calc(100vh-73px)] w-72 flex-col border-r bg-white/80 px-6 py-8 md:flex">
          <BrandBanner subtitle="Student Menu" textClassName="text-emerald-900" subtextClassName="text-emerald-700" />

          <nav className="mt-6 space-y-2">
            <button type="button" onClick={() => setCurrentPage('overview')} className={navClass('overview')}>
              Dashboard
            </button>
            <button type="button" onClick={() => setCurrentPage('profile')} className={navClass('profile')}>
              Profile
            </button>
            <button type="button" onClick={() => setCurrentPage('fees')} className={navClass('fees')}>
              Fees
            </button>
            <button type="button" onClick={() => setCurrentPage('exams')} className={navClass('exams')}>
              Exams
            </button>
            <button type="button" onClick={() => setCurrentPage('assignments')} className={navClass('assignments')}>
              Assignments
            </button>
            <button type="button" onClick={() => setCurrentPage('announcements')} className={navClass('announcements')}>
              Announcements
            </button>
          </nav>
        </aside>

        <main className="mx-auto w-full max-w-6xl px-6 py-8">
          <section className="grid gap-6 rounded-3xl bg-emerald-900 p-8 text-white lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <h2 className="text-4xl font-bold">Your student dashboard</h2>
              <p className="mt-3 text-emerald-100">
                {studentUser?.email
                  ? `Signed in as ${studentUser.email}`
                  : 'Check attendance, fees, exams, and assignments in one place.'}
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-4">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-semibold">{summary?.presentDays ?? 0}</p>
                  <p className="text-sm text-emerald-100">Present Days</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-semibold">{pendingFees}</p>
                  <p className="text-sm text-emerald-100">Pending Fees</p>
                  <p className="mt-1 text-xs text-emerald-200">{pendingFeeSummary}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-semibold">{upcomingExams}</p>
                  <p className="text-sm text-emerald-100">Upcoming Exams</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-semibold">{totalAnnouncements}</p>
                  <p className="text-sm text-emerald-100">Announcements</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white/10 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100">
                Attendance Chart
              </p>

              <div className="mt-6 flex flex-col items-center gap-4">
                <div className="relative h-44 w-44 rounded-full p-4" style={pieStyle}>
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-emerald-950 text-center">
                    <div>
                      <p className="text-4xl font-bold">{attendancePercentage}%</p>
                      <p className="text-sm text-emerald-100">Attendance</p>
                    </div>
                  </div>
                </div>

                <div className="grid w-full gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
                    <p className="text-lg font-semibold">{summary?.todayAttendance ?? '--'}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">
                      Today
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
                    <p className="text-lg font-semibold">{summary?.totalDays ?? 0}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">
                      Total Days
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {loading ? (
            <p className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Loading student dashboard...
            </p>
          ) : null}

          {error ? (
            <p className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          {!loading && !error && currentPage === 'overview' ? (
            <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-semibold text-slate-900">Latest Announcements</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Announcements from your classes appear here on the dashboard.
                </p>

                <div className="mt-6 space-y-4">
                  {announcementDetails.length ? (
                    announcementDetails.slice(0, 3).map((announcement) => (
                      <div
                        key={`${announcement.className}-${announcement.section}-${announcement.title}-${announcement.postedAt}`}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-slate-900">{announcement.title}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {announcement.className} - {announcement.section} | {announcement.subject}
                            </p>
                            <p className="mt-3 text-sm text-slate-700">{announcement.message}</p>
                          </div>
                          <div className="text-right text-xs text-slate-500">
                            <p>{announcement.teacherEmail}</p>
                            <p>{new Date(announcement.postedAt).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">
                      No class announcements available yet.
                    </div>
                  )}
                </div>

                <div className="mt-8 border-t border-slate-200 pt-8">
                <h3 className="text-2xl font-semibold text-slate-900">Attendance</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Check total attendance, today attendance, and day-wise attendance.
                </p>

                <div className="mt-6 grid gap-6 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 p-5">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Total Attendance
                    </h4>
                    <p className="mt-3 text-3xl font-bold text-emerald-700">
                      {attendancePercentage}%
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-5">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Today Attendance
                    </h4>
                    <p className="mt-3 text-3xl font-bold text-emerald-700">
                      {summary?.todayAttendance ?? 'Not Marked'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-5">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Present Days
                    </h4>
                    <p className="mt-3 text-3xl font-bold text-emerald-700">
                      {summary?.presentDays ?? 0} / {summary?.totalDays ?? 0}
                    </p>
                  </div>
                </div>

                <div className="mt-8 max-h-96 overflow-y-auto rounded-2xl border border-slate-200">
                  <div className="grid grid-cols-[1fr_auto] bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                    <p>Date</p>
                    <p>Status</p>
                  </div>
                  {dailyAttendance.length ? (
                    dailyAttendance.map((record) => (
                      <div
                        key={record.date}
                        className="grid grid-cols-[1fr_auto] border-t border-slate-200 px-4 py-3 text-sm"
                      >
                        <p className="text-slate-700">{record.date}</p>
                        <p
                          className={
                            record.status === 'Present'
                              ? 'font-semibold text-emerald-700'
                              : 'font-semibold text-rose-700'
                          }
                        >
                          {record.status}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-4 text-sm text-slate-500">
                      No attendance records available yet.
                    </div>
                  )}
                </div>
                </div>
            </section>
          ) : null}

          {!loading && !error && currentPage === 'profile' ? (
            <StudentProfilePage
              profileName={profileName}
              setProfileName={setProfileName}
              profile={profile}
              onProfileChange={updateProfileField}
              onImageSelect={handleProfileImageChange}
              onSubmit={handleSaveProfile}
              isSubmitting={isProfileSubmitting}
              message={profileMessage}
              error={profileError}
            />
          ) : null}

          {!loading && !error && currentPage === 'fees' ? (
            <StudentFeesPage pendingFeeDetails={pendingFeeDetails} getFeeMonth={getFeeMonth} />
          ) : null}

          {!loading && !error && currentPage === 'exams' ? (
            <StudentExamsPage examDetails={examDetails} />
          ) : null}

          {!loading && !error && currentPage === 'assignments' ? (
            <StudentAssignmentsPage assignmentDetails={assignmentDetails} />
          ) : null}

          {!loading && !error && currentPage === 'announcements' ? (
            <StudentAnnouncementsPage announcementDetails={announcementDetails} />
          ) : null}
        </main>
      </div>
    </div>
  );
}

export default StudentPanel;
