import React from 'react';

function StudentAnnouncementsPage({ announcementDetails }) {
  return (
    <section className="mt-4 rounded-xl bg-white p-4 shadow-sm">
      <h3 className="text-2xl font-semibold text-slate-900">Class Announcements</h3>
      <p className="mt-2 text-sm text-slate-500">
        Announcements posted by your class teacher appear here for every student in that class.
      </p>

      <div className="mt-3 space-y-4">
        {announcementDetails.length ? (
          announcementDetails.map((announcement) => (
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
                  <p className="mt-2 text-sm text-slate-700">{announcement.message}</p>
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
    </section>
  );
}

export default StudentAnnouncementsPage;
