'use client';

import { usePathname } from 'next/navigation';
import { Home, Trophy, Flag, Settings, Zap, Briefcase, Ticket } from 'lucide-react';

export function Sidebar() {
    const pathname = usePathname();

    const menu = [
        { name: 'Home', icon: Home, path: '/', disabled: false },
        { name: 'Football', icon: Trophy, path: '/football', disabled: false },
        { name: 'Bet Center', icon: Ticket, path: '/bet-center', disabled: false },
        { name: 'Formula 1', icon: Zap, path: '/f1', disabled: true, badge: 'Soon' },
        { name: 'Manager', icon: Briefcase, path: '/manager', disabled: true, badge: 'Soon' },
    ];

    const isActive = (p: string) => pathname === p || pathname.startsWith(`${p}/`);

    return (
        <div className="flex flex-col h-full p-4 backdrop-blur-xl bg-black/40 border-r border-white/5 relative">
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

            <div className="flex items-center gap-3 px-2 mb-10 mt-2 relative z-10">
                <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500 blur-md opacity-40"></div>
                    <img src="/logo.png" alt="BetBrain" className="w-8 h-8 rounded-lg object-contain relative z-10" />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden md:block">
                    BetBrain
                </span>
            </div>

            <nav className="space-y-3 flex-1 px-3">
                {menu.map((item) => (
                    item.disabled ? (
                        <div
                            key={item.name}
                            className="flex items-center gap-4 px-3 py-3 rounded-xl text-slate-700 cursor-not-allowed grayscale opacity-40 border border-transparent"
                        >
                            <item.icon size={20} />
                            <span className="font-medium hidden md:block text-sm">{item.name}</span>
                            {item.badge && (
                                <span className="ml-auto text-[9px] font-bold bg-slate-800/50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-700/50 hidden md:block uppercase tracking-wider">
                                    {item.badge}
                                </span>
                            )}
                        </div>
                    ) : (
                        <a
                            key={item.name}
                            href={item.path}
                            className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 group border ${isActive(item.path)
                                ? 'bg-gradient-to-r from-emerald-500/20 via-emerald-500/5 to-transparent border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-white hover:border-white/5'
                                }`}
                        >
                            <item.icon size={20} className={`${isActive(item.path) ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'text-slate-500 group-hover:text-white'} transition-colors duration-300`} />
                            <span className="font-medium hidden md:block text-sm tracking-wide">{item.name}</span>
                            {isActive(item.path) && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_currentColor] hidden md:block" />
                            )}
                        </a>
                    )
                ))}
            </nav>

            <div className="mt-auto border-t border-white/5 pt-4">
                <a
                    href="/settings"
                    className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 group ${isActive('/settings')
                        ? 'bg-gradient-to-r from-emerald-500/10 to-transparent border-l-2 border-emerald-400 text-emerald-400'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                >
                    <Settings size={22} className={isActive('/settings') ? 'text-emerald-400' : 'text-slate-500 group-hover:text-white'} />
                    <span className="font-medium hidden md:block">Settings</span>
                </a>
            </div>
        </div>
    );
}
