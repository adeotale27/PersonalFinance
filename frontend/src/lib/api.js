import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
export const API = `${BASE}/api`;

const api = axios.create({ baseURL: API });
const responseCache = new Map();
const inFlightRequests = new Map();
const CACHE_TTL = 5 * 60 * 1000;

export const invalidateCache = () => {
  responseCache.clear();
  inFlightRequests.clear();
  window.dispatchEvent(new Event("nivara:data-changed"));
};

api.getCached = (url, config = {}) => {
  const token = localStorage.getItem("nivara_token") || "";
  const key = `${token}:${url}`;
  const { force = false, ...requestConfig } = config;
  const cached = responseCache.get(key);
  if (!force && cached && Date.now() - cached.at < CACHE_TTL) return Promise.resolve({ data: cached.data });
  if (inFlightRequests.has(key)) return inFlightRequests.get(key);
  const request = api.get(url, requestConfig)
    .then((response) => {
      if (inFlightRequests.get(key) === request) {
        responseCache.set(key, { data: response.data, at: Date.now() });
        if (responseCache.size > 100) responseCache.delete(responseCache.keys().next().value);
      }
      return response;
    })
    .finally(() => {
      if (inFlightRequests.get(key) === request) inFlightRequests.delete(key);
    });
  inFlightRequests.set(key, request);
  return request;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nivara_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => { if (r.config.method !== "get") invalidateCache(); return r; },
  (err) => {
    // Fire-and-forget operational telemetry. Never log the logger itself.
    if (!err.config?.url?.includes("/error-logs") && err.config?.url !== "/auth/login") {
      api.post("/error-logs/client", { kind: "HttpError", message: apiError(err), route: err.config?.url, status_code: err.response?.status, screen: window.location.pathname }).catch(() => {});
    }
    if (err.response?.status === 401 && !err.config?.url?.includes("/auth/login")) {
      localStorage.removeItem("nivara_token");
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export function apiError(err) {
  const detail = err?.response?.data?.detail;
  if (detail == null) return err?.message || "Something went wrong";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  if (detail?.msg) return detail.msg;
  return String(detail);
}

export const authToken = () => localStorage.getItem("nivara_token");
export const docUrl = (id) => `${API}/documents/${id}/download?auth=${encodeURIComponent(authToken() || "")}`;
export default api;
