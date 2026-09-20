import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { Spinner } from "./components/ui";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import CashFlow from "./pages/CashFlow";
import Accounts from "./pages/Accounts";
import Income from "./pages/Income";
import Expenses from "./pages/Expenses";
import Lending from "./pages/Lending";
import Savings from "./pages/Savings";
import PfPpf from "./pages/PfPpf";
import Loans from "./pages/Loans";
import Insurance from "./pages/Insurance";
import Farms from "./pages/Farms";
import Rental from "./pages/Rental";
import NetWorth from "./pages/NetWorth";
import Projects from "./pages/Projects";
import ProjectWorkspace from "./pages/ProjectWorkspace";
import Family from "./pages/Family";
import AccessControl from "./pages/AccessControl";
import Documents from "./pages/Documents";
import Settings from "./pages/Settings";
import Losses from "./pages/Losses";
import Diary from "./pages/Diary";
import Notifications from "./pages/Notifications";
import ErrorLog from "./pages/ErrorLog";
import ErrorBoundary from "./components/ErrorBoundary";
import Necessities from "./pages/Necessities";
import Goals from "./pages/Goals";
import Planner from "./pages/Planner";
import Calculators from "./pages/Calculators";
import ReviewInbox from "./pages/ReviewInbox";
import VersionControl from "./pages/VersionControl";
import SmartImport from "./pages/SmartImport";
import PartyPortal from "./pages/PartyPortal";

function Protected({ children }) {
  const { user, checking } = useAuth();
  if (checking) return <div className="min-h-screen flex items-center justify-center"><Spinner className="w-7 h-7 text-brand" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return user.role === "PARTY_USER" ? <PartyPortal /> : <Layout>{children}</Layout>;
}

function Shell() {
  const { user, checking } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={checking ? null : user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Protected><Overview /></Protected>} />
      <Route path="/cash-flow" element={<Protected><CashFlow /></Protected>} />
      <Route path="/accounts" element={<Protected><Accounts /></Protected>} />
      <Route path="/income" element={<Protected><Income /></Protected>} />
      <Route path="/expenses" element={<Protected><Expenses /></Protected>} />
      <Route path="/lending" element={<Protected><Lending /></Protected>} />
      <Route path="/savings" element={<Protected><Savings /></Protected>} />
      <Route path="/pf-ppf" element={<Protected><PfPpf /></Protected>} />
      <Route path="/loans" element={<Protected><Loans /></Protected>} />
      <Route path="/insurance" element={<Protected><Insurance /></Protected>} />
      <Route path="/farms" element={<Protected><Farms /></Protected>} />
      <Route path="/rental" element={<Protected><Rental /></Protected>} />
      <Route path="/net-worth" element={<Protected><NetWorth /></Protected>} />
      <Route path="/projects" element={<Protected><Projects /></Protected>} />
      <Route path="/projects/:id" element={<Protected><ProjectWorkspace /></Protected>} />
      <Route path="/family" element={<Protected><Family /></Protected>} />
      <Route path="/access-control" element={<Protected><AccessControl /></Protected>} />
      <Route path="/documents" element={<Protected><Documents /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="/losses" element={<Protected><Losses /></Protected>} />
      <Route path="/diary" element={<Protected><Diary /></Protected>} />
      <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
      <Route path="/error-log" element={<Protected><ErrorLog /></Protected>} />
      <Route path="/necessities" element={<Protected><Necessities /></Protected>} />
      <Route path="/goals" element={<Protected><Goals /></Protected>} />
      <Route path="/planner" element={<Protected><Planner /></Protected>} />
      <Route path="/calculators" element={<Protected><Calculators /></Protected>} />
      <Route path="/review" element={<Protected><ReviewInbox /></Protected>} />
      <Route path="/versions" element={<Protected><VersionControl /></Protected>} />
      <Route path="/smart-import" element={<Protected><SmartImport /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary><AuthProvider><BrowserRouter><Shell /></BrowserRouter></AuthProvider></ErrorBoundary>
  );
}
