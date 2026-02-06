'use client';

import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Trophy, Star, TrendingUp, Activity, Globe } from 'lucide-react';
import { CURRENT_SEASON_STR } from '../../config/season';

const COUNTRY_ORDER = ['England', 'Spain', 'Germany', 'Italy', 'France', 'Europe'];

const COUNTRY_CONFIG: Record<string, { flag: string; gradient: string; icon?: any; label: string }> = {
    England: {
        flag: '🦁',
        gradient: 'from-blue-600/20 via-sky-900/40 to-slate-900/80',
        label: 'Premier League & Cups'
    },
    Spain: {
        flag: '🐂',
        gradient: 'from-amber-600/20 via-red-900/40 to-slate-900/80',
        label: 'La Liga & Cups'
    },
    Germany: {
        flag: '🦅',
        gradient: 'from-slate-600/20 via-zinc-900/40 to-slate-900/80',
        label: 'Bundesliga & DFB'
    },
    Italy: {
        flag: '🏛️',
        gradient: 'from-emerald-600/20 via-green-900/40 to-slate-900/80',
        label: 'Serie A & Coppa'
    },
    France: {
        flag: '⚜️',
        gradient: 'from-indigo-600/20 via-blue-900/40 to-slate-900/80',
        label: 'Ligue 1 & Cups'
    },
    Europe: {
        flag: '🇪🇺',
        gradient: 'from-violet-600/20 via-purple-900/40 to-slate-900/80',
        label: 'Continental Glory',
        icon: Globe
    },
};

export default function FootballHome() {
    const [leagues, setLeagues] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [noElectron, setNoElectron] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = () => {
        setError(null);
        setLoading(true);
        if (window.electron) {
            window.electron.getData('football')
                .then((data: any) => {
                    if (data && data.leagues) {
                        setLeagues(data.leagues);
                    } else if (data?.error) {
                        setError(data.error);
                    }
                    setLoading(false);
                })
                .catch((err: any) => {
                    console.error("Failed to load football data:", err);
                    setError(err?.message || "Failed to load data. Please try again.");
                    setLoading(false);
                });
        } else {
            setLoading(false);
            setNoElectron(true);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const byCountry = useMemo(() => {
        const map: Record<string, any[]> = {};
        for (const league of leagues) {
            const country = league.country || 'Other';
            if (!map[country]) map[country] = [];
            map[country].push(league);
        }
        return map;
    }, [leagues]);

    const orderedCountries = [...COUNTRY_ORDER, ...Object.keys(byCountry).filter(c => !COUNTRY_ORDER.includes(c))];

    if (loading) return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-emerald-500 animate-spin" />
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 blur-sm" />
            </div>
            <p className="text-slate-400 font-medium animate-pulse tracking-wide">Loading World Football...</p>
        </div>
    );

    if (error) return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
            <div className="glass-card p-10 max-w-lg w-full text-center border-rose-500/10 shadow-[0_0_50px_rgba(244,63,94,0.1)]">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 mx-auto flex items-center justify-center mb-6">
                    <Activity className="text-rose-500" size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Connection Error</h3>
                <p className="text-slate-400 mb-8 leading-relaxed">{error}</p>
                <button
                    onClick={loadData}
                    className="px-8 py-3 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 rounded-xl text-white font-bold transition-all transform hover:scale-105 shadow-lg shadow-rose-500/20"
                >
                    Try Again
                </button>
            </div>
        </div>
    );

    if (noElectron) return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
            <div className="glass-card p-10 max-w-lg w-full text-center">
                <p className="text-slate-400">Please run via Electron.</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen pb-20">
            {/* Hero Header */}
            <div className="relative h-80 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/80 to-[#050505]" />

                <div className="relative h-full max-w-7xl mx-auto px-6 md:px-10 flex flex-col justify-end pb-12">
                    <div className="animate-fade-in">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wider uppercase">
                                Season {CURRENT_SEASON_STR}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wider uppercase">
                                World Football
                            </span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tight">
                            Elite Competitions
                        </h1>
                        <p className="text-slate-400 text-lg max-w-2xl">
                            Manage simulations across the world's most prestigious leagues and tournaments.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="max-w-7xl mx-auto px-6 md:px-10 -mt-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orderedCountries.map((country, idx) => {
                        const countryLeagues = byCountry[country] || [];
                        if (countryLeagues.length === 0) return null;

                        const config = COUNTRY_CONFIG[country] || {
                            flag: '🌍',
                            gradient: 'from-slate-700/20 via-gray-900/40 to-slate-900/80',
                            label: 'Global Competitions'
                        };

                        return (
                            <div
                                key={country}
                                className="group animate-scale-in"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className={`h-full rounded-3xl overflow-hidden border border-white/5 bg-gradient-to-br ${config.gradient} hover:border-white/10 transition-all duration-500 hover:shadow-[0_0_30px_rgba(0,0,0,0.3)] hover:-translate-y-1`}>

                                    {/* Card Header */}
                                    <div className="p-6 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl leading-none select-none grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110 group-hover:rotate-12">
                                            {config.flag}
                                        </div>

                                        <div className="relative z-10">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-xl shadow-lg border border-white/10">
                                                    {config.flag}
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-white leading-tight">{country}</h2>
                                                    <p className="text-xs text-white/50 font-medium uppercase tracking-wider">{config.label}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* League List */}
                                    <div className="p-4 pt-0 space-y-2">
                                        {countryLeagues.map((league: any) => {
                                            const href = league.type === 'tournament'
                                                ? `/tournament/${league.id}`
                                                : `/football/${league.id}`;
                                            const isTournament = league.type === 'tournament';

                                            return (
                                                <a
                                                    key={league.id}
                                                    href={href}
                                                    className="flex items-center justify-between p-3 rounded-xl bg-black/20 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all duration-300 group/item"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {isTournament ? (
                                                            <Trophy size={16} className="text-amber-400 opacity-80 group-hover/item:opacity-100 group-hover/item:scale-110 transition-all" />
                                                        ) : (
                                                            <Activity size={16} className="text-emerald-400 opacity-80 group-hover/item:opacity-100 group-hover/item:scale-110 transition-all" />
                                                        )}
                                                        <span className={`text-sm font-medium ${isTournament ? 'text-amber-50 group-hover/item:text-amber-200' : 'text-slate-200 group-hover/item:text-white'}`}>
                                                            {league.name}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-white/30 font-mono bg-white/5 px-1.5 py-0.5 rounded">
                                                            {league.teams?.length || 0}
                                                        </span>
                                                        {isTournament && (
                                                            <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/20">
                                                                CUP
                                                            </span>
                                                        )}
                                                    </div>
                                                </a>
                                            );
                                        })}
                                    </div>

                                    {/* Footer decoration */}
                                    <div className="h-1 w-full bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
