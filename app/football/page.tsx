'use client';

import React, { useEffect, useState } from 'react';

export default function FootballHome() {
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        (async () => {
            try {
                const d = await (window as any).electron.getData('football');
                setData(d);
            } catch (e) { console.error(e); }
        })();
    }, []);

    if (!data) return <div className="p-10 text-slate-400">Loading Leagues...</div>;

    return (
        <div className="min-h-screen p-8 bg-slate-950 text-white">
            <header className="mb-12">
                <a href="/" className="text-slate-500 hover:text-cyan-400 mb-4 inline-block">← Back to Hub</a>
                <h1 className="text-4xl font-extrabold text-white">Select Competition</h1>
                <p className="text-slate-400 mt-2">Choose a league to manage and simulate.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {data.leagues.map((league: any) => (
                    <a key={league.id} href={`/football/${league.id}`} className="block p-6 rounded-2xl bg-slate-900 border border-white/5 hover:border-cyan-500 hover:bg-slate-800 transition-all group">
                        <div className="text-4xl mb-4 grayscale group-hover:grayscale-0 transition-all">
                            {/* Placeholder icon if no logo, or use emoji flag logic */}
                            ⚽
                        </div>
                        <h3 className="text-xl font-bold mb-2">{league.name}</h3>
                        <p className="text-sm text-slate-400">{league.teams?.length || 0} Teams</p>
                        <div className="mt-4 flex items-center text-cyan-500 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                            Load Season →
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
}
