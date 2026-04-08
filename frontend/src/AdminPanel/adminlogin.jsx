import React, { useState } from 'react';
import { API_BASE_URL } from '../config.js';

export default function AdminLogin({ onBack, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      setSuccess('');
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Unable to continue as admin.');
        return;
      }

      setSuccess('Login successful. Opening admin portal...');
      setTimeout(() => onLogin(data.user), 700);
    } catch (requestError) {
      setError('Could not connect to the backend server.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fee2e2,_#fff7ed_35%,_#ffedd5_65%,_#fed7aa)] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-3xl bg-white shadow-2xl">
          <section className="px-8 py-10 sm:px-12">
            <div className="mb-8">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-orange-700">
                Admin Portal
              </p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">Welcome back</h2>
              <p className="mt-2 text-sm text-slate-500">
                Only an existing admin can log in and create other admins.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Email Address
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Akgame99977@gmail.com"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Password
                </span>
                <div className="flex gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              {error ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </p>
              ) : null}

              {success ? (
                <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </p>
              ) : null}

              {isSubmitting ? (
                <p className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                  Checking your admin credentials...
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-orange-600 px-4 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-400"
              >
                {isSubmitting ? 'Please wait...' : 'Sign In'}
              </button>
            </form>

            <button
              type="button"
              onClick={onBack}
              className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Back to Role Selection
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
