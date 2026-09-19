export function inr(n, opts = {}) {
  const v = Number(n || 0);
  const { compact = false, decimals = 0 } = opts;
  if (compact) {
    const abs = Math.abs(v);
    if (abs >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
    if (abs >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
    if (abs >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  }
  return `₹${v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d.length <= 10 ? d + "T00:00:00" : d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtMonth(m) {
  if (!m) return "";
  if (/^\d{4}-\d{2}$/.test(m)) {
    const [y, mo] = m.split("-");
    return new Date(y, mo - 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  }
  return m;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
