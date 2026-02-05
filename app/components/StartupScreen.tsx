'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, Circle, Database, Cpu, BrainCircuit } from 'lucide-react';

interface StartupScreenProps {
    status: 'idle' | 'running' | 'complete' | 'error';
    progress: { step: string; progress: number; detail: string };
}

function formatElapsed(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function StartupScreen({ status, progress }: StartupScreenProps) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (status !== 'running') return;
        const start = Date.now();
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - start) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [status]);

    if (status === 'idle' || status === 'complete') return null;

    const dbDone = true;
    const ollamaDone = (progress.step === 'start_service' && progress.progress >= 100) || ['pull_model', 'done'].includes(progress.step);
    const modelDone = progress.step === 'done' || (progress.step === 'pull_model' && progress.progress >= 100);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-slate-950">
            {/* Video Background */}
            <div className="absolute inset-0">
                <video
                    src="/startup.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-40"
                />
                <div className="absolute inset-0 bg-slate-950/70" />
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-xl mx-auto px-8 flex flex-col items-center">
                {/* Logo / Title */}
                <div className="flex items-center gap-4 mb-12">
                    <img src="/logo.png" alt="BetBrain" className="w-16 h-16 rounded-xl object-contain" />
                    <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-600 tracking-tight">
                        BetBrain
                    </h1>
                </div>

                {/* Checklist */}
                <div className="w-full space-y-4 mb-12">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-700/80 backdrop-blur-sm">
                        {dbDone ? (
                            <CheckCircle size={24} className="text-emerald-500 flex-shrink-0" />
                        ) : (
                            <Circle size={24} className="text-slate-500 flex-shrink-0" />
                        )}
                        <div className="flex items-center gap-2">
                            <Database size={18} className="text-slate-400" />
                            <span className="text-slate-200 font-medium">Database</span>
                        </div>
                        <span className="ml-auto text-xs text-slate-500 font-mono">Ready</span>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-700/80 backdrop-blur-sm">
                        {ollamaDone ? (
                            <CheckCircle size={24} className="text-emerald-500 flex-shrink-0" />
                        ) : (
                            <Circle size={24} className="text-slate-500 flex-shrink-0" />
                        )}
                        <div className="flex items-center gap-2">
                            <Cpu size={18} className="text-slate-400" />
                            <span className="text-slate-200 font-medium">Ollama Runtime</span>
                        </div>
                        <span className="ml-auto text-xs text-slate-500 font-mono">
                            {ollamaDone ? 'Active' : progress.step === 'install_ollama' ? `${progress.progress}%` : 'Checking...'}
                        </span>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-700/80 backdrop-blur-sm">
                        {modelDone ? (
                            <CheckCircle size={24} className="text-emerald-500 flex-shrink-0" />
                        ) : (
                            <Circle size={24} className="text-slate-500 flex-shrink-0" />
                        )}
                        <div className="flex items-center gap-2">
                            <BrainCircuit size={18} className="text-slate-400" />
                            <span className="text-slate-200 font-medium">AI Model</span>
                        </div>
                        <span className="ml-auto text-xs text-slate-500 font-mono">
                            {modelDone ? 'Ready' : progress.step === 'pull_model' ? `${progress.progress}%` : 'Pending'}
                        </span>
                    </div>
                </div>

                {/* Status Bar */}
                <div className="w-full rounded-xl bg-slate-900/80 border border-slate-700/80 backdrop-blur-sm p-4">
                    <div className="flex justify-between text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">
                        <span>{progress.detail || 'Initializing...'}</span>
                        <span className="text-cyan-400">{formatElapsed(elapsed)}</span>
                    </div>
                    <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500 ease-out"
                            style={{ width: `${Math.max(2, Math.min(100, progress.progress))}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
