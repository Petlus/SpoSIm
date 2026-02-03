import React from 'react';
import { Cpu, Download, BrainCircuit, CheckCircle, Loader2 } from 'lucide-react';

interface AiSetupProps {
    status: 'idle' | 'running' | 'complete' | 'error';
    progress: { step: string; progress: number; detail: string };
}

export function AiSetupStatus({ status, progress }: AiSetupProps) {
    if (status === 'idle' || status === 'complete') return null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-slate-900/40 backdrop-blur-md border border-slate-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                {/* Emerald Glow */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-center gap-6 mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center shadow-lg">
                            <BrainCircuit size={32} className="text-emerald-400 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">AI Onboarding</h2>
                            <p className="text-emerald-400/80 font-mono text-sm mt-1">INITIALIZING NEURAL CORE</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-8">
                        <div className="flex justify-between text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">
                            <span>{progress.detail || 'Initializing...'}</span>
                            <span className="text-emerald-400">{progress.progress}%</span>
                        </div>
                        <div className="h-3 bg-slate-800/50 rounded-full overflow-hidden border border-white/5 relative">
                            <div
                                className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-500 ease-out relative"
                                style={{ width: `${Math.max(5, progress.progress)}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                            </div>
                        </div>
                    </div>

                    {/* Steps Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* Step 1: System Integrity */}
                        <div className={`p-4 rounded-xl border transition-all duration-300 ${progress.step === 'install_ollama' || progress.step === 'start_service' || progress.step === 'pull_model' || progress.step === 'done'
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-slate-800/20 border-white/5 opacity-50'
                            }`}>
                            <div className="flex items-center gap-3 mb-2">
                                <Cpu size={18} className={progress.step === 'install_ollama' ? 'text-emerald-400 animate-spin' : 'text-emerald-500'} />
                                <span className="text-sm font-semibold text-slate-200">System Integrity</span>
                            </div>
                            <div className="text-xs text-slate-500 font-mono">
                                {progress.step === 'install_ollama' ? 'Checking Runtime...' : 'Runtime Active'}
                            </div>
                        </div>

                        {/* Step 2: Core Download */}
                        <div className={`p-4 rounded-xl border transition-all duration-300 ${(progress.step === 'pull_model' || progress.step === 'done')
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-slate-800/20 border-white/5 opacity-50'
                            }`}>
                            <div className="flex items-center gap-3 mb-2">
                                <Download size={18} className={progress.step === 'pull_model' ? 'text-cyan-400 animate-bounce' : 'text-emerald-500'} />
                                <span className="text-sm font-semibold text-slate-200">Model Retrieval</span>
                            </div>
                            <div className="text-xs text-slate-500 font-mono">
                                {progress.step === 'pull_model' ? 'Downloading Weights...' : 'Weights Secured'}
                            </div>
                        </div>

                        {/* Step 3: Activation */}
                        <div className={`p-4 rounded-xl border transition-all duration-300 ${progress.step === 'done'
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-slate-800/20 border-white/5 opacity-50'
                            }`}>
                            <div className="flex items-center gap-3 mb-2">
                                <CheckCircle size={18} className={progress.step === 'done' ? 'text-emerald-400' : 'text-slate-600'} />
                                <span className="text-sm font-semibold text-slate-200">Activation</span>
                            </div>
                            <div className="text-xs text-slate-500 font-mono">
                                {progress.step === 'done' ? 'System Ready' : 'Pending...'}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
