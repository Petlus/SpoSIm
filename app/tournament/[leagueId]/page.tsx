'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Trophy, Play, RefreshCw, Calendar, ChevronLeft, ChevronRight, BarChart3, Activity, X, Sparkles, BrainCircuit, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

const FormDot = ({ result }: { result: string }) => {
    const colors: Record<string, string> = { W: 'bg-emerald-500', D: 'bg-slate-500', L: 'bg-rose-500' };
    return <div className={`w-2 h-2 rounded-full ${colors[result] || 'bg-slate-700'}`} title={result} />;
};

const BracketMatch = ({ match, compact = false, twoLegged = false }: { match: any; compact?: boolean; twoLegged?: boolean }) => {
    const isPlayed = match.homeScore !== null;
    const homeWon = isPlayed && match.homeScore > match.awayScore;
    const awayWon = isPlayed && match.awayScore > match.homeScore;
    return (
        <div className={`bg-slate-800/90 border border-slate-600/80 rounded-xl overflow-hidden shadow-lg hover:border-slate-500/60 transition-all ${compact ? 'w-40' : 'w-52'} min-w-0`}>
            {twoLegged && <div className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-bold uppercase tracking-wider text-center border-b border-slate-700/80">2 legs</div>}
            <div className={`flex items-center justify-between px-3 py-2.5 gap-2 ${homeWon ? 'bg-emerald-500/15 border-l-2 border-emerald-500' : 'border-l-2 border-transparent'}`}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-slate-700/80 flex items-center justify-center overflow-hidden flex-shrink-0">{match.home?.logo ? <img src={match.home.logo} className="w-5 h-5 object-contain" alt="" /> : <span className="text-[10px]">⚽</span>}</div>
                    <span className={`truncate text-sm font-semibold ${homeWon ? 'text-emerald-300' : 'text-slate-200'}`}>{match.home?.short_name || match.home?.name || 'TBD'}</span>
                </div>
                <span className={`font-mono font-bold text-base tabular-nums ${homeWon ? 'text-emerald-400' : 'text-slate-400'}`}>{isPlayed ? match.homeScore : '–'}</span>
            </div>
            <div className={`flex items-center justify-between px-3 py-2.5 gap-2 border-t border-slate-700/80 ${awayWon ? 'bg-emerald-500/15 border-l-2 border-emerald-500' : 'border-l-2 border-transparent'}`}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-slate-700/80 flex items-center justify-center overflow-hidden flex-shrink-0">{match.away?.logo ? <img src={match.away.logo} className="w-5 h-5 object-contain" alt="" /> : <span className="text-[10px]">⚽</span>}</div>
                    <span className={`truncate text-sm font-semibold ${awayWon ? 'text-emerald-300' : 'text-slate-200'}`}>{match.away?.short_name || match.away?.name || 'TBD'}</span>
                </div>
                <span className={`font-mono font-bold text-base tabular-nums ${awayWon ? 'text-emerald-400' : 'text-slate-400'}`}>{isPlayed ? match.awayScore : '–'}</span>
            </div>
        </div>
    );
};

const RoundLabel = ({ children }: { children: React.ReactNode }) => <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/80 mb-3 text-center">{children}</div>;

const BracketColumn = ({ label, matches, matchGap = 'gap-6', compact = false, twoLegged = false }: { label: string; matches: any[]; matchGap?: string; compact?: boolean; twoLegged?: boolean }) => (
    <div className="flex flex-col items-center">
        <RoundLabel>{label}</RoundLabel>
        <div className={`flex flex-col items-center ${matchGap}`}>{matches.map((m: any) => <BracketMatch key={m.id} match={m} compact={compact} twoLegged={twoLegged} />)}</div>
    </div>
);

export default function TournamentPage() {
    const { leagueId } = useParams();
    const [league, setLeague] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [noElectron, setNoElectron] = useState(false);
    const [activeTab, setActiveTab] = useState<'league' | 'fixtures' | 'bracket'>('league');
    const [bracket, setBracket] = useState<any>(null);
    const [fixtures, setFixtures] = useState<any[]>([]);
    const [currentMatchday, setCurrentMatchday] = useState(1);
    const [minMatchday, setMinMatchday] = useState(1);
    const [maxMatchday, setMaxMatchday] = useState(8);
    const [loadingFixtures, setLoadingFixtures] = useState(false);
    const [simulating, setSimulating] = useState(false);
    const [simulatingRound, setSimulatingRound] = useState(false);
    const [insightsOpen, setInsightsOpen] = useState(false);
    const [insightsData, setInsightsData] = useState<any>(null);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [loadingAi, setLoadingAi] = useState(false);
    const [aiProgress, setAiProgress] = useState<{ progress: number; step: string } | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);
    const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'unknown' | 'not_installed' | 'offline' | 'ready'>('checking');
    const [downloadUrl, setDownloadUrl] = useState('');
    const [setupComplete, setSetupComplete] = useState(false);

    useEffect(() => {
        if (leagueId) loadData();
    }, [leagueId]);

    useEffect(() => {
        if (league && activeTab === 'fixtures' && window.electron) {
            loadFixtures();
        }
    }, [league?.id, activeTab]);

    const loadData = async () => {
        if (!window.electron) {
            setLoading(false);
            setNoElectron(true);
            return;
        }
        try {
            const res = await window.electron.getData('football') as { leagues?: any[]; error?: string };
            const l = res?.leagues?.find((lg: any) => String(lg.id) === String(leagueId));
            if (l) {
                const teams = [...(l.teams || [])];
                teams.sort((a: any, b: any) => (b.points ?? 0) - (a.points ?? 0));
                setLeague({ ...l, teams });
                const baseBracket = buildBracketFromTeams(teams);
                const lid = typeof l.id === 'string' ? parseInt(l.id, 10) : l.id;
                const dbBracket = await window.electron?.getTournamentBracket?.(lid);
                if (dbBracket && (dbBracket.playoffs?.length || dbBracket.r16?.length || dbBracket.qf?.length || dbBracket.sf?.length || dbBracket.final)) {
                    setBracket(mergeBracketFromDb(baseBracket, dbBracket));
                } else {
                    setBracket(baseBracket);
                }
            }
        } catch (err) {
            console.error('loadData error:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadFixtures = async (matchday?: number) => {
        if (!window.electron || !league?.id) return;
        setLoadingFixtures(true);
        try {
            const lid = typeof league.id === 'string' ? parseInt(league.id, 10) : league.id;
            const result = await window.electron.getFixtures(lid, matchday);
            if (!result) return;
            setCurrentMatchday(result.currentMatchday ?? 1);
            setMinMatchday(result.minMatchday ?? 1);
            setMaxMatchday(result.maxMatchday ?? 8);
            const formatted = (result.matches ?? []).map((fix: any) => ({
                id: fix.id,
                home: fix.home ?? { id: 0, name: 'TBD', short_name: 'TBD', logo: null },
                away: fix.away ?? { id: 0, name: 'TBD', short_name: 'TBD', logo: null },
                matchday: fix.matchday,
                date: fix.date ? new Date(fix.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'TBD',
                homeScore: fix.homeScore,
                awayScore: fix.awayScore,
                status: fix.status,
                odds: null,
                loadingOdds: false,
                simulating: false
            }));
            setFixtures(formatted);
        } catch (err) {
            console.error('loadFixtures error:', err);
            setFixtures([]);
        } finally {
            setLoadingFixtures(false);
        }
    };

    const goToMatchday = (md: number) => {
        const target = Math.max(minMatchday, Math.min(maxMatchday, md));
        setCurrentMatchday(target);
        loadFixtures(target);
    };

    const runSimulateMatchday = async () => {
        if (!window.electron || !league?.id || simulating) return;
        setSimulating(true);
        try {
            const lid = typeof league.id === 'string' ? parseInt(league.id, 10) : league.id;
            await window.electron.simulateMatchday(lid);
            await loadData();
            loadFixtures(currentMatchday);
        } catch (err) {
            console.error('runSimulateMatchday error:', err);
        } finally {
            setSimulating(false);
        }
    };

    const predictMatch = async (index: number, homeId: number, awayId: number) => {
        const next = [...fixtures];
        (next[index] as any).loadingOdds = true;
        setFixtures(next);
        if (window.electron) {
            await new Promise(r => setTimeout(r, 400));
            const odds = await window.electron.getMatchOdds(homeId, awayId);
            const after = [...fixtures];
            (after[index] as any).odds = odds;
            (after[index] as any).loadingOdds = false;
            setFixtures(after);
        }
    };

    const openInsights = async (home: any, away: any) => {
        setInsightsOpen(true);
        setLoadingInsights(true);
        setAiAnalysis(null);
        if (window.electron) {
            const d = await window.electron.getAdvancedAnalysis(home.id, away.id);
            setInsightsData(d);
        }
        setLoadingInsights(false);
    };

    const simulateSingleMatch = async (index: number, matchId: number) => {
        const next = [...fixtures];
        (next[index] as any).simulating = true;
        setFixtures(next);
        if (!window.electron) return;
        try {
            const res = await window.electron.simulateSingleMatch(matchId);
            const after = [...fixtures];
            (after[index] as any).homeScore = res.homeGoals;
            (after[index] as any).awayScore = res.awayGoals;
            (after[index] as any).simulating = false;
            setFixtures(after);
            await loadData();
        } catch (err) {
            console.error('simulateSingleMatch error:', err);
            const after = [...fixtures];
            (after[index] as any).simulating = false;
            setFixtures(after);
        }
    };

    const checkOllama = async () => {
        setOllamaStatus('checking');
        try {
            const timeout = new Promise((_, r) => setTimeout(() => r(new Error('Timeout')), 4000));
            const result = await Promise.race([window.electron!.checkOllamaStatus(), timeout]) as any;
            if (!result?.installed) { setOllamaStatus('not_installed'); setDownloadUrl(result?.downloadUrl || 'https://ollama.com'); }
            else if (!result?.running) setOllamaStatus('offline');
            else setOllamaStatus('ready');
        } catch { setOllamaStatus('unknown'); }
    };

    const askAi = async () => {
        if (!insightsData || !window.electron) return;
        setLoadingAi(true);
        setAiAnalysis(null);
        setAiError(null);
        setAiProgress({ progress: 0, step: 'Starting...' });

        const unsub = window.electron.on('ai-analyst-progress', (_e: unknown, ...args: unknown[]) => {
            const data = args[0] as { progress: number; step: string };
            if (data) setAiProgress(data);
        });

        try {
            const res = await window.electron.getAiPrediction(insightsData.home.id, insightsData.away.id, insightsData.odds) as any;
            if (res?.success && res?.text) {
                setAiAnalysis(res.text.replace(/<think>[\s\S]*?<\/think>/, '').trim());
            } else if (res?.error) {
                setAiError(res.error);
            }
        } catch (err) {
            setAiError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            unsub();
            setLoadingAi(false);
            setAiProgress(null);
        }
    };

    useEffect(() => {
        if (insightsOpen && window.electron) checkOllama();
    }, [insightsOpen]);

    useEffect(() => {
        if (league && window.electron) {
            window.electron.getSetupStatus().then((s: any) => { if (s?.setupComplete) setSetupComplete(true); }).catch(() => {});
        }
    }, [league?.id]);

    const buildBracketFromTeams = (teams: any[]) => {
        const sorted = [...teams].sort((a: any, b: any) => (b.points ?? 0) - (a.points ?? 0));
        const top8 = sorted.slice(0, 8);
        const playoffTeams = sorted.slice(8, 24);

        const playoffs: any[] = [];
        for (let i = 0; i < 8; i++) {
            playoffs.push({
                id: `playoff-${i}`,
                home: playoffTeams[i] || null,
                away: playoffTeams[15 - i] || null,
                homeScore: null,
                awayScore: null,
                round: 'Playoff',
                twoLegged: true
            });
        }

        const r16: any[] = [];
        for (let i = 0; i < 8; i++) {
            r16.push({
                id: `r16-${i}`,
                home: top8[i] || null,
                away: null,
                homeScore: null,
                awayScore: null,
                round: 'R16'
            });
        }

        const qf = Array(4).fill(null).map((_, i) => ({
            id: `qf-${i}`, home: null, away: null, homeScore: null, awayScore: null, round: 'QF'
        }));
        const sf = Array(2).fill(null).map((_, i) => (
            { id: `sf-${i}`, home: null, away: null, homeScore: null, awayScore: null, round: 'SF' }
        ));
        const final = { id: 'final', home: null, away: null, homeScore: null, awayScore: null, round: 'Final' };

        return { playoffs, r16, qf, sf, final };
    };

    const mergeBracketFromDb = (base: any, db: any) => {
        const merge = (baseArr: any[], dbArr: any[]) => {
            if (!dbArr?.length) return baseArr;
            return baseArr.map((b, i) => {
                const d = dbArr[i];
                if (!d) return b;
                return {
                    ...b,
                    home: d.home ?? b.home,
                    away: d.away ?? b.away,
                    homeScore: d.homeScore ?? b.homeScore,
                    awayScore: d.awayScore ?? b.awayScore
                };
            });
        };
        return {
            playoffs: merge(base.playoffs ?? [], db.playoffs ?? []),
            r16: merge(base.r16 ?? [], db.r16 ?? []),
            qf: merge(base.qf ?? [], db.qf ?? []),
            sf: merge(base.sf ?? [], db.sf ?? []),
            final: db.final ? { ...base.final, ...db.final } : base.final
        };
    };

    const runSimulateRound = async () => {
        if (!window.electron || !league?.id || simulatingRound) return;
        setSimulatingRound(true);
        try {
            const lid = typeof league.id === 'string' ? parseInt(league.id, 10) : league.id;
            await window.electron?.simulateTournamentRound?.(lid);
            await loadData();
        } catch (err) {
            console.error('runSimulateRound error:', err);
        } finally {
            setSimulatingRound(false);
        }
    };

    if (loading) return <div className="p-10 text-slate-400 flex items-center gap-3"><RefreshCw className="animate-spin" size={18} /> Loading...</div>;
    if (noElectron) return <div className="p-10 text-slate-400">Run BetBrain in Electron to use this feature.</div>;
    if (!league) return <div className="p-10 text-slate-400">Tournament not found</div>;

    const sortedTeams = [...(league.teams || [])].sort((a: any, b: any) => (b.points ?? 0) - (a.points ?? 0));

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-screen relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <a href="/football" className="inline-flex items-center gap-2 text-slate-500 hover:text-white mb-2 transition-colors text-xs uppercase tracking-widest font-bold">
                        <ArrowLeft size={12} /> Return to Leagues
                    </a>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight flex items-center gap-3">
                        <Trophy className="text-amber-400" size={36} />
                        {league.name}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-black/40 rounded-xl p-1 text-sm border border-white/5 backdrop-blur-md">
                        <button onClick={() => setActiveTab('league')} className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${activeTab === 'league' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                            <Trophy size={16} /> League Phase
                        </button>
                        <button onClick={() => setActiveTab('fixtures')} className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${activeTab === 'fixtures' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                            <Calendar size={16} /> Fixtures
                        </button>
                        <button onClick={() => setActiveTab('bracket')} className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${activeTab === 'bracket' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                            <Play size={16} /> Bracket
                        </button>
                    </div>
                </div>
            </div>

            {activeTab === 'league' && (
                <div className="glass-card overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-4 border-b border-white/5">
                        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            <Trophy size={14} className="text-amber-400" /> League Phase Standings
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">Top 24 qualify for knockout phase</p>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="w-10">#</th>
                                <th>Team</th>
                                <th className="text-center">P</th>
                                <th className="text-center">W</th>
                                <th className="text-center">D</th>
                                <th className="text-center">L</th>
                                <th className="text-center">GD</th>
                                <th className="text-center">Pts</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTeams.map((t: any, idx: number) => {
                                const gd = (t.stats?.gf || 0) - (t.stats?.ga || 0);
                                const inTop24 = idx < 24;
                                return (
                                    <tr key={t.id} className={inTop24 ? 'bg-emerald-500/5' : ''}>
                                        <td className="text-slate-500 font-mono">{idx + 1}</td>
                                        <td className="font-semibold flex items-center gap-3">
                                            <div className="w-6 h-6 bg-slate-700 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {t.logo ? <img src={t.logo} className="object-contain w-5 h-5" alt="" /> : <span className="text-xs">⚽</span>}
                                            </div>
                                            <a href={`/football/team/${t.id}`} className="text-slate-100 truncate hover:text-emerald-400 hover:underline decoration-emerald-500/50 underline-offset-4 transition-all">
                                                {t.short_name || t.name}
                                            </a>
                                        </td>
                                        <td className="text-center text-slate-400 font-mono">{t.stats?.played || 0}</td>
                                        <td className="text-center text-slate-400 font-mono">{t.stats?.wins || 0}</td>
                                        <td className="text-center text-slate-400 font-mono">{t.stats?.draws || 0}</td>
                                        <td className="text-center text-slate-400 font-mono">{t.stats?.losses || 0}</td>
                                        <td className={`text-center font-mono font-medium ${gd > 0 ? 'text-emerald-400' : gd < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                            {gd > 0 ? `+${gd}` : gd}
                                        </td>
                                        <td className="text-center font-bold text-white font-mono">{t.points ?? 0}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'fixtures' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <button onClick={() => goToMatchday(currentMatchday - 1)} disabled={currentMatchday <= minMatchday} className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                <ChevronLeft size={18} />
                            </button>
                            <div className="text-center px-4 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700">
                                <div className="text-xs text-slate-400 uppercase tracking-wider">Matchday</div>
                                <div className="text-lg font-bold text-white">{currentMatchday}</div>
                            </div>
                            <button onClick={() => goToMatchday(currentMatchday + 1)} disabled={currentMatchday >= maxMatchday} className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                <ChevronRight size={18} />
                            </button>
                        </div>
                        <button onClick={runSimulateMatchday} disabled={simulating} className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 rounded-xl font-bold text-white text-sm shadow-lg shadow-amber-900/20 transition-all disabled:opacity-50 flex items-center gap-2 border border-amber-500/20">
                            {simulating ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
                            {simulating ? 'Simulating...' : 'Simulate Matchday'}
                        </button>
                    </div>
                    {loadingFixtures ? (
                        <div className="glass-card p-12 text-center text-slate-400">
                            <RefreshCw className="animate-spin mx-auto mb-3" size={28} />
                            <p>Loading fixtures...</p>
                        </div>
                    ) : fixtures.length === 0 ? (
                        <div className="glass-card p-8 text-center text-slate-400">
                            <Calendar size={32} className="mx-auto mb-3 opacity-50" />
                            <p className="font-medium">No fixtures for matchday {currentMatchday}</p>
                            <p className="text-sm mt-1">Run <code className="bg-slate-800 px-2 py-0.5 rounded">npm run update-data</code> to fetch fixtures from the API.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {fixtures.map((f, i) => (
                                <div key={f.id ?? i} className="glass-card p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className="w-7 h-7 bg-slate-700 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {f.home.logo ? <img src={f.home.logo} className="object-contain w-5 h-5" alt="" /> : <span className="text-xs">⚽</span>}
                                            </div>
                                            {f.home.id ? <a href={`/football/team/${f.home.id}`} className="font-semibold text-white text-sm truncate hover:text-emerald-400 transition-colors">{f.home.short_name || f.home.name}</a> : <span className="font-semibold text-white text-sm truncate">{f.home.short_name || f.home.name}</span>}
                                        </div>
                                        {(f.homeScore !== null && f.awayScore !== null) ? <span className="font-mono font-bold text-white mx-3">{f.homeScore} – {f.awayScore}</span> : <span className="text-slate-600 text-xs mx-2 flex-shrink-0">vs</span>}
                                        <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                                            {f.away.id ? <a href={`/football/team/${f.away.id}`} className="font-semibold text-white text-sm truncate hover:text-emerald-400 transition-colors">{f.away.short_name || f.away.name}</a> : <span className="font-semibold text-white text-sm truncate">{f.away.short_name || f.away.name}</span>}
                                            <div className="w-7 h-7 bg-slate-700 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {f.away.logo ? <img src={f.away.logo} className="object-contain w-5 h-5" alt="" /> : <span className="text-xs">⚽</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500 mb-3">{f.date}</div>
                                    {(f.homeScore !== null && f.awayScore !== null) ? null : (
                                        <div className="space-y-2">
                                            {f.odds ? (
                                                <div>
                                                    <div className="flex justify-between text-xs mb-1 font-mono">
                                                        <span className="text-emerald-400 flex items-center gap-1"><TrendingUp size={11} /> H: {f.odds.homeWinProb}%</span>
                                                        <span className="text-slate-400 flex items-center gap-1"><Minus size={11} /> D: {f.odds.drawProb}%</span>
                                                        <span className="text-rose-400 flex items-center gap-1"><TrendingDown size={11} /> A: {f.odds.awayWinProb}%</span>
                                                    </div>
                                                    <div className="h-1.5 rounded-full flex overflow-hidden bg-slate-700">
                                                        <div className="bg-emerald-500" style={{ width: `${f.odds.homeWinProb}%` }}></div>
                                                        <div className="bg-slate-500" style={{ width: `${f.odds.drawProb}%` }}></div>
                                                        <div className="bg-rose-500" style={{ width: `${f.odds.awayWinProb}%` }}></div>
                                                    </div>
                                                    <button onClick={() => openInsights(f.home, f.away)} className="mt-2 w-full text-xs text-sky-400 hover:text-sky-300 flex items-center justify-center gap-1.5 py-1.5 rounded border border-slate-700 hover:border-sky-500/50 transition-all">
                                                        <BarChart3 size={12} /> View Insights
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => predictMatch(i, f.home.id, f.away.id)} disabled={f.loadingOdds || !f.home.id || !f.away.id} className="w-full h-8 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center justify-center gap-2 text-xs font-medium text-slate-300 transition-all disabled:opacity-70">
                                                    {f.loadingOdds ? <><RefreshCw className="animate-spin text-emerald-400" size={14} /> Simulating 1000 Matches...</> : <><Activity size={14} className="text-purple-400" /> Simulate Prediction (1000 Runs)</>}
                                                </button>
                                            )}
                                            <button onClick={() => simulateSingleMatch(i, f.id)} disabled={f.simulating || !f.id || f.homeScore !== null} className="w-full h-8 bg-amber-600/80 hover:bg-amber-500 rounded border border-amber-500/50 flex items-center justify-center gap-2 text-xs font-bold text-white transition-all disabled:opacity-50">
                                                {f.simulating ? <RefreshCw className="animate-spin" size={14} /> : <Play size={14} fill="currentColor" />}
                                                {f.simulating ? 'Simulating...' : 'Simulate Match'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'bracket' && bracket && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="overflow-x-auto pb-8 -mx-4 px-4">
                        <div className="inline-flex items-center justify-center gap-6 lg:gap-8 min-w-max py-8">
                            <div className="flex items-center gap-6 lg:gap-8">
                                <BracketColumn label="Playoffs" matches={bracket.playoffs?.slice(0, 4) ?? []} matchGap="gap-4" compact twoLegged />
                                <div className="w-px self-stretch min-h-[180px] bg-gradient-to-b from-transparent via-slate-600/50 to-transparent" />
                                <BracketColumn label="Round of 16" matches={bracket.r16.slice(0, 4)} matchGap="gap-4" compact />
                                <div className="w-px self-stretch min-h-[180px] bg-gradient-to-b from-transparent via-slate-600/50 to-transparent" />
                                <BracketColumn label="Quarter-finals" matches={bracket.qf.slice(0, 2)} matchGap="gap-16" />
                                <div className="w-px self-stretch min-h-[180px] bg-gradient-to-b from-transparent via-slate-600/50 to-transparent" />
                                <BracketColumn label="Semi-finals" matches={bracket.sf.slice(0, 1)} />
                            </div>
                            <div className="flex flex-col items-center shrink-0 px-8 py-6 rounded-2xl bg-slate-800/80 border-2 border-amber-500/40 shadow-xl shadow-amber-900/20">
                                <Trophy size={44} className="text-amber-400 mb-2" />
                                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-4">Final</span>
                                <BracketMatch match={bracket.final} />
                            </div>
                            <div className="flex items-center gap-6 lg:gap-8">
                                <BracketColumn label="Semi-finals" matches={bracket.sf.slice(1, 2)} />
                                <div className="w-px self-stretch min-h-[180px] bg-gradient-to-b from-transparent via-slate-600/50 to-transparent" />
                                <BracketColumn label="Quarter-finals" matches={bracket.qf.slice(2, 4)} matchGap="gap-16" />
                                <div className="w-px self-stretch min-h-[180px] bg-gradient-to-b from-transparent via-slate-600/50 to-transparent" />
                                <BracketColumn label="Round of 16" matches={bracket.r16.slice(4, 8)} matchGap="gap-4" compact />
                                <div className="w-px self-stretch min-h-[180px] bg-gradient-to-b from-transparent via-slate-600/50 to-transparent" />
                                <BracketColumn label="Playoffs" matches={bracket.playoffs?.slice(4, 8) ?? []} matchGap="gap-4" compact twoLegged />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-center mt-10">
                        <button onClick={runSimulateRound} disabled={simulatingRound} className="px-8 py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 rounded-xl font-bold text-white shadow-lg shadow-amber-900/40 transition-all flex items-center gap-2 border border-amber-500/30 disabled:opacity-50">
                            {simulatingRound ? <RefreshCw className="animate-spin" size={20} /> : <Play size={20} fill="currentColor" />}
                            {simulatingRound ? 'Simulating...' : 'Simulate Next Round'}
                        </button>
                    </div>
                </div>
            )}

            {insightsOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end" onClick={() => setInsightsOpen(false)}>
                    <div className="w-full max-w-md bg-slate-900 border-l border-slate-700 h-full overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                Match Insights
                                {aiAnalysis && <Sparkles size={16} className="text-purple-400 animate-pulse" />}
                            </h2>
                            <button onClick={() => setInsightsOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        {loadingInsights ? (
                            <div className="flex items-center justify-center py-20 text-slate-400"><RefreshCw className="animate-spin" size={24} /></div>
                        ) : insightsData ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between text-center">
                                    <div className="flex-1"><p className="font-bold text-white">{insightsData.home?.name}</p><p className="text-xs text-slate-500">Form: {insightsData.home?.formFactor != null ? (insightsData.home.formFactor * 100 - 100).toFixed(0) : '-'}%</p></div>
                                    <span className="text-slate-600 px-4">vs</span>
                                    <div className="flex-1"><p className="font-bold text-white">{insightsData.away?.name}</p><p className="text-xs text-slate-500">Form: {insightsData.away?.formFactor != null ? (insightsData.away.formFactor * 100 - 100).toFixed(0) : '-'}%</p></div>
                                </div>
                                {insightsData.odds && (
                                    <div className="glass-panel p-4">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Activity size={14} /> Monte-Carlo Simulation</h3>
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div><p className={`text-2xl font-bold font-mono ${insightsData.odds.homeWinProb > 60 ? 'text-emerald-400' : 'text-slate-200'}`}>{insightsData.odds.homeWinProb}%</p><p className="text-xs text-slate-500">Home Win</p></div>
                                            <div><p className="text-2xl font-bold text-slate-400 font-mono">{insightsData.odds.drawProb}%</p><p className="text-xs text-slate-500">Draw</p></div>
                                            <div><p className={`text-2xl font-bold font-mono ${insightsData.odds.awayWinProb > 60 ? 'text-emerald-400' : 'text-slate-200'}`}>{insightsData.odds.awayWinProb}%</p><p className="text-xs text-slate-500">Away Win</p></div>
                                        </div>
                                    </div>
                                )}
                                {insightsData.home?.form && insightsData.away?.form && (
                                    <div className="glass-panel p-4">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Form</h3>
                                        <div className="flex justify-between gap-4">
                                            <div className="flex gap-1.5">{insightsData.home.form.map((r: string, j: number) => <FormDot key={j} result={r} />)}</div>
                                            <div className="flex gap-1.5">{insightsData.away.form.map((r: string, j: number) => <FormDot key={j} result={r} />)}</div>
                                        </div>
                                    </div>
                                )}
                                <div className="glass-panel p-4 border-t border-purple-500/30 bg-gradient-to-br from-slate-900 to-purple-900/20">
                                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2"><Sparkles size={14} className="text-purple-400" /> AI Analyst</h3>
                                    {aiError && !loadingAi && (
                                        <div className="mb-4 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
                                            <AlertCircle className="text-rose-400 flex-shrink-0 mt-0.5" size={18} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-rose-200">{aiError}</p>
                                                <button onClick={() => { setAiError(null); askAi(); }} className="mt-3 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded transition-colors flex items-center gap-2">
                                                    <RefreshCw size={12} /> Retry
                                                </button>
                                            </div>
                                            <button onClick={() => setAiError(null)} className="text-slate-500 hover:text-slate-300 p-1" aria-label="Dismiss"><X size={16} /></button>
                                        </div>
                                    )}
                                    {!aiAnalysis && !loadingAi && (
                                        <button onClick={askAi} disabled={ollamaStatus !== 'ready'} className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg font-bold text-white text-sm flex items-center justify-center gap-2">
                                            <BrainCircuit size={16} /> {ollamaStatus === 'ready' ? 'Get AI Prediction' : `Ollama: ${ollamaStatus}`}
                                        </button>
                                    )}
                                    {loadingAi && (
                                        <div className="py-4 flex flex-col items-center gap-3">
                                            <RefreshCw className="animate-spin text-purple-400" size={24} />
                                            <div className="w-full space-y-2">
                                                <p className="text-xs font-mono text-slate-400 text-center">{aiProgress?.step || 'Analysing...'}</p>
                                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-500" style={{ width: `${aiProgress?.progress ?? 0}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {aiAnalysis && <div className="text-slate-300 text-sm whitespace-pre-wrap">{aiAnalysis}</div>}
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-500 text-center py-8">No insights data</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
