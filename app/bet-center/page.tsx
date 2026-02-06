'use client';

import React, { useState, useEffect } from 'react';
import { Ticket, Zap, AlertTriangle, CheckCircle, RefreshCw, Brain, Trophy, ChevronRight } from 'lucide-react';

type Match = {
    id: string;
    date: string;
    status: string;
    league: string; // league code
    leagueName: string;
    leagueIcon: string;
    home: { name: string; shortName: string; logo: string | null; internalId?: number | null };
    away: { name: string; shortName: string; logo: string | null; internalId?: number | null };
};

type BetSelection = {
    matchId: string;
    homeId: number;
    awayId: number;
    homeName: string;
    awayName: string;
    selection: '1' | 'X' | '2'; // 1=Home, X=Draw, 2=Away
    odds?: number; // Simulated odds
};

type VerificationResult = {
    matchId: string;
    selection: string;
    simProbability: number;
    confidenceScore: number;
    error?: string;
};

export default function BetCenter() {
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [matches, setMatches] = useState<Match[]>([]);
    const [slip, setSlip] = useState<BetSelection[]>([]);
    const [verification, setVerification] = useState<VerificationResult[] | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        loadMatches();
        loadModels();
    }, []);

    const loadModels = async () => {
        if (!window.electron) return;
        try {
            const models = await window.electron.getAiModels();
            if (models && models.length > 0) {
                setAvailableModels(models);
                // Default to DeepSeek or first available if deepseek not found
                const defaultModel = models.find(m => m.includes('deepseek')) || models[0];
                setSelectedModel(defaultModel);
            }
        } catch (e) {
            console.error("Failed to load models:", e);
        }
    };

    const loadMatches = async () => {
        if (!window.electron) return;
        setLoading(true);
        try {
            // Fetch scores (includes upcoming matches)
            const data = await window.electron.espnGetScores();
            // Filter for upcoming and sim-able (has internalId)
            const upcoming = data?.filter((m: any) =>
                m.statusState === 'pre' &&
                m.home.internalId &&
                m.away.internalId
            ) || [];
            setMatches(upcoming);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const addToSlip = (match: Match, selection: '1' | 'X' | '2') => {
        if (slip.find(s => s.matchId === match.id)) return; // Already in slip
        if (!match.home.internalId || !match.away.internalId) return;

        const bet: BetSelection = {
            matchId: match.id,
            homeId: match.home.internalId,
            awayId: match.away.internalId,
            homeName: match.home.shortName,
            awayName: match.away.shortName,
            selection
        };
        setSlip([...slip, bet]);
        setVerification(null); // Reset verification on change
        setAiAnalysis(null);
    };

    const removeFromSlip = (matchId: string) => {
        setSlip(slip.filter(s => s.matchId !== matchId));
        setVerification(null);
        setAiAnalysis(null);
    };

    const verifySlip = async () => {
        if (!window.electron || slip.length === 0) return;
        setVerifying(true);
        try {
            const results = await window.electron.verifyBetSlip(slip);
            setVerification(results);
        } catch (e) {
            console.error(e);
        } finally {
            setVerifying(false);
        }
    };

    const askAi = async () => {
        if (!window.electron || slip.length === 0) return;
        setAnalyzing(true);
        try {
            // Pass selected model
            const res = await window.electron.analyzeBetSlip(slip, selectedModel);
            setAiAnalysis(res.analysis || res.error);
        } catch (e) {
            console.error(e);
        } finally {
            setAnalyzing(false);
        }
    };

    const getSelectionLabel = (sel: string, home: string, away: string) => {
        if (sel === '1') return `${home} Win`;
        if (sel === 'X') return 'Draw';
        return `${away} Win`;
    };

    return (
        <div className="min-h-screen text-white p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column: Match Feed */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-white flex items-center gap-3">
                            <Ticket className="text-emerald-400" /> Bet Center
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">Build and verify virtual slips with Monte Carlo simulation</p>
                    </div>
                    <button onClick={loadMatches} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="space-y-3">
                    {matches.length === 0 && !loading && <div className="p-10 text-center text-slate-500">No sim-able matches found.</div>}
                    {matches?.map(m => (
                        <div key={m.id} className="glass-card p-4 flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                            <div className="flex-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                                    <span className="text-lg">{m.leagueIcon}</span> {m.leagueName}
                                </span>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 w-32 justify-end">
                                        <span className="font-bold text-sm text-right">{m.home.shortName}</span>
                                        {m.home.logo && <img src={m.home.logo} className="w-6 h-6 object-contain" />}
                                    </div>
                                    <span className="text-xs text-slate-600 font-mono">VS</span>
                                    <div className="flex items-center gap-2 w-32">
                                        {m.away.logo && <img src={m.away.logo} className="w-6 h-6 object-contain" />}
                                        <span className="font-bold text-sm">{m.away.shortName}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Odds / Selection Buttons */}
                            <div className="flex items-center gap-2 ml-4">
                                <button onClick={() => addToSlip(m, '1')} className="px-4 py-2 bg-slate-800 rounded hover:bg-emerald-600 transition-colors text-xs font-bold font-mono">1</button>
                                <button onClick={() => addToSlip(m, 'X')} className="px-4 py-2 bg-slate-800 rounded hover:bg-emerald-600 transition-colors text-xs font-bold font-mono">X</button>
                                <button onClick={() => addToSlip(m, '2')} className="px-4 py-2 bg-slate-800 rounded hover:bg-emerald-600 transition-colors text-xs font-bold font-mono">2</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Column: Virtual Slip */}
            <div className="space-y-6">
                <div className="glass-card p-0 overflow-hidden flex flex-col h-[calc(100vh-3rem)] sticky top-6">
                    <div className="p-4 border-b border-white/5 bg-emerald-500/5">
                        <h2 className="font-bold text-lg flex items-center gap-2">
                            <Ticket size={18} className="text-emerald-400" /> Virtual Slip
                            <span className="ml-auto text-xs font-mono bg-black/40 px-2 py-1 rounded text-slate-400">{slip.length} Legs</span>
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {slip.length === 0 && (
                            <div className="text-center py-10 text-slate-600 text-sm">
                                Select matches to build your slip
                            </div>
                        )}
                        {slip?.map((bet, idx) => {
                            const res = verification?.find(v => v.matchId === bet.matchId);
                            return (
                                <div key={bet.matchId} className="bg-white/5 rounded-lg p-3 relative group">
                                    <button
                                        onClick={() => removeFromSlip(bet.matchId)}
                                        className="absolute top-2 right-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        &times;
                                    </button>
                                    <div className="text-xs text-slate-500 mb-1">{bet.homeName} vs {bet.awayName}</div>
                                    <div className="font-bold text-emerald-400">
                                        {getSelectionLabel(bet.selection, bet.homeName, bet.awayName)}
                                    </div>

                                    {/* Verification Result */}
                                    {res && (
                                        <div className="mt-2 text-xs flex items-center justify-between border-t border-white/5 pt-2">
                                            <span className="text-slate-400">Sim Confidence:</span>
                                            <span className={`font-mono font-bold ${res.confidenceScore > 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                {res.confidenceScore}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Actions */}
                    <div className="p-4 border-t border-white/5 bg-black/20 space-y-3">
                        {verification && (
                            <div className="text-xs text-center text-slate-500 mb-2">
                                <span className="block mb-1 font-bold text-slate-300">Analysis Complete</span>
                                {verification.every(v => v.confidenceScore > 60) ?
                                    <span className="text-emerald-400 flex items-center justify-center gap-1"><CheckCircle size={12} /> High Confidence Slip</span> :
                                    <span className="text-amber-400 flex items-center justify-center gap-1"><AlertTriangle size={12} /> High Risk Detected</span>
                                }
                            </div>
                        )}

                        <button
                            onClick={verifySlip}
                            disabled={slip.length === 0 || verifying}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                        >
                            {verifying ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
                            Run 1000 Simulations
                        </button>

                        {/* AI Section with Model Selector */}
                        <div className="space-y-2 pt-2 border-t border-white/5">
                            {availableModels.length > 0 && (
                                <select
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-300"
                                >
                                    {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            )}

                            <button
                                onClick={askAi}
                                disabled={slip.length === 0 || analyzing}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                            >
                                {analyzing ? <RefreshCw className="animate-spin" size={16} /> : <Brain size={16} />}
                                Ask AI Analyst
                            </button>
                        </div>

                        {/* AI Output */}
                        {aiAnalysis && (
                            <div className="mt-4 bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-3 text-xs text-indigo-200 leading-relaxed max-h-40 overflow-y-auto">
                                <div className="flex items-center gap-2 mb-2 text-indigo-400 font-bold uppercase tracking-wider">
                                    <Brain size={12} /> AI Verdict ({selectedModel})
                                </div>
                                <div className="whitespace-pre-wrap">{aiAnalysis}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
