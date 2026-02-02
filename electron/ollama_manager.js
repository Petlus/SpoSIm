const { exec, spawn } = require('child_process');
const axios = require('axios');

class OllamaManager {
    constructor() {
        this.port = 11434;
        this.baseUrl = `http://localhost:${this.port}`;
    }

    /**
     * Check if Ollama CLI is installed/accessible in PATH
     * @returns {Promise<boolean>}
     */
    async checkInstalled() {
        return new Promise((resolve) => {
            exec('ollama --version', { timeout: 3000 }, (error, stdout, stderr) => {
                if (error) {
                    console.warn("Ollama check failed or timed out:", error.message);
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }

    /**
     * Check if Ollama Service is running
     * @returns {Promise<boolean>}
     */
    async checkRunning() {
        try {
            await axios.get(this.baseUrl, { timeout: 1000 });
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Attempt to start the Ollama service
     * @returns {Promise<boolean>}
     */
    async startService() {
        console.log("Starting Ollama Service...");
        try {
            const subprocess = spawn('ollama', ['serve'], {
                detached: true,
                stdio: 'ignore'
            });
            subprocess.unref(); // Allow Electron to exit independently

            // Wait a bit for it to come alive
            for (let i = 0; i < 10; i++) {
                await new Promise(r => setTimeout(r, 1000));
                if (await this.checkRunning()) return true;
            }
            return false;
        } catch (e) {
            console.error("Failed to spawn Ollama:", e);
            return false;
        }
    }

    getDownloadUrl() {
        return "https://ollama.com/download";
    }
}

module.exports = new OllamaManager();
