/**
 * /warroom 路由
 *
 * 戰情室完整實作（Phase A + B + C）位於 /review 頁面。
 * 此路由重新導向至 /review 以保持向後相容。
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WarRoomPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/review');
  }, [router]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0a0f1a',
        color: '#9ca3af',
        fontFamily: 'monospace',
      }}
    >
      正在載入戰情室...
    </div>
  );
}
