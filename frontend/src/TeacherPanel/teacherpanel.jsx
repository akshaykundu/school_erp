import React, { useEffect, useState } from 'react';
import BrandBanner from '../components/BrandBanner.jsx';
import StudentDetailsPanel from '../components/StudentDetailsPanel.jsx';
import TeacherClassroomPage from './teacherclassroompage.jsx';
import TeacherProfilePage from './teacherprofilepage.jsx';
import { API_BASE_URL } from '../config.js';

function TeacherPortal({ teacherUser, onLogout }) {
  const [profileName, setProfileName] = useState(teacherUser?.name || '');
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
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [students, setStudents] = useState([]);
  const [attendanceError, setAttendanceError] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [classError, setClassError] = useState('');
  const [classrooms, setClassrooms] = useState([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [openedClassId, setOpenedClassId] = useState('');
  const [selectedStudentDetails, setSelectedStudentDetails] = useState(null);
  const [loadingStudentDetails, setLoadingStudentDetails] = useState(false);
  const [studentDetailsError, setStudentDetailsError] = useState('');
  const [protectedDetailsMessage, setProtectedDetailsMessage] = useState('');
  const [protectedDetailsError, setProtectedDetailsError] = useState('');
  const [isProtectedDetailsSaving, setIsProtectedDetailsSaving] = useState(false);

  async function loadStudents() {
    if (!teacherUser?.email) {
      setLoadingStudents(false);
      return;
    }

    setLoadingStudents(true);
    setAttendanceError('');

    try {
      const encodedEmail = encodeURIComponent(teacherUser.email);
      const response = await fetch(`${API_BASE_URL}/api/teachers/${encodedEmail}/students`);
      const data = await response.json();

      if (!response.ok) {
        setAttendanceError(data.message || 'Unable to load students.');
        return;
      }

      setStudents(data.students || []);
    } catch (requestError) {
      setAttendanceError('Could not connect to the backend server.');
    } finally {
      setLoadingStudents(false);
    }
  }

  async function loadProfile() {
    if (!teacherUser?.email) {
      return;
    }

    setProfileError('');

    try {
      const encodedEmail = encodeURIComponent(teacherUser.email);
      const response = await fetch(`${API_BASE_URL}/api/teachers/${encodedEmail}/profile`);
      const data = await response.json();

      if (!response.ok) {
        setProfileError(data.message || 'Unable to load teacher profile.');
        return;
      }

      setProfileName(data.name || teacherUser.name || '');
      setProfile(data.profile || {});
    } catch (requestError) {
      setProfileError('Could not connect to the backend server.');
    }
  }

  async function loadClassrooms() {
    if (!teacherUser?.email) {
      setLoadingClassrooms(false);
      return;
    }

    setLoadingClassrooms(true);
    setClassError('');

    try {
      const encodedEmail = encodeURIComponent(teacherUser.email);
      const response = await fetch(`${API_BASE_URL}/api/teachers/${encodedEmail}/classes`);
      const data = await response.json();

      if (!response.ok) {
        setClassError(data.message || 'Unable to load classes.');
        return;
      }

      setClassrooms(data.classes || []);
    } catch (requestError) {
      setClassError('Could not connect to the backend server.');
    } finally {
      setLoadingClassrooms(false);
    }
  }

  useEffect(() => {
    loadProfile();
    loadStudents();
    loadClassrooms();
  }, [teacherUser]);

  function navClass(page) {
    return currentPage === page
      ? 'block w-full rounded-2xl bg-blue-50 px-4 py-3 text-left font-semibold text-blue-800 transition hover:bg-blue-100'
      : 'block w-full rounded-2xl px-4 py-3 text-left font-semibold text-slate-700 transition hover:bg-slate-100';
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
      const encodedEmail = encodeURIComponent(teacherUser.email);
      const response = await fetch(`${API_BASE_URL}/api/teachers/${encodedEmail}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName.trim(),
          profile
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setProfileError(data.message || 'Unable to update teacher profile.');
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

  if (openedClassId) {
    return (
      <TeacherClassroomPage
        classId={openedClassId}
        teacherUser={teacherUser}
        onBack={async () => {
          setOpenedClassId('');
          await loadClassrooms();
          await loadStudents();
        }}
      />
    );
  }

  return (
    <div className="font-sans text-gray-800">
      <header className="fixed top-0 z-50 flex w-full items-center justify-between bg-white/80 px-8 py-4 shadow backdrop-blur-xl">
        <BrandBanner subtitle="Teacher Portal" textClassName="text-blue-950" subtextClassName="text-blue-700" />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentPage('profile')}
            className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-2 py-1.5 transition hover:bg-slate-50"
          >
            {profile.profileImage ? (
              <img
                src={profile.profileImage}
                alt={profileName || 'Teacher profile'}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800">
                {(profileName || teacherUser?.name || 'T').slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="pr-2 text-sm font-medium text-slate-700">Profile</span>
          </button>
          <button type="button" onClick={onLogout} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">Logout</button>
        </div>
      </header>
      <div className="flex pt-20">
        <aside className="fixed left-0 top-0 hidden h-screen w-72 flex-col border-r bg-slate-50 py-6 md:flex">
          <div className="mb-10 mt-16 px-8">
            <BrandBanner subtitle="Teacher Portal" textClassName="text-blue-950" subtextClassName="text-blue-700" />
            <p className="mt-4 text-xs text-slate-500">Students, attendance, exams and assignments</p>
          </div>
          <nav className="space-y-2 px-6">
            <button type="button" onClick={() => setCurrentPage('dashboard')} className={navClass('dashboard')}>
              Dashboard
            </button>
            <button type="button" onClick={() => setCurrentPage('profile')} className={navClass('profile')}>
              Profile
            </button>
          </nav>
        </aside>
        <main className="min-h-screen flex-1 bg-gray-100 p-8 md:ml-72">
          {currentPage === 'profile' ? (
            <TeacherProfilePage
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
              <div className="mb-10">
                <h2 className="mb-2 text-4xl font-extrabold text-blue-900">Welcome, Teacher</h2>
                <p className="text-gray-500">{teacherUser?.email ? `Signed in as ${teacherUser.email}` : 'Only admin-added teachers can access this portal.'}</p>
              </div>

              {(selectedStudentDetails || loadingStudentDetails || studentDetailsError) ? (
                <div className="mb-10">
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

              <div className="grid gap-6 xl:grid-cols-2">
                <section className="rounded-3xl bg-white p-6 shadow xl:col-span-2">
                  <h3 className="text-2xl font-semibold text-slate-900">Assigned Classes</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Admin creates classes and assigns teachers. Open any class assigned to you for attendance, exams, assignments, and announcements.
                  </p>
                  {classError ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{classError}</p> : null}
                  {loadingClassrooms ? <p className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">Loading classes...</p> : null}
                  {!loadingClassrooms && !classrooms.length ? (
                    <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      No classes assigned yet. Contact admin to assign you to a class.
                    </p>
                  ) : null}
                  {!loadingClassrooms && classrooms.length ? (
                    <div className="mt-6 grid gap-4 lg:grid-cols-2">
                      {classrooms.map((classroom) => (
                        <div key={classroom.id} className="rounded-2xl border border-slate-200 p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <button type="button" onClick={() => setOpenedClassId(classroom.id)} className="text-left text-lg font-semibold text-blue-900 transition hover:text-blue-700 hover:underline">
                                {classroom.className} - {classroom.section}
                              </button>
                              <p className="mt-1 text-sm text-slate-500">{classroom.subject}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                                {classroom.studentCount} Students
                              </span>
                              <button
                                type="button"
                                onClick={() => setOpenedClassId(classroom.id)}
                                className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
                              >
                                Enter Class
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
                            <p className="text-sm text-slate-500">Students in class</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">{classroom.studentCount}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              </div>
            </>
          ) : null}
        </main>
      </div>
      <footer className="border-t bg-slate-50 py-6 text-center">(c) 2024 ERP</footer>
    </div>
  );
}

export default TeacherPortal;
