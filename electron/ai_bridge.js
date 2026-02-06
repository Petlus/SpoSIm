const axios = require('axios');

const ollamaManager = require('./ollama_manager');

class AiBridge {
    constructor() {
        this.baseUrl = 'http://localhost:11434/api/generate';
        this.defaultModel = 'deepseek-r1:7b';
    }

    /**
     * Generate detailed response from Ollama
     * @param {string} prompt 
     * @param {string} [role] 
     */
    async generateResponse(prompt, role = 'analyst') {
        const systemPrompts = {
            'analyst': "You are an expert football analyst. Provide data-driven insights.",
            'bet-analyst': "You are a professional sports betting analyst. Evaluate risks and value. Be concise."
        };

        try {
            const response = await axios.post(this.baseUrl, {
                model: this.defaultModel,
                prompt: prompt,
                stream: false,
                system: systemPrompts[role] || systemPrompts['analyst'],
                options: { temperature: 0.3, num_predict: 500 }
            });
            return response.data.response;
        } catch (e) {
            console.error("AI Generate Error:", e.message);
            throw e;
        }
    }

    /**
     * Generate Expert Analysis using Ollama
     * @param {Object} context Match context with extended data
     * @param {function} [onProgress] - (progress: number, step: string) => void
     */
    async generateExpertAnalysis(context, onProgress) {
        const { home, away, odds, homeDetails, awayDetails, injuries, standings, topPlayers, espn } = context;

        let selectedModel = this.defaultModel;

        if (onProgress) onProgress(5, 'Checking model...');
        const pullSuccess = await ollamaManager.pullModelIfMissing(selectedModel, onProgress);
        if (!pullSuccess) {
            throw new Error('Failed to download or verify AI model. Please ensure Ollama is running.');
        }

        console.log(`AI Analyst using model: ${selectedModel}`);
        if (onProgress) onProgress(35, 'Preparing analysis...');

        // Format standings info (sim-based)
        const homeStanding = standings?.home || { position: '?', points: 0, played: 0 };
        const awayStanding = standings?.away || { position: '?', points: 0, played: 0 };

        // Format top players
        const homeStars = topPlayers?.home?.slice(0, 3).map(p => `${p.name} (${p.rating})`).join(', ') || 'N/A';
        const awayStars = topPlayers?.away?.slice(0, 3).map(p => `${p.name} (${p.rating})`).join(', ') || 'N/A';

        // Calculate expected goals based on attack/defense
        const homeExpGoals = ((homeDetails.att / 100) * 2.5 * (1 - awayDetails.def / 200)).toFixed(1);
        const awayExpGoals = ((awayDetails.att / 100) * 2.0 * (1 - homeDetails.def / 200)).toFixed(1);
        const totalExpGoals = (parseFloat(homeExpGoals) + parseFloat(awayExpGoals)).toFixed(1);

        // Determine favorite based on simulation
        const probs = [
            { name: home.name, prob: odds.homeWinProb, type: 'home' },
            { name: 'Unentschieden', prob: odds.drawProb, type: 'draw' },
            { name: away.name, prob: odds.awayWinProb, type: 'away' }
        ].sort((a, b) => b.prob - a.prob);

        const favorite = probs[0];
        const favoriteText = favorite.type === 'draw' ? 'Unentschieden ist am wahrscheinlichsten' : `${favorite.name} ist FAVORIT (${favorite.prob}%)`;

        // ── Build ESPN Real-World Data Block ──
        let espnBlock = '';
        if (espn) {
            const hSt = espn.homeStanding;
            const aSt = espn.awayStanding;
            const lines = [];

            // Real standings
            if (hSt || aSt) {
                const hLine = hSt
                    ? `${home.name} Rang #${hSt.rank} (${hSt.points} Pkt, ${hSt.played} Sp, ${hSt.wins}S/${hSt.draws}U/${hSt.losses}N, ${hSt.goalsFor}:${hSt.goalsAgainst} Tore, PPG ${hSt.ppg})`
                    : `${home.name} (keine ESPN-Daten)`;
                const aLine = aSt
                    ? `${away.name} Rang #${aSt.rank} (${aSt.points} Pkt, ${aSt.played} Sp, ${aSt.wins}S/${aSt.draws}U/${aSt.losses}N, ${aSt.goalsFor}:${aSt.goalsAgainst} Tore, PPG ${aSt.ppg})`
                    : `${away.name} (keine ESPN-Daten)`;
                lines.push(`- Echte Tabelle: ${hLine} | ${aLine}`);
            }

            // Real form
            if (espn.homeForm || espn.awayForm) {
                lines.push(`- Echte Form (letzte 5): ${home.name} ${espn.homeForm || 'N/A'} | ${away.name} ${espn.awayForm || 'N/A'}`);
            }

            // Real recent results
            const fmtResults = (results, teamName) => {
                if (!results || results.length === 0) return `${teamName}: keine Daten`;
                return `${teamName}: ${results.map(r => `${r.result} vs ${r.opponent} (${r.score})`).join(', ')}`;
            };
            if ((espn.homeRecentResults?.length > 0) || (espn.awayRecentResults?.length > 0)) {
                lines.push(`- Letzte Spiele: ${fmtResults(espn.homeRecentResults, home.name)} | ${fmtResults(espn.awayRecentResults, away.name)}`);
            }

            // Real goals stats from standings
            if (hSt && aSt) {
                lines.push(`- Echte Saison-Tore: ${home.name} ${hSt.goalsFor} geschossen, ${hSt.goalsAgainst} kassiert | ${away.name} ${aSt.goalsFor} geschossen, ${aSt.goalsAgainst} kassiert`);
            }

            // ESPN H2H
            if (espn.h2h && espn.h2h.length > 0) {
                const h2hStr = espn.h2h.slice(0, 5).map(g => `${g.name || ''} ${g.score || ''}`).join('; ');
                lines.push(`- Echte H2H: ${h2hStr}`);
            }

            // ESPN Bookmaker Odds
            if (espn.odds && espn.odds.length > 0) {
                const firstOdds = espn.odds[0];
                const oddsLine = [
                    firstOdds.provider ? `(${firstOdds.provider})` : '',
                    firstOdds.details || '',
                    firstOdds.overUnder ? `O/U: ${firstOdds.overUnder}` : '',
                    firstOdds.homeMoneyLine ? `Home ML: ${firstOdds.homeMoneyLine}` : '',
                    firstOdds.awayMoneyLine ? `Away ML: ${firstOdds.awayMoneyLine}` : '',
                ].filter(Boolean).join(' | ');
                lines.push(`- Buchmacher-Odds: ${oddsLine}`);
            }

            if (lines.length > 0) {
                espnBlock = `\n\nREAL-WORLD DATA (ESPN - echte aktuelle Daten!):\n${lines.join('\n')}`;
            }
        }

        const prompt = `MATCH: ${home.name} vs ${away.name}

WICHTIG: ${favoriteText}

DATEN:
- Sim-Tabelle: ${home.name} (#${homeStanding.position}, ${homeStanding.points} Pkt) vs ${away.name} (#${awayStanding.position}, ${awayStanding.points} Pkt)
- Marktwert: ${home.name} €${((home.market_value || 50000000) / 1000000).toFixed(0)}M vs ${away.name} €${((away.market_value || 50000000) / 1000000).toFixed(0)}M
- Stärke: ${home.name} (ATT:${homeDetails.att}/MID:${homeDetails.mid}/DEF:${homeDetails.def}) vs ${away.name} (ATT:${awayDetails.att}/MID:${awayDetails.mid}/DEF:${awayDetails.def})
- Erwartete Tore: ${home.name} ~${homeExpGoals} | ${away.name} ~${awayExpGoals} | Gesamt: ~${totalExpGoals}${espnBlock}

SIMULATION (1000x Monte-Carlo, kalibriert mit echten ESPN-Daten):
- ${home.name} Sieg: ${odds.homeWinProb}% ${odds.homeWinProb >= 50 ? '⭐ FAVORIT' : ''}
- Unentschieden: ${odds.drawProb}% ${odds.drawProb >= 35 ? '⚠️ HOCH' : ''}
- ${away.name} Sieg: ${odds.awayWinProb}% ${odds.awayWinProb >= 50 ? '⭐ FAVORIT' : ''}
${odds.avgCards != null ? `- Erwartete Karten: ~${odds.avgCards} | Über 3.5 Karten: ${odds.over35CardsProb ?? '?'}%` : ''}
${odds.avgCorners != null ? `- Erwartete Ecken: ~${odds.avgCorners} | Über 9.5 Ecken: ${odds.over95CornersProb ?? '?'}%` : ''}

AUFGABE: Gib klare Wett-Empfehlungen! Nutze die ECHTEN ESPN-Daten als Hauptgrundlage, ergänzt durch die Simulation.

**Analyse:** (2-3 Sätze: Wer ist Favorit? Warum? Beziehe die echte Form und Tabelle mit ein!)

**MEIN TIPP:** [Ergebnis z.B. 2:1 oder 0:0]

**BESTE WETTE (Safe):** [Die sicherste Empfehlung, z.B. "Sieg Bayern", "Über 1.5 Tore", "Beide treffen", "Double Chance 1X", "Unter 3.5 Karten", "Über 9.5 Ecken" – je nach Datenlage]

**RISIKO-WETTE:** [Eine etwas riskantere, aber lohnenswerte Option mit höheren Odds, z.B. "Exact Score 2:1", "Über 3.5 Tore", "Über 3.5 Karten", "Beide treffen + Über 2.5 Tore"]

Antworte NUR auf Deutsch. Kurz und klar. Nutze echte ESPN-Daten als primäre Basis!`;

        try {
            if (onProgress) onProgress(50, 'Generating AI analysis...');
            const response = await axios.post(this.baseUrl, {
                model: selectedModel,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.3,
                    num_predict: 500
                },
                system: "Du bist ein Sportwetten-Experte mit Zugang zu echten ESPN-Livedaten. Gib präzise, strukturierte Wett-Empfehlungen. Priorisiere die ECHTEN ESPN-Daten (Tabelle, Form, Tore, H2H, Buchmacher-Odds) vor Simulationsdaten. Nutze auch Karten- und Ecken-Vorhersagen wenn sinnvoll. Gib immer eine SICHERE Empfehlung (BESTE WETTE) und eine RISIKO-WETTE mit höheren Odds. Keine langen Erklärungen, nur Fakten und klare Empfehlungen."
            });

            if (onProgress) onProgress(95, 'Processing response...');
            return { success: true, text: response.data.response, model: selectedModel };
        } catch (e) {
            console.error("AI Bridge Error:", e.message);
            if (onProgress) onProgress(0, 'Error');
            if (e.code === 'ECONNREFUSED') {
                throw new Error('Ollama is offline. Please start the service from the Dashboard.');
            }
            if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
                throw new Error('Request timed out. The model may need more time – try again.');
            }
            if (e.response?.status === 404) {
                throw new Error('Model not found. Please check your Ollama installation.');
            }
            throw new Error(e.message || 'AI service unavailable. Please try again.');
        }
    }
}

module.exports = new AiBridge();
