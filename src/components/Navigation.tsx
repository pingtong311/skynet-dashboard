'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { name: '天網總部 (Portal)', path: '/' },
    { name: '復盤儀表 (Review)', path: '/review' },
    { name: '戰略控制 (Strategy)', path: '/strategy' },
  ];

  return (
    <header className="w-full max-w-6xl mx-auto flex flex-col gap-6 mb-8 pt-8 px-8 sm:px-0">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-cyan shadow-[0_0_15px_var(--color-cyan-glow)] flex items-center justify-center">
            <span className="text-cyan font-bold text-xl">S</span>
          </div>
          <h1 className="text-3xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan to-purple">
            SKYNET 戰情中心
          </h1>
        </div>
        <div className="px-4 py-2 rounded-full glass-panel flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan animate-pulse"></div>
          <span className="text-sm font-medium tracking-wide">SYSTEM ONLINE</span>
        </div>
      </div>

      <nav className="glass-panel flex p-1 rounded-xl">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex-1 text-center py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive 
                  ? 'bg-cyan text-black shadow-[0_0_15px_var(--color-cyan-glow)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
