import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(name, email, password, 'user');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div
  className="bm-register-page"
  style={{
    minHeight: 'calc(100vh - 60px)',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 24px',
    boxSizing: 'border-box'
  }}
>
      <style>{`
        @keyframes bmRegisterFade {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes bmRegisterFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .bm-register-card {
          animation: bmRegisterFade .55s ease-out both;
        }

        .bm-register-decoration {
          animation: bmRegisterFloat 5s ease-in-out infinite;
        }

        .bm-register-input,
        .bm-register-select {
          transition: border-color .2s ease, box-shadow .2s ease, background .2s ease;
        }

        .bm-register-input:focus,
        .bm-register-select:focus {
          outline: none;
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 4px rgba(99,102,241,.12);
          background: #fff !important;
        }

        .bm-register-button {
          transition: transform .15s ease, box-shadow .2s ease, opacity .2s ease;
        }

        .bm-register-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(79,70,229,.25);
        }

        .bm-register-button:active:not(:disabled) {
          transform: translateY(1px);
        }

        .bm-register-link {
          transition: color .2s ease;
        }

        .bm-register-link:hover {
          color: #4f46e5 !important;
        }

        @media (max-width: 800px) {
          .bm-register-page {
            padding: 24px !important;
          }

          .bm-register-shell {
            grid-template-columns: 1fr !important;
            max-width: 480px !important;
          }

          .bm-register-brand {
            display: none !important;
          }

          .bm-register-card {
            padding: 34px 26px !important;
          }

          .bm-register-mobile-brand {
            display: flex !important;
          }
        }
      `}</style>

      <div className="bm-register-shell" style={styles.shell}>
        <section className="bm-register-brand" style={styles.brandPanel}>
          <div style={styles.brandTop}>
            <div style={styles.logo}>৳</div>
            <span style={styles.brandName}>
              Budget<span style={styles.brandAccent}>Mate</span>
            </span>
          </div>

          <div style={styles.brandContent}>
            <div className="bm-register-decoration" style={styles.decorCircle}>
              <span style={{ fontSize: 38 }}>✨</span>
            </div>

            <h1 style={styles.heroTitle}>
              Start building<br />
              <span style={styles.heroAccent}>better money habits.</span>
            </h1>

            <p style={styles.heroText}>
              Create your BudgetMate account and get a clearer picture of
              your spending, budgets, savings, and financial goals.
            </p>

            <div style={styles.featureList}>
              <div style={styles.feature}>
                <span style={styles.featureIcon}>✓</span>
                <span>Track your income and expenses</span>
              </div>
              <div style={styles.feature}>
                <span style={styles.featureIcon}>✓</span>
                <span>Plan budgets that fit your life</span>
              </div>
              <div style={styles.feature}>
                <span style={styles.featureIcon}>✓</span>
                <span>Turn savings goals into progress</span>
              </div>
            </div>
          </div>

          <div style={styles.brandFooter}>
            Small steps today. Better financial decisions tomorrow.
          </div>
        </section>

        <section className="bm-register-card" style={styles.card}>
          <div className="bm-register-mobile-brand" style={styles.mobileBrand}>
            <div style={styles.logo}>৳</div>
            <span style={styles.brandName}>
              Budget<span style={styles.brandAccent}>Mate</span>
            </span>
          </div>

          <div style={styles.header}>
            <div style={styles.welcomeIcon}>🚀</div>
            <p style={styles.eyebrow}>GET STARTED</p>
            <h2 style={styles.title}>Create your account</h2>
            <p style={styles.subtitle}>
              Set up BudgetMate and start taking control of your money.
            </p>
          </div>

          {error && (
            <div role="alert" style={styles.errorBox}>
              <span style={styles.errorIcon}>!</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label style={styles.label} htmlFor="register-name">Full name</label>
            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>👤</span>
              <input
                id="register-name"
                className="bm-register-input"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGap}>
              <label style={styles.label} htmlFor="register-email">Email address</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}>✉</span>
                <input
                  id="register-email"
                  className="bm-register-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.fieldGap}>
              <label style={styles.label} htmlFor="register-password">Password</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}>🔒</span>
                <input
                  id="register-password"
                  className="bm-register-input"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  style={styles.input}
                />
              </div>
            </div>

            <button
              className="bm-register-button"
              type="submit"
              style={styles.button}
            >
              Create Account <span style={{ fontSize: 18 }}>→</span>
            </button>
          </form>

          <div style={styles.divider}>
            <span style={styles.line} />
            <span style={styles.dividerText}>ALREADY A MEMBER?</span>
            <span style={styles.line} />
          </div>

          <Link className="bm-register-link" to="/login" style={styles.loginLink}>
            ← Back to Sign In
          </Link>

          <p style={styles.securityNote}>
            🔐 Your financial information stays private and secure.
          </p>
        </section>
      </div>
    </div>
  );
  
}


