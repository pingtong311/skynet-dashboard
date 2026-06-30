import { useCallback, useEffect, useState } from 'react';

interface UseNotificationReturn {
  permission: NotificationPermission | 'unsupported';
  requestPermission: () => Promise<void>;
  notifySniper: (ticker: string, name: string, triggerPrice: string) => NotificationDispatchResult;
  notifyNewReports: (count: number) => NotificationDispatchResult;
}

export type NotificationDispatchResult = {
  ok: boolean;
  channel: 'browser' | 'relay';
  title: string;
  body: string;
  reason?: 'unsupported' | 'denied' | 'exception';
};

export function useNotification(): UseNotificationReturn {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');

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
    (ticker: string, name: string, triggerPrice: string): NotificationDispatchResult => {
      const title = '🎯 狙擊突破';
      const body = `${ticker} ${name} 已突破觸發價 ${triggerPrice}`;
      if (typeof window === 'undefined') return { ok: false, channel: 'browser', title, body, reason: 'unsupported' };
      if (!('Notification' in window)) return { ok: false, channel: 'browser', title, body, reason: 'unsupported' };
      if (permission !== 'granted') return { ok: false, channel: 'browser', title, body, reason: 'denied' };

      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
        return { ok: true, channel: 'browser', title, body };
      } catch {
        return { ok: false, channel: 'browser', title, body, reason: 'exception' };
      }
    },
    [permission]
  );

  const notifyNewReports = useCallback(
    (count: number): NotificationDispatchResult => {
      const title = '📊 晨間戰報更新';
      const body = `新增 ${count} 份戰報`;
      if (typeof window === 'undefined') return { ok: false, channel: 'browser', title, body, reason: 'unsupported' };
      if (!('Notification' in window)) return { ok: false, channel: 'browser', title, body, reason: 'unsupported' };
      if (permission !== 'granted') return { ok: false, channel: 'browser', title, body, reason: 'denied' };

      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
        return { ok: true, channel: 'browser', title, body };
      } catch {
        return { ok: false, channel: 'browser', title, body, reason: 'exception' };
      }
    },
    [permission]
  );

  return { permission, requestPermission, notifySniper, notifyNewReports };
}
