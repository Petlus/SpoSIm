'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CURRENT_SEASON_STR } from '../config/season';
import { Newspaper, Trophy, RefreshCw, Clock, ChevronRight, Zap, ExternalLink, Filter, Flame } from 'lucide-react';

type NewsArticle = {
    id: string;
    headline: string;
    description: string;
    published: string;
    league: string;
    leagueName: string;
    leagueIcon: string;
    images: { url: string; caption: string; width: number; height: number }[];
    links: string | null;
    type: string;
    premium: boolean;
};

type LiveScore = {
    id: string;
    name: string;
    shortName: string;
    date: string;
    status: string;
    statusDetail: string;
    statusState: 'pre' | 'in' | 'post';
    clock: string;
    period: number;
    isLive: boolean;
    isCompleted: boolean;
    venue: string | null;
    league: string;
    leagueName: string;
    leagueIcon: string;
    home: { name: string; shortName: string; logo: string | null; score: string; winner: boolean; form: string; record: string };
    away: { name: string; shortName: string; logo: string | null; score: string; winner: boolean; form: string; record: string };
};

type League = { code: string; name: string; icon: string };

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function ScoreRow({ score }: { score: LiveScore }) {
    const isLive = score.isLive;
    const isPost = score.isCompleted;
    const isPre = score.statusState === 'pre';

    const matchDate = new Date(score.date);
    const timeStr = matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = matchDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

    return (
        <div className={`px-5 py-3 hover:bg-white/5 transition-colors ${isLive ? 'bg-emerald-500/[0.03]' : ''}`}>
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-slate-600 uppercase tracking-wider font-bold">{score.leagueIcon} {score.leagueName}</span>
                {isLive ? (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {score.clock}
                    </span>
                ) : isPre ? (
                    <span className="text-[10px] text-slate-500 font-mono">{dateStr} {timeStr}</span>
                ) : (
                    <span className="text-[10px] text-slate-600 font-bold">FT</span>
                )}
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {score.home.logo && <img src={score.home.logo} className="w-4 h-4 object-contain flex-shrink-0" alt="" />}
                    <span className={`truncate text-xs font-medium ${isPost && score.home.winner ? 'text-white font-bold' : 'text-slate-300'}`}>{score.home.shortName}</span>
                </div>
                <div className="px-3 text-center flex-shrink-0">
                    {isPre ? (
                        <span className="font-mono text-sm text-slate-600">vs</span>
                    ) : (
                        <span className={`font-mono font-bold text-sm ${isLive ? 'text-emerald-400' : 'text-white'}`}>
                            {score.home.score} - {score.away.score}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className={`truncate text-xs font-medium ${isPost && score.away.winner ? 'text-white font-bold' : 'text-slate-300'}`}>{score.away.shortName}</span>
                    {score.away.logo && <img src={score.away.logo} className="w-4 h-4 object-contain flex-shrink-0" alt="" />}
                </div>
            </div>
            {score.venue && isLive && (
                <div className="mt-1.5 text-[10px] text-slate-700 truncate">{score.venue}</div>
            )}
        </div>
    );
}

export default function Home() {
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [scores, setScores] = useState<LiveScore[]>([]);
    const [leagues, setLeagues] = useState<League[]>([]);
    const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingScores, setLoadingScores] = useState(true);
    const [noElectron, setNoElectron] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async (league?: string) => {
        if (!window.electron) { setNoElectron(true); setLoading(false); return; }
        setLoading(true);
        setError(null);
        try {
            const [newsData, leagueData] = await Promise.all([
                window.electron.espnGetNews(league),
                leagues.length === 0 ? window.electron.espnGetLeagues() : Promise.resolve(leagues),
            ]);
            setNews(newsData);
            if (leagues.length === 0) setLeagues(leagueData);
        } catch (e) {
            setError('Failed to load news. Please check your internet connection.');
            console.error('News load error:', e);
        } finally {
            setLoading(false);
        }
    }, [leagues]);

    const loadScores = useCallback(async () => {
        if (!window.electron) return;
        setLoadingScores(true);
        try {
            const data = await window.electron.espnGetScores();
            setScores(data);
        } catch (e) {
            console.error('Scores load error:', e);
        } finally {
            setLoadingScores(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        loadScores();
        // Auto-refresh scores every 30 seconds for live data
        const interval = setInterval(() => {
            if (window.electron) loadScores();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleLeagueFilter = (code: string | null) => {
        setSelectedLeague(code);
        loadData(code ?? undefined);
    };

    const heroArticle = news[0];
    const restArticles = news.slice(1);
    const liveMatches = scores.filter(s => s.isLive);
    const scheduledMatches = scores.filter(s => s.statusState === 'pre');
    const completedMatches = scores.filter(s => s.isCompleted);

    if (noElectron) return (
        <div className="p-10 text-slate-400">Run BetBrain in Electron to use this feature. Start with <code className="bg-slate-800 px-2 py-1 rounded">npm run dev</code></div>
    );

    return (
        <div className="min-h-screen text-white">
            {/* Header */}
            <div className="px-8 pt-8 pb-6">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-3">
                            <Flame size={32} className="text-orange-500" />
                            News Feed
                        </h1>
                        <p className="text-slate-500 mt-1">Live football news from around the world</p>
                    </div>
                    <button
                        onClick={() => { loadData(selectedLeague ?? undefined); loadScores(); }}
                        disabled={loading}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {/* League Filters */}
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                    <button
                        onClick={() => handleLeagueFilter(null)}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                            selectedLeague === null
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5'
                        }`}
                    >
                        <Filter size={12} /> All Leagues
                    </button>
                    {leagues.map(l => (
                        <button
                            key={l.code}
                            onClick={() => handleLeagueFilter(l.code)}
                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                                selectedLeague === l.code
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5'
                            }`}
                        >
                            {l.icon} {l.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Live Ticker Bar */}
            {liveMatches.length > 0 && (
                <div className="px-8 mb-6">
                    <div className="glass-card border-emerald-500/30 overflow-hidden">
                        <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3 bg-emerald-500/5">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                            </span>
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Live Now</span>
                            <span className="text-[10px] text-slate-500 font-mono">{liveMatches.length} match{liveMatches.length !== 1 ? 'es' : ''} in progress</span>
                        </div>
                        <div className="flex overflow-x-auto gap-0 divide-x divide-white/5">
                            {liveMatches.map(match => (
                                <div key={match.id} className="flex-shrink-0 px-6 py-4 hover:bg-white/5 transition-colors min-w-[280px]">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase">{match.leagueIcon} {match.leagueName}</span>
                                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                            {match.clock}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            {match.home.logo && <img src={match.home.logo} className="w-5 h-5 object-contain flex-shrink-0" alt="" />}
                                            <span className="text-xs font-bold text-white truncate">{match.home.shortName}</span>
                                        </div>
                                        <div className="flex-shrink-0 px-3 py-1 bg-black/40 rounded-lg">
                                            <span className="font-mono font-black text-lg text-emerald-400">{match.home.score} - {match.away.score}</span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                            <span className="text-xs font-bold text-white truncate">{match.away.shortName}</span>
                                            {match.away.logo && <img src={match.away.logo} className="w-5 h-5 object-contain flex-shrink-0" alt="" />}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="px-8 pb-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main News Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Hero Article */}
                        {loading && !heroArticle ? (
                            <div className="glass-card p-12 flex flex-col items-center justify-center gap-4">
                                <RefreshCw className="animate-spin text-slate-500" size={32} />
                                <p className="text-slate-500 text-sm">Loading latest news...</p>
                            </div>
                        ) : error ? (
                            <div className="glass-card p-12 flex flex-col items-center justify-center gap-4">
                                <Newspaper className="text-slate-600" size={48} />
                                <p className="text-slate-400 text-sm">{error}</p>
                                <button onClick={() => loadData(selectedLeague ?? undefined)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-bold text-white transition-colors">
                                    Retry
                                </button>
                            </div>
                        ) : heroArticle ? (
                            <div className="glass-card overflow-hidden group cursor-pointer hover:border-white/20 transition-all">
                                {heroArticle.images[0] && (
                                    <div className="relative h-72 overflow-hidden">
                                        <img
                                            src={heroArticle.images[0].url}
                                            alt=""
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                                        <div className="absolute bottom-0 left-0 right-0 p-6">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-full">
                                                    {heroArticle.leagueIcon} {heroArticle.leagueName}
                                                </span>
                                                <span className="text-slate-400 text-xs flex items-center gap-1" suppressHydrationWarning>
                                                    <Clock size={10} /> {timeAgo(heroArticle.published)}
                                                </span>
                                            </div>
                                            <h2 className="text-2xl font-black text-white leading-tight mb-2 group-hover:text-emerald-400 transition-colors">
                                                {heroArticle.headline}
                                            </h2>
                                            <p className="text-slate-300 text-sm line-clamp-2">{heroArticle.description}</p>
                                        </div>
                                    </div>
                                )}
                                {!heroArticle.images[0] && (
                                    <div className="p-6">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-full">
                                                {heroArticle.leagueIcon} {heroArticle.leagueName}
                                            </span>
                                            <span className="text-slate-400 text-xs flex items-center gap-1">
                                                <Clock size={10} /> {timeAgo(heroArticle.published)}
                                            </span>
                                        </div>
                                        <h2 className="text-2xl font-black text-white leading-tight mb-2">{heroArticle.headline}</h2>
                                        <p className="text-slate-400 text-sm">{heroArticle.description}</p>
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {/* Article Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {restArticles.slice(0, 12).map((article) => (
                                <div key={article.id} className="glass-card overflow-hidden group cursor-pointer hover:border-white/20 transition-all flex flex-col">
                                    {article.images[0] && (
                                        <div className="relative h-36 overflow-hidden">
                                            <img
                                                src={article.images[0].url}
                                                alt=""
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                            <span className="absolute top-3 left-3 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider text-slate-300 rounded">
                                                {article.leagueIcon} {article.leagueName}
                                            </span>
                                        </div>
                                    )}
                                    <div className="p-4 flex-1 flex flex-col">
                                        {!article.images[0] && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                                                {article.leagueIcon} {article.leagueName}
                                            </span>
                                        )}
                                        <h3 className="text-sm font-bold text-white leading-snug mb-2 group-hover:text-emerald-400 transition-colors line-clamp-3">
                                            {article.headline}
                                        </h3>
                                        <p className="text-xs text-slate-500 line-clamp-2 flex-1">{article.description}</p>
                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                                            <span className="text-[10px] text-slate-600 flex items-center gap-1" suppressHydrationWarning>
                                                <Clock size={10} /> {timeAgo(article.published)}
                                            </span>
                                            {article.links && (
                                                <span className="text-[10px] text-slate-600 flex items-center gap-1">
                                                    <ExternalLink size={10} /> ESPN
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {!loading && news.length === 0 && !error && (
                            <div className="glass-card p-12 text-center">
                                <Newspaper className="text-slate-700 mx-auto mb-4" size={48} />
                                <p className="text-slate-500">No news available for this league right now.</p>
                            </div>
                        )}
                    </div>

                    {/* Sidebar: Scores + Quick Links */}
                    <div className="space-y-6">
                        {/* Scores Panel */}
                        <div className="glass-card overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <Zap size={14} className="text-amber-400" /> Scores
                                </h2>
                                <div className="flex items-center gap-2">
                                    {liveMatches.length > 0 && (
                                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            {liveMatches.length} LIVE
                                        </span>
                                    )}
                                    {loadingScores && <RefreshCw className="animate-spin text-slate-600" size={12} />}
                                </div>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto">
                                {/* Upcoming */}
                                {scheduledMatches.length > 0 && (
                                    <>
                                        <div className="px-5 py-2 bg-white/[0.02] border-b border-white/5">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <Clock size={10} /> Upcoming
                                            </span>
                                        </div>
                                        <div className="divide-y divide-white/5">
                                            {scheduledMatches.slice(0, 8).map(score => (
                                                <ScoreRow key={score.id} score={score} />
                                            ))}
                                        </div>
                                    </>
                                )}
                                {/* Completed */}
                                {completedMatches.length > 0 && (
                                    <>
                                        <div className="px-5 py-2 bg-white/[0.02] border-b border-white/5 border-t border-white/5">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <Trophy size={10} /> Results
                                            </span>
                                        </div>
                                        <div className="divide-y divide-white/5">
                                            {completedMatches.slice(0, 10).map(score => (
                                                <ScoreRow key={score.id} score={score} />
                                            ))}
                                        </div>
                                    </>
                                )}
                                {!loadingScores && scores.length === 0 && (
                                    <div className="px-5 py-8 text-center text-slate-600 text-xs">No scores available</div>
                                )}
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="glass-card overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/5">
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <Trophy size={14} className="text-cyan-400" /> Simulations
                                </h2>
                            </div>
                            <div className="divide-y divide-white/5">
                                <a href="/football" className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">⚽</span>
                                        <div>
                                            <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Football</span>
                                            <p className="text-[10px] text-slate-500">7 leagues available</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-600 group-hover:text-white transition-colors" />
                                </a>
                                <div className="flex items-center justify-between px-5 py-4 opacity-50">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">🏎️</span>
                                        <div>
                                            <span className="text-sm font-bold text-slate-400">Formula 1</span>
                                            <p className="text-[10px] text-slate-600">Coming 2026</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded font-bold">SOON</span>
                                </div>
                            </div>
                        </div>

                        {/* ESPN Sync */}
                        <div className="glass-card overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/5">
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <Trophy size={14} className="text-emerald-400" /> Real Standings
                                </h2>
                            </div>
                            <div className="divide-y divide-white/5">
                                {leagues.slice(0, 5).map(l => (
                                    <a key={l.code} href={`/football/${(l as any).internalId || ''}`} className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors group">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">{l.icon}</span>
                                            <span className="text-xs font-bold text-slate-300 group-hover:text-emerald-400 transition-colors">{l.name}</span>
                                        </div>
                                        <ChevronRight size={14} className="text-slate-600 group-hover:text-white transition-colors" />
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Data Attribution */}
                        <div className="px-4 py-3 text-center">
                            <p className="text-[10px] text-slate-700">Data powered by ESPN</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
