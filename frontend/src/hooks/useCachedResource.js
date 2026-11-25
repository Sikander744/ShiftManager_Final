import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/useAuth";
import { saveOffline, loadOffline } from "../utils/offlineStore";
import useOnlineStatus from "./useOnlineStatus";

/**
 * Loads data from the API and keeps a copy in IndexedDB for offline use.
 *
 *   online  -> fetch from API, save a copy, show live data
 *   offline -> (or server unreachable) show the last saved copy + "cached" flag
 *   back online -> automatically refreshes
 *
 * @param {string}   cacheKey  name of the cached item, e.g. "shifts"
 * @param {Function} fetcher   async function returning the data
 */
export default function useCachedResource(cacheKey, fetcher) {
  const { user } = useAuth();
  const online = useOnlineStatus();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cachedAt, setCachedAt] = useState(null);

  // Always call the latest fetcher (it may use new filter values)
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const reload = useCallback(async () => {
    if (!user) return;
    try {
      const fresh = await fetcherRef.current();
      setData(fresh);
      setError(null);
      setCachedAt(null);
      if (cacheKey) await saveOffline(user.id, cacheKey, fresh);
    } catch (err) {
      const cached = cacheKey ? await loadOffline(user.id, cacheKey) : null;
      if (err.isNetworkError && cached) {
        setData(cached.data);
        setError(null);
        setCachedAt(cached.savedAt);
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [user, cacheKey]);

  // Load on mount, when the key changes, and again when the connection returns
  useEffect(() => {
    reload();
  }, [reload, online]);

  return { data, loading, error, cachedAt, reload, setData };
}
