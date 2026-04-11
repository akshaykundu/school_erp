import React from 'react';

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

function formatAlertType(alertType) {
  if (alertType === 'attendance_absent') {
    return 'Absent Attendance';
  }

  if (alertType === 'fee_overdue') {
    return 'Overdue Fee';
  }

  return alertType || 'Unknown Alert';
}

function StudentDetailsPanel({
  title,
  accentClasses,
  details,
  loading,
  error,
  onClose,
  onProtectedDetailsChange,
  onProtectedDetailsSave,
  isProtectedDetailsSaving,
  protectedDetailsMessage,
  protectedDetailsError,
  onMarkFeePaid,
  feeActionBusyKey,
  feeActionMessage,
  feeActionError
}) {
  if (loading) {
    return (
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <p className={`rounded-2xl border px-4 py-3 text-sm ${accentClasses.info}`}>
          Loading student details...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      </section>
    );
  }

  if (!details) {
    return null;
  }

  const { student, profile, summary, attendanceRecords, feeDetails, examDetails, assignmentDetails, protectedDetails, parentAlerts = [] } = details;

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {profile.profileImage ? (
            <img src={profile.profileImage} alt={student.name} className="h-20 w-20 rounded-full object-cover shadow" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-2xl font-bold text-slate-500">
              {student.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="text-2xl font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 font-medium text-slate-900">{student.name}</p>
            <p className="text-sm text-slate-500">{student.email}</p>
            <p className="text-sm text-slate-500">Created by: {student.createdByTeacher}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Close
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Attendance</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{summary.attendancePercentage}%</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Today</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{summary.todayAttendance}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Pending Fees</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {feeDetails.filter((item) => item.status === 'Pending').length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Assignments</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{assignmentDetails.length}</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-semibold text-slate-900">Parent Details</h4>
          {!onProtectedDetailsSave ? <span className="text-xs text-slate-500">Teacher managed</span> : null}
        </div>

        {onProtectedDetailsSave ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              type="text"
              value={protectedDetails?.parentName || ''}
              onChange={(event) => onProtectedDetailsChange?.('parentName', event.target.value)}
              placeholder="Parent name"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
            <input
              type="text"
              value={protectedDetails?.parentPhone || ''}
              onChange={(event) => onProtectedDetailsChange?.('parentPhone', event.target.value)}
              placeholder="Parent phone number"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
            {protectedDetailsError ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:col-span-2">{protectedDetailsError}</p> : null}
            {protectedDetailsMessage ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 md:col-span-2">{protectedDetailsMessage}</p> : null}
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={onProtectedDetailsSave}
                disabled={isProtectedDetailsSaving}
                className="rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:bg-blue-300"
              >
                {isProtectedDetailsSaving ? 'Saving Parent Details...' : 'Save Parent Details'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>Parent Name: {protectedDetails?.parentName || 'Not added'}</p>
            <p>Parent Phone: {protectedDetails?.parentPhone || 'Not added'}</p>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-4">
          <h4 className="font-semibold text-slate-900">Profile</h4>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>Phone: {profile.phone || 'Not added'}</p>
            <p>Date of Birth: {profile.dateOfBirth || 'Not added'}</p>
            <p>Gender: {profile.gender || 'Not added'}</p>
            <p>Address: {profile.address || 'Not added'}</p>
            <p>Bio: {profile.bio || 'Not added'}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <h4 className="font-semibold text-slate-900">Recent Attendance</h4>
          <div className="mt-3 space-y-2 text-sm">
            {attendanceRecords.slice(-5).reverse().map((record) => (
              <div key={record.date} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-slate-600">{record.date}</span>
                <span className={record.status === 'Present' ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'}>
                  {record.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <h4 className="font-semibold text-slate-900">Fee Details</h4>
          <div className="card-scrollbar mt-3 max-h-96 space-y-2 overflow-y-auto pr-2 text-sm">
            {feeActionError ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">{feeActionError}</p> : null}
            {feeActionMessage ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">{feeActionMessage}</p> : null}
            {feeDetails.length ? feeDetails.map((fee) => (
              <div key={`${fee.title}-${fee.dueDate}`} className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="font-medium text-slate-900">{fee.title}</p>
                <p className="text-slate-600">{fee.amount} | {fee.status}</p>
                <p className="text-slate-500">Due: {fee.dueDate}</p>
                <p className="text-slate-500">Allowed Online Methods: {fee.allowedPaymentMethods?.length ? fee.allowedPaymentMethods.join(', ') : 'UPI, Card, Bank Transfer'}</p>
                <p className="text-slate-500">Payment Method: {fee.paymentMethod || 'Not added'}</p>
                <p className="text-slate-500">Paid At: {fee.paidAt ? formatDisplayDateTime(fee.paidAt) : 'Not paid yet'}</p>
                {onMarkFeePaid && fee.status === 'Pending' ? (
                  <button
                    type="button"
                    onClick={() => onMarkFeePaid(fee)}
                    disabled={feeActionBusyKey === `${fee.title}-${fee.dueDate}`}
                    className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700 disabled:bg-emerald-300"
                  >
                    {feeActionBusyKey === `${fee.title}-${fee.dueDate}` ? 'Marking Cash Payment...' : 'Mark Paid In Cash'}
                  </button>
                ) : null}
              </div>
            )) : <p className="text-slate-500">No fee records.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <h4 className="font-semibold text-slate-900">Exam Details</h4>
          <div className="card-scrollbar mt-3 max-h-96 space-y-2 overflow-y-auto pr-2 text-sm">
            {examDetails.length ? examDetails.map((exam) => (
              <div key={`${exam.subject}-${exam.date}-${exam.time}`} className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="font-medium text-slate-900">{exam.subject}</p>
                <p className="text-slate-600">{exam.date} | {formatDisplayTime(exam.time)}</p>
                <p className="text-slate-500">Room: {exam.room}</p>
                <p className="text-slate-500">Exam Attendance: {exam.attendanceStatus || 'Pending'}</p>
                <p className="text-slate-500">Marks: {exam.marksObtained || 'Not added'}</p>
              </div>
            )) : <p className="text-slate-500">No exam records.</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 p-4">
        <h4 className="font-semibold text-slate-900">Parent Alert History</h4>
        <div className="card-scrollbar mt-3 max-h-72 space-y-2 overflow-y-auto pr-2 text-sm">
          {parentAlerts.length ? parentAlerts.map((alert) => (
            <div key={`${alert.key}-${alert.channel}-${alert.sentAt}`} className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="font-medium text-slate-900">{formatAlertType(alert.type)}</p>
              <p className="text-slate-600">Channel: {alert.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}</p>
              <p className="text-slate-600">Recipient: {alert.recipient}</p>
              <p className="text-slate-600">Status: {alert.deliveryStatus}</p>
              <p className="text-slate-500">Sent At: {formatDisplayDateTime(alert.sentAt)}</p>
            </div>
          )) : <p className="text-slate-500">No parent alerts have been sent yet.</p>}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 p-4">
        <h4 className="font-semibold text-slate-900">Assignments</h4>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {assignmentDetails.length ? assignmentDetails.map((assignment) => (
            <div key={`${assignment.title}-${assignment.dueDate}`} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <p className="font-medium text-slate-900">{assignment.title}</p>
              <p className="text-slate-600">{assignment.subject}</p>
              <p className="text-slate-500">Deadline: {formatDisplayDateTime(assignment.dueDate)}</p>
              <p className="font-medium text-slate-700">{assignment.status}</p>
            </div>
          )) : <p className="text-sm text-slate-500">No assignments available.</p>}
        </div>
      </div>
    </section>
  );
}

export default StudentDetailsPanel;
