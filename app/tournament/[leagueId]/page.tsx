'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trophy, Play, RefreshCw } from 'lucide-react';

// Match Card Component for Bracket
const BracketMatch = ({ match, onSimulate }: { match: any, onSimulate?: () => void }) => {
    const isPlayed = match.homeScore !== null;

    return (
        <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2 w-48 text-xs">
            {/* Home Team */}
            <div className={`flex items-center justify-between p-1.5 rounded ${isPlayed && match.homeScore > match.awayScore ? 'bg-emerald-500/10' : ''}`}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-5 h-5 rounded bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {match.home?.logo ? <img src={match.home.logo} className="w-4 h-4 object-contain" alt="" /> : <span className="text-[8px]">⚽</span>}
                    </div>
                    <span className="truncate font-medium text-slate-200">{match.home?.short_name || match.home?.name || 'TBD'}</span>
                </div>
                <span className={`font-mono font-bold ${isPlayed && match.homeScore > match.awayScore ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {isPlayed ? match.homeScore : '-'}
                </span>
            </div>

            {/* Away Team */}
            <div className={`flex items-center justify-between p-1.5 rounded mt-1 ${isPlayed && match.awayScore > match.homeScore ? 'bg-emerald-500/10' : ''}`}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-5 h-5 rounded bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {match.away?.logo ? <img src={match.away.logo} className="w-4 h-4 object-contain" alt="" /> : <span className="text-[8px]">⚽</span>}
                    </div>
                    <span className="truncate font-medium text-slate-200">{match.away?.short_name || match.away?.name || 'TBD'}</span>
                </div>
                <span className={`font-mono font-bold ${isPlayed && match.awayScore > match.homeScore ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {isPlayed ? match.awayScore : '-'}
                </span>
            </div>

            {/* Date/Status */}
            <div className="text-center text-[10px] text-slate-500 mt-1.5 pt-1.5 border-t border-slate-700">
                {isPlayed ? 'Finished' : match.date || 'TBD'}
            </div>
        </div>
    );
};

// Connector line between bracket stages
const BracketConnector = ({ direction = 'right' }: { direction?: 'left' | 'right' }) => (
    <div className={`w-8 h-px bg-slate-600 ${direction === 'left' ? 'mr-2' : 'ml-2'}`} />
);

export default function TournamentPage() {
    const { leagueId } = useParams();
    const [league, setLeague] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'groups' | 'bracket'>('groups');
    const [bracket, setBracket] = useState<any>(null);

    useEffect(() => {
        if (leagueId) loadData();
    }, [leagueId]);

    const loadData = async () => {
        // @ts-ignore
        if (window.electron) {
            // @ts-ignore
            const res = await window.electron.getData('football');
            const l = res.leagues.find((lg: any) => lg.id.toString() === leagueId);
            if (l) {
                setLeague(l);
                // Generate mock bracket from top teams in each group
                generateBracket(l.teams);
            }
            setLoading(false);
        }
    };

    const generateBracket = (teams: any[]) => {
        // Group teams by group_name and get top 2 from each
        const groups: Record<string, any[]> = {};
        teams.forEach(t => {
            const g = t.group || 'GROUP A';
            if (!groups[g]) groups[g] = [];
            groups[g].push(t);
        });

        const qualifiedTeams: any[] = [];
        Object.keys(groups).sort().forEach(g => {
            const sorted = groups[g].sort((a, b) => b.points - a.points);
            qualifiedTeams.push(...sorted.slice(0, 2));
        });

        // Create R16 matches (simplified: pair 1st from GroupA vs 2nd from GroupB, etc.)
        const r16: any[] = [];
        for (let i = 0; i < Math.min(8, qualifiedTeams.length / 2); i++) {
            r16.push({
                id: `r16-${i}`,
                home: qualifiedTeams[i * 2] || null,
                away: qualifiedTeams[i * 2 + 1] || null,
                homeScore: null,
                awayScore: null,
                round: 'R16'
            });
        }

        // Create empty QF, SF, F
        const qf = Array(4).fill(null).map((_, i) => ({
            id: `qf-${i}`, home: null, away: null, homeScore: null, awayScore: null, round: 'QF'
        }));
        const sf = Array(2).fill(null).map((_, i) => ({
            id: `sf-${i}`, home: null, away: null, homeScore: null, awayScore: null, round: 'SF'
        }));
        const final = { id: 'final', home: null, away: null, homeScore: null, awayScore: null, round: 'Final' };

        setBracket({ r16, qf, sf, final });
    };

    if (loading) return <div className="p-10 text-slate-400 flex items-center gap-3"><RefreshCw className="animate-spin" size={18} /> Loading...</div>;
    if (!league) return <div className="p-10 text-slate-400">Tournament not found</div>;

    // Group teams by group_name for display
    const groupedTeams: Record<string, any[]> = {};
    league.teams.forEach((t: any) => {
        const g = t.group || 'League';
        if (!groupedTeams[g]) groupedTeams[g] = [];
        groupedTeams[g].push(t);
    });
    const sortedGroups = Object.keys(groupedTeams).sort();

    return (
        <div className="p-6 md:p-8 max-w-full mx-auto min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <Link href="/football" className="inline-flex items-center gap-2 text-slate-500 hover:text-white mb-1 transition-colors text-sm">
                        <ArrowLeft size={14} /> Back
                    </Link>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Trophy className="text-amber-400" size={28} />
                        {league.name}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-800/50 rounded-lg p-1 text-sm border border-slate-700/50">
                        <button onClick={() => setActiveTab('groups')} className={`px-4 py-1.5 rounded-md font-medium transition-all ${activeTab === 'groups' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Groups</button>
                        <button onClick={() => setActiveTab('bracket')} className={`px-4 py-1.5 rounded-md font-medium transition-all ${activeTab === 'bracket' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Bracket</button>
                    </div>
                </div>
            </div>

            {/* Groups Tab */}
            {activeTab === 'groups' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {sortedGroups.map(groupName => (
                        <div key={groupName} className="glass-card p-4">
                            <h3 className="text-sm font-bold text-amber-400 mb-3">{groupName}</h3>
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-slate-500">
                                        <th className="text-left pb-2">Team</th>
                                        <th className="text-center pb-2">P</th>
                                        <th className="text-center pb-2">W</th>
                                        <th className="text-center pb-2">D</th>
                                        <th className="text-center pb-2">L</th>
                                        <th className="text-center pb-2">Pts</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupedTeams[groupName].sort((a, b) => b.points - a.points).map((t: any, idx: number) => (
                                        <tr key={t.id} className={`border-t border-slate-700/50 ${idx < 2 ? 'bg-emerald-500/5' : ''}`}>
                                            <td className="py-1.5 flex items-center gap-2">
                                                <div className="w-4 h-4 rounded bg-slate-700 flex items-center justify-center overflow-hidden">
                                                    {t.logo ? <img src={t.logo} className="w-3 h-3 object-contain" alt="" /> : <span className="text-[8px]">⚽</span>}
                                                </div>
                                                <span className="truncate text-slate-200">{t.short_name || t.name}</span>
                                            </td>
                                            <td className="text-center text-slate-400 font-mono">{t.stats?.played || 0}</td>
                                            <td className="text-center text-slate-400 font-mono">{t.stats?.wins || 0}</td>
                                            <td className="text-center text-slate-400 font-mono">{t.stats?.draws || 0}</td>
                                            <td className="text-center text-slate-400 font-mono">{t.stats?.losses || 0}</td>
                                            <td className="text-center font-bold text-white font-mono">{t.points}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            )}

            {/* Bracket Tab */}
            {activeTab === 'bracket' && bracket && (
                <div className="overflow-x-auto pb-8">
                    <div className="flex items-center justify-center gap-4 min-w-[1200px] py-8">

                        {/* Left Side - R16 (4 matches) */}
                        <div className="flex flex-col gap-8">
                            {bracket.r16.slice(0, 4).map((m: any) => (
                                <BracketMatch key={m.id} match={m} />
                            ))}
                        </div>

                        {/* Left QF */}
                        <div className="flex flex-col gap-24 items-center">
                            <BracketConnector />
                            {bracket.qf.slice(0, 2).map((m: any) => (
                                <BracketMatch key={m.id} match={m} />
                            ))}
                            <BracketConnector />
                        </div>

                        {/* Left SF */}
                        <div className="flex flex-col gap-48 items-center">
                            <BracketConnector />
                            {bracket.sf.slice(0, 1).map((m: any) => (
                                <BracketMatch key={m.id} match={m} />
                            ))}
                            <BracketConnector />
                        </div>

                        {/* Final & Trophy */}
                        <div className="flex flex-col items-center gap-4 mx-8">
                            <Trophy size={64} className="text-amber-400 opacity-30" />
                            <span className="text-sm font-bold text-amber-400 uppercase tracking-wider">Champion</span>
                            <BracketMatch match={bracket.final} />
                            <span className="text-xs text-slate-500 uppercase tracking-wider px-3 py-1 border border-amber-500/30 rounded">Finale</span>
                        </div>

                        {/* Right SF */}
                        <div className="flex flex-col gap-48 items-center">
                            <BracketConnector direction="left" />
                            {bracket.sf.slice(1, 2).map((m: any) => (
                                <BracketMatch key={m.id} match={m} />
                            ))}
                            <BracketConnector direction="left" />
                        </div>

                        {/* Right QF */}
                        <div className="flex flex-col gap-24 items-center">
                            <BracketConnector direction="left" />
                            {bracket.qf.slice(2, 4).map((m: any) => (
                                <BracketMatch key={m.id} match={m} />
                            ))}
                            <BracketConnector direction="left" />
                        </div>

                        {/* Right Side - R16 (4 matches) */}
                        <div className="flex flex-col gap-8">
                            {bracket.r16.slice(4, 8).map((m: any) => (
                                <BracketMatch key={m.id} match={m} />
                            ))}
                        </div>
                    </div>

                    {/* Simulate Button */}
                    <div className="flex justify-center mt-8">
                        <button className="px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-lg font-bold text-white shadow-lg shadow-amber-900/30 transition-all flex items-center gap-2">
                            <Play size={18} fill="currentColor" />
                            Simulate Next Round
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
