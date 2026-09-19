import React, { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, Wallet, TrendingUp, CreditCard, Handshake,
  PiggyBank, ShieldCheck, Building2, Scale, FolderKanban, Users, KeyRound,
  FileText, Settings, Plus, LogOut, Menu, X, ShieldAlert,
} from "lucide-react";
import { cx } from "./ui";
import { useAuth } from "../lib/auth";
import QuickAdd from "./QuickAdd";

const NAV = [
  {
    group: "Personal Finance",
    items: [
      { name: "Overview", path: "/", icon: LayoutDashboard, tid: "nav-overview" },
      { name: "Cash Flow", path: "/cash-flow", icon: ArrowLeftRight, tid: "nav-cash-flow" },
      { name: "Accounts & Cash", path: "/accounts", icon: Wallet, tid: "nav-accounts" },
      { name: "Income", path: "/income", icon: TrendingUp, tid: "nav-income" },
      { name: "Expenses", path: "/expenses", icon: CreditCard, tid: "nav-expenses" },
      { name: "Lending & Borrowing", path: "/lending", icon: Handshake, tid: "nav-lending" },
      { name: "Savings & Investments", path: "/savings", icon: PiggyBank, tid: "nav-savings" },
      { name: "PF & PPF", path: "/pf-ppf", icon: ShieldCheck, tid: "nav-pf-ppf" },
      { name: "Rental Income", path: "/rental", icon: Building2, tid: "nav-rental" },
      { name: "Net Worth", path: "/net-worth", icon: Scale, tid: "nav-net-worth" },
    ],
  },
  {
    group: "Projects",
    items: [{ name: "All Projects", path: "/projects", icon: FolderKanban, tid: "nav-projects" }],
  },
  {
    group: "Governance & Admin",
    items: [
      { name: "Family Members", path: "/family", icon: Users, tid: "nav-family" },
      { name: "Access Control", path: "/access-control", icon: KeyRound, tid: "nav-access-control" },
      { name: "Documents", path: "/documents", icon: FileText, tid: "nav-documents" },
      { name: "Settings", path: "/settings", icon: Settings, tid: "nav-settings" },
    ],
  },
];

const MOBILE = [
  { name: "Home", path: "/", icon: LayoutDashboard, tid: "mobile-nav-home" },
  { name: "Lending", path: "/lending", icon: Handshake, tid: "mobile-nav-lending" },
  { name: "Projects", path: "/projects", icon: FolderKanban, tid: "mobile-nav-projects" },
  { name: "Admin", path: "/access-control", icon: ShieldAlert, tid: "mobile-nav-admin" },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center font-display font-extrabold text-lg shadow-xs">N</div>
      <div className="leading-tight">
        <div className="font-display font-bold text-ink tracking-tight">Nivara</div>
        <div className="text-[10px] text-faint font-medium -mt-0.5">Financial OS</div>
      </div>
    </div>
  );
}

function NavItems({ onNavigate }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
      {NAV.map((g) => (
        <div key={g.group}>
          <div className="overline text-faint px-3 mb-1.5">{g.group}</div>
          <div className="space-y-0.5">
            {g.items.map((it) => (
              <NavLink key={it.path} to={it.path} end={it.path === "/"} onClick={onNavigate} data-testid={it.tid}
                className={({ isActive }) => cx(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive ? "bg-brand-light text-brand-dark" : "text-subink hover:bg-muted hover:text-ink"
                )}>
                <it.icon size={17} className="shrink-0" />
                <span className="truncate">{it.name}</span>
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const initials = (user?.name || user?.email || "A").slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Desktop sidebar */}
      <aside className="w-64 bg-surface border-r border-line hidden lg:flex flex-col h-screen sticky top-0 z-30">
        <div className="h-16 px-5 flex items-center border-b border-line"><Brand /></div>
        <NavItems />
        <div className="p-3 border-t border-line">
          <button onClick={logout} data-testid="logout-btn" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-subink hover:bg-muted hover:text-expense transition-colors">
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={() => setDrawer(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-surface flex flex-col animate-fade-in">
            <div className="h-16 px-5 flex items-center justify-between border-b border-line">
              <Brand /><button onClick={() => setDrawer(false)} className="p-1.5 text-subink"><X size={20} /></button>
            </div>
            <NavItems onNavigate={() => setDrawer(false)} />
            <div className="p-3 border-t border-line">
              <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-subink hover:bg-muted"><LogOut size={17} /> Sign out</button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 px-4 sm:px-6 bg-surface/90 backdrop-blur-md border-b border-line sticky top-0 z-20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setDrawer(true)} className="lg:hidden p-2 -ml-2 text-subink" data-testid="menu-btn"><Menu size={22} /></button>
            <div className="lg:hidden"><Brand /></div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setQuickAdd(true)} data-testid="header-quick-add"
              className="inline-flex items-center gap-2 h-9 px-3 sm:px-4 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors shadow-xs">
              <Plus size={16} /><span className="hidden sm:inline">Record</span>
            </button>
            <div className="flex items-center gap-2 pl-1">
              <div className="w-9 h-9 rounded-full bg-ink text-white flex items-center justify-center text-sm font-semibold" data-testid="user-avatar">{initials}</div>
              <div className="hidden md:block leading-tight">
                <div className="text-sm font-semibold text-ink">{user?.name || "Admin"}</div>
                <div className="text-[11px] text-faint">{user?.role?.replace("_", " ").toLowerCase()}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto pb-28 lg:pb-10" key={loc.pathname}>
          <div className="animate-fade-up">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-lg border-t border-line z-30 flex items-center justify-around px-2">
        {MOBILE.map((m) => (
          <NavLink key={m.path} to={m.path} end={m.path === "/"} data-testid={m.tid}
            className={({ isActive }) => cx("flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold",
              isActive ? "text-brand" : "text-faint")}>
            <m.icon size={20} /><span>{m.name}</span>
          </NavLink>
        ))}
      </div>
      <button onClick={() => setQuickAdd(true)} data-testid="mobile-fab"
        className="lg:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-brand text-white shadow-pop flex items-center justify-center active:scale-95 transition-transform">
        <Plus size={26} />
      </button>

      <QuickAdd open={quickAdd} onClose={() => setQuickAdd(false)} onDone={() => { setQuickAdd(false); nav(0); }} />
    </div>
  );
}
