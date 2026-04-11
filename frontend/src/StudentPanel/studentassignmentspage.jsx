import React, { useState } from 'react';

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

function getAssignmentKey(assignment) {
  return `${assignment.title}-${assignment.subject}-${assignment.dueDate}`;
}

function StudentAssignmentsPage({ assignmentDetails, onSubmitAssignment, submittingAssignmentKey }) {
  const [submissionNotes, setSubmissionNotes] = useState({});
  const [submissionFiles, setSubmissionFiles] = useState({});
  const [localError, setLocalError] = useState('');

  async function handleFileChange(assignmentKey, event) {
    const selectedFiles = Array.from(event.target.files || []);

    if (!selectedFiles.length) {
      setSubmissionFiles((currentFiles) => ({
        ...currentFiles,
        [assignmentKey]: []
      }));
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

      setSubmissionFiles((currentFiles) => ({
        ...currentFiles,
        [assignmentKey]: attachments.filter((attachment) => attachment.dataUrl)
      }));
      setLocalError('');
    } catch (requestError) {
      setLocalError(requestError.message || 'Unable to attach files to this submission.');
    }

    event.target.value = '';
  }

  async function submitAssignment(assignment) {
    const assignmentKey = getAssignmentKey(assignment);
    const submissionNote = submissionNotes[assignmentKey] || '';
    const submittedAttachments = submissionFiles[assignmentKey] || [];

    setLocalError('');

    if (!submissionNote.trim() && !submittedAttachments.length) {
      setLocalError('Add a submission note or at least one file before submitting.');
      return;
    }

    const submitted = await onSubmitAssignment?.(assignment, {
      submissionNote,
      submittedAttachments
    });

    if (submitted) {
      setSubmissionNotes((currentNotes) => ({
        ...currentNotes,
        [assignmentKey]: ''
      }));
      setSubmissionFiles((currentFiles) => ({
        ...currentFiles,
        [assignmentKey]: []
      }));
    }
  }

  return (
    <section className="mt-4 rounded-xl bg-white p-4 shadow-sm">
      <h3 className="text-2xl font-semibold text-slate-900">Assignment Details</h3>
      <p className="mt-2 text-sm text-slate-500">
        View assignment files and submit your work from this page.
      </p>

      {localError ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {localError}
        </p>
      ) : null}

      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        {assignmentDetails.length ? (
          assignmentDetails.map((assignment) => {
            const assignmentKey = getAssignmentKey(assignment);
            const currentSubmissionFiles = submissionFiles[assignmentKey] || [];

            return (
              <div
                key={assignmentKey}
                className="rounded-lg border border-slate-200 p-4"
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

                <p className="mt-2 text-sm text-slate-500">Deadline: {formatDisplayDateTime(assignment.dueDate)}</p>

                <div className="mt-4">
                  <p className="text-sm font-medium text-slate-700">Assignment Files</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {assignment.attachments?.length ? assignment.attachments.map((attachment) => (
                      <a
                        key={`${assignmentKey}-${attachment.name}-${attachment.size}`}
                        href={attachment.dataUrl}
                        download={attachment.name}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100"
                      >
                        {attachment.name} ({formatFileSize(attachment.size)})
                      </a>
                    )) : <p className="text-sm text-slate-500">No files attached by the teacher.</p>}
                  </div>
                </div>

                {assignment.status === 'Submitted' ? (
                  <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Submitted At: {formatDisplayDateTime(assignment.submittedAt)}</p>
                    <p className="text-sm text-slate-700">{assignment.submissionNote || 'No submission note added.'}</p>
                    <div className="flex flex-wrap gap-2">
                      {assignment.submittedAttachments?.length ? assignment.submittedAttachments.map((attachment) => (
                        <a
                          key={`${assignmentKey}-submitted-${attachment.name}-${attachment.size}`}
                          href={attachment.dataUrl}
                          download={attachment.name}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          {attachment.name} ({formatFileSize(attachment.size)})
                        </a>
                      )) : <p className="text-sm text-slate-500">No files were uploaded with this submission.</p>}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <textarea
                      value={submissionNotes[assignmentKey] || ''}
                      onChange={(event) => setSubmissionNotes((currentNotes) => ({
                        ...currentNotes,
                        [assignmentKey]: event.target.value
                      }))}
                      placeholder="Add your submission note"
                      rows="3"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <label className="block text-sm font-medium text-slate-700">
                        Upload assignment files
                        <input type="file" multiple onChange={(event) => handleFileChange(assignmentKey, event)} className="mt-2 block w-full text-sm text-slate-600" />
                      </label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {currentSubmissionFiles.length ? currentSubmissionFiles.map((attachment) => (
                          <span key={`${assignmentKey}-local-${attachment.name}-${attachment.size}`} className="rounded-xl bg-white px-3 py-2 text-xs text-slate-700">
                            {attachment.name} ({formatFileSize(attachment.size)})
                          </span>
                        )) : <p className="text-xs text-slate-500">No files selected yet.</p>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => submitAssignment(assignment)}
                      disabled={submittingAssignmentKey === assignmentKey}
                      className="w-full rounded-lg bg-emerald-700 px-3 py-2 font-semibold text-white transition hover:bg-emerald-800 disabled:bg-emerald-300"
                    >
                      {submittingAssignmentKey === assignmentKey ? 'Submitting Assignment...' : 'Submit Assignment'}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-500">
            No assignment records available yet.
          </div>
        )}
      </div>
    </section>
  );
}

export default StudentAssignmentsPage;
