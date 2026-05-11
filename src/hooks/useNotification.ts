import { useCallback, useEffect, useState } from 'react';

interface UseNotificationReturn {
  permission: NotificationPermission | 'unsupported';
  requestPermission: () => Promise<void>;
  notifySniper: (ticker: string, name: string, triggerPrice: string) => void;
  notifyNewReports: (count: number) => void;
}

export function useNotification(): UseNotificationReturn {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    // SSR safety: check at init time only on client
    if (typeof window === 'undefined') return 'unsupported';
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  // Sync permission state if it changes externally (e.g. user revokes in browser settings)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const requestPermission = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'denied') return;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch {
      // Silently handle rejection — do not throw
    }
  }, []);

  const notifySniper = useCallback(
    (ticker: string, name: string, triggerPrice: string): void => {
      if (typeof window === 'undefined') return;
      if (!('Notification' in window)) return;
      if (permission !== 'granted') return;

      try {
        new Notification('🎯 狙擊突破', {
          body: `${ticker} ${name} 已突破觸發價 ${triggerPrice}`,
          icon: '/favicon.ico',
        });
      } catch {
        // Silently ignore notification errors
      }
    },
    [permission]
  );

  const notifyNewReports = useCallback(
    (count: number): void => {
      if (typeof window === 'undefined') return;
      if (!('Notification' in window)) return;
      if (permission !== 'granted') return;

      try {
        new Notification('📊 晨間戰報更新', {
          body: `新增 ${count} 份戰報`,
          icon: '/favicon.ico',
        });
      } catch {
        // Silently ignore notification errors
      }
    },
    [permission]
  );

  return { permission, requestPermission, notifySniper, notifyNewReports };
}
