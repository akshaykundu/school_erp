import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import QRCode from 'qrcode';
import BrandBanner from '../components/BrandBanner.jsx';
import StudentAnnouncementsPage from './studentannouncementspage.jsx';
import StudentAssignmentsPage from './studentassignmentspage.jsx';
import StudentExamsPage from './studentexamspage.jsx';
import StudentFeesPage from './studentfeespage.jsx';
import StudentNotesPage from './studentnotespage.jsx';
import StudentProfilePage from './studentprofilepage.jsx';
import { API_BASE_URL } from '../config.js';

const RAZORPAY_SUPPORTED_METHODS = ['UPI', 'Card', 'Bank Transfer'];

function StudentPanel() {
  const navigate = useNavigate();
  const { user: studentUser, logout } = useAuth();
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
  const [assignmentMessage, setAssignmentMessage] = useState('');
  const [assignmentError, setAssignmentError] = useState('');
  const [submittingAssignmentKey, setSubmittingAssignmentKey] = useState('');
  const [feeMessage, setFeeMessage] = useState('');
  const [feeError, setFeeError] = useState('');
  const [payingFeeKey, setPayingFeeKey] = useState('');
  const [upiQrPayment, setUpiQrPayment] = useState(null);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function loadDashboard(showLoadingState = true) {
    if (!studentUser?.email) {
      setLoading(false);
      return;
    }

    if (showLoadingState) {
      setLoading(true);
    }
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
      if (showLoadingState) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [studentUser]);

  const summary = dashboardData?.summary;
  const dailyAttendance = dashboardData?.dailyAttendance || [];
  const feeDetails = dashboardData?.feeDetails || [];
  const examDetails = dashboardData?.examDetails || [];
  const assignmentDetails = dashboardData?.assignmentDetails || [];
  const announcementDetails = dashboardData?.announcementDetails || [];
  const noteDetails = dashboardData?.noteDetails || [];
  const pendingFeeDetails = feeDetails.filter((item) => item.status === 'Pending');
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

  function isPastDueDate(dateValue) {
    if (!dateValue) {
      return false;
    }

    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return dateValue < todayString;
  }

  const overduePendingFeeDetails = pendingFeeDetails.filter((item) => isPastDueDate(item.dueDate));

  const pendingFees = overduePendingFeeDetails.length;
  const pendingFeeMonths = [...new Set(overduePendingFeeDetails.map((item) => getFeeMonth(item.dueDate)))];
  const pendingFeeSummary =
    pendingFeeMonths.length > 0 ? pendingFeeMonths.join(', ') : 'No pending months';
  const monthlyFeeReminders = overduePendingFeeDetails
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate))
    .map((fee) => ({
      key: `${fee.title}-${fee.dueDate}`,
      title: fee.title,
      amount: fee.amount,
      dueDate: fee.dueDate,
      month: getFeeMonth(fee.dueDate)
    }));

  function navClass(page) {
    return currentPage === page
      ? 'block rounded-lg bg-emerald-50 px-3 py-2 font-semibold text-emerald-800 transition hover:bg-emerald-100'
      : 'block rounded-lg px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-100';
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

  function isRazorpaySupportedMethod(paymentMethod) {
    return RAZORPAY_SUPPORTED_METHODS.includes(paymentMethod);
  }

  function isLikelyMobileDevice() {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia('(max-width: 768px)').matches;
  }

  function getRazorpayDisplayConfig(paymentMethod) {
    if (paymentMethod === 'UPI') {
      // Let Razorpay show the full UPI checkout so students can use
      // either a UPI ID flow or scan/QR-based payment when supported.
      return {};
    }

    if (paymentMethod === 'Card') {
      return {
        display: {
          blocks: {
            selected_method: {
              name: 'Pay via Card',
              instruments: [{ method: 'card' }]
            }
          },
          sequence: ['block.selected_method'],
          preferences: {
            show_default_blocks: false
          }
        }
      };
    }

    if (paymentMethod === 'Bank Transfer') {
      return {
        display: {
          blocks: {
            selected_method: {
              name: 'Pay via Netbanking',
              instruments: [{ method: 'netbanking' }]
            }
          },
          sequence: ['block.selected_method'],
          preferences: {
            show_default_blocks: false
          }
        }
      };
    }

    return {};
  }

  function loadRazorpayCheckoutScript() {
    if (window.Razorpay) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const existingScript = document.querySelector('script[data-razorpay-checkout="true"]');

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true), { once: true });
        existingScript.addEventListener('error', () => resolve(false), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.dataset.razorpayCheckout = 'true';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function openRazorpayCheckout(fees, paymentMethod) {
    const encodedEmail = encodeURIComponent(studentUser.email);
    const orderResponse = await fetch(`${API_BASE_URL}/api/students/${encodedEmail}/fees/create-razorpay-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feeItems: fees.map((fee) => ({
          title: fee.title,
          dueDate: fee.dueDate
        })),
        paymentMethod
      })
    });
    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      throw new Error(orderData.message || 'Unable to create Razorpay payment order.');
    }

    const scriptLoaded = await loadRazorpayCheckoutScript();

    if (!scriptLoaded || !window.Razorpay) {
      throw new Error('Unable to load Razorpay checkout.');
    }

    await new Promise((resolve, reject) => {
      const razorpayInstance = new window.Razorpay({
        key: orderData.razorpayKeyId,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'School ERP',
        description: fees.length > 1 ? `Fee payment for ${fees.length} months` : 'Monthly fee payment',
        order_id: orderData.order.id,
        prefill: {
          name: orderData.student?.name || studentUser?.name || '',
          email: orderData.student?.email || studentUser?.email || '',
          contact: orderData.student?.phone || ''
        },
        notes: {
          payment_method: paymentMethod
        },
        theme: {
          color: '#047857'
        },
        config: getRazorpayDisplayConfig(paymentMethod),
        modal: {
          ondismiss: () => reject(new Error('Razorpay checkout was closed before payment completed.'))
        },
        handler: async (razorpayResponse) => {
          try {
            const verifyResponse = await fetch(`${API_BASE_URL}/api/students/${encodedEmail}/fees/verify-razorpay-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(razorpayResponse)
            });
            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok) {
              reject(new Error(verifyData.message || 'Unable to verify Razorpay payment.'));
              return;
            }

            setFeeMessage(verifyData.message);
            await loadDashboard(false);
            resolve();
          } catch (requestError) {
            reject(new Error('Could not verify Razorpay payment with the backend.'));
          }
        }
      });

      razorpayInstance.on('payment.failed', (event) => {
        const failureMessage = event?.error?.description || 'Razorpay payment failed.';
        reject(new Error(failureMessage));
      });

      razorpayInstance.open();
    });
  }

  async function openDesktopUpiQr(fees) {
    const encodedEmail = encodeURIComponent(studentUser.email);
    const response = await fetch(`${API_BASE_URL}/api/students/${encodedEmail}/fees/create-upi-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feeItems: fees.map((fee) => ({
          title: fee.title,
          dueDate: fee.dueDate
        }))
      })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to create Razorpay UPI QR code.');
    }

    setUpiQrPayment({
      feeItems: fees,
      qrCodeId: data.qrCode?.id || '',
      imageUrl: data.qrCode?.imageUrl || '',
      imageContent: data.qrCode?.imageContent || '',
      shortUrl: data.qrCode?.shortUrl || '',
      hasRenderableQr: Boolean(data.qrCode?.hasRenderableQr),
      amount: data.qrCode?.amount || 0,
      currency: data.qrCode?.currency || 'INR'
    });
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

  async function handlePayFee(feeOrFees, paymentMethod) {
    if (!paymentMethod.trim()) {
      setFeeError('Please select an online payment method.');
      setFeeMessage('');
      return;
    }

    const fees = Array.isArray(feeOrFees) ? feeOrFees : [feeOrFees];

    if (!fees.length) {
      setFeeError('Please select at least one fee.');
      setFeeMessage('');
      return;
    }

    const isBatchPayment = fees.length > 1;
    const feeKey = isBatchPayment ? 'batch' : `${fees[0].title}-${fees[0].dueDate}`;
    setPayingFeeKey(feeKey);
    setFeeError('');
    setFeeMessage('');

    try {
      if (paymentMethod === 'UPI' && !isLikelyMobileDevice()) {
        await openDesktopUpiQr(fees);
        return;
      }

      if (isRazorpaySupportedMethod(paymentMethod)) {
        await openRazorpayCheckout(fees, paymentMethod);
        return;
      }

      throw new Error(`${paymentMethod} is not available in Razorpay checkout yet. Please choose UPI, Card, or Bank Transfer.`);
    } catch (requestError) {
      setFeeError(requestError.message || 'Could not connect to the backend server.');
    } finally {
      setPayingFeeKey('');
    }
  }

  async function handleSubmitAssignment(assignment, submission) {
    const assignmentKey = `${assignment.title}-${assignment.subject}-${assignment.dueDate}`;
    setSubmittingAssignmentKey(assignmentKey);
    setAssignmentError('');
    setAssignmentMessage('');

    try {
      const encodedEmail = encodeURIComponent(studentUser.email);
      const response = await fetch(`${API_BASE_URL}/api/students/${encodedEmail}/assignments/submit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: assignment.title,
          subject: assignment.subject,
          dueDate: assignment.dueDate,
          submissionNote: submission.submissionNote,
          submittedAttachments: submission.submittedAttachments
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setAssignmentError(data.message || 'Unable to submit assignment.');
        return false;
      }

      setAssignmentMessage(data.message);
      await loadDashboard(false);
      return true;
    } catch (requestError) {
      setAssignmentError('Could not connect to the backend server.');
      return false;
    } finally {
      setSubmittingAssignmentKey('');
    }
  }

  useEffect(() => {
    if (!upiQrPayment?.qrCodeId || !studentUser?.email) {
      return undefined;
    }

    const encodedEmail = encodeURIComponent(studentUser.email);
    const intervalId = window.setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/students/${encodedEmail}/fees/upi-qr-status/${upiQrPayment.qrCodeId}`);
        const data = await response.json();

        if (!response.ok) {
          setFeeError(data.message || 'Unable to verify Razorpay UPI QR payment.');
          return;
        }

        if (data.status === 'paid') {
          setFeeMessage(data.message || 'Fee paid successfully through Razorpay UPI QR.');
          setUpiQrPayment(null);
          setPayingFeeKey('');
          await loadDashboard(false);
        }
      } catch (requestError) {
        setFeeError('Could not verify Razorpay UPI QR payment with the backend.');
      }
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [upiQrPayment, studentUser]);

  useEffect(() => {
    if (!upiQrPayment?.imageContent) {
      setUpiQrDataUrl('');
      return undefined;
    }

    let isCancelled = false;

    QRCode.toDataURL(upiQrPayment.imageContent, {
      width: 320,
      margin: 1
    })
      .then((dataUrl) => {
        if (!isCancelled) {
          setUpiQrDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setUpiQrDataUrl('');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [upiQrPayment]);

  return (
    <div className="min-h-screen bg-emerald-50 font-sans text-gray-800">
      <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b bg-white/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1">
          <BrandBanner subtitle="Student Dashboard" textClassName="text-emerald-900" subtextClassName="text-emerald-700" />
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap sm:gap-3">
          <div className="relative w-full sm:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen((currentValue) => !currentValue)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <span>{currentPage === 'overview' ? 'Dashboard' : currentPage === 'profile' ? 'Profile' : currentPage}</span>
              <span className="text-xs text-slate-500">{mobileNavOpen ? 'Close' : 'Menu'}</span>
            </button>
            {mobileNavOpen ? (
              <div className="absolute left-0 right-0 top-full mt-2 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
                {['overview', 'profile', 'fees', 'exams', 'assignments', 'announcements', 'notes'].map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => {
                      setCurrentPage(page);
                      setMobileNavOpen(false);
                    }}
                    className={navClass(page)}
                  >
                    {page === 'overview' ? 'Dashboard' : page === 'notes' ? 'Class Notes' : page.charAt(0).toUpperCase() + page.slice(1)}
                  </button>
                ))}
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
                alt={profileName || 'Student profile'}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800">
                {(profileName || studentUser?.name || 'S').slice(0, 1).toUpperCase()}
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

      <div className="flex">
        <aside className="sticky top-[73px] hidden h-[calc(100vh-73px)] w-72 flex-col border-r bg-white/80 px-6 py-8 md:flex">
          <BrandBanner subtitle="Student Menu" textClassName="text-emerald-900" subtextClassName="text-emerald-700" />

          <nav className="mt-4 space-y-2">
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
            <button type="button" onClick={() => setCurrentPage('notes')} className={navClass('notes')}>
              Class Notes
            </button>
          </nav>
        </aside>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <section className="grid gap-4 rounded-xl bg-emerald-900 p-5 text-white lg:grid-cols-[1.15fr_0.85fr] sm:p-5">
            <div>
              <h2 className="text-3xl font-bold sm:text-4xl">Your student dashboard</h2>
              <p className="mt-3 text-emerald-100">
                {studentUser?.email
                  ? `Signed in as ${studentUser.email}`
                  : 'Check attendance, fees, exams, and assignments in one place.'}
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg bg-white/10 p-4">
                  <p className="text-2xl font-semibold">{summary?.presentDays ?? 0}</p>
                  <p className="text-sm text-emerald-100">Present Days</p>
                </div>
                <div className="rounded-lg bg-white/10 p-4">
                  <p className="text-2xl font-semibold">{pendingFees}</p>
                  <p className="text-sm text-emerald-100">Pending Fees</p>
                  <p className="mt-1 text-xs text-emerald-200">{pendingFeeSummary}</p>
                </div>
                <div className="rounded-lg bg-white/10 p-4">
                  <p className="text-2xl font-semibold">{upcomingExams}</p>
                  <p className="text-sm text-emerald-100">Upcoming Exams</p>
                </div>
                <div className="rounded-lg bg-white/10 p-4">
                  <p className="text-2xl font-semibold">{totalAnnouncements}</p>
                  <p className="text-sm text-emerald-100">Announcements</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white/10 p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100">
                Attendance Chart
              </p>

              <div className="mt-4 flex flex-col items-center gap-4">
                <div className="relative h-44 w-44 rounded-full p-4" style={pieStyle}>
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-emerald-950 text-center">
                    <div>
                      <p className="text-4xl font-bold">{attendancePercentage}%</p>
                      <p className="text-sm text-emerald-100">Attendance</p>
                    </div>
                  </div>
                </div>

                <div className="grid w-full gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-white/10 px-3 py-2 text-center">
                    <p className="text-lg font-semibold">{summary?.todayAttendance ?? '--'}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">
                      Today
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/10 px-3 py-2 text-center">
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
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Loading student dashboard...
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          {!loading && !error && currentPage === 'overview' ? (
            <section className="mt-4 rounded-xl bg-white p-4 shadow-sm">
                <h3 className="text-2xl font-semibold text-slate-900">Latest Announcements</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Announcements from your classes appear here on the dashboard.
                </p>

                <div className="mt-4 space-y-4">
                  {announcementDetails.length ? (
                    announcementDetails.slice(0, 3).map((announcement) => (
                      <div
                        key={`${announcement.className}-${announcement.title}-${announcement.postedAt}`}
                        className="rounded-lg border border-slate-200 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-slate-900">{announcement.title}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {announcement.className} | {announcement.subject}
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
                    <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-500">
                      No class announcements available yet.
                    </div>
                  )}
                </div>

                <div className="mt-4 border-t border-slate-200 pt-8">
                <h3 className="text-2xl font-semibold text-slate-900">Monthly Fee Reminders</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Pending monthly fee reminders appear here until the fee is paid.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {monthlyFeeReminders.length ? (
                    monthlyFeeReminders.map((feeReminder) => (
                      <div key={feeReminder.key} className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                        <p className="font-semibold text-orange-900">{feeReminder.title}</p>
                        <p className="mt-1 text-sm text-orange-700">Month: {feeReminder.month}</p>
                        <p className="text-sm text-orange-700">Due: {feeReminder.dueDate}</p>
                        <p className="mt-3 text-lg font-bold text-orange-900">{feeReminder.amount}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-500 md:col-span-2">
                      No monthly fee reminders right now.
                    </div>
                  )}
                </div>

                <div className="mt-4 border-t border-slate-200 pt-8">
                <h3 className="text-2xl font-semibold text-slate-900">Attendance</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Check total attendance, today attendance, and day-wise attendance.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 p-5">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Total Attendance
                    </h4>
                    <p className="mt-3 text-3xl font-bold text-emerald-700">
                      {attendancePercentage}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-5">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Today Attendance
                    </h4>
                    <p className="mt-3 text-3xl font-bold text-emerald-700">
                      {summary?.todayAttendance ?? 'Not Marked'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-5">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Present Days
                    </h4>
                    <p className="mt-3 text-3xl font-bold text-emerald-700">
                      {summary?.presentDays ?? 0} / {summary?.totalDays ?? 0}
                    </p>
                  </div>
                </div>

                <div className="mt-4 max-h-96 overflow-y-auto rounded-lg border border-slate-200">
                  <div className="grid grid-cols-[1fr_auto] bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                    <p>Date</p>
                    <p>Status</p>
                  </div>
                  {dailyAttendance.length ? (
                    dailyAttendance.map((record) => (
                      <div
                        key={record.date}
                        className="grid grid-cols-[1fr_auto] border-t border-slate-200 px-3 py-2 text-sm"
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
            <>
              {feeError ? (
                <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {feeError}
                </p>
              ) : null}
              {feeMessage ? (
                <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {feeMessage}
                </p>
              ) : null}
              <StudentFeesPage
                feeDetails={feeDetails}
                getFeeMonth={getFeeMonth}
                onPayFee={handlePayFee}
                payingFeeKey={payingFeeKey}
              />
            </>
          ) : null}

          {!loading && !error && currentPage === 'exams' ? (
            <StudentExamsPage examDetails={examDetails} />
          ) : null}

          {!loading && !error && currentPage === 'assignments' ? (
            <>
              {assignmentError ? (
                <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {assignmentError}
                </p>
              ) : null}
              {assignmentMessage ? (
                <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {assignmentMessage}
                </p>
              ) : null}
              <StudentAssignmentsPage
                assignmentDetails={assignmentDetails}
                onSubmitAssignment={handleSubmitAssignment}
                submittingAssignmentKey={submittingAssignmentKey}
              />
            </>
          ) : null}

          {!loading && !error && currentPage === 'announcements' ? (
            <StudentAnnouncementsPage announcementDetails={announcementDetails} />
          ) : null}

          {!loading && !error && currentPage === 'notes' ? (
            <StudentNotesPage noteDetails={noteDetails} />
          ) : null}
        </main>
      </div>

      {upiQrPayment ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="card-scrollbar max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white p-4 shadow-2xl md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Desktop UPI QR</p>
                <h3 className="mt-3 text-3xl font-semibold text-slate-900">Scan To Pay With UPI</h3>
                <p className="mt-3 text-sm text-slate-600">
                  Scan this Razorpay QR code with your phone&apos;s UPI app. Keep this window open while we check for payment confirmation automatically.
                </p>
                <p className="mt-4 text-base font-semibold text-emerald-700">
                  Amount: {(Number(upiQrPayment.amount || 0) / 100).toLocaleString('en-IN', {
                    style: 'currency',
                    currency: upiQrPayment.currency || 'INR'
                  })}
                </p>
                <div className="mt-5 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">Included fees</p>
                  {upiQrPayment.feeItems.map((fee) => (
                    <p key={`${fee.title}-${fee.dueDate}`}>{fee.title} | {fee.dueDate}</p>
                  ))}
                </div>
                {upiQrPayment.shortUrl ? (
                  <a
                    href={upiQrPayment.shortUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                  >
                    Open Razorpay QR Link
                  </a>
                ) : null}
              </div>

                <div className="flex w-full max-w-sm flex-col items-center rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
                {upiQrDataUrl ? (
                  <img src={upiQrDataUrl} alt="Razorpay UPI QR code" className="h-72 w-72 rounded-lg border border-slate-200 bg-white object-contain p-3" />
                ) : upiQrPayment.imageUrl ? (
                  <img src={upiQrPayment.imageUrl} alt="Razorpay UPI QR code" className="h-72 w-72 rounded-lg border border-slate-200 bg-white object-contain p-3" />
                ) : (
                  <div className="flex h-72 w-72 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
                    Razorpay did not return a renderable QR for this account or test-mode session. Try mobile UPI checkout or enable Razorpay QR support on the account.
                  </div>
                )}
                <p className="mt-4 text-center text-sm text-slate-500">
                  Payment confirmation will appear here automatically after a successful scan.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setUpiQrPayment(null);
                    setPayingFeeKey('');
                  }}
                  className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Close QR Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default StudentPanel;
