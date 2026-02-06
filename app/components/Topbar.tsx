'use client';

import { Bell, Search, UserCircle, Calendar, Trophy, Flag, Target } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { CURRENT_SEASON_STR } from '../../config/season';

export function Topbar() {
    const [date, setDate] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ leagues: Array<{ id: number; name: string }>; teams: Array<{ id: number; name: string; leagueName?: string }>; players: Array<{ id: number; name: string; goals?: number; teamName?: string; teamId?: number }> } | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [searching, setSearching] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const simDate = new Date();
        const formatted = simDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        setDate(formatted);
    }, []);

    const doSearch = useCallback(async (q: string) => {
        if (!window.electron?.search || q.length < 2) {
            setResults(null);
            return;
        }
        setSearching(true);
        try {
            const r = await window.electron.search(q);
            setResults(r);
        } catch {
            setResults(null);
        } finally {
            setSearching(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => doSearch(query), 200);
        return () => clearTimeout(t);
    }, [query, doSearch]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const hasResults = results && (results.leagues.length > 0 || results.teams.length > 0 || results.players.length > 0);

    return (
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#0a0a0a]/50 backdrop-blur-md z-40">
            <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                    SEASON {CURRENT_SEASON_STR}
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                    <Calendar size={14} className="text-slate-500" />
                    <span className="font-medium" suppressHydrationWarning>{date ?? ''}</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative" ref={dropdownRef}>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={14} className="text-slate-500" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search team, league or player..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setShowDropdown(true)}
                        className="bg-black/20 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-xs w-64 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                    />
                    {showDropdown && (query.length >= 2 || hasResults) && (
                        <div className="absolute top-full left-0 mt-1 w-80 max-h-80 overflow-y-auto rounded-xl bg-slate-900/95 border border-white/10 shadow-xl backdrop-blur-xl z-50">
                            {searching ? (
                                <div className="p-4 text-center text-slate-500 text-sm">Searching...</div>
                            ) : !hasResults ? (
                                <div className="p-4 text-center text-slate-500 text-sm">No results</div>
                            ) : (
                                <div className="py-2">
                                    {results!.leagues.length > 0 && (
                                        <div className="px-3 py-1">
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Leagues</div>
                                            {results!.leagues.map((l) => (
                                                <a key={l.id} href={`/football/${l.id}`} onClick={() => { setShowDropdown(false); setQuery(''); }} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 text-sm text-slate-200">
                                                    <Trophy size={14} className="text-amber-400" />
                                                    {l.name}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                    {results!.teams.length > 0 && (
                                        <div className="px-3 py-1">
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Teams</div>
                                            {results!.teams.map((t) => (
                                                <a key={t.id} href={`/football/team/${t.id}`} onClick={() => { setShowDropdown(false); setQuery(''); }} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 text-sm text-slate-200">
                                                    <Flag size={14} className="text-cyan-400" />
                                                    <span className="flex-1 truncate">{t.name}</span>
                                                    {t.leagueName && <span className="text-xs text-slate-500 truncate max-w-[100px]">{t.leagueName}</span>}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                    {results!.players.length > 0 && (
                                        <div className="px-3 py-1">
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Players</div>
                                            {results!.players.map((p) => (
                                                <a key={p.id} href={p.teamId ? `/football/team/${p.teamId}` : '#'} onClick={() => { setShowDropdown(false); setQuery(''); }} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 text-sm text-slate-200">
                                                    <Target size={14} className="text-emerald-400" />
                                                    <span className="flex-1 truncate">{p.name}</span>
                                                    {p.goals != null && <span className="text-xs text-amber-400 font-mono">{p.goals}G</span>}
                                                    {p.teamName && <span className="text-xs text-slate-500 truncate max-w-[80px]">{p.teamName}</span>}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <button className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                    <Bell size={18} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0a0a0a]"></span>
                </button>

                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 p-[1px]">
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                        <UserCircle size={10} className="text-white" />
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="" className="w-full h-full rounded-full" />
                    </div>
                </div>
            </div>
        </header>
    );
}
