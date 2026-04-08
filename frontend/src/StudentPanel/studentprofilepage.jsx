import React from 'react';
import ProfileForm from '../components/ProfileForm.jsx';

function StudentProfilePage({
  profileName,
  setProfileName,
  profile,
  onProfileChange,
  onImageSelect,
  onSubmit,
  isSubmitting,
  message,
  error
}) {
  return (
    <section className="mt-8">
      <ProfileForm
        title="Student Profile"
        accentClasses={{
          input: 'focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100',
          button: 'bg-emerald-700 hover:bg-emerald-800'
        }}
        name={profileName}
        setName={setProfileName}
        profile={profile}
        onProfileChange={onProfileChange}
        onImageSelect={onImageSelect}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        message={message}
        error={error}
        submitLabel="Save Student Profile"
      />
    </section>
  );
}

export default StudentProfilePage;
