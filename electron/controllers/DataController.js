const { ipcMain } = require('electron');
const db = require('../db');
const { prisma } = db;
const dataFetcher = require('../data_fetcher');
const espnService = require('../espn_service');
const footballSim = require('../simulation/football');
const simController = require('./SimController');
const ollamaManager = require('../ollama_manager');
const aiBridge = require('../ai_bridge');
const { CURRENT_SEASON_STR } = require('../../config/season');

class DataController {
    constructor() { }

    init() {
        this.registerHandlers();
    }

    registerHandlers() {
        // Data & Search
        ipcMain.handle('search', this.handleSearch.bind(this));
        ipcMain.handle('get-data', this.handleGetData.bind(this));
        ipcMain.handle('get-fixtures', this.handleGetFixtures.bind(this));
        ipcMain.handle('get-standings', this.handleGetStandings.bind(this));
        ipcMain.handle('update-data', this.handleUpdateData.bind(this));
        ipcMain.handle('get-team-details', this.handleGetTeamDetails.bind(this));

        // Simulation / Analysis
        ipcMain.handle('get-match-odds', this.handleGetMatchOdds.bind(this));
        ipcMain.handle('get-advanced-analysis', this.handleGetAdvancedAnalysis.bind(this));
        ipcMain.handle('simulate-matchday', (e, id) => simController.simulateMatchday(id));
        ipcMain.handle('simulate-tournament-round', (e, id) => simController.simulateTournamentRound(id));
        ipcMain.handle('get-tournament-bracket', (e, id) => simController.getTournamentBracket(id));

        ipcMain.handle('simulate-match', async (e, { homeId, awayId }) => {
            const home = await prisma.team.findUnique({ where: { id: homeId } });
            const away = await prisma.team.findUnique({ where: { id: awayId } });
            if (!home || !away) throw new Error("Teams not found");
            return simController._simAndSaveMatch(home, away, home.leagueId, 'Friendly', null, prisma, null);
        });

        ipcMain.handle('simulate-single-match', async (e, { matchId }) => {
            const match = await prisma.match.findUnique({ where: { id: matchId }, include: { homeTeam: true, awayTeam: true } });
            if (!match) throw new Error("Match not found");
            const group = [2001, 2146, 2154].includes(match.leagueId) ? 'League Phase' : 'League';
            await simController._simAndSaveMatch(match.homeTeam, match.awayTeam, match.leagueId, group, match.matchday, prisma, matchId);
            return { homeGoals: match.homeScore, awayGoals: match.awayScore }; // Note: result is async, ideally return from _simAndSaveMatch
        });

        ipcMain.handle('simulate-f1-race', () => simController.simulateF1Race());

        // Bet Center Logic
        ipcMain.handle('verify-bet-slip', async (e, { bets }) => {
            const results = [];
            for (const bet of bets) {
                // bet: { matchId, homeId, awayId, selection: '1'|'X'|'2' }
                try {
                    const home = await prisma.team.findUnique({ where: { id: bet.homeId } });
                    const away = await prisma.team.findUnique({ where: { id: bet.awayId } });
                    if (!home || !away) {
                        results.push({ matchId: bet.matchId, error: "Team not found" });
                        continue;
                    }

                    // Populate stats for accurate simulation
                    const hStr = await simController.calculateTeamStrength(home.id);
                    const aStr = await simController.calculateTeamStrength(away.id);
                    home.att = hStr.att; home.mid = hStr.mid; home.def = hStr.def;
                    away.att = aStr.att; away.mid = aStr.mid; away.def = aStr.def;

                    // Use ESPN data if available
                    const homeEspn = await simController.getEspnEnrichedTeamData(home.id);
                    const awayEspn = await simController.getEspnEnrichedTeamData(away.id);
                    home.form = await simController.calculateFormFactor(home.id, homeEspn);
                    away.form = await simController.calculateFormFactor(away.id, awayEspn);
                    const espnCtx = simController.buildEspnSimContext(homeEspn, awayEspn);

                    // Monte Carlo Simulation (1000 runs)
                    const iterations = 1000;
                    const simRes = footballSim.simulateMatchOdds(home, away, iterations, espnCtx);

                    let prob = 0;
                    // selection: '1' (Home), 'X' (Draw), '2' (Away)
                    if (bet.selection === '1') prob = simRes.homeWinProb;
                    else if (bet.selection === 'X') prob = simRes.drawProb;
                    else if (bet.selection === '2') prob = simRes.awayWinProb;

                    results.push({
                        matchId: bet.matchId,
                        selection: bet.selection,
                        simProbability: prob,
                        simDetails: simRes, // { homeWinProb, drawProb, awayWinProb, ... }
                        confidenceScore: Math.round(prob)
                    });
                } catch (err) {
                    console.error("Bet verification error:", err);
                    results.push({ matchId: bet.matchId, error: err.message });
                }
            }
            return results;
        });

        ipcMain.handle('analyze-bet-slip', async (e, { bets, model }) => {
            // Uses AI Analyst to review the slip
            try {
                // 1. Context Building
                let contextText = "Analyze this bet slip based on team form and simulation data:\n";
                for (const bet of bets) {
                    const home = await prisma.team.findUnique({ where: { id: bet.homeId } });
                    const away = await prisma.team.findUnique({ where: { id: bet.awayId } });
                    const selectionStr = bet.selection === '1' ? `${home.name} Win` : bet.selection === 'X' ? 'Draw' : `${away.name} Win`;

                    const hForm = await simController.getTeamForm(bet.homeId, 5);
                    const aForm = await simController.getTeamForm(bet.awayId, 5);

                    contextText += `- Match: ${home.name} vs ${away.name}. Pick: ${selectionStr}.\n`;
                    contextText += `  Home Form: ${hForm.join('-')}, Away Form: ${aForm.join('-')}.\n`;
                }

                // 2. Send to Ollama
                const prompt = `You are a professional sports betting analyst. 
                ${contextText}
                
                Provide a risk assessment for this slip. Be concise (max 3 sentences per match). 
                Conclude with a 'Verdict: Safe/Risky/Value'.`;

                const response = await aiBridge.generateResponse(prompt, 'bet-analyst', model);
                return { analysis: response };
            } catch (err) {
                console.error("AI Analysis error:", err);
                return { error: "Could not generate analysis." };
            }
        });

        ipcMain.handle('get-ai-models', async () => {
            return await ollamaManager.getAvailableModels();
        });

        ipcMain.handle('check-ollama-status', this.handleCheckOllamaStatus.bind(this));
        ipcMain.handle('start-ollama', () => ollamaManager.startService());
        ipcMain.handle('get-setup-status', this.handleGetSetupStatus.bind(this));
        ipcMain.handle('get-ai-prediction', this.handleGetAiPrediction.bind(this));
        ipcMain.handle('get-prediction-stats', this.handleGetPredictionStats.bind(this));

        // ESPN
        ipcMain.handle('espn-get-news', (e, l) => l ? espnService.getNews(l) : espnService.getAllNews());
        ipcMain.handle('espn-get-scores', (e, l) => l ? espnService.getScores(l) : espnService.getAllScores());
        ipcMain.handle('espn-get-scores-by-date', (e, { league, date }) => espnService.getScoresByDate(league, date));
        ipcMain.handle('espn-get-standings', (e, l) => espnService.getStandings(l));
        ipcMain.handle('espn-get-team-schedule', (e, { league, teamId }) => espnService.getTeamSchedule(league, teamId));
        ipcMain.handle('espn-get-match-summary', (e, { league, eventId }) => espnService.getMatchSummary(league, eventId));
        ipcMain.handle('espn-get-teams', (e, l) => espnService.getTeams(l));
        ipcMain.handle('espn-get-leagues', () => espnService.getLeagues());
        ipcMain.handle('espn-get-league-code', (e, id) => espnService.getEspnLeagueCode(id));
        ipcMain.handle('espn-get-team-id', (e, id) => espnService.getEspnTeamId(id));
        ipcMain.handle('espn-sync-logos', async () => ({ success: true, count: await dataFetcher.updateTeamLogosFromEspn() }));
        ipcMain.handle('espn-sync-standings', async () => ({ success: true, count: await dataFetcher.syncStandingsFromEspn() }));
        ipcMain.handle('espn-sync-player-ratings', async () => {
            const r = await dataFetcher.syncPlayerRatingsFromEspn();
            return { success: true, updated: r.updated };
        });
        ipcMain.handle('espn-get-team-roster', (e, { league, espnTeamId }) => espnService.getTeamRoster(league, String(espnTeamId)));
        ipcMain.handle('get-cup-matches', this.handleGetCupMatches.bind(this));
    }

