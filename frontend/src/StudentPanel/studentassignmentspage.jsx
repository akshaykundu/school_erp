import React from 'react';

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

function StudentAssignmentsPage({ assignmentDetails }) {
  return (
    <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="text-2xl font-semibold text-slate-900">Assignment Details</h3>
      <p className="mt-2 text-sm text-slate-500">
        Keep track of homework and submission status.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {assignmentDetails.length ? (
          assignmentDetails.map((assignment) => (
            <div
              key={`${assignment.title}-${assignment.dueDate}`}
              className="rounded-2xl border border-slate-200 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{assignment.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{assignment.subject}</p>
                </div>
                <span
                  className={
                    assignment.status === 'Submitted'
                      ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700'
                      : 'rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700'
                  }
                >
                  {assignment.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-500">Deadline: {formatDisplayDateTime(assignment.dueDate)}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">
            No assignment records available yet.
          </div>
        )}
      </div>
    </section>
  );
}

export default StudentAssignmentsPage;
