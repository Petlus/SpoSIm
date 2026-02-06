'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Play, BarChart3, TrendingUp, TrendingDown, Minus, RefreshCw, X, Activity, AlertTriangle, Trophy, ChevronLeft, ChevronRight, Calendar, Sparkles, BrainCircuit, Target, AlertCircle, Globe, Clock, Zap } from 'lucide-react';
import type { EspnStandingEntry, EspnScore, EspnMatchSummary } from '../../../types/electron';

// Form Dot Component
const FormDot = ({ result }: { result: string }) => {
    const colors: Record<string, string> = {
        W: 'bg-emerald-500',
        D: 'bg-slate-500',
        L: 'bg-rose-500'
    };
    return <div className={`w-2 h-2 rounded-full ${colors[result] || 'bg-slate-700'}`} title={result} />;
};

// H2H Timeline: horizontal timeline of head-to-head matches
const H2HTimeline = ({ matches, homeName, awayName }: { matches: any[]; homeName: string; awayName: string }) => {
    const normalized = matches.map(m => {
        const date = m.date || m.played_at;
        const score = m.score ?? (m.home_score != null && m.away_score != null ? `${m.home_score} - ${m.away_score}` : '');
        return { date: date ? new Date(date).getTime() : 0, score, raw: m };
    }).filter(m => m.date > 0).sort((a, b) => a.date - b.date);
    if (normalized.length === 0) return null;
    const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' });
    const w = 100; const h = 24;
    const pad = 8;
    const xScale = (i: number) => pad + (i / (normalized.length - 1 || 1)) * (w - 2 * pad);
    return (
        <div className="relative">
            <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible" preserveAspectRatio="none">
                <line x1={pad} y1={h / 2} x2={w - pad} y2={h / 2} stroke="currentColor" strokeWidth={1} className="text-slate-600" />
                {normalized.map((m, i) => (
                    <g key={i}>
                        <circle cx={xScale(i)} cy={h / 2} r={4} className="fill-slate-600 stroke-slate-800 stroke-[2]" />
                        <title>{formatDate(m.date)} – {m.score}</title>
                    </g>
                ))}
            </svg>
            <div className="flex justify-between mt-2 gap-2 flex-wrap">
                {normalized.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs" title={formatDate(m.date)}>
                        <span className="text-slate-500 font-mono shrink-0">{formatDate(m.date)}</span>
                        <span className="text-slate-300 font-mono font-bold">{m.score}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Form Chart: cumulative points over last 5-10 games
const FormChart = ({ form, teamName, maxGames = 10 }: { form: string[] | string; teamName: string; maxGames?: number }) => {
    const arr = Array.isArray(form) ? form : (typeof form === 'string' ? form.split('') : []);
    const pts: Record<string, number> = { W: 3, D: 1, L: 0 };
    const points = arr.slice(-maxGames).map(r => pts[r] ?? 0);
    const cumulative = points.reduce<number[]>((acc, p) => [...acc, (acc[acc.length - 1] ?? 0) + p], []);
    if (cumulative.length === 0) return null;
    const w = 180; const h = 48; const pad = 4;
    const maxPts = Math.max(...cumulative, 1);
    const minPts = Math.min(...cumulative, 0);
    const range = maxPts - minPts || 1;
    const scaleY = (v: number) => h - pad - ((v - minPts) / range) * (h - 2 * pad);
    const scaleX = (i: number) => pad + (i / (cumulative.length - 1 || 1)) * (w - 2 * pad);
    const pathD = cumulative.map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(v)}`).join(' ');
    return (
        <div className="mt-2">
            <div className="text-[10px] text-slate-500 mb-1">{teamName} – Points trend</div>
            <svg width={w} height={h} className="overflow-visible">
                <path d={pathD} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-emerald-400" strokeLinecap="round" strokeLinejoin="round" />
                {cumulative.map((v, i) => (
                    <circle key={i} cx={scaleX(i)} cy={scaleY(v)} r={2.5} className="fill-emerald-400" />
                ))}
            </svg>
        </div>
    );
};

// Cup Bracket: knockout tree visualization
const ROUND_ORDER = ['First Round', 'Second Round', 'Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Final'];
const CupBracket = ({ matches, rounds }: { matches: any[]; rounds: string[] }) => {
    const sortedRounds = [...rounds].sort((a, b) => {
        const ia = ROUND_ORDER.findIndex(r => a.toLowerCase().includes(r.toLowerCase().replace('-', ' ').split(' ')[0]));
        const ib = ROUND_ORDER.findIndex(r => b.toLowerCase().includes(r.toLowerCase().replace('-', ' ').split(' ')[0]));
        if (ia >= 0 && ib >= 0) return ia - ib;
        if (ia >= 0) return -1;
        if (ib >= 0) return 1;
        return a.localeCompare(b);
    });
    return (
        <div className="overflow-x-auto py-4">
            <div className="flex gap-8 min-w-max" style={{ justifyContent: 'space-between' }}>
                {sortedRounds.map((round, ri) => {
                    const roundMatches = matches.filter(m => m.round === round);
                    if (roundMatches.length === 0) return null;
                    const scale = Math.pow(2, sortedRounds.length - 1 - ri);
                    return (
                        <div key={round} className="flex flex-col gap-4" style={{ minWidth: 200 }}>
                            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider text-center sticky top-0 bg-slate-900/95 py-2">{round}</h4>
                            <div className="flex flex-col gap-3" style={{ gap: `${Math.max(12, 24 * scale)}px` }}>
                                {roundMatches.map((m: any, mi: number) => (
                                    <div key={m.id} className="glass-card p-3 border border-amber-500/20 rounded-lg min-w-[180px]">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                {m.home?.logo && <img src={m.home.logo} className="w-4 h-4 object-contain flex-shrink-0" alt="" />}
                                                <span className="text-xs font-medium text-white truncate">{m.home?.name || 'TBD'}</span>
                                            </div>
                                            <span className="text-xs font-mono font-bold text-slate-400 flex-shrink-0">
                                                {m.isCompleted ? `${m.home?.score ?? '-'}:${m.away?.score ?? '-'}` : 'vs'}
                                            </span>
                                            <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                                                <span className="text-xs font-medium text-white truncate text-right">{m.away?.name || 'TBD'}</span>
                                                {m.away?.logo && <img src={m.away.logo} className="w-4 h-4 object-contain flex-shrink-0" alt="" />}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Power Rating calculation
const calcPowerRating = (team: any) => {
    if (!team.stats || team.stats.played === 0) return 50;
    const gpg = team.stats.gf / team.stats.played;
    const gapg = team.stats.ga / team.stats.played;
    const ppg = team.points / team.stats.played;
    return Math.round((ppg * 20) + (gpg * 10) - (gapg * 5) + 30);
};

// Helper to parse AI Analysis
const parseAiAnalysis = (text: string) => {
    const analysisMatch = text.match(/\*\*Analyse:\*\*\s*([\s\S]*?)(?=\*\*MEIN TIPP:)/i) || text.match(/Analyse:\s*([\s\S]*?)(?=MEIN TIPP:)/i);
    const tipMatch = text.match(/\*\*MEIN TIPP:\*\*\s*([\s\S]*?)(?=\*\*BESTE WETTE:)/i) || text.match(/MEIN TIPP:\s*([\s\S]*?)(?=BESTE WETTE:)/i);
    const betMatch = text.match(/\*\*BESTE WETTE:\*\*\s*([\s\S]*?)$/i) || text.match(/BESTE WETTE:\s*([\s\S]*?)$/i);

    return {
        analysis: analysisMatch ? analysisMatch[1].trim() : text, // Fallback to full text if parsing fails
        tip: tipMatch ? tipMatch[1].trim() : null,
        bet: betMatch ? betMatch[1].trim() : null
    };
};

export default function LeaguePageClient() {
    const { leagueId } = useParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [noElectron, setNoElectron] = useState(false);
    const [simulating, setSimulating] = useState(false);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'standings' | 'fixtures' | 'cup' | 'espn-match'>('dashboard');
    const [activeGroup, setActiveGroup] = useState<string | null>(null);
    const [fixtures, setFixtures] = useState<any[]>([]);
    const [loadingOdds, setLoadingOdds] = useState(false);
    const [currentMatchday, setCurrentMatchday] = useState(1);
    const [minMatchday, setMinMatchday] = useState(1);
    const [maxMatchday, setMaxMatchday] = useState(34);
    const [insightsOpen, setInsightsOpen] = useState(false);
    const [insightsData, setInsightsData] = useState<any>(null);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'unknown' | 'not_installed' | 'offline' | 'ready'>('checking');
    const [downloadUrl, setDownloadUrl] = useState('');
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [thoughtProcess, setThoughtProcess] = useState<string | null>(null);
    const [loadingAi, setLoadingAi] = useState(false);
    const [aiProgress, setAiProgress] = useState<{ progress: number; step: string } | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);
    const [setupComplete, setSetupComplete] = useState(false);
    const [predictionStats, setPredictionStats] = useState<{ total: number; correct1X2: number; accuracyPercent: number } | null>(null);
    const [cupData, setCupData] = useState<{ cupName: string; matches: any[]; rounds: string[] } | null>(null);
    const [loadingCup, setLoadingCup] = useState(false);
    const [cupMatchOdds, setCupMatchOdds] = useState<Record<string, { homeWinProb: number; drawProb: number; awayWinProb: number }>>({});
    const [cupMatchLoadingOdds, setCupMatchLoadingOdds] = useState<Record<string, boolean>>({});

    // ESPN Real Data
    const [espnLeagueCode, setEspnLeagueCode] = useState<string | null>(null);
    const [espnStandings, setEspnStandings] = useState<EspnStandingEntry[]>([]);
    const [espnScores, setEspnScores] = useState<EspnScore[]>([]);
    const [loadingEspn, setLoadingEspn] = useState(false);
    const [espnMatchDetail, setEspnMatchDetail] = useState<EspnMatchSummary | null>(null);
    const [espnMatchDetailEvent, setEspnMatchDetailEvent] = useState<EspnScore | null>(null);
    const [loadingMatchDetail, setLoadingMatchDetail] = useState(false);

    useEffect(() => {
        if (leagueId) loadData();
    }, [leagueId]);

    const loadPredictionStats = useCallback(async () => {
        if (window.electron) {
            try {
                const s = await window.electron.getPredictionStats();
                setPredictionStats(s);
            } catch { setPredictionStats(null); }
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'dashboard' && window.electron) loadPredictionStats();
    }, [activeTab, loadPredictionStats]);

    const loadCupData = useCallback(async () => {
        if (!window.electron || !leagueId) return;
        setLoadingCup(true);
        try {
            const res = await window.electron.getCupMatches(parseInt(leagueId as string));
            if (res.cupName && res.matches) setCupData({ cupName: res.cupName, matches: res.matches, rounds: res.rounds || [] });
            else setCupData(null);
        } catch { setCupData(null); }
        finally { setLoadingCup(false); }
    }, [leagueId]);

    useEffect(() => {
        if (activeTab === 'cup') loadCupData();
    }, [activeTab, loadCupData]);

    const loadData = async () => {
        if (!window.electron) {
            setLoading(false);
            setNoElectron(true);
            return;
        }
        try {
            window.electron.getSetupStatus().then((s: any) => { if (s?.setupComplete) setSetupComplete(true); }).catch(() => { });
            const res = await window.electron.getData('football') as { leagues?: any[], error?: string };
            const league = res?.leagues?.find((l: any) => String(l.id) === String(leagueId));
            if (league) {
                const firstGroup = league.teams?.[0]?.group || 'League';
                setActiveGroup(g => g ?? firstGroup);
                league.teams?.sort((a: any, b: any) => (b.points ?? 0) - (a.points ?? 0));
                setData(league);
                loadFixtures(leagueId as string);
            }
        } catch (err) {
            console.error("loadData error:", err);
        } finally {
            setLoading(false);
        }
    };

    // ESPN data loading
    const loadEspnLeagueCode = useCallback(async () => {
        if (!window.electron || espnLeagueCode) return espnLeagueCode;
        const code = await window.electron.espnGetLeagueCode(parseInt(leagueId as string));
        if (code) setEspnLeagueCode(code);
        return code;
    }, [leagueId, espnLeagueCode]);

    const loadEspnStandings = useCallback(async () => {
        if (!window.electron) return;
        setLoadingEspn(true);
        try {
            const code = espnLeagueCode || await loadEspnLeagueCode();
            if (!code) return;
            const data = await window.electron.espnGetStandings(code);
            setEspnStandings(data);
        } catch (e) { console.error('ESPN standings error:', e); }
        finally { setLoadingEspn(false); }
    }, [espnLeagueCode, loadEspnLeagueCode]);

    const loadEspnScores = useCallback(async () => {
        if (!window.electron) return;
        setLoadingEspn(true);
        try {
            const code = espnLeagueCode || await loadEspnLeagueCode();
            if (!code) return;
            const data = await window.electron.espnGetScores(code);
            setEspnScores(data);
        } catch (e) { console.error('ESPN scores error:', e); }
        finally { setLoadingEspn(false); }
    }, [espnLeagueCode, loadEspnLeagueCode]);

    const loadEspnMatchDetail = useCallback(async (event: EspnScore) => {
        if (!window.electron) return;
        setLoadingMatchDetail(true);
        setEspnMatchDetailEvent(event);
        setEspnMatchDetail(null);
        setActiveTab('espn-match');
        try {
            const code = espnLeagueCode || await loadEspnLeagueCode();
            if (!code) return;
            const data = await window.electron.espnGetMatchSummary(code, event.id);
            setEspnMatchDetail(data);
        } catch (e) { console.error('ESPN match detail error:', e); }
        finally { setLoadingMatchDetail(false); }
    }, [espnLeagueCode, loadEspnLeagueCode]);

    // Auto-load ESPN data when switching to standings/fixtures tabs
    useEffect(() => {
        if (activeTab === 'standings' && espnStandings.length === 0) loadEspnStandings();
        if (activeTab === 'fixtures' && espnScores.length === 0) loadEspnScores();
    }, [activeTab]);

    // Auto-refresh ESPN scores every 30s when on fixtures tab
    useEffect(() => {
        if (activeTab !== 'fixtures') return;
        const iv = setInterval(loadEspnScores, 30000);
        return () => clearInterval(iv);
    }, [activeTab, loadEspnScores]);

    const loadFixtures = async (lid: string, matchday?: number) => {
        setLoadingOdds(false);
        setFixtures([]);
        if (!window.electron) return;
        try {
            const result = await window.electron.getFixtures(parseInt(lid, 10), matchday);
            if (!result) return;
            setCurrentMatchday(result.currentMatchday ?? 1);
            setMinMatchday(result.minMatchday ?? 1);
            setMaxMatchday(result.maxMatchday ?? 34);
            const formatted = (result.matches ?? []).map((fix: any) => ({
                id: fix.id,
                home: fix.home ?? { id: 0, name: 'TBD', short_name: 'TBD', logo: null },
                away: fix.away ?? { id: 0, name: 'TBD', short_name: 'TBD', logo: null },
                matchday: fix.matchday,
                date: fix.date ? new Date(fix.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'TBD',
                dateRaw: fix.date,
                homeScore: fix.homeScore,
                awayScore: fix.awayScore,
                status: fix.status,
                odds: null,
                loadingOdds: false,
                simulating: false
            }));
            setFixtures(formatted);
        } catch (err) {
            console.error("loadFixtures error:", err);
        }
    };

    const predictMatch = async (index: number, homeId: number, awayId: number) => {
        const next = [...fixtures];
        (next[index] as any).loadingOdds = true;
        setFixtures(next);
        if (window.electron) {
            await new Promise(r => setTimeout(r, 600));
            const odds = await window.electron.getMatchOdds(homeId, awayId);
            const after = [...fixtures];
            (after[index] as any).odds = odds;
            (after[index] as any).loadingOdds = false;
            setFixtures(after);
        }
    };

    const simulateSingleMatch = async (index: number, matchId: number) => {
        const next = [...fixtures];
        (next[index] as any).simulating = true;
        setFixtures(next);
        if (!window.electron) return;
        try {
            const res = await window.electron.simulateSingleMatch(matchId) as { homeGoals: number; awayGoals: number };
            const after = [...fixtures];
            (after[index] as any).homeScore = res.homeGoals;
            (after[index] as any).awayScore = res.awayGoals;
            (after[index] as any).simulating = false;
            setFixtures(after);
            loadData();
        } catch (err) {
            console.error('simulateSingleMatch error:', err);
            const after = [...fixtures];
            (after[index] as any).simulating = false;
            setFixtures(after);
        }
    };

    const predictCupMatch = async (homeId: number, awayId: number) => {
        const key = `${homeId}-${awayId}`;
        setCupMatchLoadingOdds(prev => ({ ...prev, [key]: true }));
        if (window.electron) {
            try {
                await new Promise(r => setTimeout(r, 400));
                const odds = await window.electron.getMatchOdds(homeId, awayId) as { homeWinProb: number; drawProb: number; awayWinProb: number };
                setCupMatchOdds(prev => ({ ...prev, [key]: { homeWinProb: odds.homeWinProb, drawProb: odds.drawProb, awayWinProb: odds.awayWinProb } }));
            } catch (e) { console.error('predictCupMatch error:', e); }
        }
        setCupMatchLoadingOdds(prev => ({ ...prev, [key]: false }));
    };

    const goToMatchday = (day: number) => {
        if (day >= minMatchday && day <= maxMatchday && leagueId) loadFixtures(leagueId as string, day);
    };

    const openInsights = async (home: any, away: any) => {
        setInsightsOpen(true);
        setLoadingInsights(true);
        setAiAnalysis(null);
        setThoughtProcess(null);
        if (window.electron) {
            const d = await window.electron.getAdvancedAnalysis(home.id, away.id);
            setInsightsData(d);
        }
        setLoadingInsights(false);
    };

    const runSimulate = async () => {
        setSimulating(true);
        if (window.electron) await window.electron.simulateMatchday(parseInt(leagueId as string));
        setTimeout(() => { loadData(); loadPredictionStats(); setSimulating(false); }, 800);
    };

    useEffect(() => {
        if (insightsOpen && window.electron) checkOllama();
    }, [insightsOpen]);

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

    const startOllamaService = async () => {
        setLoadingAi(true);
        await window.electron!.startOllama();
        setTimeout(async () => { await checkOllama(); setLoadingAi(false); }, 3000);
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
                const think = res.text.match(/<think>([\s\S]*?)<\/think>/);
                setThoughtProcess(think ? think[1].trim() : null);
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

    if (loading) return <div className="p-10 text-slate-400 flex items-center gap-3"><RefreshCw className="animate-spin" size={18} /> Loading...</div>;
    if (noElectron) return <div className="p-10 text-slate-400">Run BetBrain in Electron to use this feature. Start with <code className="bg-slate-800 px-2 py-1 rounded">npm run dev</code></div>;
    if (!data) return <div className="p-10 text-slate-400">League not found</div>;

    const uniqueGroups = Array.from(new Set(data.teams.map((t: any) => t.group || 'League')));
    const group = activeGroup ?? uniqueGroups[0] ?? 'League';
    const filteredTeams = data.teams.filter((t: any) => (t.group || 'League') === group);

    // Dashboard: All matches for current matchday
    const MatchdayMatchesWidget = () => {
        if (!fixtures || fixtures.length === 0) return (
            <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 glass-card p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-transparent"></div>
                <Calendar size={48} className="text-slate-600 mb-4 group-hover:scale-110 transition-transform duration-500" />
                <h3 className="text-xl font-bold text-slate-300">No Upcoming Matches</h3>
                <p className="text-slate-500 text-sm mt-2">The season might be over or data needs updating.</p>
            </div>
        );

        return (
            <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 glass-card p-0 relative overflow-hidden flex flex-col border-t border-white/10">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/30 via-transparent to-slate-900/50"></div>
                <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <button onClick={() => goToMatchday(currentMatchday - 1)} disabled={currentMatchday <= minMatchday} className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                <ChevronLeft size={18} />
                            </button>
                            <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/20 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Matchday {currentMatchday}
                            </span>
                            <button onClick={() => goToMatchday(currentMatchday + 1)} disabled={currentMatchday >= maxMatchday} className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                <ChevronRight size={18} />
                            </button>
                        </div>
                        <span className="text-slate-500 text-xs">{fixtures.length} matches</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {fixtures.map((fix: any, idx: number) => (
                            <div key={idx} className="glass-card p-4 flex items-center gap-4 hover:border-emerald-500/20 transition-colors group/card">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {fix.home.logo ? <img src={fix.home.logo} className="w-8 h-8 object-contain flex-shrink-0" alt="" /> : <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-xs">🏠</div>}
                                    <span className="text-sm font-bold text-white truncate">{fix.home.name}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-slate-500 text-xs font-mono hidden sm:inline">{fix.date}</span>
                                    <button onClick={() => openInsights(fix.home, fix.away)} className="px-3 py-1.5 bg-purple-600/80 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5">
                                        <BrainCircuit size={12} /> Analyze
                                    </button>
                                </div>
                                <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                                    <span className="text-sm font-bold text-white truncate text-right">{fix.away.name}</span>
                                    {fix.away.logo ? <img src={fix.away.logo} className="w-8 h-8 object-contain flex-shrink-0" alt="" /> : <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-xs">✈️</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-screen relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <a href="/football" className="inline-flex items-center gap-2 text-slate-500 hover:text-white mb-2 transition-colors text-xs uppercase tracking-widest font-bold">
                        <ArrowLeft size={12} /> Return to Leagues
                    </a>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight flex items-center gap-3">
                        {data.name}
                        <span className="px-3 py-1 bg-slate-800 rounded text-sm font-normal text-slate-400 border border-slate-700">Season 2025/26</span>
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-black/40 rounded-xl p-1 text-sm border border-white/5 backdrop-blur-md flex-wrap">
                        <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                            <Activity size={16} /> Dashboard
                        </button>
                        <button onClick={() => setActiveTab('standings')} className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${activeTab === 'standings' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                            <Trophy size={16} /> Table
                        </button>
                        <button onClick={() => setActiveTab('fixtures')} className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${activeTab === 'fixtures' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                            <Calendar size={16} /> Matches
                        </button>
                        {[2002, 2021, 2014, 2019, 2015].includes(Number(leagueId)) && (
                            <button onClick={() => setActiveTab('cup')} className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${activeTab === 'cup' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                                <Trophy size={16} /> Cup
                            </button>
                        )}
                    </div>
                    <button onClick={runSimulate} disabled={simulating} className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 rounded-xl font-bold text-white text-sm shadow-lg shadow-emerald-900/20 transition-all disabled:opacity-50 flex items-center gap-2 border border-emerald-500/20">
                        {simulating ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
                        {simulating ? 'Simulating...' : 'Simulate Week'}
                    </button>
                </div>
            </div>

            {/* Dashboard View (Bento Grid) */}
            {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* 1. Matchday Matches (Top Left - All matches) */}
                    <MatchdayMatchesWidget />

                    {/* 2. AI Status Widget (Top Right) */}
                    <div className="col-span-1 glass-card p-6 flex flex-col justify-between relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-purple-400">
                                <BrainCircuit size={20} />
                                <span className="text-xs font-bold uppercase tracking-widest">AI Analyst</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white leading-tight">
                                {ollamaStatus === 'ready' ? 'System Online' : 'System Offline'}
                            </h3>
                            <p className="text-sm text-slate-400 mt-2">
                                {ollamaStatus === 'ready'
                                    ? 'Neural engines ready for match prediction.'
                                    : 'Connect Ollama to enable advanced predictions.'}
                            </p>
                        </div>
                        <div className="mt-4">
                            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-2">
                                <span className={`w-2 h-2 rounded-full ${ollamaStatus === 'ready' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                Status: {ollamaStatus.toUpperCase()}
                            </div>
                            {/* Visual Pulse Line */}
                            <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className={`h-full ${ollamaStatus === 'ready' ? 'bg-purple-500 w-full animate-pulse' : 'bg-slate-700 w-1/4'}`}></div>
                            </div>
                            {predictionStats && predictionStats.total > 0 && (
                                <div className="mt-3 pt-3 border-t border-white/5">
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">AI Accuracy (1X2)</div>
                                    <div className="text-lg font-bold text-white font-mono mt-0.5">
                                        {predictionStats.correct1X2} of {predictionStats.total} <span className="text-emerald-400">({predictionStats.accuracyPercent}%)</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Top Scorer Widget (Mid Right) */}
                    <div className="col-span-1 glass-card p-6 flex flex-col relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                <Target size={14} className="text-amber-400" /> Golden Boot
                            </h3>
                        </div>
                        <div className="space-y-3">
                            {(data.topScorers?.length ?? 0) > 0 ? (
                                data.topScorers.slice(0, 5).map((s: { name: string; goals: number; assists?: number; teamName: string }, i: number) => (
                                    <div key={s.name + i} className={`flex items-center gap-3 ${i >= 2 ? 'opacity-75' : ''}`}>
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs">{i + 1}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-white truncate">{s.name}</div>
                                            <div className="text-xs text-slate-500 truncate">{s.teamName}</div>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <span className="text-amber-400 font-mono font-bold">{s.goals}</span>
                                            {s.assists != null && s.assists > 0 && (
                                                <span className="text-slate-500 text-xs">({s.assists}A)</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500">No scorer data yet. Run ESPN sync to fetch.</p>
                            )}
                        </div>
                    </div>

                    {/* 4. Mini Standings (Bottom Row - Wide) */}
                    <div className="col-span-1 md:col-span-2 glass-card p-0 flex flex-col">
                        <div className="p-4 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                <Trophy size={14} className="text-yellow-500" /> Top 5
                            </h3>
                            <button onClick={() => setActiveTab('standings')} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">View All →</button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <tbody className="divide-y divide-white/5">
                                    {filteredTeams.slice(0, 5).map((t: any, i: number) => (
                                        <tr key={t.id} className="hover:bg-white/5 transition-colors">
                                            <td className="pl-4 py-3 w-8 text-center font-mono text-slate-500">{i + 1}</td>
                                            <td className="px-3 py-3 font-bold text-slate-200">{t.name}</td>
                                            <td className="px-3 py-3 text-right font-mono text-white">{t.points} <span className="text-slate-500 text-xs">pts</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 5. League Stats / Info (Bottom Right) */}
                    <div className="col-span-1 md:col-span-2 glass-card p-6 flex items-center justify-around text-center">
                        <div>
                            <div className="text-3xl font-black text-white mb-1">{data.teams.length}</div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider">Teams</div>
                        </div>
                        <div className="w-px h-12 bg-white/10"></div>
                        <div>
                            <div className="text-3xl font-black text-white mb-1">{currentMatchday}</div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider">Matchday</div>
                        </div>
                        <div className="w-px h-12 bg-white/10"></div>
                        <div>
                            <div className="text-3xl font-black text-emerald-400 mb-1">
                                {(data.teams.reduce((acc: number, t: any) => acc + (t.stats?.gf || 0), 0) / (data.teams[0]?.stats?.played || 1) / (data.teams.length / 2)).toFixed(2)}
                            </div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider">Goals/Match</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Group Tabs (Only show on Standings when no ESPN data) */}
            {uniqueGroups.length > 1 && activeTab === 'standings' && espnStandings.length === 0 && (
                <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
                    {uniqueGroups.map((g: any) => (
                        <button key={g} onClick={() => setActiveGroup(g)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${group === g ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'}`}>
                            {g}
                        </button>
                    ))}
                </div>
            )}

            {/* Unified Standings Table (ESPN primary, Sim fallback) */}
            {activeTab === 'standings' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Trophy size={18} className="text-emerald-400" />
                            <h2 className="text-lg font-bold text-white">Standings</h2>
                            {espnStandings.length > 0 && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono font-bold">ESPN LIVE</span>}
                        </div>
                        <button onClick={loadEspnStandings} disabled={loadingEspn} className="text-slate-400 hover:text-white transition-colors disabled:opacity-50">
                            <RefreshCw size={16} className={loadingEspn ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    {loadingEspn && espnStandings.length === 0 && filteredTeams.length === 0 ? (
                        <div className="glass-card p-12 flex items-center justify-center gap-3 text-slate-400">
                            <RefreshCw className="animate-spin" size={20} /> Loading standings...
                        </div>
                    ) : espnStandings.length > 0 ? (
                        /* ESPN Primary Table */
                        <div className="glass-card overflow-hidden">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th className="w-10">#</th>
                                        <th>Team</th>
                                        <th className="text-center w-20">Form</th>
                                        <th className="text-center">MP</th>
                                        <th className="text-center">W</th>
                                        <th className="text-center">D</th>
                                        <th className="text-center">L</th>
                                        <th className="text-center">GF</th>
                                        <th className="text-center">GA</th>
                                        <th className="text-center">GD</th>
                                        <th className="text-center">Pts</th>
                                        <th className="text-center">PPG</th>
                                        <th className="text-center">PWR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {espnStandings.map((entry, i) => {
                                        const noteColor = entry.note?.color ? `#${entry.note.color}` : undefined;
                                        // Find sim team data for form dots + power
                                        const simTeam = data.teams.find((t: any) => t.id === entry.internalId);
                                        const pwr = simTeam ? calcPowerRating(simTeam) : null;
                                        return (
                                            <tr key={entry.espnId || i} className="group">
                                                <td className="font-mono text-slate-500 relative">
                                                    {noteColor && <div className="absolute left-0 top-1 bottom-1 w-1 rounded-r" style={{ backgroundColor: noteColor }} />}
                                                    <span className="pl-2">{entry.rank || i + 1}</span>
                                                </td>
                                                <td className="font-semibold flex items-center gap-3">
                                                    <div className="w-6 h-6 bg-slate-700 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                                                        {entry.logo ? <img src={entry.logo} className="object-contain w-5 h-5" alt="" /> : <span className="text-xs">⚽</span>}
                                                    </div>
                                                    {entry.internalId ? (
                                                        <a href={`/football/team/${entry.internalId}`} className="text-slate-100 truncate hover:text-emerald-400 transition-colors">
                                                            {entry.team}
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-100 truncate">{entry.team}</span>
                                                    )}
                                                    {entry.note && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded border font-bold hidden md:inline-block" style={{ borderColor: noteColor, color: noteColor }}>
                                                            {entry.note.description?.split(' -')[0] || ''}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {simTeam?.form?.slice(0, 5).map((r: string, fi: number) => <FormDot key={fi} result={r} />)}
                                                        {(!simTeam?.form || simTeam.form.length === 0) && <span className="text-slate-600 text-xs">-</span>}
                                                    </div>
                                                </td>
                                                <td className="text-center text-slate-400 font-mono">{entry.played}</td>
                                                <td className="text-center text-slate-400 font-mono">{entry.wins}</td>
                                                <td className="text-center text-slate-400 font-mono">{entry.draws}</td>
                                                <td className="text-center text-slate-400 font-mono">{entry.losses}</td>
                                                <td className="text-center text-slate-400 font-mono">{entry.goalsFor}</td>
                                                <td className="text-center text-slate-400 font-mono">{entry.goalsAgainst}</td>
                                                <td className={`text-center font-mono font-medium ${entry.goalDifference > 0 ? 'text-emerald-400' : entry.goalDifference < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                                    {entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}
                                                </td>
                                                <td className="text-center font-bold text-white font-mono">{entry.points}</td>
                                                <td className="text-center font-mono text-slate-400">{entry.ppg?.toFixed(2) || '-'}</td>
                                                <td className="text-center">
                                                    {pwr !== null ? (
                                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold font-mono ${pwr >= 70 ? 'bg-emerald-500/20 text-emerald-400' : pwr >= 50 ? 'bg-sky-500/20 text-sky-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                            {pwr}
                                                        </span>
                                                    ) : <span className="text-slate-600 text-xs">-</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                                <p className="text-[10px] text-slate-600">Data from ESPN • Updates every 5 minutes</p>
                                {espnStandings.some(e => e.note) && (
                                    <div className="flex gap-3">
                                        {Array.from(new Set(espnStandings.filter(e => e.note).map(e => JSON.stringify(e.note)))).map((ns, i) => {
                                            const n = JSON.parse(ns);
                                            return (
                                                <span key={i} className="text-[9px] flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: `#${n.color}` }} />
                                                    <span className="text-slate-500">{n.description?.split(' -')[0] || ''}</span>
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Sim Fallback Table */
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
                                                    <a href={`/football/team/${team.id}`} className="text-slate-100 truncate hover:text-emerald-400 hover:underline decoration-emerald-500/50 underline-offset-4 transition-all">
                                                        {team.name}
                                                    </a>
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
                            <div className="px-4 py-2 border-t border-white/5">
                                <p className="text-[10px] text-slate-600">Simulation data • ESPN data loading...</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Unified Fixtures Tab (ESPN primary, Sim features integrated) */}
            {activeTab === 'fixtures' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Calendar size={18} className="text-amber-400" />
                            <h2 className="text-lg font-bold text-white">Matches</h2>
                            {espnScores.length > 0 && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono font-bold">ESPN LIVE</span>}
                        </div>
                        <div className="flex items-center gap-3">
                            {loadingOdds && <span className="flex items-center gap-2 text-xs text-slate-400"><RefreshCw className="animate-spin" size={14} /> Calculating...</span>}
                            <button onClick={loadEspnScores} disabled={loadingEspn} className="text-slate-400 hover:text-white transition-colors disabled:opacity-50">
                                <RefreshCw size={16} className={loadingEspn ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>
                    {loadingEspn && espnScores.length === 0 ? (
                        <div className="glass-card p-12 flex items-center justify-center gap-3 text-slate-400">
                            <RefreshCw className="animate-spin" size={20} /> Loading matches...
                        </div>
                    ) : espnScores.length > 0 ? (
                        /* ESPN Primary Fixtures */
                        <div className="space-y-6">
                            {/* Live Matches */}
                            {espnScores.filter(s => s.isLive).length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {espnScores.filter(s => s.isLive).map(score => (
                                            <button key={score.id} onClick={() => loadEspnMatchDetail(score)} className="glass-card p-4 border-emerald-500/20 bg-emerald-500/[0.03] text-left hover:border-emerald-500/40 transition-all">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        {score.clock}
                                                    </span>
                                                    {score.venue && <span className="text-[10px] text-slate-600 truncate max-w-[120px]">{score.venue}</span>}
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        {score.home.logo && <img src={score.home.logo} className="w-5 h-5 object-contain flex-shrink-0" alt="" />}
                                                        <span className="text-sm font-bold text-white truncate">{score.home.name}</span>
                                                    </div>
                                                    <div className="px-4 py-1 bg-black/40 rounded-lg flex-shrink-0 mx-2">
                                                        <span className="font-mono font-black text-lg text-emerald-400">{score.home.score} - {score.away.score}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                                        <span className="text-sm font-bold text-white truncate">{score.away.name}</span>
                                                        {score.away.logo && <img src={score.away.logo} className="w-5 h-5 object-contain flex-shrink-0" alt="" />}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Scheduled Matches: ESPN + Sim fixtures merged for full matchday */}
                            {(() => {
                                const espnPre = espnScores.filter(s => s.statusState === 'pre');
                                const espnIds = new Set(espnPre.map(s => `${s.home.internalId ?? ''}-${s.away.internalId ?? ''}`));
                                const simOnly = fixtures.filter(f => f.home?.id && f.away?.id && !espnIds.has(`${f.home.id}-${f.away.id}`));
                                const upcomingMerged = [
                                    ...espnPre.map(s => ({
                                        id: s.id,
                                        dateRaw: new Date(s.date),
                                        home: s.home,
                                        away: s.away,
                                        venue: s.venue,
                                        homeInternalId: s.home.internalId,
                                        awayInternalId: s.away.internalId,
                                        simFixIdx: fixtures.findIndex(f => f.home.id === s.home.internalId && f.away.id === s.away.internalId)
                                    })),
                                    ...simOnly.map((f) => ({
                                        id: `sim-${f.home.id}-${f.away.id}`,
                                        dateRaw: f.dateRaw ? new Date(f.dateRaw) : null,
                                        home: f.home,
                                        away: f.away,
                                        venue: undefined,
                                        homeInternalId: f.home.id,
                                        awayInternalId: f.away.id,
                                        simFixIdx: fixtures.findIndex(x => x.home.id === f.home.id && x.away.id === f.away.id)
                                    }))
                                ];
                                upcomingMerged.sort((a, b) => (a.dateRaw?.getTime() ?? 0) - (b.dateRaw?.getTime() ?? 0));
                                if (upcomingMerged.length === 0) return null;
                                return (
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Clock size={14} /> Upcoming
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {upcomingMerged.map((m) => {
                                                const homeInternalId = m.homeInternalId ?? m.home?.internalId ?? m.home?.id;
                                                const awayInternalId = m.awayInternalId ?? m.away?.internalId ?? m.away?.id;
                                                const simFix = m.simFixIdx >= 0 ? fixtures[m.simFixIdx] : null;
                                                return (
                                                    <div key={m.id} className="glass-card p-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-[10px] text-slate-500 font-mono">
                                                                {m.dateRaw ? m.dateRaw.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }) : 'TBD'}
                                                            </span>
                                                            <span className="text-[10px] text-slate-500 font-mono">
                                                                {m.dateRaw ? m.dateRaw.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                {m.home.logo && <img src={m.home.logo} className="w-5 h-5 object-contain flex-shrink-0" alt="" />}
                                                                <span className="text-sm font-bold text-white truncate">{m.home.name}</span>
                                                            </div>
                                                            <span className="text-slate-600 text-xs mx-3 flex-shrink-0">vs</span>
                                                            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                                                <span className="text-sm font-bold text-white truncate">{m.away.name}</span>
                                                                {m.away.logo && <img src={m.away.logo} className="w-5 h-5 object-contain flex-shrink-0" alt="" />}
                                                            </div>
                                                        </div>
                                                        {m.venue && <div className="mb-3 text-[10px] text-slate-600 truncate">{m.venue}</div>}
                                                        {(() => {
                                                            const oddsKey = `${homeInternalId}-${awayInternalId}`;
                                                            const cupOdds = cupMatchOdds[oddsKey];
                                                            const cupLoading = cupMatchLoadingOdds[oddsKey];
                                                            const odds = simFix?.odds ?? cupOdds;
                                                            if (odds) {
                                                                return (
                                                                    <div className="space-y-2">
                                                                        <div>
                                                                            {(odds as any).predictedScore && (
                                                                                <div className="mb-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
                                                                                    <span className="text-[10px] text-amber-400/80 uppercase tracking-wider font-bold">Prediction</span>
                                                                                    <div className="text-lg font-black font-mono text-amber-400">{(odds as any).predictedScore}</div>
                                                                                    {(odds as any).expectedGoals && (
                                                                                        <div className="text-[10px] text-slate-500 font-mono">xG: {(odds as any).expectedGoals.home} – {(odds as any).expectedGoals.away}</div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                            <div className="flex justify-between text-xs mb-1.5 font-mono">
                                                                                <span className="text-emerald-400 flex items-center gap-1"><TrendingUp size={11} /> H: {odds.homeWinProb}%</span>
                                                                                <span className="text-slate-400 flex items-center gap-1"><Minus size={11} /> D: {odds.drawProb}%</span>
                                                                                <span className="text-rose-400 flex items-center gap-1"><TrendingDown size={11} /> A: {odds.awayWinProb}%</span>
                                                                            </div>
                                                                            <div className="h-1.5 rounded-full flex overflow-hidden bg-slate-700">
                                                                                <div className="bg-emerald-500" style={{ width: `${odds.homeWinProb}%` }}></div>
                                                                                <div className="bg-slate-500" style={{ width: `${odds.drawProb}%` }}></div>
                                                                                <div className="bg-rose-500" style={{ width: `${odds.awayWinProb}%` }}></div>
                                                                            </div>
                                                                            <button onClick={() => openInsights({ id: homeInternalId, name: m.home.name }, { id: awayInternalId, name: m.away.name })} className="mt-3 w-full text-xs text-sky-400 hover:text-sky-300 flex items-center justify-center gap-1.5 py-1.5 rounded border border-slate-700 hover:border-sky-500/50 transition-all">
                                                                                <BarChart3 size={12} /> View Insights
                                                                            </button>
                                                                        </div>
                                                                        {simFix?.id && simFix?.homeScore == null && (
                                                                            <button onClick={() => simulateSingleMatch(m.simFixIdx!, simFix.id)} disabled={simFix.simulating} className="w-full h-8 bg-amber-600/80 hover:bg-amber-500 rounded border border-amber-500/50 flex items-center justify-center gap-2 text-xs font-bold text-white transition-all disabled:opacity-50">
                                                                                {simFix.simulating ? <RefreshCw className="animate-spin" size={14} /> : <Play size={14} fill="currentColor" />}
                                                                                {simFix.simulating ? 'Simulating...' : 'Simulate Match'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            }
                                                            if (homeInternalId && awayInternalId) {
                                                                return (
                                                                    <div className="space-y-2">
                                                                        <button
                                                                            onClick={() => {
                                                                                if (m.simFixIdx >= 0) {
                                                                                    predictMatch(m.simFixIdx!, homeInternalId, awayInternalId);
                                                                                } else {
                                                                                    predictCupMatch(homeInternalId, awayInternalId);
                                                                                }
                                                                            }}
                                                                            disabled={m.simFixIdx >= 0 ? (fixtures[m.simFixIdx] as any)?.loadingOdds : cupLoading}
                                                                            className="w-full h-8 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center justify-center gap-2 text-xs font-medium text-slate-300 transition-all disabled:opacity-70"
                                                                        >
                                                                            {(m.simFixIdx >= 0 ? (fixtures[m.simFixIdx] as any)?.loadingOdds : cupLoading) ? (
                                                                                <><RefreshCw className="animate-spin text-emerald-400" size={14} /> Simulating 1000 Matches...</>
                                                                            ) : (
                                                                                <><Activity size={14} className="text-purple-400" /> Simulate Prediction (1000 Runs)</>
                                                                            )}
                                                                        </button>
                                                                        {simFix?.id && simFix?.homeScore == null && (
                                                                            <button onClick={() => simulateSingleMatch(m.simFixIdx!, simFix.id)} disabled={simFix.simulating} className="w-full h-8 bg-amber-600/80 hover:bg-amber-500 rounded border border-amber-500/50 flex items-center justify-center gap-2 text-xs font-bold text-white transition-all disabled:opacity-50">
                                                                                {simFix.simulating ? <RefreshCw className="animate-spin" size={14} /> : <Play size={14} fill="currentColor" />}
                                                                                {simFix.simulating ? 'Simulating...' : 'Simulate Match'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Completed Matches */}
                            {espnScores.filter(s => s.isCompleted).length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Trophy size={14} /> Results
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {espnScores.filter(s => s.isCompleted).map(score => (
                                            <button key={score.id} onClick={() => loadEspnMatchDetail(score)} className="glass-card p-4 text-left hover:border-white/20 transition-all">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-bold text-slate-600">FT</span>
                                                    <span className="text-[10px] text-slate-600">{new Date(score.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        {score.home.logo && <img src={score.home.logo} className="w-5 h-5 object-contain flex-shrink-0" alt="" />}
                                                        <span className={`text-sm font-medium truncate ${score.home.winner ? 'text-white font-bold' : 'text-slate-400'}`}>{score.home.name}</span>
                                                    </div>
                                                    <div className="px-3 flex-shrink-0 mx-2">
                                                        <span className="font-mono font-bold text-white">{score.home.score} - {score.away.score}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                                        <span className={`text-sm font-medium truncate ${score.away.winner ? 'text-white font-bold' : 'text-slate-400'}`}>{score.away.name}</span>
                                                        {score.away.logo && <img src={score.away.logo} className="w-5 h-5 object-contain flex-shrink-0" alt="" />}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <p className="text-[10px] text-slate-600 text-center">Data from ESPN • Auto-refreshes every 30 seconds</p>
                        </div>
                    ) : (
                        /* Sim Fallback Fixtures */
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
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
                                <span className="text-xs text-slate-500">Simulation data (ESPN unavailable)</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {fixtures.length === 0 ? (
                                    <div className="col-span-full glass-card p-8 text-center text-slate-400">
                                        <Calendar size={32} className="mx-auto mb-3 opacity-50" />
                                        <p className="font-medium">No fixtures for matchday {currentMatchday}</p>
                                    </div>
                                ) : fixtures.map((f, i) => (
                                    <div key={i} className="glass-card p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div className="w-7 h-7 bg-slate-700 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    {f.home.logo ? <img src={f.home.logo} className="object-contain w-5 h-5" alt="" /> : <span className="text-xs">⚽</span>}
                                                </div>
                                                <span className="font-semibold text-white text-sm truncate">{f.home.short_name || f.home.name}</span>
                                            </div>
                                            {(f.homeScore !== null && f.awayScore !== null) ? <span className="font-mono font-bold text-white mx-3">{f.homeScore} – {f.awayScore}</span> : <span className="text-slate-600 text-xs mx-2 flex-shrink-0">vs</span>}
                                            <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                                                <span className="font-semibold text-white text-sm truncate">{f.away.short_name || f.away.name}</span>
                                                <div className="w-7 h-7 bg-slate-700 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    {f.away.logo ? <img src={f.away.logo} className="object-contain w-5 h-5" alt="" /> : <span className="text-xs">⚽</span>}
                                                </div>
                                            </div>
                                        </div>
                                        {(f.homeScore !== null && f.awayScore !== null) ? (
                                            <span className="text-sm font-mono font-bold text-slate-400">{f.homeScore} – {f.awayScore}</span>
                                        ) : (
                                            <div className="space-y-2">
                                                {f.odds ? (
                                                    <div>
                                                        {(f.odds as any).predictedScore && (
                                                            <div className="mb-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
                                                                <span className="text-[10px] text-amber-400/80 uppercase tracking-wider font-bold">Prediction</span>
                                                                <div className="text-lg font-black font-mono text-amber-400">{(f.odds as any).predictedScore}</div>
                                                                {(f.odds as any).expectedGoals && (
                                                                    <div className="text-[10px] text-slate-500 font-mono">xG: {(f.odds as any).expectedGoals.home} – {(f.odds as any).expectedGoals.away}</div>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between text-xs mb-1.5 font-mono">
                                                            <span className="text-emerald-400">H: {f.odds.homeWinProb}%</span>
                                                            <span className="text-slate-400">D: {f.odds.drawProb}%</span>
                                                            <span className="text-rose-400">A: {f.odds.awayWinProb}%</span>
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
                                                    <button onClick={() => predictMatch(i, f.home.id, f.away.id)} disabled={f.loadingOdds || !f.home.id || !f.away.id} className="w-full h-8 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center justify-center gap-2 text-xs font-medium text-slate-300 transition-all disabled:opacity-70">
                                                        {f.loadingOdds ? (
                                                            <><RefreshCw className="animate-spin text-emerald-400" size={14} /><span className="text-emerald-400">Simulating...</span></>
                                                        ) : (
                                                            <><Activity size={14} className="text-purple-400" /> Simulate Prediction</>
                                                        )}
                                                    </button>
                                                )}
                                                <button onClick={() => simulateSingleMatch(i, f.id)} disabled={f.simulating || !f.id || f.homeScore != null} className="w-full h-8 bg-amber-600/80 hover:bg-amber-500 rounded border border-amber-500/50 flex items-center justify-center gap-2 text-xs font-bold text-white transition-all disabled:opacity-50">
                                                    {f.simulating ? <RefreshCw className="animate-spin" size={14} /> : <Play size={14} fill="currentColor" />}
                                                    {f.simulating ? 'Simulating...' : 'Simulate Match'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Cup Tab */}
            {activeTab === 'cup' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-4">
                        <Trophy size={18} className="text-amber-400" />
                        <h2 className="text-lg font-bold text-white">{cupData?.cupName || 'Cup'}</h2>
                    </div>
                    {loadingCup ? (
                        <div className="glass-card p-12 flex items-center justify-center gap-3 text-slate-400">
                            <RefreshCw className="animate-spin" size={20} /> Loading cup matches...
                        </div>
                    ) : cupData && cupData.matches.length > 0 ? (
                        <div className="space-y-6">
                            {cupData.rounds.length > 0 && (
                                <div className="glass-card p-4 border border-amber-500/20 rounded-xl">
                                    <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4">Bracket</h3>
                                    <CupBracket matches={cupData.matches} rounds={cupData.rounds} />
                                </div>
                            )}
                            {cupData.rounds.length > 0 ? (
                                cupData.rounds.map(round => {
                                    const roundMatches = cupData.matches.filter(m => m.round === round);
                                    if (roundMatches.length === 0) return null;
                                    return (
                                        <div key={round}>
                                            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3">{round}</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {roundMatches.map((m: any) => (
                                                    <div key={m.id} className="glass-card p-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-[10px] text-slate-500 font-mono">
                                                                {m.date ? new Date(m.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }) : 'TBD'}
                                                            </span>
                                                            {m.isCompleted && <span className="text-[10px] font-bold text-slate-500">FT</span>}
                                                        </div>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                {m.home?.logo && <img src={m.home.logo} className="w-5 h-5 object-contain flex-shrink-0" alt="" />}
                                                                <span className="text-sm font-bold text-white truncate">{m.home?.name || 'TBD'}</span>
                                                            </div>
                                                            <span className="font-mono font-bold text-slate-300 mx-2 flex-shrink-0">
                                                                {m.isCompleted ? `${m.home?.score ?? '-'} - ${m.away?.score ?? '-'}` : 'vs'}
                                                            </span>
                                                            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                                                <span className="text-sm font-bold text-white truncate text-right">{m.away?.name || 'TBD'}</span>
                                                                {m.away?.logo && <img src={m.away.logo} className="w-5 h-5 object-contain flex-shrink-0" alt="" />}
                                                            </div>
                                                        </div>
                                                        {m.canSimulate && !m.isCompleted && m.home?.internalId && m.away?.internalId && (
                                                            <div className="space-y-2">
                                                                {(() => {
                                                                    const key = `${m.home.internalId}-${m.away.internalId}`;
                                                                    const odds = cupMatchOdds[key];
                                                                    const loading = cupMatchLoadingOdds[key];
                                                                    if (odds) {
                                                                        return (
                                                                            <>
                                                                                <div>
                                                                                    <div className="flex justify-between text-xs mb-1 font-mono">
                                                                                        <span className="text-emerald-400 flex items-center gap-1"><TrendingUp size={11} /> H: {odds.homeWinProb}%</span>
                                                                                        <span className="text-slate-400 flex items-center gap-1"><Minus size={11} /> D: {odds.drawProb}%</span>
                                                                                        <span className="text-rose-400 flex items-center gap-1"><TrendingDown size={11} /> A: {odds.awayWinProb}%</span>
                                                                                    </div>
                                                                                    <div className="h-1.5 rounded-full flex overflow-hidden bg-slate-700">
                                                                                        <div className="bg-emerald-500" style={{ width: `${odds.homeWinProb}%` }}></div>
                                                                                        <div className="bg-slate-500" style={{ width: `${odds.drawProb}%` }}></div>
                                                                                        <div className="bg-rose-500" style={{ width: `${odds.awayWinProb}%` }}></div>
                                                                                    </div>
                                                                                    <button onClick={() => openInsights({ id: m.home.internalId, name: m.home.name }, { id: m.away.internalId, name: m.away.name })} className="mt-2 w-full text-xs text-sky-400 hover:text-sky-300 flex items-center justify-center gap-1.5 py-1.5 rounded border border-slate-700 hover:border-sky-500/50 transition-all">
                                                                                        <BarChart3 size={12} /> View Insights
                                                                                    </button>
                                                                                </div>
                                                                                <button
                                                                                    onClick={async () => {
                                                                                        if (window.electron) {
                                                                                            try {
                                                                                                const res = await window.electron.simulateMatch({ homeId: m.home.internalId, awayId: m.away.internalId }) as any;
                                                                                                if (res?.homeGoals != null) {
                                                                                                    alert(`Simulation: ${m.home?.name} ${res.homeGoals} - ${res.awayGoals} ${m.away?.name}`);
                                                                                                    loadCupData();
                                                                                                }
                                                                                            } catch (e) { console.error(e); }
                                                                                        }
                                                                                    }}
                                                                                    className="w-full h-8 bg-amber-600/80 hover:bg-amber-500 rounded border border-amber-500/50 flex items-center justify-center gap-2 text-xs font-bold text-white transition-all"
                                                                                >
                                                                                    <Play size={14} fill="currentColor" /> Simulate
                                                                                </button>
                                                                            </>
                                                                        );
                                                                    }
                                                                    return (
                                                                        <>
                                                                            <button
                                                                                onClick={() => predictCupMatch(m.home.internalId, m.away.internalId)}
                                                                                disabled={loading}
                                                                                className="w-full h-8 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center justify-center gap-2 text-xs font-medium text-slate-300 transition-all disabled:opacity-70"
                                                                            >
                                                                                {loading ? <><RefreshCw className="animate-spin text-emerald-400" size={14} /> Simulating 1000 Matches...</> : <><Activity size={14} className="text-purple-400" /> Simulate Prediction (1000 Runs)</>}
                                                                            </button>
                                                                            <button
                                                                                onClick={async () => {
                                                                                    if (window.electron) {
                                                                                        try {
                                                                                            const res = await window.electron.simulateMatch({ homeId: m.home.internalId, awayId: m.away.internalId }) as any;
                                                                                            if (res?.homeGoals != null) {
                                                                                                alert(`Simulation: ${m.home?.name} ${res.homeGoals} - ${res.awayGoals} ${m.away?.name}`);
                                                                                                loadCupData();
                                                                                            }
                                                                                        } catch (e) { console.error(e); }
                                                                                    }
                                                                                }}
                                                                                className="w-full h-8 bg-amber-600/80 hover:bg-amber-500 rounded border border-amber-500/50 flex items-center justify-center gap-2 text-xs font-bold text-white transition-all"
                                                                            >
                                                                                <Play size={14} fill="currentColor" /> Simulate
                                                                            </button>
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {cupData.matches.map((m: any) => (
                                        <div key={m.id} className="glass-card p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] text-slate-500 font-mono">
                                                    {m.date ? new Date(m.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }) : 'TBD'}
                                                </span>
                                                {m.isCompleted && <span className="text-[10px] font-bold text-slate-500">FT</span>}
                                            </div>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    {m.home?.logo && <img src={m.home.logo} className="w-5 h-5 object-contain flex-shrink-0" alt="" />}
                                                    <span className="text-sm font-bold text-white truncate">{m.home?.name || 'TBD'}</span>
                                                </div>
                                                <span className="font-mono font-bold text-slate-300 mx-2 flex-shrink-0">
                                                    {m.isCompleted ? `${m.home?.score ?? '-'} - ${m.away?.score ?? '-'}` : 'vs'}
                                                </span>
                                                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                                    <span className="text-sm font-bold text-white truncate text-right">{m.away?.name || 'TBD'}</span>
                                                    {m.away?.logo && <img src={m.away.logo} className="w-5 h-5 object-contain flex-shrink-0" alt="" />}
                                                </div>
                                            </div>
                                            {m.canSimulate && !m.isCompleted && m.home?.internalId && m.away?.internalId && (
                                                <div className="space-y-2">
                                                    {(() => {
                                                        const key = `${m.home.internalId}-${m.away.internalId}`;
                                                        const odds = cupMatchOdds[key];
                                                        const loading = cupMatchLoadingOdds[key];
                                                        if (odds) {
                                                            return (
                                                                <>
                                                                    <div>
                                                                        <div className="flex justify-between text-xs mb-1 font-mono">
                                                                            <span className="text-emerald-400 flex items-center gap-1"><TrendingUp size={11} /> H: {odds.homeWinProb}%</span>
                                                                            <span className="text-slate-400 flex items-center gap-1"><Minus size={11} /> D: {odds.drawProb}%</span>
                                                                            <span className="text-rose-400 flex items-center gap-1"><TrendingDown size={11} /> A: {odds.awayWinProb}%</span>
                                                                        </div>
                                                                        <div className="h-1.5 rounded-full flex overflow-hidden bg-slate-700">
                                                                            <div className="bg-emerald-500" style={{ width: `${odds.homeWinProb}%` }}></div>
                                                                            <div className="bg-slate-500" style={{ width: `${odds.drawProb}%` }}></div>
                                                                            <div className="bg-rose-500" style={{ width: `${odds.awayWinProb}%` }}></div>
                                                                        </div>
                                                                        <button onClick={() => openInsights({ id: m.home.internalId, name: m.home.name }, { id: m.away.internalId, name: m.away.name })} className="mt-2 w-full text-xs text-sky-400 hover:text-sky-300 flex items-center justify-center gap-1.5 py-1.5 rounded border border-slate-700 hover:border-sky-500/50 transition-all">
                                                                            <BarChart3 size={12} /> View Insights
                                                                        </button>
                                                                    </div>
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (window.electron) {
                                                                                try {
                                                                                    const res = await window.electron.simulateMatch({ homeId: m.home.internalId, awayId: m.away.internalId }) as any;
                                                                                    if (res?.homeGoals != null) {
                                                                                        alert(`Simulation: ${m.home?.name} ${res.homeGoals} - ${res.awayGoals} ${m.away?.name}`);
                                                                                        loadCupData();
                                                                                    }
                                                                                } catch (e) { console.error(e); }
                                                                            }
                                                                        }}
                                                                        className="w-full h-8 bg-amber-600/80 hover:bg-amber-500 rounded border border-amber-500/50 flex items-center justify-center gap-2 text-xs font-bold text-white transition-all"
                                                                    >
                                                                        <Play size={14} fill="currentColor" /> Simulate
                                                                    </button>
                                                                </>
                                                            );
                                                        }
                                                        return (
                                                            <>
                                                                <button
                                                                    onClick={() => predictCupMatch(m.home.internalId, m.away.internalId)}
                                                                    disabled={loading}
                                                                    className="w-full h-8 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center justify-center gap-2 text-xs font-medium text-slate-300 transition-all disabled:opacity-70"
                                                                >
                                                                    {loading ? <><RefreshCw className="animate-spin text-emerald-400" size={14} /> Simulating 1000 Matches...</> : <><Activity size={14} className="text-purple-400" /> Simulate Prediction (1000 Runs)</>}
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (window.electron) {
                                                                            try {
                                                                                const res = await window.electron.simulateMatch({ homeId: m.home.internalId, awayId: m.away.internalId }) as any;
                                                                                if (res?.homeGoals != null) {
                                                                                    alert(`Simulation: ${m.home?.name} ${res.homeGoals} - ${res.awayGoals} ${m.away?.name}`);
                                                                                    loadCupData();
                                                                                }
                                                                            } catch (e) { console.error(e); }
                                                                        }
                                                                    }}
                                                                    className="w-full h-8 bg-amber-600/80 hover:bg-amber-500 rounded border border-amber-500/50 flex items-center justify-center gap-2 text-xs font-bold text-white transition-all"
                                                                >
                                                                    <Play size={14} fill="currentColor" /> Simulate
                                                                </button>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="text-[10px] text-slate-600 text-center">Cup data from ESPN • Matches with both teams in this league can be simulated</p>
                        </div>
                    ) : (
                        <div className="glass-card p-12 text-center text-slate-400">
                            <Trophy size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="font-medium">No cup matches found for teams in this league.</p>
                            <p className="text-sm text-slate-500 mt-2">Cup data is loaded from ESPN. Try again later or check if the cup season has started.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ESPN Match Detail */}
            {activeTab === 'espn-match' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <button onClick={() => setActiveTab('fixtures')} className="text-slate-400 hover:text-white flex items-center gap-2 mb-4 text-sm transition-colors">
                        <ArrowLeft size={14} /> Back to Matches
                    </button>
                    {espnMatchDetailEvent && (
                        <div className="glass-card p-6 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                {espnMatchDetailEvent.isLive && (
                                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        {espnMatchDetailEvent.clock}
                                    </span>
                                )}
                                {espnMatchDetailEvent.isCompleted && <span className="text-xs font-bold text-slate-500">Full Time</span>}
                                {espnMatchDetailEvent.venue && <span className="text-xs text-slate-500">{espnMatchDetailEvent.venue}</span>}
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col items-center gap-2 flex-1">
                                    {espnMatchDetailEvent.home.logo && <img src={espnMatchDetailEvent.home.logo} className="w-14 h-14 object-contain" alt="" />}
                                    <span className="text-lg font-black text-white">{espnMatchDetailEvent.home.name}</span>
                                </div>
                                <div className="px-6 py-3 bg-black/40 rounded-xl">
                                    <span className={`font-mono font-black text-3xl ${espnMatchDetailEvent.isLive ? 'text-emerald-400' : 'text-white'}`}>
                                        {espnMatchDetailEvent.home.score} - {espnMatchDetailEvent.away.score}
                                    </span>
                                </div>
                                <div className="flex flex-col items-center gap-2 flex-1">
                                    {espnMatchDetailEvent.away.logo && <img src={espnMatchDetailEvent.away.logo} className="w-14 h-14 object-contain" alt="" />}
                                    <span className="text-lg font-black text-white">{espnMatchDetailEvent.away.name}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {loadingMatchDetail ? (
                        <div className="glass-card p-12 flex items-center justify-center gap-3 text-slate-400">
                            <RefreshCw className="animate-spin" size={20} /> Loading match details...
                        </div>
                    ) : espnMatchDetail ? (
                        <div className="space-y-6">
                            {/* Key Events */}
                            {espnMatchDetail.keyEvents.length > 0 && (
                                <div className="glass-card p-5">
                                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Zap size={14} className="text-amber-400" /> Key Events
                                    </h3>
                                    <div className="space-y-3">
                                        {espnMatchDetail.keyEvents.map((ev, i) => (
                                            <div key={ev.id || i} className="flex items-start gap-3">
                                                <span className="text-xs font-mono text-slate-500 w-10 text-right flex-shrink-0 pt-0.5">{ev.minute || '-'}</span>
                                                <div className="flex-shrink-0 mt-1">
                                                    {ev.isGoal ? <span className="text-lg">⚽</span> : ev.type === 'yellowCard' || ev.typeName?.includes('Yellow') ? <span className="text-lg">🟨</span> : ev.type === 'redCard' || ev.typeName?.includes('Red') ? <span className="text-lg">🟥</span> : <span className="text-lg">📋</span>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium ${ev.isGoal ? 'text-emerald-400' : 'text-slate-300'}`}>
                                                        {ev.player || ev.shortText || ev.text}
                                                    </p>
                                                    {ev.team && <p className="text-[10px] text-slate-500">{ev.team.name}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Boxscore Stats */}
                            {espnMatchDetail.boxscore.length === 2 && (
                                <div className="glass-card p-5">
                                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <BarChart3 size={14} className="text-sky-400" /> Match Statistics
                                    </h3>
                                    <div className="space-y-3">
                                        {Object.keys(espnMatchDetail.boxscore[0].stats).filter(k => espnMatchDetail.boxscore[1].stats[k]).map(statName => {
                                            const home = espnMatchDetail!.boxscore[0].stats[statName];
                                            const away = espnMatchDetail!.boxscore[1].stats[statName];
                                            const hVal = parseFloat(home) || 0;
                                            const aVal = parseFloat(away) || 0;
                                            const total = hVal + aVal || 1;
                                            const label = statName.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                                            return (
                                                <div key={statName}>
                                                    <div className="flex items-center justify-between text-xs mb-1">
                                                        <span className="text-slate-300 font-mono">{home}</span>
                                                        <span className="text-slate-500 text-[10px] uppercase tracking-wider">{label}</span>
                                                        <span className="text-slate-300 font-mono">{away}</span>
                                                    </div>
                                                    <div className="flex gap-1 h-1.5">
                                                        <div className="flex-1 bg-slate-800 rounded-full overflow-hidden flex justify-end">
                                                            <div className="bg-sky-500 rounded-full" style={{ width: `${(hVal / total) * 100}%` }} />
                                                        </div>
                                                        <div className="flex-1 bg-slate-800 rounded-full overflow-hidden">
                                                            <div className="bg-rose-500 rounded-full" style={{ width: `${(aVal / total) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Lineups */}
                            {espnMatchDetail.rosters.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {espnMatchDetail.rosters.map((roster, ri) => (
                                        <div key={ri} className="glass-card p-5">
                                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                {roster.logo && <img src={roster.logo} className="w-4 h-4 object-contain" alt="" />}
                                                {roster.name}
                                            </h3>
                                            <div className="space-y-1">
                                                {roster.players.filter(p => p.starter).length > 0 && (
                                                    <>
                                                        <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-2 font-bold">Starting XI</div>
                                                        {roster.players.filter(p => p.starter).map((p, pi) => (
                                                            <div key={pi} className="flex items-center gap-2 text-xs py-0.5">
                                                                <span className="text-slate-600 font-mono w-5 text-right">{p.jersey}</span>
                                                                <span className="text-slate-300 flex-1">{p.name}</span>
                                                                <span className="text-slate-600 text-[10px]">{p.position}</span>
                                                            </div>
                                                        ))}
                                                    </>
                                                )}
                                                {roster.players.filter(p => !p.starter).length > 0 && (
                                                    <>
                                                        <div className="text-[10px] text-slate-600 uppercase tracking-wider mt-3 mb-2 font-bold border-t border-white/5 pt-2">Substitutes</div>
                                                        {roster.players.filter(p => !p.starter).map((p, pi) => (
                                                            <div key={pi} className="flex items-center gap-2 text-xs py-0.5 opacity-60">
                                                                <span className="text-slate-600 font-mono w-5 text-right">{p.jersey}</span>
                                                                <span className="text-slate-400 flex-1">{p.name}</span>
                                                                <span className="text-slate-700 text-[10px]">{p.position}</span>
                                                            </div>
                                                        ))}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Odds */}
                            {espnMatchDetail.odds.length > 0 && (
                                <div className="glass-card p-5">
                                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Target size={14} className="text-amber-400" /> Betting Odds
                                    </h3>
                                    <div className="space-y-2">
                                        {espnMatchDetail.odds.map((o, oi) => (
                                            <div key={oi} className="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg p-3">
                                                <span className="text-slate-400 text-xs">{o.provider}</span>
                                                <div className="flex gap-4 font-mono text-xs">
                                                    {o.details && <span className="text-white">{o.details}</span>}
                                                    {o.overUnder > 0 && <span className="text-slate-400">O/U: {o.overUnder}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* H2H */}
                            {espnMatchDetail.h2h.length > 0 && (
                                <div className="glass-card p-5">
                                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Head to Head</h3>
                                    <H2HTimeline matches={espnMatchDetail.h2h} homeName={espnMatchDetailEvent?.home?.name || ''} awayName={espnMatchDetailEvent?.away?.name || ''} />
                                </div>
                            )}

                            <p className="text-[10px] text-slate-600 text-center">Match data from ESPN</p>
                        </div>
                    ) : (
                        <div className="glass-card p-12 text-center text-slate-400">
                            <BarChart3 size={32} className="mx-auto mb-3 opacity-50" />
                            <p>Match details not available yet.</p>
                        </div>
                    )}
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
                                    {(insightsData.odds as any)?.predictedScore && (
                                        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
                                            <span className="text-[10px] text-amber-400/80 uppercase tracking-wider font-bold">Predicted Score</span>
                                            <div className="text-2xl font-black font-mono text-amber-400 mt-1">{(insightsData.odds as any).predictedScore}</div>
                                            {(insightsData.odds as any)?.expectedGoals && (
                                                <div className="text-xs text-slate-500 font-mono mt-1">Expected Goals: {(insightsData.odds as any).expectedGoals.home} – {(insightsData.odds as any).expectedGoals.away}</div>
                                            )}
                                        </div>
                                    )}
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
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Form (Last 5–10)</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex gap-1.5">{insightsData.home.form.map((r: string, i: number) => <FormDot key={i} result={r} />)}</div>
                                        <div className="flex gap-1.5 justify-end">{insightsData.away.form.map((r: string, i: number) => <FormDot key={i} result={r} />)}</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <FormChart form={insightsData.home.form} teamName={insightsData.home.name} maxGames={10} />
                                        <FormChart form={insightsData.away.form} teamName={insightsData.away.name} maxGames={10} />
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

                                {/* H2H (Sim) */}
                                <div className="glass-panel p-4">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Head-to-Head (Sim)</h3>
                                    {insightsData.h2h.length > 0 ? (
                                        <H2HTimeline matches={insightsData.h2h} homeName={insightsData.home.name} awayName={insightsData.away.name} />
                                    ) : <p className="text-slate-600">No previous meetings</p>}
                                </div>

                                {/* ── ESPN Real-World Data Section ── */}
                                {insightsData.espn && (insightsData.espn.homeStanding || insightsData.espn.awayStanding || insightsData.espn.homeForm || insightsData.espn.awayForm) && (
                                    <div className="glass-panel p-4 border border-emerald-500/20 bg-emerald-500/[0.02]">
                                        <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Globe size={14} /> Real-World Data
                                            <span className="text-[9px] text-emerald-400/60 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">ESPN</span>
                                        </h3>

                                        {/* Real Standings Comparison */}
                                        {(insightsData.espn.homeStanding || insightsData.espn.awayStanding) && (
                                            <div className="mb-4">
                                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-bold">League Position</div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {[
                                                        { label: insightsData.home.name, st: insightsData.espn.homeStanding },
                                                        { label: insightsData.away.name, st: insightsData.espn.awayStanding },
                                                    ].map((side, si) => (
                                                        <div key={si} className={`bg-slate-800/50 rounded-lg p-3 ${si === 1 ? 'text-right' : ''}`}>
                                                            {side.st ? (
                                                                <>
                                                                    <div className="text-2xl font-black text-white font-mono">#{side.st.rank}</div>
                                                                    <div className="text-xs text-slate-400 font-mono mt-1">{side.st.points} pts ({side.st.ppg?.toFixed(2)} PPG)</div>
                                                                    <div className="text-[10px] text-slate-500 mt-0.5">{side.st.wins}W {side.st.draws}D {side.st.losses}L</div>
                                                                    <div className="text-[10px] text-slate-500">{side.st.goalsFor} GF / {side.st.goalsAgainst} GA</div>
                                                                </>
                                                            ) : (
                                                                <div className="text-xs text-slate-600">No data</div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Real Form */}
                                        {(insightsData.espn.homeForm || insightsData.espn.awayForm) && (
                                            <div className="mb-4">
                                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-bold">Real Form (Last 5)</div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {[
                                                        { form: insightsData.espn.homeForm },
                                                        { form: insightsData.espn.awayForm },
                                                    ].map((side, si) => (
                                                        <div key={si} className={`flex gap-1.5 ${si === 1 ? 'justify-end' : ''}`}>
                                                            {side.form ? side.form.split('').map((r: string, fi: number) => (
                                                                <span key={fi} className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${r === 'W' ? 'bg-emerald-500/20 text-emerald-400' : r === 'L' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700 text-slate-400'}`}>
                                                                    {r}
                                                                </span>
                                                            )) : <span className="text-xs text-slate-600">N/A</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Recent Results */}
                                        {(insightsData.espn.homeRecentResults?.length > 0 || insightsData.espn.awayRecentResults?.length > 0) && (
                                            <div className="mb-4">
                                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-bold">Recent Results</div>
                                                <div className="grid grid-cols-2 gap-3 text-xs">
                                                    {[
                                                        { results: insightsData.espn.homeRecentResults },
                                                        { results: insightsData.espn.awayRecentResults },
                                                    ].map((side, si) => (
                                                        <div key={si} className="space-y-1">
                                                            {(side.results || []).slice(0, 5).map((r: any, ri: number) => (
                                                                <div key={ri} className={`flex items-center gap-1.5 ${si === 1 ? 'flex-row-reverse' : ''}`}>
                                                                    <span className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center flex-shrink-0 ${r.result === 'W' ? 'bg-emerald-500/20 text-emerald-400' : r.result === 'L' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700 text-slate-400'}`}>{r.result}</span>
                                                                    <span className="text-slate-400 truncate">{r.score} vs {r.opponent}</span>
                                                                </div>
                                                            ))}
                                                            {(!side.results || side.results.length === 0) && <span className="text-slate-600">No data</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* ESPN H2H */}
                                        {insightsData.espn.h2h?.length > 0 && (
                                            <div className="mb-4">
                                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-bold">Real H2H (ESPN)</div>
                                                <H2HTimeline matches={insightsData.espn.h2h} homeName={insightsData.home.name} awayName={insightsData.away.name} />
                                            </div>
                                        )}

                                        {/* Bookmaker Odds */}
                                        {insightsData.espn.odds?.length > 0 && (
                                            <div>
                                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-bold">Bookmaker Odds</div>
                                                <div className="space-y-1.5">
                                                    {insightsData.espn.odds.slice(0, 3).map((o: any, oi: number) => (
                                                        <div key={oi} className="flex items-center justify-between text-xs bg-slate-800/30 rounded p-2">
                                                            <span className="text-slate-500">{o.provider}</span>
                                                            <div className="flex gap-3 font-mono text-slate-300">
                                                                {o.details && <span>{o.details}</span>}
                                                                {o.overUnder > 0 && <span className="text-slate-500">O/U: {o.overUnder}</span>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-3 pt-2 border-t border-emerald-500/10">
                                            <p className="text-[9px] text-slate-600">Real-time data from ESPN</p>
                                        </div>
                                    </div>
                                )}

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

                                        {/* Error Display */}
                                        {aiError && !loadingAi && (
                                            <div className="mb-4 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                                        <div className="p-6 text-center text-purple-300 flex flex-col items-center gap-4">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-purple-500/30 rounded-full animate-ping"></div>
                                                <BrainCircuit className="relative z-10 text-purple-400 animate-pulse" size={32} />
                                            </div>
                                            <div className="w-full space-y-2">
                                                <p className="text-xs font-mono font-medium tracking-wide text-slate-400">{aiProgress?.step || 'Analysing...'}</p>
                                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-500 ease-out"
                                                        style={{ width: `${aiProgress?.progress ?? 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {aiAnalysis && (
                                        <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-700">
                                            {(() => {
                                                const parsed = parseAiAnalysis(aiAnalysis);
                                                const isStructured = parsed.tip && parsed.bet;

                                                return (
                                                    <div className="bg-slate-900/80 backdrop-blur-xl rounded-xl border border-purple-500/30 shadow-2xl overflow-hidden">
                                                        {/* Header Gradient */}
                                                        <div className="h-1 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-emerald-500"></div>

                                                        {/* Reasoning Toggle */}
                                                        {thoughtProcess && (
                                                            <div className="bg-black/40 border-b border-white/5">
                                                                <details className="group/details">
                                                                    <summary className="px-4 py-2 text-[10px] font-mono text-purple-400/70 cursor-pointer hover:text-purple-400 hover:bg-white/5 transition-colors flex items-center gap-2 select-none uppercase tracking-widest">
                                                                        <BrainCircuit size={12} />
                                                                        <span>Analyst Reasoning Protocol</span>
                                                                        <span className="ml-auto opacity-50 group-open/details:rotate-180 transition-transform">▼</span>
                                                                    </summary>
                                                                    <div className="p-4 text-xs text-slate-400 font-mono whitespace-pre-wrap leading-relaxed bg-black/50 shadow-inner">
                                                                        {thoughtProcess}
                                                                    </div>
                                                                </details>
                                                            </div>
                                                        )}

                                                        <div className="p-5 space-y-5">
                                                            {/* 1. The Tip (Hero Section) */}
                                                            {parsed.tip && (
                                                                <div className="text-center">
                                                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Predicted Score</div>
                                                                    <div className="inline-block relative">
                                                                        <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 tracking-tight font-sans">
                                                                            {parsed.tip.replace(/\s*-\s*Konfidenz:.*/i, '')}
                                                                        </div>
                                                                        <div className="absolute -inset-4 bg-purple-500/20 blur-xl rounded-full -z-10"></div>
                                                                    </div>
                                                                    {parsed.tip.match(/Konfidenz:\s*(.*)/i) && (
                                                                        <div className="mt-2 flex justify-center">
                                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${parsed.tip.includes('Hoch') ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                                                                parsed.tip.includes('Mittel') ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                                                                    'bg-slate-700 text-slate-400 border-slate-600'
                                                                                }`}>
                                                                                Confidence: {parsed.tip.match(/Konfidenz:\s*(.*)/i)?.[1]}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* 2. Analysis Text */}
                                                            <div className="bg-slate-800/50 rounded-lg p-4 border border-white/5">
                                                                <div className="flex items-start gap-3">
                                                                    <div className="mt-1 p-1.5 bg-purple-500/20 rounded text-purple-400">
                                                                        <Sparkles size={14} />
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-xs font-bold text-slate-300 uppercase mb-1">Match Analysis</h4>
                                                                        <p className="text-sm text-slate-300 leading-relaxed">
                                                                            {isStructured ? parsed.analysis : aiAnalysis}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* 3. The Best Bet (Ticket Style) */}
                                                            {parsed.bet && (
                                                                <div className="relative group cursor-default">
                                                                    <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-slate-900 rounded-full border-r border-amber-500/30 z-10"></div>
                                                                    <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-slate-900 rounded-full border-l border-amber-500/30 z-10"></div>

                                                                    <div className="bg-gradient-to-br from-amber-500/10 to-orange-600/5 border border-amber-500/30 rounded-lg p-4 relative overflow-hidden">
                                                                        <div className="flex justify-between items-center mb-2">
                                                                            <span className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest border border-amber-500/30 px-1.5 rounded">Top Pick</span>
                                                                            <Sparkles size={12} className="text-amber-400" />
                                                                        </div>

                                                                        <div className="text-lg font-bold text-amber-100 font-mono tracking-tight">
                                                                            {parsed.bet}
                                                                        </div>

                                                                        <div className="mt-3 pt-3 border-t border-amber-500/20 border-dashed flex justify-between items-center">
                                                                            <span className="text-[10px] text-amber-500/60 font-mono">AI-VERIFIED • HIGH VALUE</span>
                                                                            <div className="h-2 w-16 bg-amber-500/20 rounded-full overflow-hidden">
                                                                                <div className="h-full bg-amber-500/60 w-3/4"></div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
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
