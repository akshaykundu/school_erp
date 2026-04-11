import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AdminClassroomPage from './adminclassroompage.jsx';
import AdminProfilePage from './adminprofilepage.jsx';
import BrandBanner from '../components/BrandBanner.jsx';
import { API_BASE_URL } from '../config.js';

function AdminPanel() {
  const navigate = useNavigate();
  const { user: adminUser, logout } = useAuth();
  const [profileName, setProfileName] = useState(adminUser?.name || '');
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
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherMessage, setTeacherMessage] = useState('');
  const [teacherError, setTeacherError] = useState('');
  const [isTeacherSubmitting, setIsTeacherSubmitting] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [adminError, setAdminError] = useState('');
  const [isAdminSubmitting, setIsAdminSubmitting] = useState(false);
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classesError, setClassesError] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [teacherListError, setTeacherListError] = useState('');
  const [className, setClassName] = useState('');
  const [classSubject, setClassSubject] = useState('');
  const [assignedTeacherEmail, setAssignedTeacherEmail] = useState('');
  const [classMessage, setClassMessage] = useState('');
  const [classError, setClassError] = useState('');
  const [isClassSubmitting, setIsClassSubmitting] = useState(false);
  const [openedClassId, setOpenedClassId] = useState('');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [paymentLogs, setPaymentLogs] = useState([]);
  const [loadingPaymentLogs, setLoadingPaymentLogs] = useState(false);
  const [paymentLogsError, setPaymentLogsError] = useState('');
  const [razorpayConfigured, setRazorpayConfigured] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function loadTeachers() {
    if (!adminUser?.email) {
      setLoadingTeachers(false);
      return;
    }

    setLoadingTeachers(true);
    setTeacherListError('');

    try {
      const encodedEmail = encodeURIComponent(adminUser.email);
      const response = await fetch(`${API_BASE_URL}/api/admins/${encodedEmail}/teachers`);
      const data = await response.json();

      if (!response.ok) {
        setTeacherListError(data.message || 'Unable to load teachers.');
        return;
      }

      setTeachers(data.teachers || []);
    } catch (requestError) {
      setTeacherListError('Could not connect to the backend server.');
    } finally {
      setLoadingTeachers(false);
    }
  }

  async function loadClasses() {
    if (!adminUser?.email) {
      setLoadingClasses(false);
      return;
    }

    setLoadingClasses(true);
    setClassesError('');

    try {
      const encodedEmail = encodeURIComponent(adminUser.email);
      const response = await fetch(`${API_BASE_URL}/api/admins/${encodedEmail}/classes`);
      const data = await response.json();

      if (!response.ok) {
        setClassesError(data.message || 'Unable to load classes.');
        return;
      }

      setClasses(data.classes || []);
    } catch (requestError) {
      setClassesError('Could not connect to the backend server.');
    } finally {
      setLoadingClasses(false);
    }
  }

  async function loadPaymentLogs() {
    if (!adminUser?.email) {
      setLoadingPaymentLogs(false);
      return;
    }

    setLoadingPaymentLogs(true);
    setPaymentLogsError('');

    try {
      const encodedEmail = encodeURIComponent(adminUser.email);
      const response = await fetch(`${API_BASE_URL}/api/admins/${encodedEmail}/payment-logs`);
      const data = await response.json();

      if (!response.ok) {
        setPaymentLogsError(data.message || 'Unable to load payment logs.');
        return;
      }

      setPaymentLogs(data.paymentLogs || []);
      setRazorpayConfigured(Boolean(data.razorpayConfigured));
    } catch (requestError) {
      setPaymentLogsError('Could not connect to the backend server.');
    } finally {
      setLoadingPaymentLogs(false);
    }
  }

  useEffect(() => {
    async function loadProfile() {
      if (!adminUser?.email) {
        return;
      }

      try {
        const encodedEmail = encodeURIComponent(adminUser.email);
        const response = await fetch(`${API_BASE_URL}/api/admins/${encodedEmail}/profile`);
        const data = await response.json();

        if (!response.ok) {
          setProfileError(data.message || 'Unable to load admin profile.');
          return;
        }

        setProfileName(data.name || adminUser.name || '');
        setProfile(data.profile || {});
      } catch (requestError) {
        setProfileError('Could not connect to the backend server.');
      }
    }

    loadProfile();
  }, [adminUser]);

  useEffect(() => {
    loadTeachers();
  }, [adminUser]);

  useEffect(() => {
    loadClasses();
  }, [adminUser]);

  useEffect(() => {
    if (currentPage === 'payments') {
      loadPaymentLogs();
    }
  }, [adminUser, currentPage]);

  function formatAmount(amountPaise, currency = 'INR') {
    const normalizedAmount = Number(amountPaise || 0) / 100;

    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency
    }).format(normalizedAmount || 0);
  }

  function formatDateTime(dateTimeValue) {
    if (!dateTimeValue) {
      return 'Not paid yet';
    }

    const parsedDate = new Date(dateTimeValue);

    if (Number.isNaN(parsedDate.getTime())) {
      return dateTimeValue;
    }

    return parsedDate.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
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
      const encodedEmail = encodeURIComponent(adminUser.email);
      const response = await fetch(`${API_BASE_URL}/api/admins/${encodedEmail}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName.trim(),
          profile
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setProfileError(data.message || 'Unable to update admin profile.');
        return;
      }

      setProfileName(data.user.name);
      setProfile(data.user.profile || profile);
      setProfileMessage(data.message);
    } catch (requestError) {
      setProfileError('Could not connect to the backend server.');
    } finally {
      setIsProfileSubmitting(false);
    }
  }

  async function handleAddAdmin(event) {
    event.preventDefault();

    if (!adminName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      setAdminError('Please enter admin name, email, and password.');
      setAdminMessage('');
      return;
    }

    setIsAdminSubmitting(true);
    setAdminError('');
    setAdminMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: adminUser?.email,
          name: adminName.trim(),
          email: adminEmail.trim(),
          password: adminPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setAdminError(data.message || 'Unable to add admin.');
        return;
      }

      setAdminMessage(`${data.user.name} has been added as an admin.`);
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
    } catch (requestError) {
      setAdminError('Could not connect to the backend server.');
    } finally {
      setIsAdminSubmitting(false);
    }
  }

  async function handleAddTeacher(event) {
    event.preventDefault();

    if (!teacherName.trim() || !teacherEmail.trim() || !teacherPassword.trim()) {
      setTeacherError('Please enter teacher name, email, and password.');
      setTeacherMessage('');
      return;
    }

    setIsTeacherSubmitting(true);
    setTeacherError('');
    setTeacherMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: adminUser?.email,
          name: teacherName.trim(),
          email: teacherEmail.trim(),
          password: teacherPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setTeacherError(data.message || 'Unable to add teacher.');
        return;
      }

      setTeacherMessage(`${data.user.name} has been added as a teacher.`);
      setTeacherName('');
      setTeacherEmail('');
      setTeacherPassword('');
      await loadTeachers();
    } catch (requestError) {
      setTeacherError('Could not connect to the backend server.');
    } finally {
      setIsTeacherSubmitting(false);
    }
  }

  async function handleCreateClass(event) {
    event.preventDefault();

    if (!className.trim() || !classSubject.trim() || !assignedTeacherEmail.trim()) {
      setClassError('Please enter class name, subject, and assigned teacher.');
      setClassMessage('');
      return;
    }

    setIsClassSubmitting(true);
    setClassError('');
    setClassMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: adminUser?.email,
          teacherEmail: assignedTeacherEmail,
          className: className.trim(),
          subject: classSubject.trim()
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setClassError(data.message || 'Unable to create class.');
        return;
      }

      setClassMessage(data.message);
      setClasses((currentClasses) => [data.class, ...currentClasses]);
      setClassName('');
      setClassSubject('');
      setAssignedTeacherEmail('');
      await loadClasses();
    } catch (requestError) {
      setClassError('Could not connect to the backend server.');
    } finally {
      setIsClassSubmitting(false);
    }
  }

  if (openedClassId) {
    return (
      <AdminClassroomPage
        classId={openedClassId}
        adminUser={adminUser}
        onBack={async () => {
          setOpenedClassId('');
          await loadClasses();
        }}
      />
    );
  }

  function navClass(page) {
    return currentPage === page
      ? 'block w-full rounded-lg bg-orange-50 px-3 py-2 text-left font-semibold text-orange-800 transition hover:bg-orange-100'
      : 'block w-full rounded-lg px-3 py-2 text-left font-semibold text-slate-700 transition hover:bg-slate-100';
  }

  return (
    <div className="min-h-screen bg-orange-50 font-sans text-gray-800">
      <header className="fixed top-0 z-50 flex w-full flex-wrap items-center justify-between gap-3 border-b bg-white/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1">
          <BrandBanner subtitle="Admin Dashboard" textClassName="text-orange-900" subtextClassName="text-orange-700" />
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap sm:gap-3">
          <div className="relative w-full sm:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen((currentValue) => !currentValue)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <span>{currentPage === 'payments' ? 'Payments' : currentPage === 'profile' ? 'Profile' : 'Dashboard'}</span>
              <span className="text-xs text-slate-500">{mobileNavOpen ? 'Close' : 'Menu'}</span>
            </button>
            {mobileNavOpen ? (
              <div className="absolute left-0 right-0 top-full mt-2 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
                <button type="button" onClick={() => { setCurrentPage('dashboard'); setMobileNavOpen(false); }} className={navClass('dashboard')}>Dashboard</button>
                <button type="button" onClick={() => { setCurrentPage('payments'); setMobileNavOpen(false); }} className={navClass('payments')}>Payments</button>
                <button type="button" onClick={() => { setCurrentPage('profile'); setMobileNavOpen(false); }} className={navClass('profile')}>Profile</button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setCurrentPage('profile')}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-slate-200 bg-white px-2 py-1.5 transition hover:bg-slate-50 sm:flex-none"
          >
            {profile.profileImage ? (
              <img
                src={profile.profileImage}
                alt={profileName || 'Admin profile'}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-800">
                {(profileName || adminUser?.name || 'A').slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="truncate pr-2 text-sm font-medium text-slate-700">Profile</span>
          </button>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="flex-none rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex pt-36 sm:pt-24">
        <aside className="fixed left-0 top-0 hidden h-screen w-72 flex-col border-r bg-white/80 px-6 py-8 md:flex">
          <div className="mt-16">
            <BrandBanner subtitle="Admin Dashboard" textClassName="text-orange-900" subtextClassName="text-orange-700" />
          </div>

          <nav className="mt-4 space-y-2">
            <button type="button" onClick={() => setCurrentPage('dashboard')} className={navClass('dashboard')}>
              Dashboard
            </button>
            <button type="button" onClick={() => setCurrentPage('payments')} className={navClass('payments')}>
              Payments
            </button>
            <button type="button" onClick={() => setCurrentPage('profile')} className={navClass('profile')}>
              Profile
            </button>
          </nav>
        </aside>

        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:ml-72">
          {currentPage === 'profile' ? (
            <AdminProfilePage
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

          {currentPage === 'dashboard' ? (
            <>
        <section className="grid gap-4 rounded-xl bg-slate-900 p-5 text-white md:grid-cols-[1.2fr_0.8fr] md:p-5">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">Administrative control center</h2>
            <p className="mt-3 text-slate-300">
              {adminUser?.email
                ? `Signed in as ${adminUser.email}`
                : 'Manage teacher access from one dashboard.'}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
            <div className="rounded-lg bg-white/10 p-4">
              <p className="text-2xl font-semibold">Admin Only</p>
              <p className="text-sm text-slate-300">Admins, teachers, and student fees are managed here</p>
            </div>
            <div className="rounded-lg bg-white/10 p-4">
              <p className="text-2xl font-semibold">Protected Access</p>
              <p className="text-sm text-slate-300">Only admins can add other admins, teachers, and fees</p>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h3 className="text-2xl font-semibold text-slate-900">Create Class</h3>
            <p className="mt-2 text-sm text-slate-500">Create a class and assign a teacher to manage it.</p>

            <form className="mt-4 space-y-4" onSubmit={handleCreateClass}>
              <input type="text" value={className} onChange={(event) => setClassName(event.target.value)} placeholder="Class name" className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100" />
              <input type="text" value={classSubject} onChange={(event) => setClassSubject(event.target.value)} placeholder="Main subject" className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100" />
              <select value={assignedTeacherEmail} onChange={(event) => setAssignedTeacherEmail(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100">
                <option value="">Select teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.email} value={teacher.email}>
                    {teacher.name} ({teacher.email})
                  </option>
                ))}
              </select>
              {loadingTeachers ? <p className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">Loading teachers...</p> : null}
              {teacherListError ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{teacherListError}</p> : null}
              {classError ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{classError}</p> : null}
              {classMessage ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{classMessage}</p> : null}
              <button type="submit" disabled={isClassSubmitting} className="w-full rounded-lg bg-orange-600 px-3 py-2 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-400">
                {isClassSubmitting ? 'Creating Class...' : 'Create Class'}
              </button>
            </form>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h3 className="text-2xl font-semibold text-slate-900">Add Admin</h3>
            <p className="mt-2 text-sm text-slate-500">
              Only a logged-in admin can create another admin account.
            </p>

            <form className="mt-4 space-y-4" onSubmit={handleAddAdmin}>
              <input type="text" value={adminName} onChange={(event) => setAdminName(event.target.value)} placeholder="Admin full name" className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100" />
              <input type="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} placeholder="admin@example.com" className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100" />
              <input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="Temporary password" className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100" />
              {adminError ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{adminError}</p> : null}
              {adminMessage ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{adminMessage}</p> : null}
              <button type="submit" disabled={isAdminSubmitting} className="w-full rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500">{isAdminSubmitting ? 'Adding Admin...' : 'Add Admin'}</button>
            </form>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h3 className="text-2xl font-semibold text-slate-900">Add Teacher</h3>
            <p className="mt-2 text-sm text-slate-500">Create teacher credentials that can be used to access the teacher portal.</p>
            <form className="mt-4 space-y-4" onSubmit={handleAddTeacher}>
              <input type="text" value={teacherName} onChange={(event) => setTeacherName(event.target.value)} placeholder="Teacher full name" className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100" />
              <input type="email" value={teacherEmail} onChange={(event) => setTeacherEmail(event.target.value)} placeholder="teacher@schoolerp.com" className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100" />
              <input type="password" value={teacherPassword} onChange={(event) => setTeacherPassword(event.target.value)} placeholder="Temporary password" className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100" />
              {teacherError ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{teacherError}</p> : null}
              {teacherMessage ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{teacherMessage}</p> : null}
              <button type="submit" disabled={isTeacherSubmitting} className="w-full rounded-lg bg-orange-600 px-3 py-2 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-400">{isTeacherSubmitting ? 'Adding Teacher...' : 'Add Teacher'}</button>
            </form>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
            <h3 className="text-2xl font-semibold text-slate-900">All Classes</h3>
            <p className="mt-2 text-sm text-slate-500">
              Admin can enter any class and open any student profile from here.
            </p>
            {classesError ? <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{classesError}</p> : null}
            {loadingClasses ? <p className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">Loading classes...</p> : null}
            {!loadingClasses && !classes.length ? (
              <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                No classes available yet.
              </p>
            ) : null}
            {!loadingClasses && classes.length ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {classes.map((classroom) => (
                  <div key={classroom.id} className="rounded-lg border border-slate-200 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <button type="button" onClick={() => setOpenedClassId(classroom.id)} className="text-left text-lg font-semibold text-orange-700 transition hover:text-orange-600 hover:underline">
                          {classroom.className}
                        </button>
                        <p className="mt-1 text-sm text-slate-500">{classroom.subject}</p>
                        <p className="text-sm text-slate-500">
                          Teacher: {classroom.teacher?.name} ({classroom.teacher?.email})
                        </p>
                      </div>
                      <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
                        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                          {classroom.studentCount} Students
                        </span>
                        <button
                          type="button"
                          onClick={() => setOpenedClassId(classroom.id)}
                          className="w-full rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 sm:w-auto"
                        >
                          Enter Class
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-sm text-slate-500">Students in class</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{classroom.studentCount}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>
            </>
          ) : null}

          {currentPage === 'payments' ? (
            <section className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">Razorpay Payment Logs</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Review successful paid Razorpay transactions and the fee items included in each student payment.
                  </p>
                  <div className="mt-3">
                    <span className={razorpayConfigured
                      ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700'
                      : 'rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700'}
                    >
                      {razorpayConfigured ? 'Razorpay Configured' : 'Razorpay Not Configured'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadPaymentLogs}
                  disabled={loadingPaymentLogs}
                  className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-800 transition hover:border-orange-300 hover:bg-orange-100 disabled:border-orange-100 disabled:bg-orange-50 disabled:text-orange-400"
                >
                  {loadingPaymentLogs ? 'Refreshing...' : 'Refresh Logs'}
                </button>
              </div>

              {paymentLogsError ? <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{paymentLogsError}</p> : null}
              {loadingPaymentLogs ? <p className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">Loading payment logs...</p> : null}

              {!loadingPaymentLogs && !paymentLogs.length ? (
                <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  No paid Razorpay transactions are available yet.
                </p>
              ) : null}

              {!loadingPaymentLogs && paymentLogs.length ? (
                <div className="card-scrollbar mt-4 grid max-h-[42rem] gap-4 overflow-y-auto pr-2">
                  {paymentLogs.map((paymentLog) => (
                    <div key={paymentLog.orderId} className="rounded-lg border border-slate-200 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{paymentLog.studentName}</h3>
                          <p className="text-sm text-slate-500">{paymentLog.studentEmail}</p>
                        </div>
                        <span className={paymentLog.status === 'paid'
                          ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700'
                          : paymentLog.status === 'failed'
                            ? 'rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700'
                            : 'rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700'}
                        >
                          {paymentLog.status}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 md:grid-cols-2">
                        <p><span className="font-semibold text-slate-800">Order ID:</span> {paymentLog.orderId}</p>
                        <p><span className="font-semibold text-slate-800">Payment ID:</span> {paymentLog.paymentId || 'Not paid yet'}</p>
                        <p><span className="font-semibold text-slate-800">Method:</span> {paymentLog.paymentMethod}</p>
                        <p><span className="font-semibold text-slate-800">Amount:</span> {formatAmount(paymentLog.amountPaise, paymentLog.currency)}</p>
                        <p><span className="font-semibold text-slate-800">Currency:</span> {paymentLog.currency}</p>
                        <p><span className="font-semibold text-slate-800">Paid At:</span> {formatDateTime(paymentLog.paidAt)}</p>
                      </div>

                      <div className="mt-4">
                        <p className="text-sm font-semibold text-slate-900">Fee Items</p>
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          {paymentLog.feeItems.map((feeItem) => (
                            <div key={`${paymentLog.orderId}-${feeItem.title}-${feeItem.dueDate}`} className="rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-900">
                              <p className="font-medium">{feeItem.title}</p>
                              <p>Due: {feeItem.dueDate}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}

export default AdminPanel;
