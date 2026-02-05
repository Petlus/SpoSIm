const axios = require('axios');

const ollamaManager = require('./ollama_manager');

class AiBridge {
    constructor() {
        this.baseUrl = 'http://localhost:11434/api/generate';
        this.defaultModel = 'deepseek-r1:7b';
    }

    /**
     * Generate Expert Analysis using Ollama
     * @param {Object} context Match context with extended data
     * @param {function} [onProgress] - (progress: number, step: string) => void
     */
    async generateExpertAnalysis(context, onProgress) {
        const { home, away, odds, homeDetails, awayDetails, injuries, standings, topPlayers } = context;

        let selectedModel = this.defaultModel;

        if (onProgress) onProgress(5, 'Checking model...');
        const pullSuccess = await ollamaManager.pullModelIfMissing(selectedModel, onProgress);
        if (!pullSuccess) {
            throw new Error('Failed to download or verify AI model. Please ensure Ollama is running.');
        }

        console.log(`AI Analyst using model: ${selectedModel}`);
        if (onProgress) onProgress(35, 'Preparing analysis...');

        // Format standings info
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

        const prompt = `MATCH: ${home.name} vs ${away.name}

WICHTIG: ${favoriteText}

DATEN:
- Tabelle: ${home.name} (#${homeStanding.position}, ${homeStanding.points} Pkt) vs ${away.name} (#${awayStanding.position}, ${awayStanding.points} Pkt)
- Marktwert: ${home.name} €${((home.market_value || 50000000) / 1000000).toFixed(0)}M vs ${away.name} €${((away.market_value || 50000000) / 1000000).toFixed(0)}M
- Stärke: ${home.name} (ATT:${homeDetails.att}/MID:${homeDetails.mid}/DEF:${homeDetails.def}) vs ${away.name} (ATT:${awayDetails.att}/MID:${awayDetails.mid}/DEF:${awayDetails.def})
- Erwartete Tore: ${home.name} ~${homeExpGoals} | ${away.name} ~${awayExpGoals} | Gesamt: ~${totalExpGoals}

SIMULATION (1000x Monte-Carlo):
- ${home.name} Sieg: ${odds.homeWinProb}% ${odds.homeWinProb >= 50 ? '⭐ FAVORIT' : ''}
- Unentschieden: ${odds.drawProb}% ${odds.drawProb >= 35 ? '⚠️ HOCH' : ''}
- ${away.name} Sieg: ${odds.awayWinProb}% ${odds.awayWinProb >= 50 ? '⭐ FAVORIT' : ''}

AUFGABE: Gib EINE klare Wett-Empfehlung!

**Analyse:** (1-2 Sätze: Wer ist Favorit? Warum?)

**MEIN TIPP:** [Ergebnis z.B. 2:1 oder 0:0]

**BESTE WETTE:** [Die eine Wette die am sichersten ist, z.B. "Sieg Bayern", "Über 1.5 Tore", "Beide treffen", "Double Chance 1X", etc.]

Antworte NUR auf Deutsch. Kurz und klar. Wähle die EINE beste Wette basierend auf den Simulationsdaten!`;

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
                system: "Du bist ein Sportwetten-Experte. Gib präzise, strukturierte Wett-Empfehlungen basierend auf den Daten. Keine langen Erklärungen, nur Fakten und Empfehlungen."
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
