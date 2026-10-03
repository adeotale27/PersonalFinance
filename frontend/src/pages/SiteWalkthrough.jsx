import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, Building2, Check, Compass, LockKeyhole,
  PiggyBank, ShieldCheck, Sparkles, TrendingUp, Wallet,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import api, { apiError } from "../lib/api";
import { Spinner } from "../components/ui";

const highlights = [
  { icon: TrendingUp, title: "See the whole picture", description: "Bring balances, cash flow, investments and net worth into one clear view.", tone: "blue" },
  { icon: Building2, title: "Keep projects on track", description: "Follow budgets, work progress, payments and project documents together.", tone: "teal" },
  { icon: PiggyBank, title: "Plan what comes next", description: "Track savings, loans, insurance renewals and the goals that matter to you.", tone: "violet" },
  { icon: ShieldCheck, title: "Stay in control", description: "Explore a secure, role-aware workspace built for family finances and teams.", tone: "amber" },
];

const steps = [
  ["01", "Start with the overview", "A live-feeling dashboard brings your financial position and next actions together."],
  ["02", "Explore any workspace", "Use the left navigation to open accounts, cash flow, lending, insurance, projects and more."],
  ["03", "Try it out safely", "Add, edit or remove sample records. Changes stay in this browser session and reset on refresh."],
];

