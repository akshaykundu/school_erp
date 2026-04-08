import React from 'react';
import ProfileForm from '../components/ProfileForm.jsx';

function TeacherProfilePage({
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
        title="Teacher Profile"
        accentClasses={{
          input: 'focus:border-blue-500 focus:ring-4 focus:ring-blue-100',
          button: 'bg-blue-700 hover:bg-blue-800'
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
        submitLabel="Save Teacher Profile"
      />
    </section>
  );
}

export default TeacherProfilePage;
