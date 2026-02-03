const axios = require('axios');

const ollamaManager = require('./ollama_manager');

class AiBridge {
    constructor() {
        this.baseUrl = 'http://localhost:11434/api/generate';
        this.defaultModel = 'deepseek-r1:7b';
    }

    /**
     * Generate Expert Analysis using Ollama
     * @param {Object} context Match context
     */
    async generateExpertAnalysis(context) {
        const { home, away, odds, homeDetails, awayDetails, injuries } = context;

        let selectedModel = this.defaultModel;

        // Ensure model exists
        await ollamaManager.pullModelIfMissing(selectedModel);

        console.log(`AI Analyst using model: ${selectedModel}`);

        const prompt = `
Rolle: Du bist ein DeepSeek-R1 basierter Wett-Analyst. 
Vergleiche den Gesamtmarktwert von ${home.name} (€${((home.market_value || 50000000) / 1000000).toFixed(0)}M) und ${away.name} (€${((away.market_value || 50000000) / 1000000).toFixed(0)}M) mit den Simulations-Wahrscheinlichkeiten (${odds.homeWinProb}% / ${odds.drawProb}% / ${odds.awayWinProb}%). Wo liegt der statistische Fehler der Buchmacher?

Zusatzdaten:
- Elo: ${home.name} (${home.elo_rating || 1500}) vs ${away.name} (${away.elo_rating || 1500})
- Form: ${home.name} (${homeDetails.form.join('-')}) vs ${away.name} (${awayDetails.form.join('-')})
- Wichtige Ausfälle: ${injuries || "Keine"}

Anweisung:
Analysiere die Daten Schritt für Schritt. Nutze deine Reasoning-Fähigkeit, um versteckte Value-Wetten zu finden.
`;

        try {
            const response = await axios.post(this.baseUrl, {
                model: selectedModel,
                prompt: prompt,
                stream: false,
                system: "Du bist ein professioneller Wett-Analyst. Antworte in einfachem Deutsch. Nutze <think> Tags für deinen Denkprozess."
            });

            return { success: true, text: response.data.response, model: selectedModel };
        } catch (e) {
            console.error("AI Bridge Error:", e.message);
            if (e.code === 'ECONNREFUSED') {
                return { error: "Ollama is offline. Please start the service." };
            }
            return { error: "AI Service Unavailable." };
        }
    }
}

module.exports = new AiBridge();