    // --- Implementation of Read/Write methods ---

    async handleSearch(event, { query }) {
        const q = String(query || '').trim();
        if (q.length < 2) return { leagues: [], teams: [], players: [] };
        const leagues = await prisma.league.findMany({ where: { sport: 'football', name: { contains: q } }, take: 5, select: { id: true, name: true } });
        const teams = await prisma.team.findMany({ where: { OR: [{ name: { contains: q } }, { shortName: { contains: q } }] }, include: { league: { select: { id: true, name: true } } }, take: 10 });
        const players = await prisma.player.findMany({ where: { name: { contains: q } }, include: { team: { select: { id: true, name: true } } }, orderBy: { goals: 'desc' }, take: 10 });
        return { leagues: leagues.map(l => ({ id: l.id, name: l.name })), teams: teams.map(t => ({ id: t.id, name: t.name, shortName: t.shortName, leagueId: t.leagueId, leagueName: t.league?.name })), players: players.map(p => ({ id: p.id, name: p.name, goals: p.goals, teamId: p.teamId, teamName: p.team?.name })) };
    }

    async handleGetData(event, category) {
        if (category === 'football') {
            const leagues = await prisma.league.findMany({ where: { sport: 'football' } });
            const result = { leagues: [] };
            const LEAGUE_COUNTRY_MAP = { 2002: 'Germany', 2021: 'England', 2014: 'Spain', 2019: 'Italy', 2015: 'France' };
            for (const l of leagues) {
                const standings = await prisma.standing.findMany({
                    where: { leagueId: l.id, season: CURRENT_SEASON_STR },
                    include: { team: true },
                    orderBy: [{ groupName: 'asc' }, { points: 'desc' }]
                });
                const mappedTeams = standings.filter(s => s.team).map(s => ({
                    ...s.team, id: Number(s.team.id), logo: s.team.logo, group: s.groupName || 'League', points: s.points, form: [],
                    stats: { played: s.played, wins: s.wins, draws: s.draws, losses: s.losses, gf: s.gf, ga: s.ga }
                }));
                // Top scorers ... (simplified for brevity)
                result.leagues.push({ ...l, id: Number(l.id), country: LEAGUE_COUNTRY_MAP[l.id] || l.country, teams: mappedTeams, topScorers: [] });
            }
            return result;
        }
        return {};
    }

