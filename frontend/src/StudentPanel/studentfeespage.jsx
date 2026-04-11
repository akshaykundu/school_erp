import React, { useState } from 'react';

function formatDisplayDateTime(dateTimeValue) {
  if (!dateTimeValue) {
    return 'Not paid yet';
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

function parseDateValue(dateValue) {
  const parsedDate = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function getDueState(fee) {
  if (fee.status === 'Paid') {
    return {
      label: 'Paid',
      badgeClass: 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700',
      noteClass: 'rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700',
      note: `Paid by ${fee.paymentMethod || 'the saved method'}.`
    };
  }

  const dueDate = parseDateValue(fee.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!dueDate) {
    return {
      label: 'Pending',
      badgeClass: 'rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700',
      noteClass: 'rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700',
      note: 'You can pay this fee anytime before or after the due date.'
    };
  }

  if (dueDate.getTime() < today.getTime()) {
    return {
      label: 'Overdue',
      badgeClass: 'rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700',
      noteClass: 'rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700',
      note: 'This month is overdue, but you can still pay it anytime.'
    };
  }

  if (dueDate.getTime() === today.getTime()) {
    return {
      label: 'Due Today',
      badgeClass: 'rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700',
      noteClass: 'rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700',
      note: 'This fee is due today. You can pay now or later.'
    };
  }

  return {
    label: 'Upcoming',
    badgeClass: 'rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700',
    noteClass: 'rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700',
    note: 'This is a future month fee. You can pay it anytime before the due date or after it.'
  };
}

function StudentFeesPage({ feeDetails, getFeeMonth, onPayFee, payingFeeKey }) {
  const [paymentMethodByFee, setPaymentMethodByFee] = useState({});
  const [selectedFeeKeys, setSelectedFeeKeys] = useState([]);
  const [batchPaymentMethod, setBatchPaymentMethod] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  function isLikelyMobileDevice() {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia('(max-width: 768px)').matches;
  }

  function shouldShowUpiWarning(paymentMethod) {
    return paymentMethod === 'UPI';
  }

  function getUpiHelperMessage() {
    if (isLikelyMobileDevice()) {
      return 'UPI works best on mobile. You can continue with your UPI app or enter a UPI ID if Razorpay shows that option.';
    }

    return 'Desktop UPI usually works best by scanning the Razorpay QR code with your phone. UPI app deep links often do not work on desktop browsers.';
  }

  function getFeeKey(fee) {
    return `${fee.title}-${fee.dueDate}`;
  }

  const pendingFeeDetails = feeDetails.filter((fee) => fee.status === 'Pending');
  const paidFeeDetails = feeDetails.filter((fee) => fee.status === 'Paid');
  const sortedFeeDetails = [...feeDetails].sort((first, second) => first.dueDate.localeCompare(second.dueDate));
  const availableMonths = ['All Months', ...new Set(sortedFeeDetails.map((fee) => getFeeMonth(fee.dueDate)))];
  const [activeMonth, setActiveMonth] = useState('All Months');
  const filteredFeeDetails = sortedFeeDetails.filter((fee) => {
    const dueState = getDueState(fee);
    const matchesMonth = activeMonth === 'All Months' || getFeeMonth(fee.dueDate) === activeMonth;

    if (!matchesMonth) {
      return false;
    }

    if (activeFilter === 'All') {
      return true;
    }

    if (activeFilter === 'Pending') {
      return fee.status === 'Pending';
    }

    if (activeFilter === 'Paid') {
      return fee.status === 'Paid';
    }

    return dueState.label === activeFilter;
  });
  const filteredPendingFeeDetails = filteredFeeDetails.filter((fee) => fee.status === 'Pending');
  const selectedPendingFees = pendingFeeDetails.filter((fee) => selectedFeeKeys.includes(getFeeKey(fee)));
  const selectedAllowedMethods = selectedPendingFees.length
    ? selectedPendingFees.reduce((currentMethods, fee) => {
      const feeMethods = fee.allowedPaymentMethods?.length
        ? fee.allowedPaymentMethods
        : ['UPI', 'Card', 'Bank Transfer'];

      if (!currentMethods) {
        return feeMethods;
      }

      return currentMethods.filter((method) => feeMethods.includes(method));
    }, null)
    : ['UPI', 'Card', 'Bank Transfer'];

  function toggleFeeSelection(fee) {
    const feeKey = getFeeKey(fee);

    setSelectedFeeKeys((currentKeys) =>
      currentKeys.includes(feeKey)
        ? currentKeys.filter((key) => key !== feeKey)
        : [...currentKeys, feeKey]
    );
  }

  function handleSelectAllPendingFees() {
    setSelectedFeeKeys(filteredPendingFeeDetails.map((fee) => getFeeKey(fee)));
  }

  function handleClearSelectedFees() {
    setSelectedFeeKeys([]);
    setBatchPaymentMethod('');
  }

  function getStudentFeeHeading(fee) {
    const monthLabel = getFeeMonth(fee.dueDate);
    return fee.title === 'Monthly Fee' ? monthLabel : `${monthLabel} - ${fee.title}`;
  }

  function getPaymentMethodLabel(method) {
    if (method === 'UPI') {
      return isLikelyMobileDevice() ? 'UPI (App or UPI ID)' : 'UPI (Scan QR on Desktop)';
    }

    return method;
  }

  return (
    <section className="mt-4 rounded-xl bg-white p-4 shadow-sm">
      <h3 className="text-2xl font-semibold text-slate-900">Monthly Fee Portal</h3>
      <p className="mt-2 text-sm text-slate-500">
        This page shows every month&apos;s fee. Students can pay any month anytime, whether it is before the due date or after it.
      </p>
      <p className="mt-2 text-sm text-emerald-700">
        Razorpay test checkout is available for UPI, Card, and Bank Transfer.
      </p>
      <p className="mt-2 text-sm font-medium text-slate-600">
        Showing {filteredFeeDetails.length} of {sortedFeeDetails.length} fee records for this student.
      </p>

      <div className="mt-3 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Total Months</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{sortedFeeDetails.length}</p>
        </div>
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm text-orange-700">Pending Months</p>
          <p className="mt-2 text-3xl font-bold text-orange-900">{pendingFeeDetails.length}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">Paid Months</p>
          <p className="mt-2 text-3xl font-bold text-emerald-900">{paidFeeDetails.length}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <select
          value={activeMonth}
          onChange={(event) => setActiveMonth(event.target.value)}
          className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-slate-400 sm:w-auto"
        >
          {availableMonths.map((monthLabel) => (
            <option key={monthLabel} value={monthLabel}>{monthLabel}</option>
          ))}
        </select>
        {['All', 'Pending', 'Paid', 'Upcoming', 'Due Today', 'Overdue'].map((filterLabel) => (
          <button
            key={filterLabel}
            type="button"
            onClick={() => {
              setActiveFilter(filterLabel);

              if (filterLabel === 'All') {
                setActiveMonth('All Months');
              }
            }}
            className={
              activeFilter === filterLabel
                ? 'rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white'
                : 'rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50'
            }
          >
            {filterLabel}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setActiveMonth('All Months');
            setActiveFilter('All');
          }}
          className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
        >
          Reset Filters
        </button>
      </div>

      {pendingFeeDetails.length ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-900">Pay Multiple Months At Once</p>
              <p className="mt-1 text-sm text-emerald-700">
                Select any monthly fees below and pay them together in one online payment, even if some are upcoming or overdue.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllPendingFees}
                  disabled={payingFeeKey === 'batch' || !filteredPendingFeeDetails.length}
                  className="rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-400"
                >
                  Select All Visible Pending Months
                </button>
                <button
                  type="button"
                  onClick={handleClearSelectedFees}
                  disabled={payingFeeKey === 'batch' || !selectedFeeKeys.length}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  Clear Selection
                </button>
              </div>
            </div>
            <div className="grid gap-3 lg:min-w-[320px]">
              <select
                value={batchPaymentMethod}
                onChange={(event) => setBatchPaymentMethod(event.target.value)}
                disabled={payingFeeKey === 'batch' || !selectedPendingFees.length}
                className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100"
              >
                <option value="">Select payment method for selected fees</option>
                {selectedAllowedMethods.map((method) => (
                  <option key={method} value={method}>{getPaymentMethodLabel(method)}</option>
                ))}
              </select>
              {shouldShowUpiWarning(batchPaymentMethod) ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {getUpiHelperMessage()}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => onPayFee(selectedPendingFees, batchPaymentMethod)}
                disabled={
                  payingFeeKey === 'batch' ||
                  !selectedPendingFees.length ||
                  !batchPaymentMethod ||
                  !selectedAllowedMethods.length ||
                  !selectedAllowedMethods.includes(batchPaymentMethod)
                }
                className="w-full rounded-lg bg-emerald-700 px-3 py-2 font-semibold text-white transition hover:bg-emerald-800 disabled:bg-emerald-300"
              >
                {payingFeeKey === 'batch' ? 'Processing Selected Fees...' : `Pay Selected Fees (${selectedPendingFees.length})`}
              </button>
            </div>
          </div>
          {!selectedAllowedMethods.length && selectedFeeKeys.length ? (
            <p className="mt-2 text-sm text-rose-700">
              The selected fees do not share a common payment method. Choose a different combination.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        {filteredFeeDetails.length ? (
          filteredFeeDetails.map((fee) => {
            const dueState = getDueState(fee);

            return (
            <div key={getFeeKey(fee)} className="card-scrollbar max-h-[34rem] overflow-y-auto rounded-lg border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {fee.status === 'Pending' ? (
                    <label className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedFeeKeys.includes(getFeeKey(fee))}
                        onChange={() => toggleFeeSelection(fee)}
                        disabled={payingFeeKey === 'batch'}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Select for combined payment
                    </label>
                  ) : null}
                  <p className="font-semibold text-slate-900">{getStudentFeeHeading(fee)}</p>
                  <div className="mt-2 grid gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    <p><span className="font-semibold text-slate-800">Month:</span> {getFeeMonth(fee.dueDate)}</p>
                    <p><span className="font-semibold text-slate-800">Due Date:</span> {fee.dueDate}</p>
                    <p><span className="font-semibold text-slate-800">Status:</span> {fee.status}</p>
                    <p><span className="font-semibold text-slate-800">Allowed Online Methods:</span> {fee.allowedPaymentMethods?.length ? fee.allowedPaymentMethods.join(', ') : 'UPI, Card, Bank Transfer'}</p>
                    <p><span className="font-semibold text-slate-800">Payment Method:</span> {fee.paymentMethod || 'Not paid yet'}</p>
                    <p><span className="font-semibold text-slate-800">Transaction ID:</span> {fee.transactionId || 'Not available'}</p>
                    <p><span className="font-semibold text-slate-800">Paid On:</span> {formatDisplayDateTime(fee.paidAt)}</p>
                  </div>
                </div>
                <span className={dueState.badgeClass}>{dueState.label}</span>
              </div>
              <p className="mt-2 break-words text-lg font-bold text-slate-800">{fee.amount}</p>
              {fee.status === 'Pending' ? (
                <div className="mt-4 space-y-3">
                  <div className={dueState.noteClass}>
                    {dueState.note}
                  </div>
                  <select
                    value={paymentMethodByFee[getFeeKey(fee)] || ''}
                    onChange={(event) =>
                      setPaymentMethodByFee((currentState) => ({
                        ...currentState,
                        [getFeeKey(fee)]: event.target.value
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="">Select online payment method</option>
                    {(fee.allowedPaymentMethods?.length ? fee.allowedPaymentMethods : ['UPI', 'Card', 'Bank Transfer']).map((method) => (
                      <option key={method} value={method}>{getPaymentMethodLabel(method)}</option>
                    ))}
                  </select>
                  {shouldShowUpiWarning(paymentMethodByFee[getFeeKey(fee)] || '') ? (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      {getUpiHelperMessage()}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onPayFee(fee, paymentMethodByFee[getFeeKey(fee)] || '')}
                    disabled={payingFeeKey === getFeeKey(fee) || payingFeeKey === 'batch'}
                    className="w-full rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white transition hover:bg-emerald-700 disabled:bg-emerald-300"
                  >
                    {payingFeeKey === getFeeKey(fee)
                      ? 'Processing Payment...'
                      : (paymentMethodByFee[getFeeKey(fee)] || '') === 'UPI'
                        ? getPaymentMethodLabel('UPI')
                        : 'Pay Online'}
                  </button>
                </div>
              ) : (
                <div className={dueState.noteClass}>
                  {dueState.note}
                </div>
              )}
            </div>
          )})
        ) : (
          <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-500">
            No fee records available for this filter.
          </div>
        )}
      </div>
    </section>
  );
}

export default StudentFeesPage;
