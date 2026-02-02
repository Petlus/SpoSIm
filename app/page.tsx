'use client';

import React from 'react';

export default function Home() {
    return (
        <div className="min-h-screen p-8 bg-slate-950 text-white">
            <header className="mb-12 flex justify-between items-center">
                <div>
                    <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-600 tracking-tight">
                        SPORSIM
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg">Season 2025/2026 Simulation Engine</p>
                </div>
                <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-xs font-mono text-slate-400">
                    v0.1.0-alpha
                </div>
            </header>

            <main className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {/* Football Card */}
                <div className="group relative p-8 rounded-3xl bg-slate-900 border border-white/5 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-[0_0_40px_-10px_rgba(6,182,212,0.3)] overflow-hidden cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3 bg-cyan-950/50 rounded-xl border border-cyan-500/20 text-cyan-400">
                                ⚽
                            </div>
                            <span className="text-xs font-bold bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded">LIVE</span>
                        </div>

                        <h2 className="text-3xl font-bold mb-2 group-hover:text-cyan-400 transition-colors">Football</h2>
                        <p className="text-slate-400 mb-6 line-clamp-2">
                            Simulate Bundesliga, Premier League, and Champions League. Manage rotation, injuries, and tactical setups.
                        </p>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-slate-500 border-b border-white/5 pb-1">
                                <span>Bundesliga</span>
                                <span className="text-slate-300">Week 19</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-500 border-b border-white/5 pb-1">
                                <span>Premier League</span>
                                <span className="text-slate-300">Week 22</span>
                            </div>
                        </div>

                        <a href="/football" className="block text-center mt-8 w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-cyan-900/20">
                            Enter Simulation
                        </a>
                    </div>
                </div>

                {/* F1 Card */}
                <div className="group relative p-8 rounded-3xl bg-slate-900 border border-white/5 hover:border-purple-500/50 transition-all duration-300 hover:shadow-[0_0_40px_-10px_rgba(168,85,247,0.3)] overflow-hidden cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3 bg-purple-950/50 rounded-xl border border-purple-500/20 text-purple-400">
                                🏎️
                            </div>
                            <span className="text-xs font-bold bg-purple-500/10 text-purple-400 px-2 py-1 rounded">PRE-SEASON</span>
                        </div>

                        <h2 className="text-3xl font-bold mb-2 group-hover:text-purple-400 transition-colors">Formula 1</h2>
                        <p className="text-slate-400 mb-6 line-clamp-2">
                            Next-gen racing simulation. Data-driven track analysis, tyre strategies, and weather dynamism.
                        </p>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-slate-500 border-b border-white/5 pb-1">
                                <span>Constructor Standings</span>
                                <span className="text-slate-300">Reset</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-500 border-b border-white/5 pb-1">
                                <span>Next Race</span>
                                <span className="text-slate-300">Bahrain GP</span>
                            </div>
                        </div>

                        <a href="/f1" className="block text-center mt-8 w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-purple-900/20">
                            Enter Simulation
                        </a>
                    </div>
                </div>

            </main>
        </div>
    );
}
