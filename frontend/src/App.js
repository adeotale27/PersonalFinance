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

function Protected({ children }) {
  const { user, checking } = useAuth();
  if (checking) return <div className="min-h-screen flex items-center justify-center"><Spinner className="w-7 h-7 text-brand" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AuthProvider>
  );
}
