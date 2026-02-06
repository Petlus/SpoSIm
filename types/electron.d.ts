export interface EspnStandingEntry {
    espnId: string | null;
    internalId: number | null;
    team: string;
    shortName: string;
    logo: string | null;
    rank: number;
    rankChange: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    goalDifference_display: string;
    points: number;
    ppg: number;
    deductions: number;
    overallRecord: string;
    note: { color: string; description: string; rank: number } | null;
    league: string;
}

export interface EspnScore {
    id: string;
    name: string;
    shortName: string;
    date: string;
    status: string;
    statusDetail: string;
    statusState: 'pre' | 'in' | 'post';
    clock: string;
    period: number;
    isLive: boolean;
    isCompleted: boolean;
    venue: string | null;
    venueCity: string | null;
    attendance: number | null;
    league: string;
    leagueName: string;
    leagueIcon: string;
    home: {
        espnId: string | null;
        internalId: number | null;
        name: string;
        shortName: string;
        logo: string | null;
        score: string;
        winner: boolean;
        form: string;
        record: string;
    };
    away: {
        espnId: string | null;
        internalId: number | null;
        name: string;
        shortName: string;
        logo: string | null;
        score: string;
        winner: boolean;
        form: string;
        record: string;
    };
}

export interface EspnNewsArticle {
    id: string;
    headline: string;
    description: string;
    published: string;
    league: string;
    leagueName: string;
    leagueIcon: string;
    images: Array<{ url: string; caption: string; width: number; height: number }>;
    links: string | null;
    type: string;
    premium: boolean;
}

export interface EspnTeam {
    espnId: string;
    internalId: number | null;
    name: string;
    shortName: string;
    logo: string | null;
    color: string | null;
    alternateColor: string | null;
    league: string;
}

export interface EspnMatchSummary {
    boxscore: Array<{
        espnId: string;
        internalId: number | null;
        name: string;
        shortName: string;
        logo: string;
        color: string;
        stats: Record<string, string>;
    }>;
    keyEvents: Array<{
        id: string;
        type: string;
        typeName: string;
        text: string;
        shortText: string;
        minute: string;
        period: number;
        isGoal: boolean;
        team: { id: string; name: string } | null;
        player: string | null;
    }>;
    rosters: Array<{
        espnId: string;
        name: string;
        logo: string;
        players: Array<{
            id: string;
            name: string;
            position: string;
            jersey: string;
            starter: boolean;
            subbedIn: boolean;
            subbedOut: boolean;
            stats: unknown[];
        }>;
    }>;
    odds: Array<{
        provider: string;
        details: string;
        overUnder: number;
        spread: number;
        homeMoneyLine: number;
        awayMoneyLine: number;
    }>;
    h2h: Array<{
        id: string;
        date: string;
        name: string;
        score: string;
    }>;
    commentary: Array<{
        text: string;
        time: string;
        period: number;
    }>;
    venue: string | null;
    attendance: number | null;
}

export interface EspnTeamSchedule {
    team: {
        espnId: string;
        internalId: number | null;
        name: string;
        logo: string;
        record: string;
        standing: string;
    } | null;
    events: EspnScore[];
}

export interface EspnLeague {
    code: string;
    name: string;
    icon: string;
    internalCode: string;
    internalId: number;
}

export interface EspnRosterPlayer {
    espnId: string;
    name: string;
    firstName: string;
    lastName: string;
    age: number | null;
    jersey: string | null;
    position: 'GK' | 'DEF' | 'MID' | 'FWD' | 'SUB';
    positionName: string;
    citizenship: string;
    headshot: string | null;
    injured: boolean;
    appearances: number;
    subIns: number;
    goals: number;
    assists: number;
    shots: number;
    shotsOnTarget: number;
    yellowCards: number;
    redCards: number;
    foulsCommitted: number;
    saves: number;
    goalsConceded: number;
}

