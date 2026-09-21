import React, { useState } from "react";
import { useAuth } from "../lib/auth";
import { Eye, EyeOff, Handshake, LockKeyhole, Mail, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

const features = [["Net worth & cash flow", "Real-time wealth and treasury reporting", TrendingUp], ["Lending & recovery", "Structured lending and repayment clarity", Handshake], ["Rental income", "Portfolio yield and occupancy tracking", Sparkles], ["Granular access", "Secure, role-aware workspace control", ShieldCheck]];

function BrandMark({ dark = false }) {
  return <div className="flex items-center gap-2.5"><span className={`login-mark ${dark ? "" : "shadow-lg shadow-indigo-950/20"}`}><Sparkles size={17} strokeWidth={2.6} /></span><div className="leading-none"><strong className={dark ? "text-white" : "text-ink"}>NIVARA</strong><strong className="text-cyan-400 ml-1">FINANCE</strong><span className={`block mt-1 text-[8px] tracking-[.08em] ${dark ? "text-slate-400" : "text-faint"}`}>PERSONAL FINANCIAL OS</span></div></div>;
}

function FinanceVisual() {
  return <div className="login-visual" aria-hidden="true"><div className="login-status"><span /> SYSTEM STATUS: OPERATIONAL</div><svg viewBox="0 0 360 210" role="presentation"><defs><linearGradient id="barGlow" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#59e8ff"/><stop offset="1" stopColor="#8a5cff"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g className="visual-grid"><path d="M40 165H318M40 132H318M40 99H318M40 66H318"/><path d="M70 42V174M116 42V174M162 42V174M208 42V174M254 42V174"/></g><g className="visual-bars" filter="url(#glow)"><rect x="68" y="112" width="15" height="52" rx="3"/><rect x="94" y="84" width="15" height="80" rx="3"/><rect x="120" y="101" width="15" height="63" rx="3"/><rect x="146" y="60" width="15" height="104" rx="3"/></g><g className="visual-pie" filter="url(#glow)"><circle cx="244" cy="99" r="39" fill="none" stroke="#5be9ff" strokeWidth="13" strokeDasharray="140 105" transform="rotate(-35 244 99)"/><circle cx="244" cy="99" r="39" fill="none" stroke="#a156ff" strokeWidth="13" strokeDasharray="57 188" strokeDashoffset="-148" transform="rotate(-35 244 99)"/></g><path className="visual-line" d="M51 151 C76 145,88 120,109 126 S144 152,162 111 S198 71,214 101 S242 140,270 99 S302 83,319 70"/><circle className="visual-dot" cx="319" cy="70" r="5"/></svg><div className="visual-floor" /></div>;
}

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const submit = async (event) => { event.preventDefault(); setError(""); setLoading(true); const result = await login(email.trim(), password); setLoading(false); if (!result.ok) setError(result.error); };

  return <div className="login-shell min-h-screen text-white"><div className="login-shell__grid" />
    <div className="relative z-10 min-h-screen max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-14 py-7 sm:py-12 flex flex-col">
      <BrandMark dark />
      <div className="flex-1 grid lg:grid-cols-[1.28fr_.72fr] items-center gap-12 lg:gap-20 py-10 lg:py-8">
        <section className="max-w-2xl"><FinanceVisual /><div className="mt-10"><p className="text-cyan-400 text-[10px] tracking-[.11em] font-extrabold">FINANCIAL OPERATING SYSTEM</p><h1 className="mt-2 font-sans text-[2rem] sm:text-[2.65rem] font-extrabold tracking-[-.045em] leading-[1.08] max-w-xl">One command center for all your money & projects.</h1><div className="grid sm:grid-cols-2 gap-x-8 gap-y-5 mt-8">{features.map(([title, detail, Icon]) => <div key={title} className="flex gap-3"><span className="login-feature-icon"><Icon size={16} /></span><div><h2 className="text-sm font-bold">{title}</h2><p className="text-[11px] leading-snug text-slate-400 mt-0.5">{detail}</p></div></div>)}</div></div></section>
        <section className="login-panel w-full max-w-[410px] lg:justify-self-end p-6 sm:p-8"><div className="w-10 h-1 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 mb-6"/><h2 className="font-sans text-2xl font-extrabold tracking-tight">Welcome back</h2><p className="text-sm text-slate-400 mt-1">Your private finance workspace, ready when you are.</p><form onSubmit={submit} className="mt-7 space-y-5"><label className="block"><span className="login-label">Email address</span><span className="login-input-wrap"><Mail size={16}/><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@nivara.app" data-testid="login-email" required /></span></label><label className="block"><span className="flex items-center justify-between login-label">Password <span className="text-cyan-400 normal-case tracking-normal cursor-pointer">Forgot?</span></span><span className="login-input-wrap"><LockKeyhole size={16}/><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" data-testid="login-password" required /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></span></label>{error && <div className="text-sm text-rose-200 bg-rose-500/10 border border-rose-400/30 rounded-xl px-3 py-2" data-testid="login-error">{error}</div>}<button type="submit" disabled={loading} data-testid="login-submit" className="login-submit">{loading ? "Signing in…" : "Sign in"}</button></form><p className="text-[10px] text-slate-500 mt-5 text-center flex justify-center items-center gap-1.5"><LockKeyhole size={12}/> Your information stays protected in this workspace.</p></section>
      </div>
    </div>
  </div>;
}
