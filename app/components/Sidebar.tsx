'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Flag, Settings, Zap, Briefcase } from 'lucide-react';

export function Sidebar() {
    const pathname = usePathname();

    const menu = [
        { name: 'Home', icon: Home, path: '/', disabled: false },
        { name: 'Football', icon: Trophy, path: '/football', disabled: false },
        { name: 'Formula 1', icon: Zap, path: '/f1', disabled: true, badge: 'Soon' },
        { name: 'Manager', icon: Briefcase, path: '/manager', disabled: false },
    ];

    const isActive = (p: string) => pathname === p || pathname.startsWith(`${p}/`);

    return (
        <div className="flex flex-col h-full p-4">
            <div className="flex items-center gap-3 px-2 mb-10 mt-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-sky-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <span className="font-bold text-white text-lg">S</span>
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden md:block">
                    SportSim
                </span>
            </div>

            <nav className="space-y-2 flex-1">
                {menu.map((item) => (
                    item.disabled ? (
                        <div
                            key={item.name}
                            className="flex items-center gap-4 px-3 py-3 rounded-xl text-slate-600 cursor-not-allowed grayscale opacity-60"
                        >
                            <item.icon size={22} className="text-slate-600" />
                            <span className="font-medium hidden md:block">{item.name}</span>
                            {item.badge && (
                                <span className="ml-auto text-[10px] font-bold bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded hidden md:block">
                                    {item.badge}
                                </span>
                            )}
                        </div>
                    ) : (
                        <Link
                            key={item.name}
                            href={item.path}
                            className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 group ${isActive(item.path)
                                ? 'bg-gradient-to-r from-emerald-500/10 to-transparent border-l-2 border-emerald-400 text-emerald-400'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <item.icon size={22} className={`${isActive(item.path) ? 'text-emerald-400' : 'text-slate-500 group-hover:text-white'} transition-colors`} />
                            <span className="font-medium hidden md:block">{item.name}</span>
                        </Link>
                    )
                ))}
            </nav>

            <div className="mt-auto border-t border-white/5 pt-4">
                <button className="flex items-center gap-4 px-3 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white w-full transition-all">
                    <Settings size={22} />
                    <span className="font-medium hidden md:block">Settings</span>
                </button>
            </div>
        </div>
    );
}