const styles = {
  shell: {
    width: '100%',
    maxWidth: 1040,
    minHeight: 680,
    display: 'grid',
    gridTemplateColumns: '1fr .92fr',
    overflow: 'hidden',
    borderRadius: 26,
    background: '#fff',
    boxShadow: '0 25px 70px rgba(15,23,42,.13)',
    border: '1px solid rgba(148,163,184,.18)'
  },
  brandPanel: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    padding: '42px 48px',
    color: '#fff',
    overflow: 'hidden',
    background: 'linear-gradient(145deg,#111827 0%,#18233c 48%,#312e81 100%)'
  },
  brandTop: { display: 'flex', alignItems: 'center', gap: 11, position: 'relative', zIndex: 2 },
  logo: {
    width: 38, height: 38, borderRadius: 11,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    color: '#fff', fontWeight: 800, fontSize: 20,
    boxShadow: '0 8px 20px rgba(99,102,241,.35)'
  },
  brandName: { fontSize: 22, fontWeight: 800, letterSpacing: '-.5px' },
  brandAccent: { color: '#a78bfa' },
  brandContent: { marginTop: 78, position: 'relative', zIndex: 2 },
  decorCircle: {
    width: 72, height: 72, borderRadius: 24,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 28, background: 'rgba(255,255,255,.10)',
    border: '1px solid rgba(255,255,255,.14)',
    boxShadow: '0 15px 35px rgba(0,0,0,.15)'
  },
  heroTitle: {
    margin: 0, fontSize: 42, lineHeight: 1.08,
    letterSpacing: '-1.7px', fontWeight: 800
  },
  heroAccent: { color: '#a78bfa' },
  heroText: {
    maxWidth: 430, margin: '22px 0 30px',
    fontSize: 15, lineHeight: 1.75, color: 'rgba(255,255,255,.72)'
  },
  featureList: { display: 'grid', gap: 15 },
  feature: {
    display: 'flex', alignItems: 'center', gap: 12,
    fontSize: 14, color: 'rgba(255,255,255,.88)'
  },
  featureIcon: {
    width: 24, height: 24, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(99,102,241,.25)', color: '#c4b5fd',
    fontWeight: 800, fontSize: 13
  },
  brandFooter: {
    marginTop: 'auto', position: 'relative', zIndex: 2,
    fontSize: 12, color: 'rgba(255,255,255,.42)'
  },
  card: {
    padding: '48px 54px 38px',
    display: 'flex', flexDirection: 'column',
    justifyContent: 'center', background: '#fff'
  },
  mobileBrand: {
    display: 'none', alignItems: 'center', gap: 10, marginBottom: 30
  },
  header: { marginBottom: 22 },
  welcomeIcon: { fontSize: 27, marginBottom: 8 },
  eyebrow: {
    margin: 0, fontSize: 11, fontWeight: 800,
    letterSpacing: '1.5px', color: '#6366f1'
  },
  title: {
    margin: '7px 0 8px', fontSize: 29, lineHeight: 1.2,
    letterSpacing: '-.8px', color: '#111827'
  },
  subtitle: {
    margin: 0, fontSize: 14, lineHeight: 1.6, color: '#718096'
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 10,
    marginBottom: 18, padding: '11px 13px',
    borderRadius: 11, background: '#fff1f2',
    border: '1px solid #fecdd3', color: '#be123c',
    fontSize: 13, lineHeight: 1.4
  },
  errorIcon: {
    width: 21, height: 21, flex: '0 0 21px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '50%', background: '#ffe4e6', fontWeight: 800
  },
  label: {
    display: 'block', marginBottom: 7,
    fontSize: 13, fontWeight: 700, color: '#334155'
  },
  fieldGap: { marginTop: 14 },
  inputWrap: { position: 'relative' },
  inputIcon: {
    position: 'absolute', left: 15, top: '50%',
    transform: 'translateY(-50%)', zIndex: 1,
    fontSize: 14, opacity: .62
  },
  input: {
    width: '100%', height: 47, boxSizing: 'border-box',
    border: '1px solid #dbe1ea', borderRadius: 12,
    padding: '0 15px 0 43px', background: '#f8fafc',
    color: '#111827', fontSize: 14, fontFamily: 'inherit'
  },
  select: {
    width: '100%', height: 47, boxSizing: 'border-box',
    border: '1px solid #dbe1ea', borderRadius: 12,
    padding: '0 14px 0 43px', background: '#f8fafc',
    color: '#111827', fontSize: 14, fontFamily: 'inherit',
    appearance: 'auto'
  },
  button: {
    width: '100%', height: 51, marginTop: 22,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 9, border: 0, borderRadius: 12,
    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    color: '#fff', fontSize: 14, fontWeight: 750,
    fontFamily: 'inherit', cursor: 'pointer',
    boxShadow: '0 7px 18px rgba(79,70,229,.20)'
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: 10, margin: '25px 0 13px'
  },
  line: { height: 1, flex: 1, background: '#edf0f5' },
  dividerText: {
    fontSize: 9, letterSpacing: '1px', fontWeight: 800,
    color: '#a0aec0', whiteSpace: 'nowrap'
  },
  loginLink: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '11px 15px', borderRadius: 11,
    border: '1px solid #ddd6fe', background: '#faf9ff',
    color: '#6d28d9', textDecoration: 'none',
    fontSize: 13, fontWeight: 700
  },
  securityNote: {
    margin: '21px 0 0', textAlign: 'center',
    fontSize: 10.5, color: '#a0aec0'
  }
};

