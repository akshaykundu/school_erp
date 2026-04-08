import React from 'react';

function StudentFeesPage({ pendingFeeDetails, getFeeMonth }) {
  return (
    <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="text-2xl font-semibold text-slate-900">Fee Details</h3>
      <p className="mt-2 text-sm text-slate-500">
        Only pending fees are shown here, along with the related month.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {pendingFeeDetails.length ? (
          pendingFeeDetails.map((fee) => (
            <div key={`${fee.title}-${fee.dueDate}`} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{fee.title}</p>
                  <p className="mt-1 text-sm text-slate-500">Month: {getFeeMonth(fee.dueDate)}</p>
                  <p className="text-sm text-slate-500">Due: {fee.dueDate}</p>
                </div>
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                  {fee.status}
                </span>
              </div>
              <p className="mt-3 text-lg font-bold text-slate-800">{fee.amount}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">
            No pending fee records available.
          </div>
        )}
      </div>
    </section>
  );
}

export default StudentFeesPage;
