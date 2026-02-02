const axios = require('axios');

class AiBridge {
    constructor() {
        this.baseUrl = 'http://localhost:11434/api/generate';
        this.model = 'llama3'; // Default, can call checkModel() later
    }

    /**
     * Generate Expert Analysis using Ollama
     * @param {Object} context Match context
     */
    async generateExpertAnalysis(context) {
        const { home, away, odds, homeDetails, awayDetails, injuries } = context;

        const prompt = `
Rolle: Du bist der "SpoSim AI Analyst", ein hochspezialisierter Algorithmus für Sportwetten-Strategie und taktische Fußball-Analyse.

Kontext der Daten:
- Heimteam: ${home.name} (Form: ${homeDetails.form.join('-')})
- Auswärtsteam: ${away.name} (Form: ${awayDetails.form.join('-')})
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
                model: this.model,
                prompt: prompt,
                stream: false,
                system: "Du bist ein professioneller Wett-Analyst. Antworte kurz und präzise auf Deutsch."
            });

            return { success: true, text: response.data.response };
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
