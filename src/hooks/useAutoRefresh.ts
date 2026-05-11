import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAutoRefreshOptions {
  intervalMs: number;
  onRefresh: () => Promise<void> | void;
  enabled?: boolean;
}

interface UseAutoRefreshReturn {
  countdown: number;
  refresh: () => void;
  isRefreshing: boolean;
}

export function useAutoRefresh(options: UseAutoRefreshOptions): UseAutoRefreshReturn {
  const { intervalMs, onRefresh, enabled = true } = options;

  const [countdown, setCountdown] = useState(Math.floor(intervalMs / 1000));
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Store refs to avoid stale closures
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onRefreshRef = useRef(onRefresh);
  const intervalMsRef = useRef(intervalMs);
  const enabledRef = useRef(enabled);

  // Keep refs in sync with latest props
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    intervalMsRef.current = intervalMs;
  }, [intervalMs]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const clearAllIntervals = useCallback(() => {
    if (refreshIntervalRef.current !== null) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const executeRefresh = useCallback(async () => {
    if (!enabledRef.current) return;
    setIsRefreshing(true);
    try {
      await onRefreshRef.current();
    } catch (err) {
      console.error('[useAutoRefresh] onRefresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const startIntervals = useCallback(() => {
    clearAllIntervals();

    const totalSeconds = Math.floor(intervalMsRef.current / 1000);
    setCountdown(totalSeconds);

    // Countdown interval: tick every second
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return Math.floor(intervalMsRef.current / 1000);
        return prev - 1;
      });
    }, 1000);

    // Refresh interval: trigger onRefresh at each full interval
    refreshIntervalRef.current = setInterval(() => {
      executeRefresh();
    }, intervalMsRef.current);
  }, [clearAllIntervals, executeRefresh]);

  // Manual refresh: execute immediately and reset timers
  const refresh = useCallback(() => {
    executeRefresh();
    startIntervals();
  }, [executeRefresh, startIntervals]);

  // Page Visibility API handler
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden — pause all intervals
        clearAllIntervals();
      } else {
        // Page is visible again — refresh immediately and restart
        if (enabledRef.current) {
          executeRefresh();
          startIntervals();
        }
      }
    };

    // Check if Page Visibility API is supported
    const supportsVisibility = typeof document.hidden !== 'undefined';

    if (supportsVisibility) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (supportsVisibility) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [clearAllIntervals, executeRefresh, startIntervals]);

  // Start/stop intervals based on enabled flag
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (enabled) {
      startIntervals();
    } else {
      clearAllIntervals();
    }

    return () => {
      clearAllIntervals();
    };
  }, [enabled, startIntervals, clearAllIntervals]);

  return { countdown, refresh, isRefreshing };
}
