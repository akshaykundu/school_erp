import React from 'react';

function ProfileForm({
  title,
  accentClasses,
  name,
  setName,
  profile,
  onProfileChange,
  onImageSelect,
  onSubmit,
  isSubmitting,
  message,
  error,
  submitLabel
}) {
  const previewImage = profile.profileImage || '';

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-72">
          <h3 className="text-2xl font-semibold text-slate-900">{title}</h3>
          <p className="mt-2 text-sm text-slate-500">
            Fill in your personal details and profile picture.
          </p>

          <div className="mt-6 flex flex-col items-center rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
            {previewImage ? (
              <img
                src={previewImage}
                alt={`${name || 'User'} profile`}
                className="h-28 w-28 rounded-full object-cover shadow"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-200 text-3xl font-bold text-slate-500">
                {(name || 'U').slice(0, 1).toUpperCase()}
              </div>
            )}
            <label className={`mt-4 inline-flex cursor-pointer rounded-2xl px-4 py-2 text-sm font-semibold text-white ${accentClasses.button}`}>
              Upload Photo
              <input type="file" accept="image/*" className="hidden" onChange={onImageSelect} />
            </label>
          </div>
        </div>

        <form className="grid flex-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Full name"
            className={`w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ${accentClasses.input}`}
          />
          <input
            type="text"
            value={profile.phone}
            onChange={(event) => onProfileChange('phone', event.target.value)}
            placeholder="Phone number"
            className={`w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ${accentClasses.input}`}
          />
          <input
            type="date"
            value={profile.dateOfBirth}
            onChange={(event) => onProfileChange('dateOfBirth', event.target.value)}
            className={`w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ${accentClasses.input}`}
          />
          <select
            value={profile.gender}
            onChange={(event) => onProfileChange('gender', event.target.value)}
            className={`w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ${accentClasses.input}`}
          >
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <textarea
            value={profile.address}
            onChange={(event) => onProfileChange('address', event.target.value)}
            placeholder="Address"
            rows="3"
            className={`w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none md:col-span-2 ${accentClasses.input}`}
          />
          <textarea
            value={profile.bio}
            onChange={(event) => onProfileChange('bio', event.target.value)}
            placeholder="Short bio"
            rows="3"
            className={`w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none md:col-span-2 ${accentClasses.input}`}
          />

          <div className="md:col-span-2">
            {error ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </p>
            ) : null}
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full rounded-2xl px-4 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-400 ${accentClasses.button}`}
            >
              {isSubmitting ? 'Saving Profile...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default ProfileForm;
