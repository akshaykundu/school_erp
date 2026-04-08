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

function StudentExamsPage({ examDetails }) {
  return (
    <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="text-2xl font-semibold text-slate-900">Exam Details</h3>
      <p className="mt-2 text-sm text-slate-500">
        Review your upcoming exam schedule.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {examDetails.length ? (
          examDetails.map((exam) => (
            <div key={`${exam.subject}-${exam.date}-${exam.time}`} className="rounded-2xl border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">{exam.subject}</p>
              <p className="mt-2 text-sm text-slate-500">Date: {exam.date}</p>
              <p className="text-sm text-slate-500">Time: {formatDisplayTime(exam.time)}</p>
              <p className="text-sm text-slate-500">Room: {exam.room}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">
            No exam records available yet.
          </div>
        )}
      </div>
    </section>
  );
}

export default StudentExamsPage;