export interface ElectronAPI {
    getAppVersion: () => Promise<string>;
    checkForUpdates: () => Promise<{ available?: boolean; version?: string; message?: string; error?: string }>;
    search: (query: string) => Promise<{
        leagues: Array<{ id: number; name: string }>;
        teams: Array<{ id: number; name: string; shortName?: string; leagueId?: number; leagueName?: string }>;
        players: Array<{ id: number; name: string; goals?: number; teamId?: number; teamName?: string }>;
    }>;
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
        playoffs?: unknown[];
        r16?: unknown[];
        qf?: unknown[];
        sf?: unknown[];
        final?: unknown;
    } | null>;
    simulateMatch: (data: { homeId: number; awayId: number }) => Promise<unknown>;
    simulateSingleMatch: (matchId: number) => Promise<{ homeGoals: number; awayGoals: number }>;
    simulateF1Race: (trackId: string) => Promise<unknown>;
    getMatchOdds: (homeId: number, awayId: number) => Promise<unknown>;
    getAdvancedAnalysis: (homeId: number, awayId: number) => Promise<{
        odds: { homeWinProb: number; drawProb: number; awayWinProb: number };
        home: {
            id: number;
            name: string;
            form: string[];
            formFactor: number;
            scorers: { name: string; goals: number }[];
            injuries: { name: string; position: string }[];
        };
        away: {
            id: number;
            name: string;
            form: string[];
            formFactor: number;
            scorers: { name: string; goals: number }[];
            injuries: { name: string; position: string }[];
        };
        h2h: { homeScore: number; awayScore: number }[];
        espn?: {
            homeStanding: {
                rank: number;
                points: number;
                played: number;
                wins: number;
                draws: number;
                losses: number;
                goalsFor: number;
                goalsAgainst: number;
                goalDifference: number;
                ppg: number;
                overallRecord: string;
            } | null;
            awayStanding: {
                rank: number;
                points: number;
                played: number;
                wins: number;
                draws: number;
                losses: number;
                goalsFor: number;
                goalsAgainst: number;
                goalDifference: number;
                ppg: number;
                overallRecord: string;
            } | null;
            homeForm: string;
            awayForm: string;
            homeRecentResults: { opponent: string; score: string; result: string; date: string; isHome: boolean }[];
            awayRecentResults: { opponent: string; score: string; result: string; date: string; isHome: boolean }[];
            h2h: { id: string; date: string; name: string; score: string }[];
            odds: { provider: string; details: string; overUnder: number; spread: number; homeMoneyLine: number; awayMoneyLine: number }[];
        };
        error?: string;
    }>;
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
        odds: unknown,
        matchId?: number
    ) => Promise<{ success?: boolean; text?: string; error?: string }>;
    getPredictionStats: () => Promise<{ total: number; correct1X2: number; accuracyPercent: number }>;
    getCupMatches: (leagueId: number) => Promise<{ cupName: string | null; matches: any[]; rounds: string[] }>;
    getSetupStatus: () => Promise<{
        ollamaInstalled?: boolean;
        modelDownloaded?: boolean;
        setupComplete?: boolean;
    }>;
    getStandings: (leagueId: number, season?: string) => Promise<unknown>;

    // ESPN API
    espnGetNews: (league?: string) => Promise<EspnNewsArticle[]>;
    espnGetScores: (league?: string) => Promise<EspnScore[]>;
    espnGetScoresByDate: (league: string, date: string) => Promise<EspnScore[]>;
    espnGetStandings: (league: string) => Promise<EspnStandingEntry[]>;
    espnGetTeamSchedule: (league: string, teamId: string) => Promise<EspnTeamSchedule>;
    espnGetMatchSummary: (league: string, eventId: string) => Promise<EspnMatchSummary | null>;
    espnGetTeams: (league: string) => Promise<EspnTeam[]>;
    espnGetLeagues: () => Promise<EspnLeague[]>;
    espnGetLeagueCode: (internalCodeOrId: string | number) => Promise<string | null>;
    espnGetTeamId: (internalId: number) => Promise<number | null>;
    espnSyncLogos: () => Promise<{ success: boolean; count?: number; error?: string }>;
    espnSyncStandings: () => Promise<{ success: boolean; count?: number; error?: string }>;
    espnSyncPlayerRatings: () => Promise<{ success: boolean; updated?: number; errors?: number; error?: string }>;
    espnGetTeamRoster: (league: string, espnTeamId: string) => Promise<EspnRosterPlayer[]>;

    // Bet Center
    verifyBetSlip: (bets: any[]) => Promise<any>;
    analyzeBetSlip: (bets: any[]) => Promise<any>;

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

export { };
