const { exec, spawn } = require('child_process');
const { PassThrough } = require('stream');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const os = require('os');

class OllamaManager {
    constructor() {
        this.port = 11434;
        this.baseUrl = `http://localhost:${this.port}`;
        this._resolvedExe = null; // cached resolved path
    }

    /**
     * Resolve the full path to the Ollama executable.
     * Checks PATH first, then default Windows install location.
     * @returns {Promise<string|null>} Full path or 'ollama' if in PATH, null if not found
     */
    async resolveExe() {
        if (this._resolvedExe) return this._resolvedExe;

        // 1. Try global PATH
        const inPath = await new Promise((resolve) => {
            exec('ollama --version', { timeout: 3000 }, (error) => {
                resolve(!error);
            });
        });
        if (inPath) {
            this._resolvedExe = 'ollama';
            return this._resolvedExe;
        }

        // 2. Check default Windows install path
        if (process.platform === 'win32') {
            const localAppData = process.env.LOCALAPPDATA;
            if (localAppData) {
                const defaultPath = path.join(localAppData, 'Programs', 'Ollama', 'ollama.exe');
                if (fs.existsSync(defaultPath)) {
                    console.log("Found Ollama at default path:", defaultPath);
                    this._resolvedExe = defaultPath;
                    return this._resolvedExe;
                }
            }
        }

        return null;
    }

