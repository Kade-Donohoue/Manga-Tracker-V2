import * as React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  const handleSignInClick = () => navigate('/sign-in');
  const handleSignUpClick = () => navigate('/sign-up');

  return (
    <div
      style={{
        padding: 32,
        fontFamily: 'sans-serif',
        color: '#f0f0f0',
        backgroundColor: '#121212',
        minHeight: '100vh',
      }}
    >
      {/* Hero Section */}
      <section
        style={{
          maxWidth: 800,
          margin: '0 auto',
          textAlign: 'center',
          padding: '64px 16px',
        }}
      >
        <h1 style={{ fontSize: '2.5rem', marginBottom: 16 }}>Manga Tracker</h1>
        <p style={{ fontSize: '1.2rem', marginBottom: 32 }}>
          Track all your favorite manga across multiple sources in one place.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          <button
            onClick={handleSignInClick}
            style={{
              backgroundColor: '#00bcd4',
              color: '#fff',
              padding: '12px 24px',
              fontSize: '1rem',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'background 0.3s',
            }}
          >
            Sign In
          </button>
          <button
            onClick={handleSignUpClick}
            style={{
              backgroundColor: 'transparent',
              color: '#00bcd4',
              padding: '12px 24px',
              fontSize: '1rem',
              border: '1px solid #00bcd4',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'background 0.3s, color 0.3s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#00bcd4';
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = '#00bcd4';
            }}
          >
            Sign Up
          </button>
        </div>
      </section>

      {/* Supported Sources */}
      <section style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', marginTop: 48 }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: 24 }}>Currently Supported Sources</h2>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          {[
            { name: 'Manganato', url: 'https://www.manganato.gg/' },
            { name: 'Asura Scans', url: 'https://asuracomic.net/' },
            { name: 'MangaFire', url: 'https://mangafire.to/home' },
            { name: 'Mangadex', url: 'https://mangadex.org/' },
            { name: 'MangaPark', url: 'https://mangapark.org/' },
            { name: 'Bato', url: 'https://bato.to/' },
          ].map(({ name, url }) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#80deea',
                textDecoration: 'none',
                border: '1px solid #80deea',
                borderRadius: 8,
                padding: '8px 16px',
                minWidth: 120,
              }}
            >
              {name}
            </a>
          ))}
        </div>
      </section>

      {/* Info Section */}
      <section
        style={{
          maxWidth: 700,
          margin: '64px auto 0',
          textAlign: 'center',
          fontSize: '1rem',
        }}
      >
        <p>
          Have feature requests or bug reports? Open an issue on{' '}
          <a
            href="https://github.com/Kade-Donohoue/Manga-Tracker-V2"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#80deea', textDecoration: 'underline' }}
          >
            GitHub
          </a>
          .
        </p>
        <p style={{ marginTop: 16 }}>
          To get started, sign in or sign up, then visit <strong>View Tracked</strong> to begin
          adding your manga.
        </p>
      </section>
    </div>
  );
}
