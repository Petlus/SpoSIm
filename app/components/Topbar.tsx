'use client';

import { Bell, Search, UserCircle, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import { CURRENT_SEASON_STR } from '../../config/season';

export function Topbar() {
    const [date, setDate] = useState('');

    useEffect(() => {
        // Simulation date - for now using current date but could be stored in DB
        const simDate = new Date(); // In production: fetch from DB/state
        const formatted = simDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        setDate(formatted);
    }, []);

    return (
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#0a0a0a]/50 backdrop-blur-md z-40">
            {/* Date Display */}
            <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                    SEASON {CURRENT_SEASON_STR}
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                    <Calendar size={14} className="text-slate-500" />
                    <span className="font-medium">{date}</span>
                </div>
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
