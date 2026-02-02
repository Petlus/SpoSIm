const { exec, spawn } = require('child_process');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const os = require('os');

class OllamaManager {
    constructor() {
        this.port = 11434;
        this.baseUrl = `http://localhost:${this.port}`;
    }

    /**
     * Check if Ollama CLI is installed/accessible in PATH or default Windows location
     * @returns {Promise<boolean>}
     */
    async checkInstalled() {
        // 1. Try Global PATH via exec
        const checkGlobal = new Promise((resolve) => {
            exec('ollama --version', { timeout: 2000 }, (error) => {
                if (error) resolve(false);
                else resolve(true);
            });
        });

        if (await checkGlobal) return true;

        // 2. Check Default Windows Install Path
        // usually C:\Users\<User>\AppData\Local\Programs\Ollama\ollama.exe
        if (process.platform === 'win32') {
            const localAppData = process.env.LOCALAPPDATA;
            if (localAppData) {
                const defaultPath = path.join(localAppData, 'Programs', 'Ollama', 'ollama.exe');
                if (fs.existsSync(defaultPath)) {
                    console.log("Found Ollama at default path:", defaultPath);
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Check if Ollama Service is running
     * @returns {Promise<boolean>}
     */
    async checkRunning() {
        try {
            await axios.get(this.baseUrl, { timeout: 800 });
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

        // Find executable (re-use logic or just rely on PATH if checked)
        let exe = 'ollama';
        if (process.platform === 'win32') {
            const localAppData = process.env.LOCALAPPDATA;
            const defaultPath = path.join(localAppData, 'Programs', 'Ollama', 'ollama.exe');
            if (fs.existsSync(defaultPath)) exe = defaultPath;
        }

        try {
            const subprocess = spawn(exe, ['serve'], {
                detached: true,
                stdio: 'ignore',
                shell: true
            });
            subprocess.unref();

            // Wait extended time for startup (up to 10s)
            for (let i = 0; i < 20; i++) {
                await new Promise(r => setTimeout(r, 500));
                if (await this.checkRunning()) return true;
            }
            return false;
        } catch (e) {
            console.error("Failed to spawn Ollama:", e);
            return false;
        }
    }

    /**
     * Get list of available models
     * @returns {Promise<string[]>}
     */
    async getAvailableModels() {
        return new Promise((resolve) => {
            // Find executable logic (reused from startService if needed, but 'ollama' usually work if in PATH/shimmed)
            // Or use the full path checking logic if needed
            let cmd = 'ollama list';

            exec(cmd, { timeout: 3000 }, (error, stdout, stderr) => {
                if (error) {
                    console.warn("Failed to list models:", error.message);
                    resolve([]);
                    return;
                }
                // Parse stdout: "NAME ID SIZE MODIFIED"
                // Skip header line
                const lines = stdout.trim().split('\n').slice(1);
                const models = lines.map(line => line.split(/\s+/)[0]).filter(Boolean);
                // Clean tags (e.g. 'llama3:latest' -> 'llama3') if desired, but full tag is better for pulling
                resolve(models);
            });
        });
    }

    getDownloadUrl() {
        return "https://ollama.com/download";
    }
}

module.exports = new OllamaManager();
