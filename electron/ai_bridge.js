const axios = require('axios');

const ollamaManager = require('./ollama_manager');

class AiBridge {
    constructor() {
        this.baseUrl = 'http://localhost:11434/api/generate';
        this.defaultModel = 'llama3';
    }

    /**
     * Generate Expert Analysis using Ollama
     * @param {Object} context Match context
     */
    async generateExpertAnalysis(context) {
        const { home, away, odds, homeDetails, awayDetails, injuries } = context;

        // Dynamic Model Selection
        const availableModels = await ollamaManager.getAvailableModels();
        // Priority: llama3 > mistral > phi3 > first available > default
        let selectedModel = this.defaultModel;

        if (availableModels.length > 0) {
            if (availableModels.some(m => m.includes('llama3'))) selectedModel = availableModels.find(m => m.includes('llama3'));
            else if (availableModels.some(m => m.includes('mistral'))) selectedModel = availableModels.find(m => m.includes('mistral'));
            else if (availableModels.some(m => m.includes('phi3'))) selectedModel = availableModels.find(m => m.includes('phi3'));
            else selectedModel = availableModels[0];
        }

        console.log(`AI Analyst using model: ${selectedModel}`);

        const prompt = `
Rolle: Du bist der "SpoSim AI Analyst", ein hochspezialisierter Algorithmus für Sportwetten-Strategie und taktische Fußball-Analyse.

Kontext der Daten:
Kontext der Daten:
- Heimteam: ${home.name} (Elo: ${home.elo_rating || 1500}, Marktwert: €${((home.market_value || 50000000) / 1000000).toFixed(0)}M, Form: ${homeDetails.form.join('-')})
- Auswärtsteam: ${away.name} (Elo: ${away.elo_rating || 1500}, Marktwert: €${((away.market_value || 50000000) / 1000000).toFixed(0)}M, Form: ${awayDetails.form.join('-')})
- Monte-Carlo-Simulation (1000 Durchläufe): 
  * Heimsieg: ${odds.homeWinProb}%
  * Unentschieden: ${odds.drawProb}%
  * Auswärtssieg: ${odds.awayWinProb}%
- Wichtige Ausfälle: ${injuries || "Keine"}

Anweisung:
Analysiere die Diskrepanz zwischen der Grundstärke der Teams und der aktuellen Form. 
1. Identifiziere das wahrscheinlichste Szenario basierend auf den 1000 Simulationen.
2. Erkläre kurz (1 Satz), warum die Simulation so entschieden hat (z.B. Heimvorteil vs. schwache Abwehrform).
3. Gib eine konkrete Wett-Empfehlung ab (z.B. "Sieg Heim", "Unter 2.5 Tore" oder "Value-Tipp auf Unentschieden").

Regeln:
- Antworte in maximal 3-4 kurzen Sätzen.
- Sprache: Deutsch.
- Tonfall: Analytisch, präzise, seriös (wie ein Bloomberg-Terminal für Sport).
- Keine Einleitung wie "Gerne helfe ich dir...", sondern direkt mit der Analyse starten.
`;

        try {
            const response = await axios.post(this.baseUrl, {
                model: selectedModel,
                prompt: prompt,
                stream: false,
                system: "Du bist ein professioneller Wett-Analyst. Antworte kurz und präzise auf Deutsch."
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
