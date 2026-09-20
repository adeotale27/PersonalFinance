import { useEffect, useState, useCallback, useRef } from "react";
import api from "./api";

// Lightweight data-fetching hook with refetch + loading/error states.
export function useFetch(url, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const urlRef = useRef(url);
  urlRef.current = url;

  const refetch = useCallback((background = false) => {
    if (!background) setLoading(true);
    return api.getCached(urlRef.current, background ? { force: true } : {})
      .then((r) => { setData(r.data); setError(null); })
      .catch((e) => setError(e))
      .finally(() => { if (!background) setLoading(false); });
  }, []);

  useEffect(() => {
    refetch();
    const refresh = () => refetch(true);
    window.addEventListener("nivara:data-changed", refresh);
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => { window.removeEventListener("nivara:data-changed", refresh); window.removeEventListener("focus", refresh); window.clearInterval(timer); };
    /* eslint-disable-next-line */
  }, deps);

  return { data, loading, error, refetch, setData };
}
