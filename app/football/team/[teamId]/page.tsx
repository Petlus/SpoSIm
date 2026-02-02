'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Shield, Activity, Star, Trophy, Target } from 'lucide-react';

export default function TeamPage() {
    const { teamId } = useParams();
    const router = useRouter();
    const [team, setTeam] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (teamId) loadTeam();
    }, [teamId]);

    const loadTeam = async () => {
        // @ts-ignore
        if (window.electron) {
            // @ts-ignore
            const data = await window.electron.getTeamDetails(parseInt(teamId));
            if (!data.error) {
                setTeam(data);
            }
            setLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 animate-pulse">Loading Team Details...</div>;
    if (!team) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Team not found</div>;

    const getPosColor = (pos: string) => {
        if (pos === 'Attacker') return 'text-amber-400';
        if (pos === 'Midfielder') return 'text-sky-400';
        if (pos === 'Defender') return 'text-emerald-400';
        return 'text-purple-400'; // GK
    };

    return (
        <div className="p-6 md:p-10 max-w-6xl mx-auto min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <button onClick={() => router.back()} className="text-slate-500 hover:text-white flex items-center gap-2 mb-4 transition-colors">
                    <ArrowLeft size={18} /> Back
                </button>

                <div className="glass-card p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div className="w-32 h-32 bg-slate-800/50 rounded-2xl flex items-center justify-center p-4 backdrop-blur-md shadow-xl border border-slate-700/50">
                        {team.logo ? <img src={team.logo} className="w-full h-full object-contain drop-shadow-lg" /> : <Shield size={64} className="text-slate-600" />}
                    </div>

                    <div className="flex-1 text-center md:text-left z-10">
                        <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">{team.name}</h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                            <span className="px-3 py-1 bg-slate-800/80 rounded-lg text-slate-400 text-xs font-mono uppercase tracking-wider border border-slate-700/50">EST. {team.founded || 'N/A'}</span>
                            <span className="px-3 py-1 bg-slate-800/80 rounded-lg text-slate-400 text-xs font-mono uppercase tracking-wider border border-slate-700/50">{team.venue || 'Unknown Stadium'}</span>
                        </div>

                        {/* Dynamic Strength Indicators */}
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center p-3 bg-slate-900/50 rounded-lg border border-slate-800 min-w-[80px]">
                                <span className="text-xs text-slate-500 font-bold uppercase mb-1">ATT</span>
                                <span className="text-2xl font-black text-amber-500 font-mono tracking-tighter">{team.att}</span>
                            </div>
                            <div className="flex flex-col items-center p-3 bg-slate-900/50 rounded-lg border border-slate-800 min-w-[80px]">
                                <span className="text-xs text-slate-500 font-bold uppercase mb-1">MID</span>
                                <span className="text-2xl font-black text-sky-500 font-mono tracking-tighter">{team.mid}</span>
                            </div>
                            <div className="flex flex-col items-center p-3 bg-slate-900/50 rounded-lg border border-slate-800 min-w-[80px]">
                                <span className="text-xs text-slate-500 font-bold uppercase mb-1">DEF</span>
                                <span className="text-2xl font-black text-emerald-500 font-mono tracking-tighter">{team.def}</span>
                            </div>
                        </div>
                    </div>

                    {/* League Stats (if avail) */}
                    {team.stats && (
                        <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-700/30 backdrop-blur-sm z-10 w-full md:w-auto">
                            <div className="grid grid-cols-4 gap-6 text-center">
                                <div><p className="text-xs text-slate-500 uppercase">Rank</p><p className="text-xl font-bold text-white">#{(team.stats.points > 60) ? 1 : 5}</p></div>
                                <div><p className="text-xs text-slate-500 uppercase">Pts</p><p className="text-xl font-bold text-white text-emerald-400">{team.stats.points}</p></div>
                                <div><p className="text-xs text-slate-500 uppercase">W/D/L</p><p className="text-sm font-medium text-slate-300 mt-1">{team.stats.wins}/{team.stats.draws}/{team.stats.losses}</p></div>
                                <div><p className="text-xs text-slate-500 uppercase">Goals</p><p className="text-sm font-medium text-slate-300 mt-1">{team.stats.gf}:{team.stats.ga}</p></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Tabs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Squad List */}
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><User size={20} className="text-purple-400" /> Squad <span className="text-slate-500 text-sm font-normal">({team.players.length} Players)</span></h2>

                    <div className="glass-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-800/50 text-slate-400 font-medium uppercase text-xs tracking-wider">
                                    <tr>
                                        <th className="p-4 w-12 text-center">#</th>
                                        <th className="p-4">Player</th>
                                        <th className="p-4">Pos</th>
                                        <th className="p-4 text-center">Age</th>
                                        <th className="p-4 text-center">Rating</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {team.players.length > 0 ? team.players.map((p: any) => (
                                        <tr key={p.id || Math.random()} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-3 text-center font-mono text-slate-600 group-hover:text-slate-400">{p.number || '-'}</td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-800 rounded-full overflow-hidden flex-shrink-0 border border-slate-700 group-hover:border-slate-500 transition-colors">
                                                        {p.photo ? <img src={p.photo} className="w-full h-full object-cover" /> : <User size={20} className="text-slate-600 m-auto" />}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-200 group-hover:text-white">{p.name}</div>
                                                        <div className="text-xs text-slate-500">Contract until 2026</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={`p-3 font-medium ${getPosColor(p.position)}`}>{p.position}</td>
                                            <td className="p-3 text-center text-slate-400">{p.age || '?'}</td>
                                            <td className="p-3 text-center">
                                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold font-mono ${(p.rating || 70) >= 85 ? 'bg-amber-500/20 text-amber-400' :
                                                        (p.rating || 70) >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                                                            (p.rating || 70) >= 75 ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-700 text-slate-400'
                                                    }`}>
                                                    {p.rating || 70}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-500">No players found in database based on recent fetch.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar Stats */}
                <div className="space-y-6">
                    {/* Form Guide */}
                    <div className="glass-card p-5">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Recent Form</h3>
                        <div className="flex items-center gap-2 justify-center py-4">
                            {(team.form || []).map((r: string, i: number) => (
                                <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${r === 'W' ? 'bg-emerald-500 text-slate-900' :
                                        r === 'D' ? 'bg-slate-500 text-white' : 'bg-rose-500 text-white'
                                    }`}>
                                    {r}
                                </div>
                            ))}
                            {(team.form || []).length === 0 && <span className="text-slate-500">No matches played</span>}
                        </div>
                    </div>

                    {/* Trophies (Mock) */}
                    <div className="glass-card p-5">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Honours</h3>
                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2 text-amber-400 opacity-50">
                                <Trophy size={16} /> <span className="text-sm text-slate-400">Bundesliga x0</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 opacity-50">
                                <Target size={16} /> <span className="text-sm">DFB Pokal x0</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
