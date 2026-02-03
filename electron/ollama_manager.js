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
            if (subprocess.unref) subprocess.unref();

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
     * Ensure Ollama is running, trying to start it if installed but not running
     */
    async ensureOllamaRunning() {
        if (await this.checkRunning()) return true;
        if (await this.checkInstalled()) {
            return await this.startService();
        }
        return false;
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

    /**
     * Pull a model if it's missing from the local registry
     * @param {string} modelName 
     * @returns {Promise<boolean>}
     */
    async pullModelIfMissing(modelName) {
        const models = await this.getAvailableModels();
        // Check for exact match or partial match (e.g. 'deepseek-r1:7b' vs 'deepseek-r1:7b-instruct')
        const exists = models.some(m => m === modelName || m.startsWith(modelName + ':'));

        if (exists) {
            console.log(`Model ${modelName} is already available.`);
            return true;
        }

        console.log(`Model ${modelName} missing. Pulling... (This may take a while)`);

        return new Promise((resolve) => {
            // Find executable
            let exe = 'ollama';
            if (process.platform === 'win32') {
                const localAppData = process.env.LOCALAPPDATA;
                const defaultPath = path.join(localAppData, 'Programs', 'Ollama', 'ollama.exe');
                if (fs.existsSync(defaultPath)) exe = defaultPath;
            }

            const p = spawn(exe, ['pull', modelName], { shell: true });

            p.stdout.on('data', (data) => console.log(`[Ollama Pull] ${data}`));
            p.stderr.on('data', (data) => console.log(`[Ollama Pull] ${data}`));

            p.on('close', (code) => {
                if (code === 0) {
                    console.log(`Successfully pulled ${modelName}`);
                    resolve(true);
                } else {
                    console.error(`Failed to pull ${modelName}. Exit code: ${code}`);
                    resolve(false);
                }
            });
        });
    }

    /**
     * Download and Install Ollama (Windows only for now)
     * @returns {Promise<boolean>}
     */
    async downloadAndInstallOllama() {
        if (process.platform !== 'win32') return false;

        const installerUrl = "https://ollama.com/download/OllamaSetup.exe";
        const tempDir = os.tmpdir();
        const installerPath = path.join(tempDir, 'OllamaSetup.exe');

        console.log(`Downloading Ollama from ${installerUrl}...`);

        try {
            const writer = fs.createWriteStream(installerPath);
            const response = await axios({
                url: installerUrl,
                method: 'GET',
                responseType: 'stream'
            });

            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            console.log("Download complete. Running installer silently...");

            // Execute installer silently
            return new Promise((resolve) => {
                exec(`"${installerPath}" /silent`, (error) => {
                    if (error) {
                        console.error("Installer failed:", error);
                        resolve(false);
                    } else {
                        console.log("Ollama installed successfully.");
                        resolve(true);
                    }
                });
            });

        } catch (e) {
            console.error("Download failed:", e);
            return false;
        }
    }

    /**
     * Pull model with progress tracking via callback
     * @param {string} modelName 
     * @param {function} onProgress (progress: number, status: string) => void
     * @returns {Promise<boolean>}
     */
    async pullModelProgressive(modelName, onProgress) {
        try {
            console.log(`Pulling ${modelName} with progress tracking...`);

            const response = await axios({
                method: 'post',
                url: `${this.baseUrl}/api/pull`,
                data: { name: modelName, stream: true },
                responseType: 'stream'
            });

            response.data.on('data', (chunk) => {
                const lines = chunk.toString().split('\n').filter(Boolean);
                for (const line of lines) {
                    try {
                        const json = JSON.parse(line);
                        if (json.status === 'success') {
                            onProgress(100, "Completed");
                        } else if (json.completed && json.total) {
                            const percent = Math.round((json.completed / json.total) * 100);
                            onProgress(percent, json.status);
                        } else {
                            onProgress(-1, json.status);
                        }
                    } catch (e) {
                        // ignore parse errors for partial chunks
                    }
                }
            });

            return new Promise((resolve) => {
                response.data.on('end', () => resolve(true));
                response.data.on('error', () => resolve(false));
            });

        } catch (e) {
            console.error("Progressive pull failed:", e.message);
            return false;
        }
    }
}

module.exports = new OllamaManager();
