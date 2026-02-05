'use client';

import { useState, useEffect } from 'react';
import { Download, RefreshCw } from 'lucide-react';

export function UpdateNotification() {
    const [status, setStatus] = useState<'idle' | 'available' | 'downloading' | 'downloaded'>('idle');
    const [inElectron, setInElectron] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.electron?.on) return;
        setInElectron(true);

        const unsubAvailable = window.electron.on('update-available', () => {
            setStatus('available');
        });
        const unsubDownloaded = window.electron.on('update-downloaded', () => {
            setStatus('downloaded');
        });

        return () => {
            unsubAvailable?.();
            unsubDownloaded?.();
        };
    }, []);

    if (!inElectron || status === 'idle') return null;

    const messages: Record<string, { text: string; icon: React.ReactNode }> = {
        available: { text: 'Update available, downloading...', icon: <Download size={14} /> },
        downloading: { text: 'Downloading update...', icon: <Download size={14} /> },
        downloaded: { text: 'Update ready! Restarting...', icon: <RefreshCw size={14} /> },
    };
    const { text, icon } = messages[status] || messages.available;

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-sm shadow-lg backdrop-blur-sm">
            {icon}
            <span>{text}</span>
        </div>
    );
}
