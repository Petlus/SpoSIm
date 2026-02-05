'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Shield, Activity, Star, Trophy, Target, Sparkles, TrendingUp } from 'lucide-react';

export default function TeamPage() {
    const { teamId } = useParams();
    const router = useRouter();
    const [team, setTeam] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [noElectron, setNoElectron] = useState(false);

    useEffect(() => {
        if (teamId) loadTeam();
    }, [teamId]);

    const loadTeam = async () => {
        if (window.electron) {
            const data = await window.electron.getTeamDetails(parseInt(teamId as string));
            if (!(data as { error?: string }).error) {
                setTeam(data);
            }
            setLoading(false);
        } else {
            setLoading(false);
            setNoElectron(true);
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 animate-pulse">Loading Team Details...</div>;
    if (noElectron) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Run BetBrain in Electron to use this feature.</div>;
    if (!team) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Team not found</div>;

    // --- Dynamic Team Colors ---
    const getTeamTheme = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('dortmund')) return { from: 'from-yellow-400', to: 'to-yellow-600', text: 'text-yellow-400', border: 'border-yellow-500/50', shadow: 'shadow-yellow-500/20', accent: 'bg-yellow-500' };
        if (n.includes('bayern')) return { from: 'from-red-600', to: 'to-red-900', text: 'text-red-500', border: 'border-red-500/50', shadow: 'shadow-red-500/20', accent: 'bg-red-600' };
        if (n.includes('leipzig')) return { from: 'from-red-500', to: 'to-white', text: 'text-red-400', border: 'border-red-400/50', shadow: 'shadow-red-500/20', accent: 'bg-red-500' };
        if (n.includes('leverkusen')) return { from: 'from-red-700', to: 'to-black', text: 'text-red-500', border: 'border-red-600/50', shadow: 'shadow-red-500/20', accent: 'bg-red-700' };
        if (n.includes('stuttgart')) return { from: 'from-red-500', to: 'to-red-700', text: 'text-red-500', border: 'border-red-500/50', shadow: 'shadow-red-500/20', accent: 'bg-red-600' };
        if (n.includes('gladbach')) return { from: 'from-black', to: 'to-emerald-900', text: 'text-white', border: 'border-white/30', shadow: 'shadow-white/10', accent: 'bg-emerald-800' };
        if (n.includes('frankfurt')) return { from: 'from-red-600', to: 'to-black', text: 'text-red-500', border: 'border-red-500/50', shadow: 'shadow-red-500/20', accent: 'bg-red-600' };
        if (n.includes('wolfsburg')) return { from: 'from-lime-500', to: 'to-emerald-700', text: 'text-lime-400', border: 'border-lime-500/50', shadow: 'shadow-lime-500/20', accent: 'bg-lime-500' };
        if (n.includes('union')) return { from: 'from-red-700', to: 'to-yellow-500', text: 'text-red-500', border: 'border-red-500/50', shadow: 'shadow-red-500/20', accent: 'bg-red-600' };
        if (n.includes('mainz')) return { from: 'from-red-500', to: 'to-white', text: 'text-red-500', border: 'border-red-500/50', shadow: 'shadow-red-500/20', accent: 'bg-red-500' };
        if (n.includes('augsburg')) return { from: 'from-red-500', to: 'to-green-500', text: 'text-green-400', border: 'border-green-500/50', shadow: 'shadow-green-500/20', accent: 'bg-green-600' };
        if (n.includes('hoffenheim')) return { from: 'from-blue-500', to: 'to-blue-800', text: 'text-blue-400', border: 'border-blue-500/50', shadow: 'shadow-blue-500/20', accent: 'bg-blue-600' };
        if (n.includes('bremen')) return { from: 'from-emerald-500', to: 'to-emerald-800', text: 'text-emerald-400', border: 'border-emerald-500/50', shadow: 'shadow-emerald-500/20', accent: 'bg-emerald-600' };
        if (n.includes('heidenheim')) return { from: 'from-red-500', to: 'to-blue-500', text: 'text-red-500', border: 'border-red-500/50', shadow: 'shadow-red-500/20', accent: 'bg-red-600' };
        if (n.includes('koeln') || n.includes('köln')) return { from: 'from-red-600', to: 'to-white', text: 'text-red-500', border: 'border-red-500/50', shadow: 'shadow-red-500/20', accent: 'bg-red-600' };
        if (n.includes('hamburg') || n.includes('hsv')) return { from: 'from-blue-600', to: 'to-black', text: 'text-blue-500', border: 'border-blue-500/50', shadow: 'shadow-blue-500/20', accent: 'bg-blue-600' };
        if (n.includes('st. pauli') || n.includes('pauli')) return { from: 'from-amber-700', to: 'to-black', text: 'text-amber-600', border: 'border-amber-700/50', shadow: 'shadow-amber-900/40', accent: 'bg-amber-800' };
        
        // Default
        return { from: 'from-slate-700', to: 'to-slate-900', text: 'text-slate-400', border: 'border-slate-600', shadow: 'shadow-slate-900/50', accent: 'bg-slate-700' };
    };

    const theme = getTeamTheme(team.name);

    const getPosColor = (pos: string) => {
        const p = pos?.toUpperCase() || '';
        if (p === 'FWD' || p === 'ATT' || pos === 'Attacker') return 'bg-amber-500 text-amber-950';
        if (p === 'MID' || pos === 'Midfielder') return 'bg-sky-500 text-sky-950';
        if (p === 'DEF' || pos === 'Defender') return 'bg-emerald-500 text-emerald-950';
        if (p === 'GK') return 'bg-purple-500 text-purple-950';
        return 'bg-slate-500 text-slate-900';
    };

    const getRatingColor = (rating: number) => {
        if (rating >= 85) return 'bg-amber-400 text-amber-950 border-amber-500'; // World Class
        if (rating >= 80) return 'bg-emerald-400 text-emerald-950 border-emerald-500'; // Elite
        if (rating >= 75) return 'bg-sky-400 text-sky-950 border-sky-500'; // Good
        return 'bg-slate-400 text-slate-900 border-slate-500'; // Average
    };

    return (
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto min-h-screen relative overflow-hidden">
            {/* Ambient Background Glow based on Team Color */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b ${theme.from} to-transparent opacity-10 blur-[120px] pointer-events-none`}></div>

            {/* Header */}
            <div className="mb-10 relative z-10">
                <button onClick={() => router.back()} className="text-slate-400 hover:text-white flex items-center gap-2 mb-6 transition-colors group">
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Back
                </button>

                {/* Glassmorphism Header Card */}
                <div className={`glass-card p-8 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden border-t border-white/10 shadow-2xl ${theme.shadow}`}>
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5 bg-[url('/file.svg')] bg-repeat opacity-[0.03]"></div>
                    
                    {/* Logo Section */}
                    <div className={`relative group`}>
                        <div className={`absolute inset-0 ${theme.from} to-transparent opacity-30 blur-2xl rounded-full group-hover:opacity-50 transition-opacity duration-700`}></div>
                        <div className="w-40 h-40 bg-slate-900/80 rounded-2xl flex items-center justify-center p-6 backdrop-blur-xl shadow-2xl border border-white/10 relative z-10 transform group-hover:scale-105 transition-transform duration-500">
                            {team.logo ? <img src={team.logo} className="w-full h-full object-contain drop-shadow-2xl" /> : <Shield size={64} className="text-slate-600" />}
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left z-10">
                        <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter drop-shadow-lg">
                                {team.name}
                            </h1>
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-6">
                            <div className="px-3 py-1 bg-black/40 rounded border border-white/10 text-slate-400 text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                                <Activity size={12} /> EST. {team.founded || 'N/A'}
                            </div>
                            <div className="px-3 py-1 bg-black/40 rounded border border-white/10 text-slate-400 text-xs font-mono uppercase tracking-wider">
                                {team.venue || 'Unknown Stadium'}
                            </div>
                            <div className={`px-3 py-1 bg-gradient-to-r ${theme.from} to-transparent rounded border border-white/10 text-white text-xs font-bold uppercase tracking-wider shadow-lg`}>
                                Official Partner
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto md:mx-0">
                            <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5 text-center group hover:border-amber-500/30 transition-colors">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 group-hover:text-amber-400">ATTACK</div>
                                <div className="text-3xl font-black text-white font-mono">{team.att}</div>
                            </div>
                            <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5 text-center group hover:border-sky-500/30 transition-colors">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 group-hover:text-sky-400">MIDFIELD</div>
                                <div className="text-3xl font-black text-white font-mono">{team.mid}</div>
                            </div>
                            <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5 text-center group hover:border-emerald-500/30 transition-colors">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 group-hover:text-emerald-400">DEFENSE</div>
                                <div className="text-3xl font-black text-white font-mono">{team.def}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Squad Section - FIFA Cards Grid */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className={`w-1 h-8 rounded-full bg-gradient-to-b ${theme.from} to-transparent`}></span>
                        Active Squad
                        <span className="text-slate-600 text-sm font-normal">({team.players.length})</span>
                    </h2>
                    
                    <div className="flex gap-2">
                        {/* Filters could go here */}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {team.players.length > 0 ? team.players.map((p: any) => (
                        <div key={p.id || Math.random()} className="group relative perspective-1000">
                            {/* Card Container */}
                            <div className="relative bg-slate-800/80 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/50 transition-all duration-300">
                                
                                {/* Header / Background Graphic */}
                                <div className={`h-24 bg-gradient-to-br ${theme.from} to-slate-900 relative overflow-hidden`}>
                                    <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-20 mix-blend-overlay"></div>
                                    <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                                </div>

                                {/* Player Image & Rating Badge */}
                                <div className="absolute top-4 left-4 z-10">
                                    <div className={`w-12 h-12 flex items-center justify-center font-black text-xl border-2 shadow-lg ${getRatingColor(p.rating || 70)} rounded-lg transform -rotate-3`}>
                                        {p.rating || 70}
                                    </div>
                                </div>

                                <div className="flex justify-center -mt-16 relative z-0">
                                    <div className="w-28 h-28 bg-slate-900 rounded-full border-4 border-slate-800 overflow-hidden shadow-xl relative">
                                        {p.photo ? (
                                            <img src={p.photo} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                                <User size={48} className="text-slate-600" />
                                            </div>
                                        )}
                                        {/* Form Indicator Dot */}
                                        <div className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900" title="Good Form"></div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-4 text-center pt-2">
                                    <h3 className="text-lg font-bold text-white truncate leading-tight mb-1">{p.name}</h3>
                                    <div className="flex justify-center items-center gap-2 mb-4">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${getPosColor(p.position)}`}>
                                            {p.position || 'SUB'}
                                        </span>
                                        <span className="text-slate-500 text-xs font-mono">{p.age}y</span>
                                    </div>

                                    {/* Mini Stats */}
                                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/5 pt-3">
                                        <div className="text-slate-400">Value</div>
                                        <div className="text-right font-mono text-emerald-400 font-bold">
                                            {p.marketValue ? `€${(Number(p.marketValue) / 1000000).toFixed(1)}M` : '-'}
                                        </div>
                                        <div className="text-slate-400">Goals</div>
                                        <div className="text-right font-mono text-white">{p.goals || 0}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full py-12 text-center text-slate-500 italic">
                            No players found in database.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
