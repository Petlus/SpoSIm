'use client';

import { useState, useEffect } from 'react';
import { Building2, Wallet, Users, Calendar, TrendingUp, ArrowRight, Mail, Briefcase, Bell, CheckCircle, AlertCircle, ExternalLink, Activity } from 'lucide-react';
import Link from 'next/link';

export default function ManagerPage() {
    const [manager, setManager] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'inbox' | 'finances'>('overview');
    const [selectedEmail, setSelectedEmail] = useState<number | null>(null);

    // Simulated Inbox Data
    const EMAILS = [
        { id: 1, from: 'The Board', subject: 'Expectations for the Season', date: 'Yesterday', urgent: true, body: 'The board expects a top 4 finish this season. We have allocated a transfer budget of €20M to help you achieve this goal.' },
        { id: 2, from: 'Chief Scout', subject: 'Scouting Report: Wonderkid found', date: '2h ago', urgent: false, body: 'We have found a 17-year-old striker in Brazil who could be the next big thing. Recommend immediate scouting trip.' },
        { id: 3, from: 'Assistant Manager', subject: 'Training Report', date: 'Just now', urgent: false, body: 'The team morale is high after the last session. Several players are showing great improvements in fitness.' },
    ];

    useEffect(() => {
        // Simulate fetching manager data with a delay for realism
        setTimeout(() => {
            setManager({
                name: "Head Coach",
                teamId: null, // Change to a number (e.g., 20) to see the dashboard view
                reputation: 75,
                clubName: 'BetBrain FC',
                balance: 50000000,
                transferBudget: 20000000,
                wageBudget: 150000,
                boardTrust: 85,
                fanSupport: 92
            });
        }, 800);
    }, []);

    if (!manager) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-emerald-500 animate-spin" />
                <p className="text-slate-400 font-medium animate-pulse">Opening Office...</p>
            </div>
        </div>
    );

    // --- NO TEAM SELECTED STATE ---
    if (!manager.teamId) {
        return (
            <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6">
                {/* Background Atmosphere */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522770179533-24471fcdba45?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />

                <div className="relative z-10 max-w-4xl w-full text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6 animate-fade-in">
                        <Briefcase size={12} /> Career Mode
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight animate-scale-in">
                        Start Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Legacy</span>
                    </h1>

                    <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in" style={{ animationDelay: '100ms' }}>
                        Take control of a club, manage finances, tactics, and lead your team to glory. The world is watching.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-fade-in" style={{ animationDelay: '200ms' }}>
                        <div className="glass-card p-6 border-emerald-500/20 hover:border-emerald-500/40 transition-colors group">
                            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Building2 className="text-emerald-400" size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Select Club</h3>
                            <p className="text-sm text-slate-500">Choose from over 100 clubs across major European leagues.</p>
                        </div>
                        <div className="glass-card p-6 border-blue-500/20 hover:border-blue-500/40 transition-colors group">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <TrendingUp className="text-blue-400" size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Build Strategy</h3>
                            <p className="text-sm text-slate-500">Set tactics, formations, and manage player morale.</p>
                        </div>
                        <div className="glass-card p-6 border-purple-500/20 hover:border-purple-500/40 transition-colors group">
                            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Users className="text-purple-400" size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Transfer Market</h3>
                            <p className="text-sm text-slate-500">Scout talents and negotiate blockbuster transfers.</p>
                        </div>
                    </div>

                    <Link href="/football" className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black hover:bg-slate-200 rounded-xl font-bold text-lg transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)] animate-fade-in" style={{ animationDelay: '300ms' }}>
                        Browse Teams <ArrowRight size={20} />
                    </Link>
                </div>
            </div>
        );
    }

    // --- MANAGER DASHBOARD ---
    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-10 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center shadow-lg">
                        <Users size={32} className="text-slate-400" />
                    </div>
                    <div>
                        <div className="text-sm text-emerald-400 font-bold uppercase tracking-wider mb-1">Head Coach</div>
                        <h1 className="text-3xl font-black text-white">{manager.name}</h1>
                        <div className="text-slate-400 text-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Online at {manager.clubName}
                        </div>
                    </div>
                </div>

                <div className="flex bg-black/40 rounded-xl p-1 text-sm border border-white/5 backdrop-blur-md">
                    <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${activeTab === 'overview' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                        <Activity size={16} /> Overview
                    </button>
                    <button onClick={() => setActiveTab('inbox')} className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${activeTab === 'inbox' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                        <Mail size={16} /> Inbox <span className="bg-rose-500 text-white text-[10px] px-1.5 rounded-full">{EMAILS.length}</span>
                    </button>
                    <button onClick={() => setActiveTab('finances')} className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${activeTab === 'finances' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                        <Wallet size={16} /> Finances
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Left Column: Stats & Status */}
                <div className="col-span-1 space-y-6">
                    {/* Board Trust Card */}
                    <div className="glass-card p-6 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Board Trust</h3>
                            <Briefcase size={16} className="text-emerald-400" />
                        </div>
                        <div className="relative pt-2">
                            <div className="text-4xl font-black text-white mb-1">{manager.boardTrust}%</div>
                            <div className="text-xs text-emerald-400 font-bold mb-3">Very Secure</div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${manager.boardTrust}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Finance Mini-Card */}
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Budget</h3>
                            <Wallet size={16} className="text-amber-400" />
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Transfer Funds</div>
                            <div className="text-xl font-mono font-bold text-white mb-3">€{(manager.transferBudget / 1000000).toFixed(1)}M</div>

                            <div className="text-xs text-slate-500 mb-1">Wage Budget</div>
                            <div className="text-lg font-mono font-bold text-slate-300">€{(manager.wageBudget / 1000).toFixed(0)}k <span className="text-xs font-normal">/ week</span></div>
                        </div>
                    </div>
                </div>

                {/* Center/Right: Main Content based on Tab */}
                <div className="col-span-1 lg:col-span-3">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Next Match Promo */}
                            <div className="md:col-span-2 glass-card p-0 overflow-hidden relative group">
                                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2093&auto=format&fit=crop')] bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity duration-700"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/80 to-transparent"></div>

                                <div className="relative p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                                    <div className="text-center md:text-left">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-white/10 backdrop-blur border border-white/10 text-xs font-bold text-white uppercase tracking-wider mb-4">
                                            <Calendar size={12} /> Next Matchday
                                        </div>
                                        <h2 className="text-3xl font-black text-white mb-2">Derby Day Approaches</h2>
                                        <p className="text-slate-400 max-w-md">Your squad is preparing for the crucial upcoming fixture. Training intensity has been increased.</p>
                                    </div>

                                    <div className="flex items-center gap-6 bg-black/30 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                                        <div className="text-center">
                                            <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-emerald-500 flex items-center justify-center text-2xl mb-2">🦁</div>
                                            <div className="font-bold text-white">BetBrain</div>
                                        </div>
                                        <div className="text-2xl font-black text-slate-500">VS</div>
                                        <div className="text-center">
                                            <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-2xl mb-2">🛡️</div>
                                            <div className="font-bold text-slate-400">Rival</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Emails Widget */}
                            <div className="glass-card p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <Mail size={16} className="text-sky-400" /> Inbox
                                    </h3>
                                    <button onClick={() => setActiveTab('inbox')} className="text-xs text-sky-400 hover:text-white transition-colors">View All</button>
                                </div>
                                <div className="space-y-3">
                                    {EMAILS.slice(0, 3).map(email => (
                                        <div key={email.id} className="flex gap-3 items-start p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5">
                                            <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${email.urgent ? 'bg-rose-500 animate-pulse' : 'bg-sky-500'}`}></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <span className="text-xs font-bold text-white truncate">{email.from}</span>
                                                    <span className="text-[10px] text-slate-500">{email.date}</span>
                                                </div>
                                                <div className="text-xs text-slate-400 truncate">{email.subject}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Assistant Report */}
                            <div className="glass-card p-6">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                                    <CheckCircle size={16} className="text-purple-400" /> Tasks
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 opacity-50">
                                        <div className="w-5 h-5 rounded border border-slate-600 flex items-center justify-center text-slate-400 text-xs">✓</div>
                                        <span className="text-sm text-slate-400 line-through">Submit squad registration</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded border border-emerald-500 flex items-center justify-center text-transparent hover:text-emerald-500 cursor-pointer transition-colors"></div>
                                        <span className="text-sm text-white">Renew contract for Top Scorer</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded border border-emerald-500 flex items-center justify-center text-transparent hover:text-emerald-500 cursor-pointer transition-colors"></div>
                                        <span className="text-sm text-white">Press Conference (14:00)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'inbox' && (
                        <div className="glass-card h-[600px] flex overflow-hidden">
                            {/* Email List */}
                            <div className="w-1/3 border-r border-white/5 overflow-y-auto">
                                {EMAILS.map(email => (
                                    <div
                                        key={email.id}
                                        onClick={() => setSelectedEmail(email.id)}
                                        className={`p-4 border-b border-white/5 cursor-pointer transition-colors ${selectedEmail === email.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                    >
                                        <div className="flex justify-between mb-1">
                                            <span className={`text-xs font-bold ${email.urgent ? 'text-rose-400' : 'text-slate-300'}`}>{email.from}</span>
                                            <span className="text-[10px] text-slate-500">{email.date}</span>
                                        </div>
                                        <div className="text-sm font-bold text-white mb-1 truncate">{email.subject}</div>
                                        <div className="text-xs text-slate-500 truncate">{email.body}</div>
                                    </div>
                                ))}
                            </div>
                            {/* Email Content */}
                            <div className="flex-1 p-8 bg-black/20">
                                {selectedEmail ? (
                                    (() => {
                                        const mail = EMAILS.find(e => e.id === selectedEmail);
                                        return mail ? (
                                            <div className="animate-fade-in">
                                                <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/5">
                                                    <div>
                                                        <h2 className="text-xl font-bold text-white mb-2">{mail.subject}</h2>
                                                        <div className="flex items-center gap-2 text-sm text-slate-400">
                                                            From: <span className="text-white font-medium">{mail.from}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-slate-500">{mail.date}</div>
                                                </div>
                                                <div className="text-slate-300 leading-relaxed text-sm">
                                                    {mail.body}
                                                    <br /><br />
                                                    <p className="text-slate-500 italic text-xs">This is a simulated message for demonstration.</p>
                                                </div>
                                                <div className="mt-8 flex gap-3">
                                                    <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-colors">Reply</button>
                                                    <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-lg transition-colors">Archive</button>
                                                </div>
                                            </div>
                                        ) : null;
                                    })()
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                        <Mail size={48} className="mb-4 opacity-20" />
                                        <p>Select a message to read</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'finances' && (
                        <div className="glass-card p-8 flex flex-col items-center justify-center h-[400px]">
                            <Wallet size={48} className="text-emerald-500 mb-4 opacity-50" />
                            <h2 className="text-2xl font-bold text-white mb-2">Financial Reports</h2>
                            <p className="text-slate-400 text-center max-w-md">Detailed financial breakdown and charts are coming in the next update.</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
