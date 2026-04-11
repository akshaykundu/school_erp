import React from 'react';

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

function StudentNotesPage({ noteDetails }) {
  return (
    <section className="mt-4 rounded-xl bg-white p-4 shadow-sm">
      <h3 className="text-2xl font-semibold text-slate-900">Class Notes</h3>
      <p className="mt-2 text-sm text-slate-500">
        Notes shared by your admin or class teacher appear here. Students can view these notes but cannot edit them.
      </p>

      <div className="mt-3 space-y-4">
        {noteDetails.length ? (
          noteDetails.map((note) => (
            <div
              key={`${note.className}-${note.title}-${note.postedAt}`}
              className="rounded-lg border border-slate-200 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{note.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {note.className} | {note.subject}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{note.content}</p>
                  {note.attachments?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {note.attachments.map((attachment) => (
                        <a
                          key={`${note.postedAt}-${attachment.name}`}
                          href={attachment.dataUrl}
                          download={attachment.name}
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100"
                        >
                          {attachment.name} ({formatFileSize(attachment.size)})
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>{note.teacherEmail}</p>
                  <p>{new Date(note.postedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-500">
            No class notes available yet.
          </div>
        )}
      </div>
    </section>
  );
}

export default StudentNotesPage;
