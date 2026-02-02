'use client';

import { Bell, Search, UserCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Topbar() {
    const [date, setDate] = useState('Aug 24, 2024');

    return (
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#0a0a0a]/50 backdrop-blur-md z-40">
            {/* Date Display */}
            <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                    SEASON 2025/2026
                </div>
                <span className="text-slate-400 text-sm font-medium">
                    {date}
                </span>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={14} className="text-slate-500" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search team or player..."
                        className="bg-black/20 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-xs w-64 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                    />
                </div>

                <button className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                    <Bell size={18} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0a0a0a]"></span>
                </button>

                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 p-[1px]">
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                        <UserCircle size={10} className="text-white" />
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" className="w-full h-full rounded-full" />
                    </div>
                </div>
            </div>
        </header>
    );
}