    /**
     * Check if Ollama CLI is installed/accessible
     * @returns {Promise<boolean>}
     */
    async checkInstalled() {
        return (await this.resolveExe()) !== null;
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

        const exe = await this.resolveExe();
        if (!exe) {
            console.error("Ollama executable not found.");
            return false;
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
        const exe = await this.resolveExe();
        if (!exe) {
            console.warn("Cannot list models – Ollama not found.");
            return [];
        }

        const cmd = exe === 'ollama' ? 'ollama list' : `"${exe}" list`;

        return new Promise((resolve) => {
            exec(cmd, { timeout: 5000 }, (error, stdout) => {
                if (error) {
                    console.warn("Failed to list models:", error.message);
                    resolve([]);
                    return;
                }
                // Parse stdout: "NAME ID SIZE MODIFIED" – skip header line
                const lines = stdout.trim().split('\n').slice(1);
                const models = lines.map(line => line.split(/\s+/)[0]).filter(Boolean);
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
     * @param {function} [onProgress] - (progress: number, step: string) => void
     * @returns {Promise<boolean>}
     */
    async pullModelIfMissing(modelName, onProgress) {
        const models = await this.getAvailableModels();
        // Check for exact match or partial match (e.g. 'deepseek-r1:7b' vs 'deepseek-r1:7b-instruct')
        const exists = models.some(m => m === modelName || m.startsWith(modelName + ':'));

        if (exists) {
            console.log(`Model ${modelName} is already available.`);
            if (onProgress) onProgress(100, 'Model ready');
            return true;
        }

        console.log(`Model ${modelName} missing. Pulling... (This may take a while)`);
        if (onProgress) onProgress(5, `Downloading model "${modelName}"... (this may take a few minutes)`);

        const exe = await this.resolveExe();
        if (!exe) {
            console.error("Cannot pull model – Ollama not found.");
            if (onProgress) onProgress(0, 'Ollama not found');
            return false;
        }

        return new Promise((resolve) => {
            const p = spawn(exe, ['pull', modelName], { shell: true });
            let lastProgress = 5;

            const parseProgress = (data) => {
                const str = String(data);
                // Ollama outputs: "pulling manifest", "pulling abc123... 10%", etc.
                const pctMatch = str.match(/(\d+)\s*%/);
                if (pctMatch) {
                    const pct = Math.min(95, parseInt(pctMatch[1], 10));
                    if (pct > lastProgress && onProgress) {
                        lastProgress = pct;
                        onProgress(pct, `Downloading model... ${pct}%`);
                    }
                } else if (str.includes('pulling') && onProgress) {
                    onProgress(Math.min(lastProgress + 5, 90), 'Downloading model...');
                }
            };

            p.stdout.on('data', (data) => {
                console.log(`[Ollama Pull] ${data}`);
                parseProgress(data);
            });
            p.stderr.on('data', (data) => {
                console.log(`[Ollama Pull] ${data}`);
                parseProgress(data);
            });

            p.on('close', (code) => {
                if (code === 0) {
                    console.log(`Successfully pulled ${modelName}`);
                    if (onProgress) onProgress(100, 'Model ready');
                    resolve(true);
                } else {
                    console.error(`Failed to pull ${modelName}. Exit code: ${code}`);
                    if (onProgress) onProgress(0, 'Download failed');
                    resolve(false);
                }
            });
        });
    }

    /**
     * Download and Install Ollama (Windows only for now)
     * @param {function} [onProgress] - (progress: number, status: string) => void
     * @returns {Promise<boolean>}
     */
    async downloadAndInstallOllama(onProgress) {
        if (process.platform !== 'win32') return false;

        const installerUrl = "https://ollama.com/download/OllamaSetup.exe";
        const tempDir = os.tmpdir();
        const installerPath = path.join(tempDir, 'OllamaSetup.exe');

        console.log(`Downloading Ollama from ${installerUrl}...`);

        try {
            const response = await axios({
                url: installerUrl,
                method: 'GET',
                responseType: 'stream'
            });

            const totalLength = response.headers['content-length'] ? parseInt(response.headers['content-length'], 10) : 0;
            let downloadedLength = 0;

            const progressStream = new PassThrough();
            progressStream.on('data', (chunk) => {
                downloadedLength += chunk.length;
                if (onProgress && totalLength > 0) {
                    const percent = Math.min(95, Math.round((downloadedLength / totalLength) * 90));
                    onProgress(percent, `Downloading Ollama Installer... ${percent}%`);
                }
            });

            const writer = fs.createWriteStream(installerPath);
            response.data.pipe(progressStream).pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            if (onProgress) onProgress(95, 'Installing Ollama...');

            console.log("Download complete. Running installer silently...");

            // Execute installer silently
            return new Promise((resolve) => {
                exec(`"${installerPath}" /silent`, (error) => {
                    if (error) {
                        console.error("Installer failed:", error);
                        resolve(false);
                    } else {
                        console.log("Ollama installed successfully.");
                        this._resolvedExe = null; // clear cache so resolveExe() re-detects
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
        // Ensure Ollama service is reachable before attempting pull
        const running = await this.checkRunning();
        if (!running) {
            console.error("Ollama service not running – cannot pull model.");
            onProgress(0, "Ollama service not reachable");
            return false;
        }

        try {
            console.log(`Pulling ${modelName} with progress tracking...`);

            const response = await axios({
                method: 'post',
                url: `${this.baseUrl}/api/pull`,
                data: { name: modelName, stream: true },
                responseType: 'stream',
                timeout: 0, // no timeout for large downloads
            });

            let buffer = '';

            response.data.on('data', (chunk) => {
                buffer += chunk.toString();
                // Split on newlines, keep last incomplete line in buffer
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const json = JSON.parse(line);
                        if (json.status === 'success') {
                            onProgress(100, "Completed");
                        } else if (json.completed && json.total) {
                            const percent = Math.min(99, Math.round((json.completed / json.total) * 100));
                            onProgress(percent, json.status || 'Downloading...');
                        } else {
                            // Status-only messages (e.g. "pulling manifest") – keep progress moving
                            onProgress(0, json.status || 'Preparing...');
                        }
                    } catch (e) {
                        // ignore parse errors for partial chunks
                    }
                }
            });

            return new Promise((resolve) => {
                response.data.on('end', () => resolve(true));
                response.data.on('error', (err) => {
                    console.error("Stream error during pull:", err.message);
                    resolve(false);
                });
            });

        } catch (e) {
            console.error("Progressive pull failed:", e.message);
            onProgress(0, `Pull failed: ${e.message}`);
            return false;
        }
    }
}

module.exports = new OllamaManager();
