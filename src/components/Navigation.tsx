'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { name: '總部 (HQ)', path: '/' },
    { name: '戰情室 (WAR ROOM)', path: '/review' },
    { name: '策略 (STRATEGY)', path: '/strategy' },
    { name: 'AI 思考 (AI)', path: '/ai' },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-glass-border">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-cyan flex items-center justify-center">
            <span className="text-black font-black text-xs">S</span>
          </div>
          <span className="font-bold tracking-tighter text-sm">SKYNET<span className="text-cyan ml-1">OS</span></span>
        </div>

        <div className="flex gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`px-4 py-1.5 rounded text-[11px] font-bold tracking-widest uppercase transition-all duration-200 ${
                  isActive 
                    ? 'text-cyan bg-cyan/10 border border-cyan/20' 
                    : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-4 text-[10px] tracking-widest text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green shadow-[0_0_5px_var(--accent-green)]"></div>
            CORE ACTIVE
          </div>
        </div>
      </div>
    </nav>
  );
}

