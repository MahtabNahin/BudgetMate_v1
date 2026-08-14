import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bm-login-page">
      <style>{`
        .bm-login-page{min-height:100vh;box-sizing:border-box;display:flex;align-items:center;justify-content:center;padding:42px;background:radial-gradient(circle at 15% 15%,rgba(99,102,241,.16),transparent 30%),radial-gradient(circle at 85% 85%,rgba(168,85,247,.13),transparent 30%),#f4f6fa;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172033}
        .bm-login-shell{width:100%;max-width:1040px;min-height:640px;display:grid;grid-template-columns:1fr .92fr;overflow:hidden;border-radius:26px;background:#fff;box-shadow:0 25px 70px rgba(15,23,42,.13);border:1px solid rgba(148,163,184,.18)}
        .bm-brand{position:relative;display:flex;flex-direction:column;padding:42px 48px;color:#fff;overflow:hidden;background:linear-gradient(145deg,#111827 0%,#18233c 48%,#312e81 100%)}
        .bm-brand:after{content:"";position:absolute;width:300px;height:300px;border-radius:50%;right:-140px;bottom:-140px;background:rgba(139,92,246,.18)}
        .bm-brand-top{display:flex;align-items:center;gap:11px;position:relative;z-index:2}.bm-logo{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#6366f1,#8b5cf6);font-weight:800;font-size:20px;box-shadow:0 8px 20px rgba(99,102,241,.35)}
        .bm-brand-name{font-size:22px;font-weight:800;letter-spacing:-.5px}.bm-purple{color:#a78bfa}.bm-brand-content{margin-top:78px;position:relative;z-index:2}.bm-orb{width:72px;height:72px;border-radius:24px;display:flex;align-items:center;justify-content:center;margin-bottom:28px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14);animation:bmFloat 5s ease-in-out infinite}
        .bm-hero{margin:0;font-size:45px;line-height:1.08;letter-spacing:-1.8px;font-weight:800}.bm-hero-accent{color:#a78bfa}.bm-hero-text{max-width:430px;margin:22px 0 30px;font-size:15px;line-height:1.75;color:rgba(255,255,255,.72)}.bm-features{display:grid;gap:15px}.bm-feature{display:flex;align-items:center;gap:12px;font-size:14px;color:rgba(255,255,255,.88)}.bm-check{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(99,102,241,.25);color:#c4b5fd;font-weight:800;font-size:13px}.bm-brand-footer{margin-top:auto;position:relative;z-index:2;font-size:12px;color:rgba(255,255,255,.42)}
        .bm-card{padding:58px 54px 42px;display:flex;flex-direction:column;justify-content:center;animation:bmFadeUp .55s ease-out both}.bm-card-head{margin-bottom:27px}.bm-welcome{font-size:27px;margin-bottom:8px}.bm-eyebrow{margin:0;font-size:11px;font-weight:800;letter-spacing:1.5px;color:#6366f1}.bm-title{margin:7px 0 8px;font-size:29px;line-height:1.2;letter-spacing:-.8px;color:#111827}.bm-subtitle{margin:0;font-size:14px;line-height:1.6;color:#718096}
        .bm-error{display:flex;align-items:center;gap:10px;margin-bottom:19px;padding:11px 13px;border-radius:11px;background:#fff1f2;border:1px solid #fecdd3;color:#be123c;font-size:13px}.bm-error-icon{width:21px;height:21px;flex:0 0 21px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#ffe4e6;font-weight:800}.bm-label{display:block;margin-bottom:8px;font-size:13px;font-weight:700;color:#334155}.bm-input-wrap{position:relative}.bm-icon{position:absolute;left:15px;top:50%;transform:translateY(-50%);z-index:1;font-size:15px;opacity:.62}.bm-input{width:100%;height:50px;box-sizing:border-box;border:1px solid #dbe1ea;border-radius:12px;padding:0 15px 0 43px;background:#f8fafc;color:#111827;font-size:14px;font-family:inherit;transition:border-color .2s,box-shadow .2s,background .2s}.bm-input:focus{outline:none;border-color:#6366f1;box-shadow:0 0 0 4px rgba(99,102,241,.12);background:#fff}.bm-password{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:36px;height:36px;border:0;background:transparent;cursor:pointer;border-radius:9px}
        .bm-options{display:flex;align-items:center;margin:16px 0 21px}.bm-remember{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#64748b;cursor:pointer}.bm-checkbox{width:15px;height:15px;accent-color:#6366f1}.bm-button{width:100%;height:51px;display:flex;align-items:center;justify-content:center;gap:9px;border:0;border-radius:12px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-size:14px;font-weight:750;font-family:inherit;box-shadow:0 7px 18px rgba(79,70,229,.2);cursor:pointer;transition:transform .15s,box-shadow .2s,opacity .2s}.bm-button:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 10px 24px rgba(79,70,229,.25)}.bm-button:active:not(:disabled){transform:translateY(1px)}.bm-divider{display:flex;align-items:center;gap:10px;margin:28px 0 13px}.bm-line{height:1px;flex:1;background:#edf0f5}.bm-divider-text{font-size:9px;letter-spacing:1px;font-weight:800;color:#a0aec0;white-space:nowrap}.bm-register-text{margin:0 0 13px;text-align:center;font-size:12.5px;line-height:1.5;color:#718096}.bm-register{display:flex;align-items:center;justify-content:center;gap:7px;padding:11px 15px;border-radius:11px;border:1px solid #ddd6fe;background:#faf9ff;color:#6d28d9;text-decoration:none;font-size:13px;font-weight:700;transition:all .2s}.bm-register:hover{background:#f3efff;border-color:#c4b5fd}.bm-security{margin:25px 0 0;text-align:center;font-size:10.5px;color:#a0aec0}.bm-mobile-brand{display:none}
        @keyframes bmFadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}@keyframes bmFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @media(max-width:800px){.bm-login-page{padding:24px}.bm-login-shell{grid-template-columns:1fr;max-width:480px;min-height:auto}.bm-brand{display:none}.bm-card{padding:34px 26px}.bm-mobile-brand{display:flex;align-items:center;gap:10px;margin-bottom:34px}.bm-title{font-size:27px}}
      `}</style>

      <div className="bm-login-shell">
        <section className="bm-brand">
          <div className="bm-brand-top"><div className="bm-logo">৳</div><span className="bm-brand-name">Budget<span className="bm-purple">Mate</span></span></div>
          <div className="bm-brand-content">
            <div className="bm-orb"><span style={{fontSize:42}}>৳</span></div>
            <h1 className="bm-hero">Take control of<br/><span className="bm-hero-accent">your money.</span></h1>
            <p className="bm-hero-text">Track your spending, manage your budgets, and work toward the things you want with BudgetMate.</p>
            <div className="bm-features">
              <div className="bm-feature"><span className="bm-check">✓</span><span>Understand where your money goes</span></div>
              <div className="bm-feature"><span className="bm-check">✓</span><span>Stay on top of your monthly budget</span></div>
              <div className="bm-feature"><span className="bm-check">✓</span><span>Build better savings habits</span></div>
            </div>
          </div>
          <div className="bm-brand-footer">Your finances. Your goals. Your future.</div>
        </section>

        <section className="bm-card">
          <div className="bm-mobile-brand"><div className="bm-logo">৳</div><span className="bm-brand-name">Budget<span className="bm-purple">Mate</span></span></div>
          <div className="bm-card-head"><div className="bm-welcome">👋</div><p className="bm-eyebrow">WELCOME BACK</p><h2 className="bm-title">Good to see you again</h2><p className="bm-subtitle">Sign in to continue managing your finances.</p></div>

          {error && <div className="bm-error" role="alert"><span className="bm-error-icon">!</span><span>{error}</span></div>}

          <form onSubmit={handleSubmit}>
            <label className="bm-label" htmlFor="login-email">Email address</label>
            <div className="bm-input-wrap"><span className="bm-icon">✉</span><input id="login-email" className="bm-input" type="email" placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="email" required /></div>

            <div style={{marginTop:18}}>
              <label className="bm-label" htmlFor="login-password">Password</label>
              <div className="bm-input-wrap"><span className="bm-icon">🔒</span><input id="login-password" className="bm-input" style={{paddingRight:48}} type={showPassword?'text':'password'} placeholder="Enter your password" value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete="current-password" required /><button type="button" className="bm-password" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?'🙈':'👁'}</button></div>
            </div>

            <div className="bm-options"><label className="bm-remember"><input className="bm-checkbox" type="checkbox"/> <span>Remember me</span></label></div>
            <button className="bm-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : <>Sign In <span style={{fontSize:18}}>→</span></>}</button>
          </form>

          <div className="bm-divider"><span className="bm-line"/><span className="bm-divider-text">NEW TO BUDGETMATE?</span><span className="bm-line"/></div>
          <p className="bm-register-text">Create an account and start building better money habits.</p>
          <Link className="bm-register" to="/register">Create your account <span>→</span></Link>
          <p className="bm-security">🔐 Your financial information stays private and secure.</p>
        </section>
      </div>
    </div>
  );
}
