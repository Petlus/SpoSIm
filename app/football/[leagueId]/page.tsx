'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function LeagueDashboard() {
    const params = useParams(); // Use useParams hook
    const [league, setLeague] = useState<any>(null);
    const [simulating, setSimulating] = useState(false);

    // We need to resolve params.leagueId which might be a promise or string depending on Next.js version
    // but useParams() returns an object.
    const leagueId = params?.leagueId;

    const loadLeague = async () => {
        if (!leagueId) return;
        const data = await (window as any).electron.getData('football');
        const l = data.leagues.find((x: any) => x.id.toString() === leagueId.toString());
        if (l) {
            // Sort tables
            l.teams.sort((a: any, b: any) => b.points - a.points);
            setLeague(l);
        }
    };

    useEffect(() => {
        loadLeague();
    }, [leagueId]);

    const simulateMatchday = async () => {
        setSimulating(true);
        await (window as any).electron.simulateMatchday(leagueId);
        await loadLeague(); // Reload data
        setSimulating(false);
    };

    if (!league) return <div className="p-10 text-slate-400">Loading League Data...</div>;

    return (
        <div className="min-h-screen p-8 bg-slate-950 text-white flex flex-col">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <a href="/football" className="text-slate-500 hover:text-cyan-400 mb-2 inline-block">← Change League</a>
                    <h1 className="text-4xl font-extrabold text-white">{league.name}</h1>
                    <p className="text-slate-400">Season 2025/2026</p>
                </div>
                <div className="flex gap-3">
                    <button
                        disabled={simulating}
                        onClick={simulateMatchday}
                        className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/20 transition-all">
                        {simulating ? 'Simulating...' : 'Play Next Matchday'}
                    </button>
                    <button
                        disabled={simulating}
                        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold rounded-xl border border-white/10 transition-all">
                        Simulate Season
                    </button>
                </div>
            </header>

            <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Table / Standings */}
                <div className="lg:col-span-2 bg-slate-900 rounded-3xl border border-white/5 p-6 overflow-hidden">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <span className="text-cyan-400">📊</span> Live Table
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-950/50">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Pos</th>
                                    <th className="px-4 py-3">Team</th>
                                    <th className="px-4 py-3">P</th>
                                    <th className="px-4 py-3">W</th>
                                    <th className="px-4 py-3">D</th>
                                    <th className="px-4 py-3">L</th>
                                    <th className="px-4 py-3 font-bold text-white rounded-r-lg">Pts</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {league.teams.map((team: any, index: number) => (
                                    <tr key={team.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-4 py-3 font-mono text-slate-400">{index + 1}</td>
                                        <td className="px-4 py-3 font-medium flex items-center gap-3">
                                            {team.logo && <img src={team.logo} className="w-6 h-6 object-contain" />}
                                            {team.name}
                                        </td>
                                        <td className="px-4 py-3 text-slate-400">{team.stats?.played || 0}</td>
                                        <td className="px-4 py-3 text-slate-400">{team.stats?.wins || 0}</td>
                                        <td className="px-4 py-3 text-slate-400">{team.stats?.draws || 0}</td>
                                        <td className="px-4 py-3 text-slate-400">{team.stats?.losses || 0}</td>
                                        <td className="px-4 py-3 font-bold text-cyan-400">{team.points}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Side Panel: Fixtures / Info */}
                <div className="space-y-6">
                    {/* Next Fixtures Placeholder */}
                    <div className="bg-slate-900 rounded-3xl border border-white/5 p-6">
                        <h3 className="text-xl font-bold mb-4">Matchday Info</h3>
                        <div className="p-4 bg-slate-950 rounded-xl border border-white/5 text-center text-slate-500 text-sm">
                            No active fixtures generated.<br />Click "Play Next Matchday" to generate and simulate.
                        </div>
                    </div>

                    {/* Top Scorer / Stats Placeholder */}
                    <div className="bg-slate-900 rounded-3xl border border-white/5 p-6 h-fit">
                        <h3 className="text-xl font-bold mb-4">Champion Probability</h3>
                        {league.teams.slice(0, 3).map((t: any) => (
                            <div key={t.id} className="mb-3">
                                <div className="flex justify-between text-xs mb-1">
                                    <span>{t.name}</span>
                                    <span className="text-cyan-400 font-mono">{(t.points / (league.teams[0].points || 1) * 30).toFixed(1)}%</span>
                                </div>
                                <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                                    <div className="h-full bg-cyan-600 rounded-full" style={{ width: `${(t.points / (league.teams[0].points || 1) * 30)}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </main>
        </div>
    );
}
