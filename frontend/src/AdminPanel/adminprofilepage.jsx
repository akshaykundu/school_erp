import React from 'react';
import ProfileForm from '../components/ProfileForm.jsx';

function AdminProfilePage({
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
        title="Admin Profile"
        accentClasses={{
          input: 'focus:border-orange-500 focus:ring-4 focus:ring-orange-100',
          button: 'bg-orange-600 hover:bg-orange-700'
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
        submitLabel="Save Admin Profile"
      />
    </section>
  );
}

export default AdminProfilePage;
