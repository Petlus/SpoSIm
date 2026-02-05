'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Globe } from 'lucide-react';
import { CURRENT_SEASON_STR } from '../../config/season';

export default function FootballHome() {
    const [leagues, setLeagues] = useState([]);
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

    if (loading) return <div className="p-10 text-slate-400 flex items-center gap-2"><Globe className="animate-spin text-emerald-400" size={16} /> Initializing database...</div>;
    if (error) return (
        <div className="p-10 max-w-xl mx-auto text-center">
            <p className="text-rose-400 mb-4">{error}</p>
            <button onClick={loadData} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium">Retry</button>
        </div>
    );
    if (noElectron) return (
        <div className="p-10 max-w-xl mx-auto text-center">
            <p className="text-slate-400 mb-4">Run BetBrain in Electron to use this feature.</p>
            <p className="text-slate-500 text-sm">Start with <code className="bg-slate-800 px-2 py-1 rounded">npm run dev</code></p>
        </div>
    );

    return (
        <div className="p-10 max-w-7xl mx-auto">
            <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white mb-8 transition-colors">
                <ArrowLeft size={18} />
                <span>Back to BetBrain</span>
            </Link>

            <h1 className="text-4xl font-bold text-white mb-2">Select Competition</h1>
            <p className="text-slate-400 mb-10">Season {CURRENT_SEASON_STR} - Select a league or tournament.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {leagues.map((league: any) => {
                    // Route tournaments (like CL) to bracket view
                    const href = league.type === 'tournament'
                        ? `/tournament/${league.id}`
                        : `/football/${league.id}`;

                    const isTournament = league.type === 'tournament';

                    return (
                        <Link key={league.id} href={href} className="block group">
                            <div className={`h-48 glass-card rounded-2xl p-6 relative overflow-hidden transition-all duration-300 ${isTournament ? 'group-hover:border-amber-500/30' : 'group-hover:border-emerald-500/30'
                                }`}>
                                {/* Bg Gradient */}
                                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl -mr-10 -mt-10 transition-all ${isTournament
                                    ? 'bg-amber-500/10 group-hover:bg-amber-500/20'
                                    : 'bg-emerald-500/10 group-hover:bg-emerald-500/20'
                                    }`} />

                                <div className="relative z-10 h-full flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h2 className={`text-2xl font-bold text-white transition-colors ${isTournament ? 'group-hover:text-amber-400' : 'group-hover:text-emerald-400'
                                                    }`}>{league.name}</h2>
                                                {isTournament && (
                                                    <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">KO</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wider">
                                                <Globe size={12} />
                                                <span>{league.teams ? league.teams.length : 0} Teams</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono text-slate-500 border border-white/10 px-2 py-1 rounded">{CURRENT_SEASON_STR}</span>
                                        <span className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center transition-all ${isTournament
                                            ? 'group-hover:bg-amber-500 group-hover:text-black'
                                            : 'group-hover:bg-emerald-500 group-hover:text-black'
                                            }`}>
                                            →
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
