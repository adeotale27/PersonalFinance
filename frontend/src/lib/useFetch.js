import { useEffect, useState, useCallback, useRef } from "react";
import api from "./api";

// Lightweight data-fetching hook with refetch + loading/error states.
export function useFetch(url, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const urlRef = useRef(url);
  urlRef.current = url;

  const refetch = useCallback(() => {
    setLoading(true);
    return api.getCached(urlRef.current)
      .then((r) => { setData(r.data); setError(null); })
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refetch(); /* eslint-disable-next-line */ }, deps);

  return { data, loading, error, refetch, setData };
}