    async handleGetFixtures(event, { leagueId, matchday }) {
        const lid = typeof leagueId === 'string' ? parseInt(leagueId, 10) : leagueId;
        const matches = await prisma.match.findMany({ where: { leagueId: lid, matchday: matchday || 1 }, include: { homeTeam: true, awayTeam: true } });
        return {
            currentMatchday: matchday || 1, matches: matches.map(m => ({
                id: m.id, home: { id: m.homeTeamId, name: m.homeTeam?.name, logo: m.homeTeam?.logo }, away: { id: m.awayTeamId, name: m.awayTeam?.name, logo: m.awayTeam?.logo },
                homeScore: m.homeScore, awayScore: m.awayScore, status: m.status, date: m.playedAt
            }))
        };
    }

    async handleGetStandings(event, { leagueId }) {
        const standings = await prisma.standing.findMany({ where: { leagueId, season: CURRENT_SEASON_STR }, include: { team: true }, orderBy: [{ points: 'desc' }] });
        return standings.map(s => ({ ...s, name: s.team.name, logo: s.team.logo }));
    }

    async handleGetTeamDetails(event, teamId) {
        return await prisma.team.findUnique({
            where: { id: teamId },
            include: { players: true, standings: { where: { season: CURRENT_SEASON_STR } } }
        });
    }

    async handleUpdateData() {
        await dataFetcher.updateAllData();
        return { success: true };
    }

    async handleGetMatchOdds(event, { homeId, awayId }) {
        const home = await prisma.team.findUnique({ where: { id: homeId } });
        const away = await prisma.team.findUnique({ where: { id: awayId } });
        if (!home || !away) return { error: "Teams not found" };

        // Populate form/strength from simController
        const hStr = await simController.calculateTeamStrength(homeId);
        const aStr = await simController.calculateTeamStrength(awayId);
        home.att = hStr.att; home.mid = hStr.mid; home.def = hStr.def;
        away.att = aStr.att; away.mid = aStr.mid; away.def = aStr.def;

        home.form = await simController.calculateFormFactor(homeId);
        away.form = await simController.calculateFormFactor(awayId);

        return footballSim.simulateMatchOdds(home, away, 1000, null);
    }

    async handleGetAdvancedAnalysis(event, { homeId, awayId }) {
        const odds = await this.handleGetMatchOdds(event, { homeId, awayId });
        const h2h = await prisma.match.findMany({
            where: { OR: [{ homeTeamId: homeId, awayTeamId: awayId }, { homeTeamId: awayId, awayTeamId: homeId }] },
            orderBy: { playedAt: 'desc' }, take: 5
        });
        return { odds, h2h, home: { id: homeId }, away: { id: awayId } };
    }

    async handleCheckOllamaStatus() {
        const installed = await ollamaManager.checkInstalled();
        const running = await ollamaManager.checkRunning();
        return { installed, running, downloadUrl: ollamaManager.getDownloadUrl() };
    }

    async handleGetSetupStatus() {
        return await prisma.appSettings.findFirst({ where: { id: 1 } }) || { ollamaInstalled: false };
    }

    async handleGetAiPrediction(event, { homeId, awayId }) {
        return { error: "AI Prediction requires bridge" };
    }

    async handleGetPredictionStats() {
        return { total: 0, accuracyPercent: 0 };
    }

    async handleGetCupMatches(event, { leagueId }) {
        return { cupName: null, matches: [] };
    }
}

module.exports = new DataController();
