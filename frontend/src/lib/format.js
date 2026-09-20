export function inr(n, opts = {}) {
  const v = Number(n || 0);
  const { compact = false, decimals = 0 } = opts;
  const currency = localStorage.getItem("nivara_currency") || "INR";
  const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : `${currency} `;
  if (compact) {
    const abs = Math.abs(v);
    if (currency === "INR" && abs >= 1e7) return `${symbol}${(v / 1e7).toFixed(2)}Cr`;
    if (currency === "INR" && abs >= 1e5) return `${symbol}${(v / 1e5).toFixed(2)}L`;
    if (abs >= 1e3) return `${symbol}${(v / 1e3).toFixed(1)}K`;
  }
  return `${symbol}${v.toLocaleString(currency === "INR" ? "en-IN" : "en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d.length <= 10 ? d + "T00:00:00" : d);
  if (isNaN(dt)) return d;
  const format = localStorage.getItem("nivara_date_format") || "DD-MM-YYYY";
  const timezone = localStorage.getItem("nivara_timezone") || "Asia/Kolkata";
  const parts = d.length <= 10 ? { day: String(dt.getDate()).padStart(2, "0"), month: String(dt.getMonth() + 1).padStart(2, "0"), year: dt.getFullYear() } : Object.fromEntries(new Intl.DateTimeFormat("en", { timeZone: timezone, day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(dt).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return format === "MM-DD-YYYY" ? `${parts.month}-${parts.day}-${parts.year}` : format === "YYYY-MM-DD" ? `${parts.year}-${parts.month}-${parts.day}` : `${parts.day}-${parts.month}-${parts.year}`;
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
