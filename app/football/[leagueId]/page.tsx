'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LeaguePage() {
    const { leagueId } = useParams();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Standings'); // 'Standings', 'Knockout'
    const [activeGroup, setActiveGroup] = useState<string | null>(null);

    useEffect(() => {
        if (leagueId) {
            // @ts-ignore
            if (window.electron) {
                // @ts-ignore
                window.electron.getData('football').then((res: any) => {
                    const league = res.leagues.find((l: any) => l.id.toString() === leagueId);
                    if (league) {
                        // Determine initial group if any
                        const firstGroup = league.teams.length > 0 ? (league.teams[0].group || 'League') : 'League';
                        setActiveGroup(firstGroup);
                        // Sort teams by points
                        league.teams.sort((a: any, b: any) => b.points - a.points);
                        setData(league);
                    }
                    setLoading(false);
                });
            }
        }
    }, [leagueId]);

    const simulateMatchday = async () => {
        // @ts-ignore
        await window.electron.simulateMatchday(leagueId);
        // refresh
        // @ts-ignore
        const res = await window.electron.getData('football');
        const league = res.leagues.find((l: any) => l.id.toString() === leagueId);
        if (league) {
            league.teams.sort((a: any, b: any) => b.points - a.points);
            setData(league);
        }
    };

    if (loading) return <div className="p-8 text-white">Loading League Data...</div>;
    if (!data) return <div className="p-8 text-white">League not found</div>;

    // Group teams logic
    const uniqueGroups = Array.from(new Set(data.teams.map((t: any) => t.group || 'League')));
    const isTournament = uniqueGroups.length > 1;

    const filteredTeams = data.teams.filter((t: any) => (t.group || 'League') === activeGroup);

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <Link href="/football" className="text-cyan-400 hover:underline">← Back to Leagues</Link>
                    <div className="space-x-4 flex items-center">
                        {/* Phase Switcher for Tournaments */}
                        {isTournament && (
                            <div className="inline-flex bg-slate-800 rounded-lg p-1 mr-4">
                                <button
                                    onClick={() => setActiveTab('Standings')}
                                    className={`px-4 py-1 rounded-md text-sm transition-colors ${activeTab === 'Standings' ? 'bg-cyan-600' : 'hover:bg-slate-700'}`}
                                >
                                    Groups
                                </button>
                                <button
                                    onClick={() => setActiveTab('Knockout')}
                                    className={`px-4 py-1 rounded-md text-sm transition-colors ${activeTab === 'Knockout' ? 'bg-cyan-600' : 'hover:bg-slate-700'}`}
                                >
                                    Knockout
                                </button>
                            </div>
                        )}
                        <button
                            onClick={simulateMatchday}
                            className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded-lg font-bold shadow-lg transition-all"
                        >
                            Simulate Matchday
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4 mb-8">
                    <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                        {data.name}
                    </h1>
                    <span className="bg-slate-700 px-3 py-1 rounded text-sm text-cyan-200">{data.teams.length} Teams</span>
                </div>

                {activeTab === 'Standings' && (
                    <>
                        {/* Group Tabs */}
                        {uniqueGroups.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
                                {uniqueGroups.map((g: any) => (
                                    <button
                                        key={g}
                                        onClick={() => setActiveGroup(g)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeGroup === g
                                                ? 'bg-cyan-600 text-white'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                            }`}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/10 text-slate-400 text-sm uppercase tracking-wider">
                                        <th className="p-4">#</th>
                                        <th className="p-4">Team</th>
                                        <th className="p-4 text-center">P</th>
                                        <th className="p-4 text-center">W</th>
                                        <th className="p-4 text-center">D</th>
                                        <th className="p-4 text-center">L</th>
                                        <th className="p-4 text-center">GF</th>
                                        <th className="p-4 text-center">GA</th>
                                        <th className="p-4 text-center font-bold text-white">Pts</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredTeams.map((team: any, index: number) => (
                                        <tr key={team.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-4 text-slate-500">{index + 1}</td>
                                            <td className="p-4 font-bold flex items-center gap-3">
                                                {team.logo && <img src={team.logo} className="w-8 h-8 object-contain" />}
                                                {team.name}
                                            </td>
                                            <td className="p-4 text-center text-slate-400">{team.stats.played}</td>
                                            <td className="p-4 text-center text-green-400">{team.stats.wins}</td>
                                            <td className="p-4 text-center text-yellow-400">{team.stats.draws}</td>
                                            <td className="p-4 text-center text-red-400">{team.stats.losses}</td>
                                            <td className="p-4 text-center text-slate-300">{team.stats.gf}</td>
                                            <td className="p-4 text-center text-slate-300">{team.stats.ga}</td>
                                            <td className="p-4 text-center font-black text-xl text-white">{team.points}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {activeTab === 'Knockout' && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-2xl border border-white/10 border-dashed">
                        <div className="text-6xl mb-4">🏆</div>
                        <h3 className="text-2xl font-bold text-white mb-2">Knockout Stage</h3>
                        <p className="text-slate-400 max-w-md text-center">
                            The tournament bracket will appear here once the Group Stage is concluded.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
