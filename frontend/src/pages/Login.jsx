import React, { useState } from "react";
import { useAuth } from "../lib/auth";
import { Button, Input, Field } from "../components/ui";
import { ShieldCheck, TrendingUp, Handshake, Building2 } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@nivara.app");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await login(email.trim(), password);
    setLoading(false);
    if (!res.ok) setError(res.error);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-brand-dark text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white text-brand-dark flex items-center justify-center font-display font-extrabold text-xl">N</div>
          <div>
            <div className="font-display font-bold text-xl">Nivara</div>
            <div className="text-xs text-teal-200">Financial Operating System</div>
          </div>
        </div>
        <div className="relative space-y-6 max-w-sm">
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight">One command center for all your money & projects.</h1>
          <p className="text-teal-100/80 text-sm leading-relaxed">Track net worth, income, expenses, lending, savings, PF/PPF, rental income and construction projects — all traceable, all in one place.</p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[["Net worth & cash flow", TrendingUp], ["Lending & recovery", Handshake], ["Rental income", Building2], ["Granular access", ShieldCheck]].map(([t, Ic]) => (
              <div key={t} className="flex items-center gap-2.5 text-sm text-teal-50/90">
                <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><Ic size={16} /></span>{t}
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-teal-200/60">Secure JWT authentication · India timezone · INR</div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-brand text-white flex items-center justify-center font-display font-extrabold text-xl">N</div>
            <div><div className="font-display font-bold text-xl text-ink">Nivara</div><div className="text-xs text-faint">Financial OS</div></div>
          </div>
          <h2 className="font-display text-2xl font-bold text-ink mb-1">Welcome back</h2>
          <p className="text-sm text-subink mb-6">Sign in to your admin command center.</p>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@nivara.app" data-testid="login-email" required /></Field>
            <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" data-testid="login-password" required /></Field>
            {error && <div className="text-sm text-expense bg-rose-50 border border-rose-200 rounded-lg px-3 py-2" data-testid="login-error">{error}</div>}
            <Button type="submit" size="lg" className="w-full" disabled={loading} data-testid="login-submit">{loading ? "Signing in…" : "Sign in"}</Button>
          </form>
          <p className="text-xs text-faint mt-6 text-center">Demo admin: <span className="num text-subink">admin@nivara.app</span> · <span className="num text-subink">Nivara@2026</span></p>
        </div>
      </div>
    </div>
  );
}
