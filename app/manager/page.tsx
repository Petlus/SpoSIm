'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, Wallet, Users, Calendar, TrendingUp, ArrowRight } from 'lucide-react';

export default function ManagerPage() {
    const [manager, setManager] = useState<any>(null);
    const [team, setTeam] = useState<any>(null);

    // Placeholder Data - Would be fetched from DB
    useEffect(() => {
        // Simulate fetching manager data
        setManager({
            name: "Manager",
            teamId: null,
            reputation: 0,
        });
    }, []);

    if (!manager) return <div className="p-10 text-slate-400">Loading...</div>;

    // If no team selected, show team selection
    if (!manager.teamId) {
        return (
            <div className="p-10 max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold text-white mb-4">Manager Mode</h1>
                <p className="text-slate-400 mb-10">Select a team to begin your career.</p>

                <div className="glass-card p-8 text-center">
                    <Building2 size={48} className="mx-auto text-slate-600 mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">No Team Selected</h2>
                    <p className="text-slate-400 text-sm mb-6">
                        Go to a League and select a team to take control.
                    </p>
                    <Link href="/football" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-white transition-all">
                        Browse Leagues <ArrowRight size={18} />
                    </Link>
                </div>
            </div>
        );
    }

    // Manager Dashboard
    return (
        <div className="p-10 max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-8">Office</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Budget Card */}
                <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Wallet size={24} className="text-green-400" />
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Club Finances</h3>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">€50M</div>
                    <p className="text-sm text-slate-500">Transfer Budget: €20M</p>
                </div>

                {/* Squad Card */}
                <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Users size={24} className="text-blue-400" />
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Squad</h3>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">25</div>
                    <p className="text-sm text-slate-500">First Team Players</p>
                </div>

                {/* Morale Card */}
                <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <TrendingUp size={24} className="text-purple-400" />
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Team Morale</h3>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">High</div>
                    <p className="text-sm text-green-400">+5% Performance Boost</p>
                </div>
            </div>

            {/* Next Match */}
            <div className="mt-8 glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Calendar size={24} className="text-cyan-400" />
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Next Match</h3>
                </div>
                <p className="text-slate-500 text-sm">No upcoming matches scheduled.</p>
            </div>
        </div>
    );
}
