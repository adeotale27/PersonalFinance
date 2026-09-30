import { useEffect, useState, useCallback, useRef } from "react";
import api from "./api";

// Lightweight data-fetching hook with refetch + loading/error states.
export function useFetch(url, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const urlRef = useRef(url);
  const requestId = useRef(0);
  urlRef.current = url;

  const refetch = useCallback((background = false) => {
    const currentRequest = ++requestId.current;
    if (!background) setLoading(true);
    return api.getCached(urlRef.current, background ? { force: true } : {})
      .then((r) => {
        if (currentRequest === requestId.current) { setData(r.data); setError(null); }
      })
      .catch((e) => { if (currentRequest === requestId.current) setError(e); })
      .finally(() => { if (!background && currentRequest === requestId.current) setLoading(false); });
  }, []);

  useEffect(() => {
    refetch();
    const refresh = () => { if (document.visibilityState === "visible") refetch(true); };
    window.addEventListener("nivara:data-changed", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => { requestId.current += 1; window.removeEventListener("nivara:data-changed", refresh); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); window.clearInterval(timer); };
    /* eslint-disable-next-line */
  }, deps);

  return { data, loading, error, refetch, setData };
}
