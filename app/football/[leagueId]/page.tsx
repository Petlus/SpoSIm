'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play, BarChart3, TrendingUp, TrendingDown, Minus, RefreshCw, X, Activity, AlertTriangle, Trophy, ChevronLeft, ChevronRight, Calendar, Sparkles, BrainCircuit } from 'lucide-react';

// Form Dot Component
const FormDot = ({ result }: { result: string }) => {
    const colors: Record<string, string> = {
        W: 'bg-emerald-500',
        D: 'bg-slate-500',
        L: 'bg-rose-500'
    };
    return <div className={`w-2 h-2 rounded-full ${colors[result] || 'bg-slate-700'}`} title={result} />;
};

// Power Rating calculation
const calcPowerRating = (team: any) => {
    if (!team.stats || team.stats.played === 0) return 50;
    const gpg = team.stats.gf / team.stats.played;
    const gapg = team.stats.ga / team.stats.played;
    const ppg = team.points / team.stats.played;
    return Math.round((ppg * 20) + (gpg * 10) - (gapg * 5) + 30);
};

export default function LeaguePage() {
    const { leagueId } = useParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [simulating, setSimulating] = useState(false);
    const [activeTab, setActiveTab] = useState<'standings' | 'fixtures'>('standings');
    const [activeGroup, setActiveGroup] = useState<string | null>(null);
    const [fixtures, setFixtures] = useState<any[]>([]);
    const [loadingOdds, setLoadingOdds] = useState(false);

    // Matchday navigation state
    const [currentMatchday, setCurrentMatchday] = useState(1);
    const [minMatchday, setMinMatchday] = useState(1);
    const [maxMatchday, setMaxMatchday] = useState(34);

    // Insights Panel State
    const [insightsOpen, setInsightsOpen] = useState(false);
    const [insightsData, setInsightsData] = useState<any>(null);
    const [loadingInsights, setLoadingInsights] = useState(false);

    // AI State
    const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'unknown' | 'not_installed' | 'offline' | 'ready'>('checking');
    const [downloadUrl, setDownloadUrl] = useState('');
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [thoughtProcess, setThoughtProcess] = useState<string | null>(null);
    const [loadingAi, setLoadingAi] = useState(false);
    const [typewriterText, setTypewriterText] = useState('');
    const [setupComplete, setSetupComplete] = useState(false);

    useEffect(() => {
        if (leagueId) loadData();
    }, [leagueId]);

    const loadData = async () => {
        // @ts-ignore
        // @ts-ignore
        if (window.electron) {
            // Check persistence for AI Lock
            // @ts-ignore
            window.electron.getSetupStatus().then(settings => {
                if (settings && settings.setupComplete) setSetupComplete(true);
            });

            // @ts-ignore
            const res = await window.electron.getData('football');
            const league = res.leagues.find((l: any) => l.id.toString() === leagueId);
            if (league) {
                const firstGroup = league.teams.length > 0 ? (league.teams[0].group || 'League') : 'League';
                if (!activeGroup) setActiveGroup(firstGroup);
                league.teams.sort((a: any, b: any) => b.points - a.points);
                setData(league);
                loadFixtures(leagueId as string);
            }
            setLoading(false);
        }
    }

    const loadFixtures = async (leagueId: string, matchday?: number) => {
        setLoadingOdds(false);
        setFixtures([]);
        // @ts-ignore
        if (window.electron) {
            // @ts-ignore
            const result = await window.electron.getFixtures(parseInt(leagueId), matchday);

            // Update matchday state
            setCurrentMatchday(result.currentMatchday);
            setMinMatchday(result.minMatchday);
            setMaxMatchday(result.maxMatchday);

            // Format fixtures
            const formattedFixtures = result.matches.map((fix: any) => ({
                home: fix.home,
                away: fix.away,
                matchday: fix.matchday,
                date: fix.date ? new Date(fix.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'TBD',
                odds: null,
                loadingOdds: false
            }));
            setFixtures(formattedFixtures);
        }
    };

    const predictMatch = async (index: number, homeId: number, awayId: number) => {
        const newFixtures = [...fixtures];
        // @ts-ignore
        newFixtures[index].loadingOdds = true;
        setFixtures([...newFixtures]);

        // @ts-ignore
        if (window.electron) {
            // Artificial delay for UX
            await new Promise(r => setTimeout(r, 600));
            // @ts-ignore
            const odds = await window.electron.getMatchOdds(homeId, awayId);
            // @ts-ignore
            newFixtures[index].odds = odds;
        }
        // @ts-ignore
        newFixtures[index].loadingOdds = false;
        setFixtures([...newFixtures]);
    };

    const goToMatchday = (day: number) => {
        if (day >= minMatchday && day <= maxMatchday && leagueId) {
            loadFixtures(leagueId as string, day);
        }
    };

    const openInsights = async (home: any, away: any) => {
        setInsightsOpen(true);
        setLoadingInsights(true);
        // @ts-ignore
        if (window.electron) {
            // @ts-ignore
            const data = await window.electron.getAdvancedAnalysis(home.id, away.id);
            setInsightsData(data);
        }
        setLoadingInsights(false);
    };

    const simulateMatchday = async () => {
        setSimulating(true);
        // @ts-ignore
        await window.electron.simulateMatchday(leagueId);
        setTimeout(() => { loadData(); setSimulating(false); }, 800);
    };

    // Typewriter effect
    useEffect(() => {
        if (!aiAnalysis) {
            setTypewriterText('');
            return;
        }
        let i = 0;
        const interval = setInterval(() => {
            setTypewriterText(aiAnalysis.substring(0, i));
            i++;
            if (i > aiAnalysis.length) clearInterval(interval);
        }, 15); // Speed
        return () => clearInterval(interval);
    }, [aiAnalysis]);

    const checkOllama = async () => {
        setOllamaStatus('checking');
        try {
            // Race against a frontend timeout in case IPC hangs
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000));
            // @ts-ignore
            const result = await Promise.race([window.electron.checkOllamaStatus(), timeoutPromise]);

            if (!result.installed) {
                setOllamaStatus('not_installed');
                setDownloadUrl(result.downloadUrl || 'https://ollama.com');
            } else if (!result.running) {
                setOllamaStatus('offline');
            } else {
                setOllamaStatus('ready');
            }
        } catch (error) {
            console.error("Ollama Check Failed:", error);
            // Fallback: Assume offline or not installed if it fails, don't leave hanging
            setOllamaStatus('unknown'); // Or 'offline' to show start button at least
        }
    };

    const startOllamaService = async () => {
        setLoadingAi(true);
        // @ts-ignore
        await window.electron.startOllama();
        // Check again after a delay
        setTimeout(async () => {
            await checkOllama();
            setLoadingAi(false);
        }, 3000);
    };

    const askAi = async () => {
        if (!insightsData) return;
        setLoadingAi(true);
        setAiAnalysis(null);

        // @ts-ignore
        const res = await window.electron.getAiPrediction(
            insightsData.home.id,
            insightsData.away.id,
            insightsData.odds // Pass the Odds!
        );

        setLoadingAi(false);
        if (res.success) {
            // Parse <think> tags
            const thinkMatch = res.text.match(/<think>([\s\S]*?)<\/think>/);
            const thought = thinkMatch ? thinkMatch[1].trim() : null;
            const cleanText = res.text.replace(/<think>[\s\S]*?<\/think>/, '').trim();

            setAiAnalysis(cleanText);
            setThoughtProcess(thought);
        } else {
            setAiAnalysis(`Error: ${res.error || "Unknown AI Error. Check Console."}`);
        }
    };

    if (loading) return <div className="p-10 text-slate-400 flex items-center gap-3"><RefreshCw className="animate-spin" size={18} /> Loading...</div>;
    if (!data) return <div className="p-10 text-slate-400">League not found</div>;

    const uniqueGroups = Array.from(new Set(data.teams.map((t: any) => t.group || 'League')));
    const filteredTeams = data.teams.filter((t: any) => (t.group || 'League') === activeGroup);

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-screen relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <Link href="/football" className="inline-flex items-center gap-2 text-slate-500 hover:text-white mb-1 transition-colors text-sm">
                        <ArrowLeft size={14} /> Back
                    </Link>
                    <h1 className="text-3xl font-bold text-white">{data.name}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-800/50 rounded-lg p-1 text-sm border border-slate-700/50">
                        <button onClick={() => setActiveTab('standings')} className={`px-4 py-1.5 rounded-md font-medium transition-all ${activeTab === 'standings' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Standings</button>
                        <button onClick={() => setActiveTab('fixtures')} className={`px-4 py-1.5 rounded-md font-medium transition-all ${activeTab === 'fixtures' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Fixtures</button>
                    </div>
                    <button onClick={simulateMatchday} disabled={simulating} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold text-white text-sm shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50 flex items-center gap-2">
                        {simulating ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} fill="currentColor" />}
                        {simulating ? 'Simulating...' : 'Simulate'}
                    </button>
                </div>
            </div>

            {/* Group Tabs */}
            {uniqueGroups.length > 1 && activeTab === 'standings' && (
                <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
                    {uniqueGroups.map((g: any) => (
                        <button key={g} onClick={() => setActiveGroup(g)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeGroup === g ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'}`}>
                            {g}
                        </button>
                    ))}
                </div>
            )}

            {/* Standings Table */}
            {activeTab === 'standings' && (
                <div className="glass-card overflow-hidden">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="w-10">#</th>
                                <th>Team</th>
                                <th className="text-center w-24">Form</th>
                                <th className="text-center">MP</th>
                                <th className="text-center">W</th>
                                <th className="text-center">D</th>
                                <th className="text-center">L</th>
                                <th className="text-center">GD</th>
                                <th className="text-center">Pts</th>
                                <th className="text-center">PWR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTeams.map((team: any, index: number) => {
                                const pwr = calcPowerRating(team);
                                const gd = (team.stats?.gf || 0) - (team.stats?.ga || 0);
                                return (
                                    <tr key={team.id}>
                                        <td className="text-slate-500 font-mono">{index + 1}</td>
                                        <td className="font-semibold flex items-center gap-3">
                                            <div className="w-6 h-6 bg-slate-700 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {team.logo ? <img src={team.logo} className="object-contain w-5 h-5" alt="" /> : <span className="text-xs">⚽</span>}
                                            </div>
                                            <Link href={`/football/team/${team.id}`} className="text-slate-100 truncate hover:text-emerald-400 hover:underline decoration-emerald-500/50 underline-offset-4 transition-all">
                                                {team.name}
                                            </Link>
                                        </td>
                                        <td className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {(team.form || []).slice(0, 5).map((r: string, i: number) => <FormDot key={i} result={r} />)}
                                                {(!team.form || team.form.length === 0) && <span className="text-slate-600 text-xs">-</span>}
                                            </div>
                                        </td>
                                        <td className="text-center text-slate-400 font-mono">{team.stats?.played || 0}</td>
                                        <td className="text-center text-slate-400 font-mono">{team.stats?.wins || 0}</td>
                                        <td className="text-center text-slate-400 font-mono">{team.stats?.draws || 0}</td>
                                        <td className="text-center text-slate-400 font-mono">{team.stats?.losses || 0}</td>
                                        <td className={`text-center font-mono font-medium ${gd > 0 ? 'text-emerald-400' : gd < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                            {gd > 0 ? `+${gd}` : gd}
                                        </td>
                                        <td className="text-center font-bold text-white font-mono">{team.points}</td>
                                        <td className="text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold font-mono ${pwr >= 70 ? 'bg-emerald-500/20 text-emerald-400' : pwr >= 50 ? 'bg-sky-500/20 text-sky-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                {pwr}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Fixtures Tab */}
            {activeTab === 'fixtures' && (
                <div className="space-y-4">
                    {/* Matchday Navigation */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => goToMatchday(currentMatchday - 1)}
                                disabled={currentMatchday <= minMatchday}
                                className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="text-center px-4 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700">
                                <div className="text-xs text-slate-400 uppercase tracking-wider">Matchday</div>
                                <div className="text-lg font-bold text-white">{currentMatchday}</div>
                            </div>
                            <button
                                onClick={() => goToMatchday(currentMatchday + 1)}
                                disabled={currentMatchday >= maxMatchday}
                                className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-400">
                            <span className="flex items-center gap-1.5">
                                <Calendar size={14} />
                                Monte-Carlo Odds (1000 Runs)
                            </span>
                            {loadingOdds && <span className="flex items-center gap-2"><RefreshCw className="animate-spin" size={14} /> Calculating...</span>}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {fixtures.map((f, i) => (
                            <div key={i} className="glass-card p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className="w-7 h-7 bg-slate-700 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {f.home.logo ? <img src={f.home.logo} className="object-contain w-5 h-5" alt="" /> : <span className="text-xs">⚽</span>}
                                        </div>
                                        <Link href={`/football/team/${f.home.id}`} className="font-semibold text-white text-sm truncate hover:text-emerald-400 transition-colors">
                                            {f.home.short_name || f.home.name}
                                        </Link>
                                    </div>
                                    <span className="text-slate-600 text-xs mx-2 flex-shrink-0">vs</span>
                                    <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                                        <Link href={`/football/team/${f.away.id}`} className="font-semibold text-white text-sm truncate hover:text-emerald-400 transition-colors">
                                            {f.away.short_name || f.away.name}
                                        </Link>
                                        <div className="w-7 h-7 bg-slate-700 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {f.away.logo ? <img src={f.away.logo} className="object-contain w-5 h-5" alt="" /> : <span className="text-xs">⚽</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Probability Bar */}
                                {f.odds ? (
                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5 font-mono">
                                            <span className="text-emerald-400 flex items-center gap-1"><TrendingUp size={11} /> H: {f.odds.homeWinProb}%</span>
                                            <span className="text-slate-400 flex items-center gap-1"><Minus size={11} /> D: {f.odds.drawProb}%</span>
                                            <span className="text-rose-400 flex items-center gap-1"><TrendingDown size={11} /> A: {f.odds.awayWinProb}%</span>
                                        </div>
                                        <div className="h-1.5 rounded-full flex overflow-hidden bg-slate-700">
                                            <div className="bg-emerald-500" style={{ width: `${f.odds.homeWinProb}%` }}></div>
                                            <div className="bg-slate-500" style={{ width: `${f.odds.drawProb}%` }}></div>
                                            <div className="bg-rose-500" style={{ width: `${f.odds.awayWinProb}%` }}></div>
                                        </div>
                                        <button onClick={() => openInsights(f.home, f.away)} className="mt-3 w-full text-xs text-sky-400 hover:text-sky-300 flex items-center justify-center gap-1.5 py-1.5 rounded border border-slate-700 hover:border-sky-500/50 transition-all">
                                            <BarChart3 size={12} /> View Insights
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => predictMatch(i, f.home.id, f.away.id)}
                                        disabled={f.loadingOdds}
                                        className="w-full h-8 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center justify-center gap-2 text-xs font-medium text-slate-300 transition-all disabled:opacity-70"
                                    >
                                        {f.loadingOdds ? (
                                            <>
                                                <RefreshCw className="animate-spin text-emerald-400" size={14} />
                                                <span className="text-emerald-400">Simulating 1000 Matches...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Activity size={14} className="text-purple-400" />
                                                Simulate Prediction (1000 Runs)
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Insights Side Panel */}
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
                                {/* Teams Header */}
                                <div className="flex items-center justify-between text-center">
                                    <div className="flex-1"><p className="font-bold text-white">{insightsData.home.name}</p><p className="text-xs text-slate-500">Form: {(insightsData.home.formFactor * 100 - 100).toFixed(0)}%</p></div>
                                    <span className="text-slate-600 px-4">vs</span>
                                    <div className="flex-1"><p className="font-bold text-white">{insightsData.away.name}</p><p className="text-xs text-slate-500">Form: {(insightsData.away.formFactor * 100 - 100).toFixed(0)}%</p></div>
                                </div>

                                {/* Monte-Carlo Odds */}
                                <div className="glass-panel p-4">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Activity size={14} /> Monte-Carlo Simulation</h3>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <p className={`text-2xl font-bold font-mono ${insightsData.odds.homeWinProb > 60 ? 'text-emerald-400' : 'text-slate-200'}`}>{insightsData.odds.homeWinProb}%</p>
                                            <p className="text-xs text-slate-500">Home Win</p>
                                        </div>
                                        <div><p className="text-2xl font-bold text-slate-400 font-mono">{insightsData.odds.drawProb}%</p><p className="text-xs text-slate-500">Draw</p></div>
                                        <div>
                                            <p className={`text-2xl font-bold font-mono ${insightsData.odds.awayWinProb > 60 ? 'text-emerald-400' : 'text-slate-200'}`}>{insightsData.odds.awayWinProb}%</p>
                                            <p className="text-xs text-slate-500">Away Win</p>
                                        </div>
                                    </div>

                                    {/* Value-Bet Detector */}
                                    {/* Logic: If Win Prob > 70% BUT team has fewer points/weaker strength -> Value Alert */}
                                    {((insightsData.odds.homeWinProb > 70 && insightsData.home.formFactor < insightsData.away.formFactor) ||
                                        (insightsData.odds.awayWinProb > 70 && insightsData.away.formFactor < insightsData.home.formFactor)) && (
                                            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded flex items-center gap-3">
                                                <AlertTriangle className="text-amber-400 shrink-0 animate-pulse" size={20} />
                                                <div>
                                                    <p className="text-amber-400 font-bold text-sm uppercase tracking-wide">Value Alert!</p>
                                                    <p className="text-amber-100/70 text-xs">Simulation identifies high probability for specific outcome despite table standings.</p>
                                                </div>
                                            </div>
                                        )}
                                </div>

                                {/* Form */}
                                <div className="glass-panel p-4">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Form (Last 5)</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex gap-1.5">{insightsData.home.form.map((r: string, i: number) => <FormDot key={i} result={r} />)}</div>
                                        <div className="flex gap-1.5 justify-end">{insightsData.away.form.map((r: string, i: number) => <FormDot key={i} result={r} />)}</div>
                                    </div>
                                </div>

                                {/* Top Scorers */}
                                <div className="glass-panel p-4">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Trophy size={14} /> Top Scorers</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>{insightsData.home.scorers.length > 0 ? insightsData.home.scorers.map((s: any) => <p key={s.name} className="text-slate-300">{s.name} <span className="text-emerald-400 font-mono">({s.goals})</span></p>) : <p className="text-slate-600">No data</p>}</div>
                                        <div className="text-right">{insightsData.away.scorers.length > 0 ? insightsData.away.scorers.map((s: any) => <p key={s.name} className="text-slate-300"><span className="text-emerald-400 font-mono">({s.goals})</span> {s.name}</p>) : <p className="text-slate-600">No data</p>}</div>
                                    </div>
                                </div>

                                {/* Injuries */}
                                <div className="glass-panel p-4">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><AlertTriangle size={14} className="text-rose-400" /> Injuries</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>{insightsData.home.injuries.length > 0 ? insightsData.home.injuries.map((p: any) => <p key={p.name} className="text-rose-400">{p.name} <span className="text-slate-500">({p.position})</span></p>) : <p className="text-slate-600">None</p>}</div>
                                        <div className="text-right">{insightsData.away.injuries.length > 0 ? insightsData.away.injuries.map((p: any) => <p key={p.name} className="text-rose-400"><span className="text-slate-500">({p.position})</span> {p.name}</p>) : <p className="text-slate-600">None</p>}</div>
                                    </div>
                                </div>

                                {/* H2H */}
                                <div className="glass-panel p-4">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Head-to-Head</h3>
                                    {insightsData.h2h.length > 0 ? (
                                        <div className="space-y-2 text-sm">
                                            {insightsData.h2h.map((m: any, i: number) => (
                                                <div key={i} className="flex justify-between text-slate-300">
                                                    <span>{m.home_team_id === insightsData.home.id ? insightsData.home.name : insightsData.away.name}</span>
                                                    <span className="font-mono font-bold">{m.home_score} - {m.away_score}</span>
                                                    <span>{m.away_team_id === insightsData.away.id ? insightsData.away.name : insightsData.home.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-slate-600">No previous meetings</p>}
                                </div>


                                {!setupComplete && (
                                    <div className="mb-4 bg-slate-950/50 border border-slate-800 rounded p-3 text-xs text-slate-400 flex items-center gap-2">
                                        <Activity size={12} className="text-amber-500" />
                                        <span>AI Analyst is setting up. Please check the Dashboard.</span>
                                    </div>
                                )}

                                {/* AI Analysis */}
                                <div className="glass-panel p-4 border-t border-purple-500/30 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-purple-900/20">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                                    <div className="flex items-center justify-between mb-3 relative z-10">
                                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                            <Sparkles size={14} className="text-purple-400" /> AI Analyst (Beta)
                                        </h3>

                                        {/* Status Aware Buttons */}
                                        {!aiAnalysis && !loadingAi && (
                                            <>
                                                {ollamaStatus === 'checking' && <span className="text-xs text-slate-500">Checking...</span>}

                                                {ollamaStatus === 'not_installed' && (
                                                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded flex items-center gap-1.5 transition-all">
                                                        <Activity size={14} /> Install Ollama
                                                    </a>
                                                )}

                                                {ollamaStatus === 'offline' && (
                                                    <button onClick={startOllamaService} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded flex items-center gap-1.5 transition-all">
                                                        <Activity size={14} /> Start Service
                                                    </button>
                                                )}

                                                {(ollamaStatus === 'ready' || ollamaStatus === 'unknown') && (
                                                    <button
                                                        onClick={askAi}
                                                        disabled={!setupComplete}
                                                        className={`px-3 py-1.5 text-xs font-bold rounded shadow-lg transition-all flex items-center gap-1.5 border ${setupComplete
                                                            ? 'bg-purple-600 hover:bg-purple-500 text-white hover:scale-105 active:scale-95 border-purple-500/20'
                                                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border-slate-700'
                                                            }`}
                                                    >
                                                        <BrainCircuit size={14} /> Analyze Match
                                                    </button>
                                                )}

                                                <button onClick={checkOllama} className="ml-2 text-slate-600 hover:text-slate-400" title="Check Status"><RefreshCw size={12} /></button>
                                            </>
                                        )}
                                    </div>

                                    {loadingAi && (
                                        <div className="p-6 text-center text-purple-300 flex flex-col items-center gap-3">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-purple-500/30 rounded-full animate-ping"></div>
                                                <BrainCircuit className="relative z-10 text-purple-400 animate-pulse" size={32} />
                                            </div>
                                            <span className="text-xs font-mono font-medium tracking-wide">Analysing & Reasoning...</span>
                                        </div>
                                    )}

                                    {aiAnalysis && (
                                        <div className="relative group">
                                            <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap bg-slate-900/40 backdrop-blur-md p-5 rounded-lg border border-purple-500/20 font-sans shadow-xl relative z-10">
                                                {/* Expert Badge */}
                                                <div className="absolute -top-3 -right-3 bg-purple-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-lg flex items-center gap-1 transform rotate-2">
                                                    <Trophy size={10} /> Certified
                                                </div>

                                                <div className="font-mono text-xs opacity-80 mb-2 text-purple-300 uppercase tracking-widest">Analyst Report</div>

                                                {/* Reasoning Box */}
                                                {thoughtProcess && (
                                                    <details className="mb-4 bg-slate-950/50 rounded border border-purple-500/10 overflow-hidden group/details">
                                                        <summary className="px-3 py-2 text-xs font-mono text-purple-400 cursor-pointer hover:bg-purple-500/10 transition-colors flex items-center gap-2 select-none">
                                                            <BrainCircuit size={12} />
                                                            <span>Show Analyst's Reasoning Process</span>
                                                            <span className="ml-auto opacity-50 group-open/details:rotate-180 transition-transform">▼</span>
                                                        </summary>
                                                        <div className="p-3 text-xs text-slate-400 font-mono whitespace-pre-wrap leading-relaxed border-t border-purple-500/10 bg-black/20">
                                                            {thoughtProcess}
                                                        </div>
                                                    </details>
                                                )}

                                                {typewriterText}
                                                <span className="animate-pulse inline-block w-1.5 h-3.5 bg-purple-500 ml-1 align-middle"></span>
                                            </div>

                                            {/* Value Alert Badge if High Value detected */}
                                            {(aiAnalysis.includes("Value-") || aiAnalysis.includes("Value ")) && (
                                                <div className="mt-2 flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded border border-amber-500/20 animate-pulse">
                                                    <Sparkles size={12} /> High Value Opportunity Detected
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
