import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import api from "./lib/api";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

window.addEventListener("unhandledrejection", (event) => api.post("/error-logs/client", { kind: "UnhandledPromise", message: event.reason?.message || String(event.reason), route: window.location.pathname, screen: window.location.pathname }).catch(() => {}));
window.addEventListener("error", (event) => api.post("/error-logs/client", { kind: "WindowError", message: event.message, route: event.filename || window.location.pathname, screen: window.location.pathname }).catch(() => {}));