export default function SiteWalkthrough() {
  const { enterDemo } = useAuth();
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(null);
  const [availabilityError, setAvailabilityError] = useState("");

  useEffect(() => {
    api.get("/sitewalkthrough/status")
      .then(({ data }) => setEnabled(data.enabled === true))
      .catch((error) => setAvailabilityError(apiError(error)));
  }, []);

  const startDemo = () => {
    enterDemo();
    navigate("/", { replace: true });
  };

  if (enabled === null) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#f5f7ff] px-5 text-center text-ink">
        <div>
          {availabilityError ? <LockKeyhole className="mx-auto mb-3 text-amber" size={30} /> : <Spinner className="mx-auto mb-3 h-7 w-7 text-brand" />}
          <h1 className="font-display text-xl font-semibold">{availabilityError ? "Walkthrough unavailable" : "Checking walkthrough availability…"}</h1>
          <p className="mt-2 max-w-md text-sm text-subink">
            {availabilityError
              ? "We couldn't check whether the site walkthrough is enabled. Please ask your administrator to check the walkthrough setting."
              : "Please wait a moment."}
          </p>
          {availabilityError && <p className="mt-2 text-xs text-expense">{availabilityError}</p>}
        </div>
      </main>
    );
  }

  if (!enabled) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#f5f7ff] px-5 text-center text-ink">
        <div className="max-w-lg rounded-2xl border border-line bg-white p-8 shadow-card">
          <LockKeyhole className="mx-auto mb-4 text-amber" size={32} />
          <h1 className="font-display text-2xl font-semibold">Walkthrough currently unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-subink">Please ask your administrator to turn on the site walkthrough.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f7ff] text-ink">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(ellipse_at_58%_0%,rgba(98,107,239,.2),transparent_60%)]" />
      <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between">
          <a href="/sitewalkthrough" className="flex items-center gap-3" aria-label="Nivara Finance walkthrough">
            <img src="/brand/nivara-logo-mark.png" alt="" className="h-11 w-11 rounded-xl border border-white bg-white object-contain shadow-sm" />
            <span className="leading-tight"><strong className="block text-sm font-black tracking-tight">NIVARA <span className="text-brand">FINANCE</span></strong><span className="mt-1 block text-[9px] font-bold tracking-[.15em] text-faint">BUILD · MANAGE · GROW</span></span>
          </a>
          <button onClick={startDemo} className="hidden items-center gap-2 rounded-full border border-line bg-white/85 px-4 py-2.5 text-xs font-bold text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-brand/30 sm:inline-flex">Open demo <ArrowRight size={14} /></button>
        </header>

        <section className="grid items-center gap-12 pb-16 pt-14 lg:grid-cols-[1fr_.92fr] lg:gap-16 lg:pb-24 lg:pt-20">
          <div className="relative z-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-indigo-700 shadow-sm"><Sparkles size={13} /> Interactive product tour</div>
            <h1 className="max-w-2xl font-display text-4xl font-semibold leading-[1.08] tracking-[-.04em] text-ink sm:text-5xl lg:text-[3.65rem]">Your financial life, <span className="bg-gradient-to-r from-brand to-teal-500 bg-clip-text text-transparent">finally in focus.</span></h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-subink sm:text-lg">Explore Nivara Finance with a complete sample workspace. No account, login or setup required — just open the demo and look around.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button onClick={startDemo} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-[#178f9e] px-6 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(75,91,229,.25)] transition hover:-translate-y-0.5 hover:brightness-105">Explore the live demo <ArrowRight size={16} /></button>
              <div className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-white/75 px-4 text-xs font-semibold text-subink"><LockKeyhole size={14} className="text-teal-600" /> Safe, temporary sample data</div>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-semibold text-subink"><span className="inline-flex items-center gap-1.5"><Check size={13} className="text-teal-600" /> No login required</span><span className="inline-flex items-center gap-1.5"><Check size={13} className="text-teal-600" /> Every page is open</span><span className="inline-flex items-center gap-1.5"><Check size={13} className="text-teal-600" /> Edits reset on refresh</span></div>
          </div>

          <div className="relative mx-auto w-full max-w-[570px]">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-indigo-200/65 via-white/30 to-teal-100/70 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/90 bg-white p-3 shadow-[0_28px_80px_-35px_rgba(47,62,120,.38)] sm:p-4">
              <div className="flex items-center justify-between border-b border-slate-100 px-2 pb-3"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-teal-400" /><span className="text-[10px] font-extrabold tracking-wide text-subink">NIVARA · SAMPLE WORKSPACE</span></div><span className="rounded-full bg-teal-50 px-2.5 py-1 text-[9px] font-bold text-teal-700">LIVE DEMO</span></div>
              <div className="grid grid-cols-3 gap-2.5 py-3 sm:gap-3">
                {[["Net worth", "₹92.7L", "+8.4%"], ["Cash flow", "₹2.45L", "This month"], ["Projects", "02 active", "68% average"]].map(([label, value, note]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 sm:p-3.5"><span className="block text-[9px] font-bold text-faint sm:text-[10px]">{label}</span><strong className="mt-1 block text-xs font-extrabold text-ink sm:text-base">{value}</strong><span className="mt-1 block text-[8px] font-semibold text-teal-700 sm:text-[9px]">{note}</span></div>)}
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between"><div><span className="block text-[10px] font-extrabold text-ink sm:text-xs">Income & expenses</span><span className="text-[9px] text-faint">A healthier monthly rhythm</span></div><span className="rounded-lg bg-indigo-50 p-2 text-brand"><Wallet size={15} /></span></div>
                <div className="flex h-32 items-end gap-2 border-b border-l border-slate-100 px-2 sm:h-40 sm:gap-3">{[47, 64, 54, 73, 60, 82, 72, 91, 68, 84, 76, 97].map((height, index) => <div key={index} className="flex h-full flex-1 items-end gap-0.5"><div className="w-1/2 rounded-t bg-gradient-to-t from-brand to-indigo-300" style={{ height: `${height}%` }} /><div className="w-1/2 rounded-t bg-gradient-to-t from-teal-500 to-teal-200" style={{ height: `${Math.max(18, height - 26)}%` }} /></div>)}</div>
                <div className="mt-2 flex justify-between text-[8px] font-medium text-faint"><span>Apr</span><span>Jun</span><span>Aug</span><span>Oct</span><span>Dec</span><span>Mar</span></div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3">
                {[["Upcoming renewal", "Family Health Floater", "15 days", ShieldCheck], ["Project milestone", "Skyline Heights", "68% complete", Building2]].map(([title, name, status, Icon]) => <div key={title} className="flex items-center gap-2.5 rounded-xl border border-slate-100 p-2.5 sm:p-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-brand"><Icon size={15} /></span><span className="min-w-0"><span className="block text-[8px] font-semibold text-faint sm:text-[9px]">{title}</span><strong className="block truncate text-[9px] text-ink sm:text-[10px]">{name}</strong></span><span className="ml-auto whitespace-nowrap text-[8px] font-bold text-teal-700">{status}</span></div>)}
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 hidden items-center gap-2 rounded-xl border border-white bg-white/95 px-3 py-2 shadow-lg sm:flex"><span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-50 text-teal-700"><ArrowUpRight size={16} /></span><span><strong className="block text-[10px] text-ink">One view. Better decisions.</strong><span className="text-[9px] text-faint">Built around your whole financial picture</span></span></div>
          </div>
        </section>

        <section className="border-t border-slate-200/70 py-14 sm:py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-brand">A workspace for the whole picture</p><h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">More clarity across your finances.</h2></div><button onClick={startDemo} className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand-dark">See it in action <ArrowRight size={14} /></button></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{highlights.map(({ icon: Icon, title, description, tone }) => <article key={title} className="rounded-2xl border border-white bg-white/80 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tone === "blue" ? "bg-indigo-50 text-brand" : tone === "teal" ? "bg-teal-50 text-teal-700" : tone === "violet" ? "bg-violet-50 text-violet-700" : "bg-amber-50 text-amber-700"}`}><Icon size={18} /></span><h3 className="mt-4 text-sm font-extrabold text-ink">{title}</h3><p className="mt-1.5 text-xs leading-5 text-subink">{description}</p></article>)}</div>
        </section>

        <section className="grid gap-8 rounded-3xl bg-[#18223a] p-6 text-white shadow-[0_24px_65px_-38px_rgba(24,34,58,.7)] sm:p-9 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div><span className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.14em] text-teal-300"><Compass size={14} /> Your guided tour</span><h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Three steps. No setup.</h2><p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">Jump into a ready-to-explore sample and see how the pieces fit together.</p><button onClick={startDemo} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-extrabold text-[#18223a] transition hover:bg-teal-50">Start the walkthrough <ArrowRight size={15} /></button></div>
          <div className="grid gap-3 sm:grid-cols-3">{steps.map(([number, title, description]) => <article key={number} className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><span className="text-xs font-extrabold text-teal-300">{number}</span><h3 className="mt-3 text-xs font-extrabold">{title}</h3><p className="mt-1.5 text-[11px] leading-5 text-slate-300">{description}</p></article>)}</div>
        </section>
        <footer className="flex flex-col gap-3 pt-8 text-[10px] font-medium text-faint sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} Nivara Finance · Interactive demo</span><span className="inline-flex items-center gap-1.5"><LockKeyhole size={11} /> No visitor changes are written to your database</span></footer>
      </div>
    </main>
  );
}
