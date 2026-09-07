'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Wrong password');
        setLoading(false);
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next') || '/';
      window.location.href = next;
    } catch (err) {
      setError('Could not reach the server — check your connection.');
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--ink)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <form
        onSubmit={submit}
        style={{
          background: 'var(--paper-raised)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
          padding: '32px 30px',
          width: '100%',
          maxWidth: 360
        }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>Fort Trails</h1>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 22 }}>
          Enter the crew password to get in.
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        {error && (
          <div style={{ color: 'var(--rust)', fontSize: 12.5, marginTop: -6, marginBottom: 14 }}>
            {error}
          </div>
        )}
        <button className="btn rust" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
          {loading ? 'Checking…' : 'Enter'}
        </button>
      </form>
    </div>
  );
}
