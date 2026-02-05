export interface ElectronAPI {
    getAppVersion: () => Promise<string>;
    getData: (category: 'football' | 'f1') => Promise<unknown>;
    updateData: () => Promise<{ success: boolean; error?: string }>;
    getFixtures: (leagueId: number, matchday?: number) => Promise<{
        currentMatchday: number;
        minMatchday: number;
        maxMatchday: number;
        matches: Array<{
            id: number;
            home: { id: number; name: string; logo: string | null };
            away: { id: number; name: string; logo: string | null };
            homeScore: number | null;
            awayScore: number | null;
            status: string;
            date: string | null;
        }>;
    }>;
    simulateMatchday: (leagueId: number) => Promise<unknown>;
    simulateTournamentRound: (leagueId: number) => Promise<{ round: string | null; count?: number; message?: string }>;
    getTournamentBracket: (leagueId: number) => Promise<{
        playoffs?: any[];
        r16?: any[];
        qf?: any[];
        sf?: any[];
        final?: any;
    } | null>;
    simulateMatch: (data: { homeId: number; awayId: number }) => Promise<unknown>;
    simulateSingleMatch: (matchId: number) => Promise<{ homeGoals: number; awayGoals: number }>;
    simulateF1Race: (trackId: string) => Promise<unknown>;
    getMatchOdds: (homeId: number, awayId: number) => Promise<unknown>;
    getAdvancedAnalysis: (homeId: number, awayId: number) => Promise<unknown>;
    getTeamDetails: (teamId: number) => Promise<unknown>;
    checkOllamaStatus: () => Promise<{
        installed: boolean;
        running: boolean;
        downloadUrl?: string;
        error?: string;
    }>;
    startOllama: () => Promise<unknown>;
    getAiPrediction: (
        homeId: number,
        awayId: number,
        odds: unknown
    ) => Promise<{ success?: boolean; text?: string; error?: string }>;
    getSetupStatus: () => Promise<{
        ollamaInstalled?: boolean;
        modelDownloaded?: boolean;
        setupComplete?: boolean;
    }>;
    on: (
        channel: string,
        fn: (event: unknown, ...args: unknown[]) => void
    ) => () => void;
}

declare global {
    interface Window {
        electron?: ElectronAPI;
    }
}

export {};
