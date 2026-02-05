'use client';

import { useState, useEffect } from 'react';
import { Settings, RefreshCw, Cpu, Database, Image, BarChart3, Users, Loader2, CheckCircle, AlertCircle, Download } from 'lucide-react';

export default function SettingsPage() {
    const [version, setVersion] = useState<string | null>(null);
    const [ollamaStatus, setOllamaStatus] = useState<{ installed: boolean; running: boolean; error?: string } | null>(null);
    const [setupStatus, setSetupStatus] = useState<{ ollamaInstalled?: boolean; modelDownloaded?: boolean; setupComplete?: boolean } | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [syncingLogos, setSyncingLogos] = useState(false);
    const [syncingStandings, setSyncingStandings] = useState(false);
    const [syncingPlayers, setSyncingPlayers] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);
    const [checkingUpdates, setCheckingUpdates] = useState(false);
    const [updateMessage, setUpdateMessage] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted || typeof window === 'undefined' || !window.electron) return;
        window.electron.getAppVersion().then(setVersion).catch(() => setVersion('—'));
        window.electron.checkOllamaStatus().then(setOllamaStatus).catch(() => setOllamaStatus(null));
        window.electron.getSetupStatus().then(setSetupStatus).catch(() => setSetupStatus(null));
    }, [mounted]);

    const handleRefreshData = async () => {
        if (!window.electron?.updateData) return;
        setRefreshing(true);
        setLastError(null);
        try {
            const res = await window.electron.updateData();
            if (res?.error) setLastError(res.error);
        } catch (e) {
            setLastError(e instanceof Error ? e.message : 'Update failed');
        } finally {
            setRefreshing(false);
        }
    };

    const handleSyncLogos = async () => {
        if (!window.electron?.espnSyncLogos) return;
        setSyncingLogos(true);
        setLastError(null);
        try {
            const res = await window.electron.espnSyncLogos();
            if (res?.error) setLastError(res.error);
        } catch (e) {
            setLastError(e instanceof Error ? e.message : 'Sync failed');
        } finally {
            setSyncingLogos(false);
        }
    };

    const handleSyncStandings = async () => {
        if (!window.electron?.espnSyncStandings) return;
        setSyncingStandings(true);
        setLastError(null);
        try {
            const res = await window.electron.espnSyncStandings();
            if (res?.error) setLastError(res.error);
        } catch (e) {
            setLastError(e instanceof Error ? e.message : 'Sync failed');
        } finally {
            setSyncingStandings(false);
        }
    };

    const handleSyncPlayers = async () => {
        if (!window.electron?.espnSyncPlayerRatings) return;
        setSyncingPlayers(true);
        setLastError(null);
        try {
            const res = await window.electron.espnSyncPlayerRatings();
            if (res?.error) setLastError(res.error);
        } catch (e) {
            setLastError(e instanceof Error ? e.message : 'Sync failed');
        } finally {
            setSyncingPlayers(false);
        }
    };

    const handleStartOllama = async () => {
        if (!window.electron?.startOllama) return;
        try {
            await window.electron.startOllama();
            const status = await window.electron.checkOllamaStatus();
            setOllamaStatus(status);
        } catch (e) {
            setLastError(e instanceof Error ? e.message : 'Could not start Ollama');
        }
    };

    const handleCheckForUpdates = async () => {
        if (!window.electron?.checkForUpdates) return;
        setCheckingUpdates(true);
        setUpdateMessage(null);
        setLastError(null);
        try {
            const res = await window.electron.checkForUpdates();
            setUpdateMessage(res?.message ?? (res?.available ? `Update ${res?.version} available` : 'No update available'));
        } catch (e) {
            setLastError(e instanceof Error ? e.message : 'Check failed');
        } finally {
            setCheckingUpdates(false);
        }
    };

    const inElectron = mounted && typeof window !== 'undefined' && !!window.electron;

    return (
        <div className="relative min-h-full p-8 max-w-3xl mx-auto overflow-hidden">
            {/* Video background */}
            <video
                autoPlay
                muted
                loop
                playsInline
                className="fixed inset-0 w-full h-full object-cover opacity-[0.12] pointer-events-none -z-10"
            >
                <source src="/startup.mp4" type="video/mp4" />
            </video>
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-slate-800/50 border border-white/10 flex items-center justify-center">
                    <Settings size={24} className="text-slate-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Settings</h1>
                    <p className="text-slate-500 text-sm">App configuration and data sync</p>
                </div>
            </div>

            {lastError && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400">
                    <AlertCircle size={20} />
                    <span className="text-sm">{lastError}</span>
                </div>
            )}

            {!inElectron && (
                <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
                    Settings require the Electron app. Run via <code className="bg-black/30 px-1 rounded">npm run dev</code> or the desktop app.
                </div>
            )}

            <div className="space-y-6">
                {/* App Info */}
                <section className="glass-card p-6">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">App</h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-300">Version</span>
                            <span className="font-mono text-emerald-400">{version ?? '—'}</span>
                        </div>
                        {inElectron && (
                            <>
                                <button
                                    onClick={handleCheckForUpdates}
                                    disabled={checkingUpdates}
                                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors disabled:opacity-50"
                                >
                                    <span className="flex items-center gap-3">
                                        <Download size={18} className={checkingUpdates ? 'animate-pulse text-cyan-400' : 'text-slate-400'} />
                                        <span className="text-slate-200">Check for updates</span>
                                    </span>
                                    {checkingUpdates && <Loader2 size={18} className="animate-spin text-cyan-400" />}
                                </button>
                                {updateMessage && (
                                    <p className="text-xs text-slate-400">{updateMessage}</p>
                                )}
                            </>
                        )}
                    </div>
                </section>

                {/* Data */}
                <section className="glass-card p-6">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Database size={16} /> Data
                    </h2>
                    <div className="space-y-3">
                        <button
                            onClick={handleRefreshData}
                            disabled={!inElectron || refreshing}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors disabled:opacity-50"
                        >
                            <span className="flex items-center gap-3">
                                <RefreshCw size={18} className={refreshing ? 'animate-spin text-cyan-400' : 'text-slate-400'} />
                                <span className="text-slate-200">Refresh all data</span>
                            </span>
                            {refreshing && <Loader2 size={18} className="animate-spin text-cyan-400" />}
                        </button>
                        <p className="text-xs text-slate-500">Fetches leagues, teams, fixtures from APIs (respects 24h cooldown)</p>
                    </div>
                </section>

                {/* ESPN Sync */}
                <section className="glass-card p-6">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <BarChart3 size={16} /> ESPN Sync
                    </h2>
                    <div className="space-y-3">
                        <button
                            onClick={handleSyncLogos}
                            disabled={!inElectron || syncingLogos}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors disabled:opacity-50"
                        >
                            <span className="flex items-center gap-3">
                                <Image size={18} className={syncingLogos ? 'animate-pulse text-emerald-400' : 'text-slate-400'} />
                                <span className="text-slate-200">Sync team logos</span>
                            </span>
                            {syncingLogos && <Loader2 size={18} className="animate-spin text-emerald-400" />}
                        </button>
                        <button
                            onClick={handleSyncStandings}
                            disabled={!inElectron || syncingStandings}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors disabled:opacity-50"
                        >
                            <span className="flex items-center gap-3">
                                <BarChart3 size={18} className={syncingStandings ? 'animate-pulse text-emerald-400' : 'text-slate-400'} />
                                <span className="text-slate-200">Sync standings</span>
                            </span>
                            {syncingStandings && <Loader2 size={18} className="animate-spin text-emerald-400" />}
                        </button>
                        <button
                            onClick={handleSyncPlayers}
                            disabled={!inElectron || syncingPlayers}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors disabled:opacity-50"
                        >
                            <span className="flex items-center gap-3">
                                <Users size={18} className={syncingPlayers ? 'animate-pulse text-emerald-400' : 'text-slate-400'} />
                                <span className="text-slate-200">Sync player ratings (goals, assists)</span>
                            </span>
                            {syncingPlayers && <Loader2 size={18} className="animate-spin text-emerald-400" />}
                        </button>
                        <p className="text-xs text-slate-500">Updates Golden Boot and player stats from ESPN</p>
                    </div>
                </section>

                {/* AI / Ollama */}
                <section className="glass-card p-6">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Cpu size={16} /> AI (Ollama)
                    </h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 border border-white/10">
                            <span className="text-slate-300">Status</span>
                            {ollamaStatus?.running ? (
                                <span className="flex items-center gap-2 text-emerald-400">
                                    <CheckCircle size={16} /> Running
                                </span>
                            ) : ollamaStatus?.installed ? (
                                <span className="flex items-center gap-2 text-amber-400">
                                    <AlertCircle size={16} /> Installed, not running
                                </span>
                            ) : (
                                <span className="flex items-center gap-2 text-slate-500">Not installed</span>
                            )}
                        </div>
                        {ollamaStatus?.installed && !ollamaStatus?.running && (
                            <button
                                onClick={handleStartOllama}
                                disabled={!inElectron}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 transition-colors disabled:opacity-50"
                            >
                                <Cpu size={18} /> Start Ollama
                            </button>
                        )}
                        {setupStatus?.setupComplete && (
                            <p className="text-xs text-emerald-400/80 flex items-center gap-1">
                                <CheckCircle size={12} /> AI setup complete
                            </p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
