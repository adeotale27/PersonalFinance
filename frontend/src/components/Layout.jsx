import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, Wallet, TrendingUp, CreditCard, Handshake, Inbox,
  PiggyBank, ShieldCheck, Building2, Scale, FolderKanban, Users,
  FileText, Settings, Plus, LogOut, Menu, X, ShieldAlert, Landmark, Umbrella, Sprout, LockKeyhole, Bell, BookOpen, BellRing, ChevronRight, CarFront, Target, ChevronDown, CalendarDays, Calculator, Clock3, Upload, Search,
} from "lucide-react";
import { cx } from "./ui";
import { useAuth } from "../lib/auth";
import QuickAdd from "./QuickAdd";
import { Button } from "./ui";
import api, { apiError } from "../lib/api";
import { inr } from "../lib/format";

const NAV = [
  {
    group: "Personal Finance",
    items: [
      { name: "Action Center", path: "/", icon: LayoutDashboard, tid: "nav-overview" },
      { name: "Review Inbox", path: "/review", icon: Inbox, tid: "nav-review" },
      { name: "Financial Planner", path: "/planner", icon: CalendarDays, tid: "nav-planner" },
      { name: "Calculators", path: "/calculators", icon: Calculator, tid: "nav-calculators" },
      { name: "Cash Flow", path: "/cash-flow", icon: ArrowLeftRight, tid: "nav-cash-flow" },
      { name: "Accounts & Cash", path: "/accounts", icon: Wallet, tid: "nav-accounts" },
      { name: "Income", path: "/income", icon: TrendingUp, tid: "nav-income" },
      { name: "Expenses", path: "/expenses", icon: CreditCard, tid: "nav-expenses" },
      { name: "Lending & Borrowing", path: "/lending", icon: Handshake, tid: "nav-lending" },
      { name: "Savings & Investments", path: "/savings", icon: PiggyBank, tid: "nav-savings" },
      { name: "PF & PPF", path: "/pf-ppf", icon: ShieldCheck, tid: "nav-pf-ppf" },
      { name: "Loans", path: "/loans", icon: Landmark, tid: "nav-loans" },
      { name: "Insurance", path: "/insurance", icon: Umbrella, tid: "nav-insurance" },
      { name: "Rental Income", path: "/rental", icon: Building2, tid: "nav-rental" },
      { name: "Net Worth", path: "/net-worth", icon: Scale, tid: "nav-net-worth" },
      { name: "Losses", path: "/losses", icon: LockKeyhole, tid: "nav-losses" },
      { name: "Daily Diary", path: "/diary", icon: BookOpen, tid: "nav-diary" },
      { name: "Personal Necessities", path: "/necessities", icon: CarFront, tid: "nav-necessities" },
      { name: "Goals", path: "/goals", icon: Target, tid: "nav-goals" },
    ],
  },
  {
    group: "Projects & Farms",
    items: [
      { name: "All Projects", path: "/projects", icon: FolderKanban, tid: "nav-projects" },
      { name: "Farms & Farming", path: "/farms", icon: Sprout, tid: "nav-farms" },
    ],
  },
  {
    group: "Governance & Admin",
    items: [
      { name: "Family Members", path: "/family", icon: Users, tid: "nav-family" },
      { name: "Documents", path: "/documents", icon: FileText, tid: "nav-documents" },
      { name: "Import Center", path: "/smart-import", icon: Upload, tid: "nav-imports" },
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

function Brand({ version, onVersion }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-display font-extrabold text-lg shadow-lg shadow-teal-900/15">N</div>
      <div className="leading-tight">
        <div className="font-display font-bold text-ink tracking-tight">Nivara Finance</div>
        <div className="text-[10px] text-faint font-medium -mt-0.5">Personal Financial OS <button onClick={onVersion} className="ml-1 text-brand font-bold hover:underline focus:outline-none" title="Open version control">V{version}</button></div>
      </div>
    </div>
  );
}

function NavItems({ onNavigate, collapsed = false }) {
  const [openGroups, setOpenGroups] = useState(() => Object.fromEntries(NAV.map((g) => [g.group, true])));
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
      {NAV.map((g) => (
        <div key={g.group}>
          {!collapsed && <button onClick={() => setOpenGroups((current) => ({ ...current, [g.group]: !current[g.group] }))} className="w-full overline text-faint px-3 mb-1.5 flex items-center justify-between hover:text-ink" aria-expanded={!!openGroups[g.group]}><span>{g.group}</span><ChevronDown size={13} className={cx("transition-transform", !openGroups[g.group] && "-rotate-90")}/></button>}
          <div className={cx("space-y-0.5", !collapsed && !openGroups[g.group] && "hidden")}>
            {g.items.map((it) => (
              <NavLink key={it.path} to={it.path} end={it.path === "/"} onClick={onNavigate} data-testid={it.tid}
                className={({ isActive }) => cx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-[background-color,color,transform,box-shadow]",
                  isActive ? "bg-gradient-to-r from-teal-50 to-emerald-50 text-brand-dark shadow-xs" : "text-subink hover:bg-muted hover:text-ink hover:translate-x-0.5"
                )} title={collapsed ? it.name : undefined}>
                <it.icon size={17} className="shrink-0" />
                {!collapsed && <span className="truncate">{it.name}</span>}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function LiveIdentity({ version, onVersion }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
  return <div className="hidden lg:flex items-center gap-3"><Brand version={version} onVersion={onVersion}/><span className="h-8 w-px bg-line"/><div className="text-xs leading-tight whitespace-nowrap"><div className="font-semibold text-ink">{now.toLocaleDateString(undefined, { weekday:"short", day:"2-digit", month:"short", year:"numeric" })}</div><div className="text-faint flex items-center gap-1 mt-0.5"><Clock3 size={12}/>{now.toLocaleTimeString(undefined, { hour:"2-digit", minute:"2-digit", hour12:true })} · {zone}</div></div></div>;
}

function GlobalSearch() {
  const nav = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState(""), [items, setItems] = useState([]), [open, setOpen] = useState(false), [active, setActive] = useState(0);
  useEffect(() => { const shortcut = (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); inputRef.current?.focus(); setOpen(true); } }; window.addEventListener("keydown", shortcut); return () => window.removeEventListener("keydown", shortcut); }, []);
  useEffect(() => { if (query.trim().length < 2) { setItems([]); return undefined; } const timer = window.setTimeout(() => api.get(`/search?q=${encodeURIComponent(query)}`).then((response) => { setItems(response.data.items || []); setOpen(true); }).catch(() => {}), 250); return () => window.clearTimeout(timer); }, [query]);
  const choose = (item) => { if (!item) return; nav(item.path); setOpen(false); setQuery(""); };
  const keyDown = (event) => { if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => Math.min(value + 1, items.length - 1)); } if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(value - 1, 0)); } if (event.key === "Enter") choose(items[active]); if (event.key === "Escape") setOpen(false); };
  return <div className="relative hidden xl:block w-[min(31vw,30rem)]"><label className="sr-only" htmlFor="financial-search">Search financial records</label><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint"/><input ref={inputRef} id="financial-search" value={query} onKeyDown={keyDown} onChange={(event) => { setQuery(event.target.value); setActive(0); }} onFocus={() => setOpen(items.length > 0)} placeholder="Search your financial life…" className="w-full h-9 rounded-lg border border-line bg-white pl-9 pr-14 text-sm outline-none focus:ring-2 focus:ring-teal-200"/><kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-faint border border-line rounded px-1.5 py-0.5">⌘K</kbd>{open && items.length > 0 && <div className="absolute top-11 left-0 right-0 z-50 rounded-xl border border-line bg-white shadow-pop p-2 max-h-80 overflow-y-auto">{items.map((item, index) => <button key={`${item.group}-${item.id}`} onMouseEnter={() => setActive(index)} onClick={() => choose(item)} className={cx("w-full text-left px-3 py-2 rounded-lg", active === index ? "bg-teal-50" : "hover:bg-muted")}><span className="overline text-faint">{item.group}</span><span className="block text-sm font-semibold text-ink">{item.label}</span>{item.detail && <span className="block text-xs text-subink">{item.detail}</span>}</button>)}</div>}</div>;
}

function Notifications() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const panelRef = useRef(null);
  const load = () => api.get("/notifications").then((r) => setItems(r.data.items || [])).catch(() => {});
  useEffect(() => {
    load();
    window.addEventListener("nivara:notifications-changed", load);
    return () => window.removeEventListener("nivara:notifications-changed", load);
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!panelRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);
  const acknowledge = async (item) => {
    try { setItems((current) => current.filter((entry) => entry.id !== item.id)); await api.post(`/notifications/${item.id}/acknowledge`); load(); window.dispatchEvent(new Event("nivara:notifications-changed")); }
    catch (e) { setError(apiError(e)); }
  };
  return <div className="relative" ref={panelRef}><button onClick={() => setOpen((value) => !value)} className="relative w-9 h-9 rounded-lg text-subink hover:bg-muted flex items-center justify-center" aria-label="Notifications" aria-expanded={open} title="Notifications"><Bell size={18} />{items.length > 0 && <span className="absolute -right-1 -top-1 min-w-4 h-4 px-1 rounded-full bg-expense text-white text-[10px] font-bold flex items-center justify-center">{items.length > 99 ? "99+" : items.length}</span>}</button>
    {open && <div className="absolute right-0 top-11 z-50 w-[min(23rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-3 shadow-pop animate-fade-up" role="dialog" aria-label="Alerts and reminders"><div className="px-1 pb-3"><div className="font-display font-semibold text-ink">Alerts & reminders</div><p className="text-xs text-subink mt-0.5">Your next financial actions, ordered by urgency.</p></div>{error && <p className="text-sm text-expense px-1 mb-3">{error}</p>}{items.length ? <div className="space-y-2 max-h-[min(60vh,28rem)] overflow-y-auto pr-1">{items.slice(0, 4).map((item) => <div key={item.id} className="p-3 rounded-xl border border-line bg-muted/40"><div className="flex justify-between gap-3"><div className="min-w-0"><div className="font-semibold text-sm text-ink">{item.title}</div><div className="text-xs text-faint mt-0.5">{item.message}{item.due_date ? ` · due ${item.due_date}` : ""}</div></div>{item.amount > 0 && <div className="num font-bold text-expense whitespace-nowrap">{inr(item.amount)}</div>}</div><div className="mt-3 flex justify-end"><Button size="sm" variant="secondary" onClick={() => acknowledge(item)}>Acknowledge</Button></div></div>)}</div> : <div className="text-sm text-subink text-center py-8">You’re all caught up.</div>}<button onClick={() => { setOpen(false); nav("/notifications"); }} className="mt-3 w-full text-sm font-semibold text-brand flex items-center justify-center gap-1">View all notifications <ChevronRight size={15} /></button></div>}
  </div>;
}

function OverdueAlertPopups() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const dismissed = useRef(new Set());
  const load = () => api.get("/notifications").then((response) => {
    const today = new Date().toISOString().slice(0, 10);
    setItems((response.data.items || []).filter((item) => item.due_date && item.due_date < today && !dismissed.current.has(item.id)).slice(0, 5));
  }).catch(() => {});
  useEffect(() => {
    load();
    window.addEventListener("nivara:notifications-changed", load);
    return () => window.removeEventListener("nivara:notifications-changed", load);
  }, []);
  const dismiss = (id) => { dismissed.current.add(id); setItems((current) => current.filter((item) => item.id !== id)); };
  if (!items.length) return null;
  return <div className="fixed right-4 top-24 z-[55] w-[min(24rem,calc(100vw-2rem))] space-y-2" aria-live="polite">{items.map((item) => <div key={item.id} className="rounded-xl border border-rose-200 bg-white p-3.5 shadow-pop animate-fade-up"><div className="flex items-start gap-3"><span className="mt-0.5 h-8 w-8 shrink-0 rounded-lg bg-rose-50 text-expense flex items-center justify-center"><BellRing size={16} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink">{item.title}</p><p className="mt-0.5 text-xs text-subink">{item.message}{item.amount > 0 ? ` · ${inr(item.amount)}` : ""}</p><button onClick={() => { nav("/notifications"); }} className="mt-2 text-xs font-semibold text-brand">Review notification</button></div><button onClick={() => dismiss(item.id)} className="rounded-lg p-1 text-faint hover:bg-muted hover:text-ink" aria-label={`Dismiss ${item.title}`}><X size={16} /></button></div></div>)}</div>;
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [version, setVersion] = useState("—");
  const nav = useNavigate();
  const loc = useLocation();
  const initials = (user?.name || user?.email || "A").slice(0, 1).toUpperCase();
  useEffect(() => { api.get("/error-logs/unread-count").then((r) => setErrorCount(r.data.count || 0)).catch(() => {}); }, [loc.pathname]);
  useEffect(() => { api.get("/version-history").then((r) => setVersion(r.data.current || "—")).catch(() => {}); }, []);

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Desktop sidebar */}
      <aside className={cx("bg-white/80 backdrop-blur-xl border-r border-slate-200/70 hidden lg:flex flex-col h-screen sticky top-0 z-30 transition-[width] duration-200", sidebarCollapsed ? "w-20" : "w-72")}>
        <div className={cx("h-20 px-5 flex items-center", sidebarCollapsed ? "justify-center" : "justify-between")}><div className={sidebarCollapsed ? "hidden" : ""}><Brand version={version} onVersion={() => nav("/versions")} /></div>{sidebarCollapsed && <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-display font-extrabold text-lg">N</div>}<button onClick={() => setSidebarCollapsed((value) => !value)} className={cx("w-10 h-10 rounded-lg text-subink hover:bg-muted flex items-center justify-center", sidebarCollapsed && "absolute -right-5 bg-white border border-line shadow-sm")} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}><ChevronRight size={18} className={cx("transition-transform", !sidebarCollapsed && "rotate-180")}/></button></div>
        <NavItems collapsed={sidebarCollapsed} />
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
              <Brand version={version} onVersion={() => { setDrawer(false); nav("/versions"); }} /><button onClick={() => setDrawer(false)} className="p-1.5 text-subink"><X size={20} /></button>
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
        <header className="h-20 px-4 sm:px-7 bg-white/75 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setDrawer(true)} className="lg:hidden p-2 -ml-2 text-subink" data-testid="menu-btn"><Menu size={22} /></button>
            <div className="lg:hidden"><Brand version={version} onVersion={() => nav("/versions")} /></div>
            <LiveIdentity version={version} onVersion={() => nav("/versions")} />
          </div>
          <GlobalSearch />
          <div className="flex items-center gap-2 sm:gap-3">
            <Notifications />
            <button onClick={() => setQuickAdd(true)} data-testid="header-quick-add"
              className="inline-flex items-center gap-2 h-9 px-3 sm:px-4 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors shadow-xs">
              <Plus size={16} /><span className="hidden sm:inline">Record</span>
            </button>
            <div className="relative flex items-center gap-2 pl-1">
              <button onClick={() => setAdminOpen((v) => !v)} className="hidden sm:inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-line bg-white text-sm font-semibold text-ink hover:bg-muted">Admin <ChevronDown size={14}/>{errorCount > 0 && <span className="min-w-4 h-4 px-1 rounded-full bg-expense text-white text-[10px] flex items-center justify-center">{errorCount > 99 ? "99+" : errorCount}</span>}</button>
              {adminOpen && <div className="absolute right-0 top-11 w-56 p-2 rounded-xl border border-line bg-white shadow-pop z-40"><button onClick={() => { setAdminOpen(false); nav("/notifications"); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted">Notification center</button><button onClick={() => { setAdminOpen(false); nav("/versions"); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted">Version control</button><button onClick={() => { setAdminOpen(false); nav("/error-log"); }} className="w-full flex justify-between text-left px-3 py-2 rounded-lg text-sm hover:bg-muted">Operational logs {errorCount > 0 && <span className="text-expense font-bold">{errorCount}</span>}</button><button onClick={() => { setAdminOpen(false); nav("/access-control"); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted">Access control</button></div>}
              <div className="w-9 h-9 rounded-full bg-ink text-white flex items-center justify-center text-sm font-semibold" data-testid="user-avatar">{initials}</div>
              <div className="hidden md:block leading-tight">
                <div className="text-sm font-semibold text-ink">{user?.name || "Admin"}</div>
                <div className="text-[11px] text-faint">{user?.role?.replace("_", " ").toLowerCase()}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1540px] w-full mx-auto pb-28 lg:pb-10" key={loc.pathname}>
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
      <OverdueAlertPopups />
    </div>
  );
}
