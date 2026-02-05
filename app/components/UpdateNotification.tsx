'use client';

import { useState, useEffect } from 'react';
import { Download, RefreshCw, AlertCircle } from 'lucide-react';

export function UpdateNotification() {
    const [status, setStatus] = useState<'idle' | 'available' | 'downloading' | 'downloaded' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [inElectron, setInElectron] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.electron?.on) return;
        setInElectron(true);

        const unsubAvailable = window.electron.on('update-available', () => {
            setStatus('available');
            setErrorMessage(null);
        });
        const unsubProgress = window.electron.on('update-download-progress', (_e: unknown, data?: unknown) => {
            setStatus('downloading');
            setProgress((data as { percent?: number })?.percent ?? 0);
            setErrorMessage(null);
        });
        const unsubDownloaded = window.electron.on('update-downloaded', () => {
            setStatus('downloaded');
            setProgress(100);
            setErrorMessage(null);
        });
        const unsubError = window.electron.on('update-error', (_e: unknown, data?: unknown) => {
            setStatus('error');
            setErrorMessage((data as { message?: string })?.message ?? 'Update failed');
        });

        return () => {
            unsubAvailable?.();
            unsubProgress?.();
            unsubDownloaded?.();
            unsubError?.();
        };
    }, []);

    if (!inElectron || status === 'idle') return null;

    const messages: Record<string, { text: string; icon: React.ReactNode }> = {
        available: { text: 'Update available, downloading...', icon: <Download size={14} /> },
        downloading: {
            text: progress > 0 ? `Downloading update... ${progress}%` : 'Downloading update...',
            icon: <Download size={14} />,
        },
        downloaded: { text: 'Update ready! Restarting in 2 seconds...', icon: <RefreshCw size={14} /> },
        error: { text: errorMessage ?? 'Update failed', icon: <AlertCircle size={14} /> },
    };
    const { text, icon } = messages[status] || messages.available;
    const isError = status === 'error';

    return (
        <div
            className={`fixed bottom-4 right-4 z-[100] flex items-center gap-2 px-4 py-2 rounded-lg text-sm shadow-lg backdrop-blur-sm ${
                isError
                    ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                    : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
            }`}
        >
            {icon}
            <span>{text}</span>
        </div>
    );
}
