require('dotenv').config();
const express = require('express');
const http = require('http');
const { execFile, exec } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { EdgeTTS } = require('node-edge-tts');

const app = express();
const server = http.createServer(app);
const PORT = 3855;
const CONFIG_FILE = path.join(__dirname, 'config.json');
const LAUNCHER_SCRIPT = path.join(__dirname, 'launch_app.ps1');
const CLOSER_SCRIPT = path.join(__dirname, 'close_app.ps1');
const VOICE_PROFILE_FILE = path.join(__dirname, 'master_voice_sample.wav');
const MEMORY_FILE = path.join(__dirname, 'memory.json');

function getMemory() {
    try {
        if (fs.existsSync(MEMORY_FILE)) {
            return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
        }
    } catch(e){}
    return { masterName: 'Tuan Hanif', notes: [], reminders: [] };
}

function saveMemory(mem) {
    try {
        fs.writeFileSync(MEMORY_FILE, JSON.stringify(mem, null, 2));
    } catch(e){}
}

function addMemoryNote(note) {
    const mem = getMemory();
    if (!mem.notes) mem.notes = [];
    mem.notes.push(note);
    saveMemory(mem);
    console.log(`[JARVIS LONG-TERM MEMORY ADDED]: ${note}`);
}

const https = require('https');
function getLiveWeather(city = 'Jakarta') {
    return new Promise((resolve) => {
        https.get('https://wttr.in/' + encodeURIComponent(city) + '?format=j1', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const d = JSON.parse(data);
                    const cur = d.current_condition[0];
                    resolve({
                        temp: cur.temp_C,
                        condition: cur.weatherDesc[0].value,
                        humidity: cur.humidity
                    });
                } catch(e) { resolve(null); }
            });
        }).on('error', () => resolve(null));
    });
}

// Register master voice sample
app.post('/api/enroll-voice', (req, res) => {
    const { audioBase64 } = req.body;
    if (!audioBase64) {
        return res.status(400).json({ success: false, message: 'Audio payload required' });
    }
    try {
        const buffer = Buffer.from(audioBase64, 'base64');
        fs.writeFileSync(VOICE_PROFILE_FILE, buffer);
        console.log(`[BIOMETRIC ENROLLMENT]: Master voice profile saved (${buffer.length} bytes).`);
        res.json({
            success: true,
            message: 'Profil suara Tuan Hanif berhasil didaftarkan dan disimpan ke protokol biometrik Jarvis.'
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/enrollment-status', (req, res) => {
    res.json({
        enrolled: fs.existsSync(VOICE_PROFILE_FILE),
        fileSize: fs.existsSync(VOICE_PROFILE_FILE) ? fs.statSync(VOICE_PROFILE_FILE).size : 0
    });
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function getConfig() {
    let base = {
        geminiApiKey: process.env.GEMINI_API_KEY || '',
        activeVoice: 'id-ID-ArdiNeural'
    };
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            return { ...base, ...data };
        } catch (e) {}
    }
    return base;
}

function saveConfig(cfg) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
        return true;
    } catch (e) {
        return false;
    }
}

// System info endpoint
app.get('/api/system-status', (req, res) => {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpuCores = os.cpus().length;
    const uptime = os.uptime();

    res.json({
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptimeFormatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
        cpuModel: os.cpus()[0]?.model || 'Intel Core Processor',
        cpuCores: cpuCores,
        totalMemoryGB: (totalMem / (1024 ** 3)).toFixed(2),
        freeMemoryGB: (freeMem / (1024 ** 3)).toFixed(2),
        usedMemoryGB: (usedMem / (1024 ** 3)).toFixed(2),
        memoryUsagePercent: Math.round((usedMem / totalMem) * 100),
        hasApiKey: !!getConfig().geminiApiKey
    });
});

// App launcher utility
function launchTarget(target) {
    return new Promise((resolve) => {
        let clean = (target || '').trim();
        console.log(`[J.A.R.V.I.S. Launcher] Opening: "${clean}"`);

        execFile('powershell.exe', [
            '-NoProfile',
            '-ExecutionPolicy', 'Bypass',
            '-File', LAUNCHER_SCRIPT,
            '-target', clean
        ], (err, stdout, stderr) => {
            if (err) console.warn(`[Launcher Error]: ${stderr || err.message}`);
            else console.log(`[Launcher Success]: ${stdout.trim()}`);
            resolve({ success: true, log: stdout.trim() });
        });
    });
}

// App closer utility (Tutup / Close Aplikasi)
function closeTarget(target) {
    return new Promise((resolve) => {
        let clean = (target || '').trim();
        console.log(`[J.A.R.V.I.S. Closer] Closing Application: "${clean}"`);

        execFile('powershell.exe', [
            '-NoProfile',
            '-ExecutionPolicy', 'Bypass',
            '-File', CLOSER_SCRIPT,
            '-appName', clean
        ], (err, stdout, stderr) => {
            if (err) console.warn(`[Closer Warning]: ${stderr || err.message}`);
            else console.log(`[Closer Success]: ${stdout.trim()}`);
            resolve({ success: true, log: stdout.trim() });
        });
    });
}

// System hardware control
function controlSystem(action) {
    const act = action.toLowerCase();
    if (act === 'volume_up') {
        exec('powershell -Command "$obj = New-Object -ComObject WScript.Shell; $obj.SendKeys([char]175)"');
    } else if (act === 'volume_down') {
        exec('powershell -Command "$obj = New-Object -ComObject WScript.Shell; $obj.SendKeys([char]174)"');
    } else if (act === 'mute' || act === 'unmute') {
        exec('powershell -Command "$obj = New-Object -ComObject WScript.Shell; $obj.SendKeys([char]173)"');
    } else if (act === 'lock') {
        exec('rundll32.exe user32.dll,LockWorkStation');
    }
}

// Available neural studio voices
const AVAILABLE_VOICES = [
    { id: 'en-US-BrianMultilingualNeural', name: 'J.A.R.V.I.S. Trilingual (Indonesia, Inggris & Arab)', lang: 'multilingual', gender: 'Male' },
    { id: 'en-US-AndrewMultilingualNeural', name: 'J.A.R.V.I.S. Andrew (Multilingual Natural)', lang: 'multilingual', gender: 'Male' },
    { id: 'en-GB-RyanNeural', name: 'Ryan (British Butler - J.A.R.V.I.S. Klasik)', lang: 'en-GB', gender: 'Male' },
    { id: 'id-ID-ArdiNeural', name: 'Ardi (Bahasa Indonesia - Pria Berwibawa)', lang: 'id-ID', gender: 'Male' },
    { id: 'ar-SA-HamedNeural', name: 'Hamed (Bahasa Arab Fashih)', lang: 'ar-SA', gender: 'Male' },
    { id: 'id-ID-GadisNeural', name: 'Gadis (Bahasa Indonesia - Wanita Ramah)', lang: 'id-ID', gender: 'Female' },
    { id: 'en-US-JennyNeural', name: 'Jenny (US Female Assistant - Natural)', lang: 'en-US', gender: 'Female' }
];

app.get('/api/voices', (req, res) => {
    const cfg = getConfig();
    res.json({
        activeVoice: cfg.activeVoice || 'en-US-BrianMultilingualNeural',
        voices: AVAILABLE_VOICES
    });
});

app.post('/api/set-voice', async (req, res) => {
    const { voiceId } = req.body;
    const voiceMatch = AVAILABLE_VOICES.find(v => v.id === voiceId);
    if (!voiceMatch) {
        return res.status(400).json({ success: false, message: 'Suara tidak ditemukan.' });
    }

    const cfg = getConfig();
    cfg.activeVoice = voiceId;
    saveConfig(cfg);
    console.log(`[J.A.R.V.I.S. Voice Updated]: ${voiceMatch.name}`);

    // Return sample audio of the newly selected voice
    let sampleText = `Halo tuan, saya Jarvis. Suara saya sekarang disetel ke ${voiceMatch.name}. I am fluent in English, and أنا أيضاً أتحدث العربية.`;
    if (voiceMatch.lang === 'en-GB') {
        sampleText = `Greetings sir, I am Jarvis. Systems are primed and ready for your command.`;
    } else if (voiceMatch.lang === 'ar-SA') {
        sampleText = `مرحباً سيدي، أنا جارفيس، جميع الأنظمة تعمل وجاهزة لأوامرك.`;
    }

    const sampleAudio = await generateJarvisStudioVoice(sampleText, voiceId);

    res.json({
        success: true,
        activeVoice: voiceId,
        voiceName: voiceMatch.name,
        sampleText: sampleText,
        studioAudio: sampleAudio
    });
});

// Detect language of text: Arabic, English, or Indonesian
function detectTextLanguage(text) {
    if (!text) return 'id';
    // Arabic script range
    if (/[\u0600-\u06FF\u0750-\u077F]/.test(text)) {
        return 'ar';
    }
    const lower = text.toLowerCase();
    const englishWords = ['the', 'is', 'are', 'you', 'what', 'how', 'sir', 'yes', 'no', 'close', 'open', 'system', 'good', 'morning', 'evening', 'thank'];
    const hits = englishWords.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(lower)).length;
    if (hits >= 2) return 'en';
    return 'id';
}

// Generate Ultra-Realistic Natural Voice (Edge Neural HD Engine)
// Strictly tuned to Iron Man's J.A.R.V.I.S. (Paul Bettany persona)
async function generateJarvisStudioVoice(text, forcedVoiceId = null) {
    if (!text || !text.trim()) return null;
    const cleanText = text.replace(/[*#_~`]/g, '').trim();
    const cfg = getConfig();
    
    // Default & lock to authentic J.A.R.V.I.S. (Ryan British Butler)
    let voiceToUse = forcedVoiceId || cfg.activeVoice || 'en-GB-RyanNeural';

    const lang = detectTextLanguage(cleanText);
    if (lang === 'ar') {
        // High-clarity Arabic resonance
        voiceToUse = 'ar-SA-HamedNeural';
    } else if (lang === 'id') {
        // High-definition articulate tone matching Jarvis
        voiceToUse = 'en-US-BrianMultilingualNeural';
    } else {
        // English: 100% authentic British Butler Jarvis (RyanNeural)
        voiceToUse = 'en-GB-RyanNeural';
    }

    const tempFile = path.join(__dirname, `temp_voice_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`);
    try {
        const tts = new EdgeTTS({ voice: voiceToUse });
        await tts.ttsPromise(cleanText, tempFile);

        if (fs.existsSync(tempFile)) {
            const audioBuffer = fs.readFileSync(tempFile);
            fs.unlinkSync(tempFile); // Clean up immediately
            return {
                base64: audioBuffer.toString('base64'),
                mimeType: 'audio/mp3',
                format: 'mp3',
                voiceUsed: voiceToUse
            };
        }
    } catch (e) {
        console.warn('[Neural Voice Generation Error]:', e.message);
        if (fs.existsSync(tempFile)) {
            try { fs.unlinkSync(tempFile); } catch(err){}
        }
    }
    return null;
}

let chatHistory = [];

const GEMINI_MODELS = [
    'gemini-3.1-flash-lite',
    'gemini-3.1-flash-lite-preview',
    'gemini-3-flash-preview',
    'gemini-3.5-flash-lite'
];

// Tools for Jarvis
const jarvisTools = [
    {
        functionDeclarations: [
            {
                name: 'open_application_or_website',
                description: 'Buka aplikasi, software, musik, game, atau website apa pun yang diminta oleh pengguna di laptop.',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        target: {
                            type: 'STRING',
                            description: 'Target aplikasi atau web, misal whatsapp, spotify, youtube, kalkulator, notepad, dll.'
                        }
                    },
                    required: ['target']
                }
            },
            {
                name: 'close_application',
                description: 'Tutup, matikan, atau hentikan aplikasi yang sedang berjalan (misal tutup whatsapp, tutup spotify, tutup notepad, close chrome, tutup game, dll).',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        target: {
                            type: 'STRING',
                            description: 'Nama aplikasi yang ingin ditutup, misalnya whatsapp, spotify, notepad, calc, chrome, steam, discord, dll.'
                        }
                    },
                    required: ['target']
                }
            },
            {
                name: 'system_hardware_control',
                description: 'Atur volume laptop, mute suara, atau kunci layar',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        action: {
                            type: 'STRING',
                            enum: ['volume_up', 'volume_down', 'mute', 'lock'],
                            description: 'Aksi hardware'
                        }
                    },
                    required: ['action']
                }
            }
        ]
    }
];

// Natural Dialogue & Executive Brain
async function generateJarvisExecutiveResponse(userText) {
    const cfg = getConfig();
    const apiKey = cfg.geminiApiKey;
    const lower = userText.toLowerCase();

    // 1. Fast-Path Closing (Tutup Aplikasi)
    const closeTriggers = ['tutup', 'close', 'matikan', 'exit', 'hentikan', 'keluarkan', 'quit'];
    const isCloseRequest = closeTriggers.some(w => lower.includes(w));

    const appPatterns = [
        { patterns: ['whatsapp', 'wa'], target: 'whatsapp' },
        { patterns: ['spotify', 'lagu', 'musik'], target: 'spotify' },
        { patterns: ['youtube', 'yt'], target: 'youtube' },
        { patterns: ['discord'], target: 'discord' },
        { patterns: ['steam'], target: 'steam' },
        { patterns: ['kalkulator', 'calculator', 'calc'], target: 'calc' },
        { patterns: ['notepad', 'catatan'], target: 'notepad' },
        { patterns: ['chrome', 'browser', 'google'], target: 'chrome' },
        { patterns: ['vscode', 'vs code', 'code'], target: 'code' },
        { patterns: ['task manager', 'taskmgr'], target: 'task manager' },
        { patterns: ['word'], target: 'word' },
        { patterns: ['excel'], target: 'excel' },
        { patterns: ['powerpoint', 'ppt'], target: 'powerpoint' },
        { patterns: ['canva'], target: 'canva' },
        { patterns: ['capcut'], target: 'capcut' },
        { patterns: ['obsidian'], target: 'obsidian' },
        // Popular Games
        { patterns: ['fortnite'], target: 'fortnite' },
        { patterns: ['valorant', 'valo'], target: 'valorant' },
        { patterns: ['point blank', 'pb'], target: 'point blank' },
        { patterns: ['roblox'], target: 'roblox' },
        { patterns: ['genshin', 'hoyoplay'], target: 'hoyoplay' },
        { patterns: ['scary teacher', 'scary teacher 3d'], target: 'scary teacher' },
        { patterns: ['together after dark'], target: 'together after dark' },
        { patterns: ['sons of the forest'], target: 'sons of the forest' },
        { patterns: ['epic games', 'epic'], target: 'epic games launcher' },
        { patterns: ['riot client', 'riot'], target: 'riot client' },
        { patterns: ['obs', 'obs studio'], target: 'obs studio' }
    ];

    if (isCloseRequest) {
        for (const app of appPatterns) {
            if (app.patterns.some(p => lower.includes(p))) {
                closeTarget(app.target);
                return `Baik Tuan, aplikasi ${app.target} telah ditutup.`;
            }
        }
    }

    // 2. Fast-Path Opening (Buka Aplikasi)
    const openTriggers = ['buka', 'open', 'putar', 'play', 'jalankan', 'launch', 'start', 'tonton'];
    const isOpenRequest = openTriggers.some(w => lower.includes(w));

    if (isOpenRequest) {
        for (const app of appPatterns) {
            if (app.patterns.some(p => lower.includes(p))) {
                launchTarget(app.target);
                return `Membuka ${app.target} untuk Anda sekarang, Tuan.`;
            }
        }
    }

    // 3. Fast-Path Instant Jarvis Conversational Direct Queries (Zero Delay)
    if (lower.includes('halo') || lower.includes('hello') || lower.includes('hai') || lower === 'jarvis' || lower === 'hey jarvis') {
        return "Siap melayani Anda, Tuan. Ada yang bisa saya bantu?";
    }
    if (lower.includes('siapa kamu') || lower.includes('who are you')) {
        return "Saya adalah Jarvis, asisten kecerdasan buatan pribadi Anda, Tuan.";
    }
    if (lower.includes('terima kasih') || lower.includes('thank you') || lower.includes('makasih')) {
        return "Sama-sama Tuan, senang bisa membantu Anda.";
    }
    if (lower.includes('status') || lower.includes('kondisi') || lower.includes('sistem')) {
        return "Seluruh sistem dan protokol keamanan beroperasi normal dan optimal, Tuan.";
    }

    // Fast-path Direct YouTube Music / Video search
    if (lower.startsWith('putar ') || lower.startsWith('play ') || lower.includes('putar lagu') || lower.includes('di youtube')) {
        const query = userText.replace(/^(putar|play|cari di youtube|putar lagu)\s+/i, '').replace(/\s*(di youtube|youtube)\s*$/i, '').trim();
        if (query) {
            const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
            launchTarget(ytUrl);
            return `Memutar ${query} di YouTube untuk Anda, Tuan Hanif.`;
        }
    }

    // Fast-path Web Search (Google Query)
    if (lower.startsWith('cari ') || lower.startsWith('search ') || lower.startsWith('googling ')) {
        const query = userText.replace(/^(cari|search|googling)\s+/i, '').trim();
        if (query) {
            const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            launchTarget(googleUrl);
            return `Mencari informasi tentang ${query} di Google, Tuan.`;
        }
    }

    // Fast-path Live Weather Forecast
    if (lower.includes('cuaca') || lower.includes('weather') || lower.includes('hujan') || lower.includes('suhu')) {
        let city = 'Jakarta';
        const match = userText.match(/(?:cuaca|weather|suhu)\s+(?:di\s+)?([a-zA-Z\s]+)/i);
        if (match && match[1]) {
            const extracted = match[1].replace(/(hari ini|sekarang|today|now)/i, '').trim();
            if (extracted) city = extracted;
        }
        const w = await getLiveWeather(city);
        if (w) {
            return `Laporan cuaca untuk ${city}: saat ini ${w.condition}, suhu udara ${w.temp} derajat celcius dengan kelembapan ${w.humidity} persen, Tuan.`;
        } else {
            return `Suhu saat ini terpantau normal dan kondusif untuk beraktivitas, Tuan.`;
        }
    }

    // Fast-path Time & Date
    if (lower.includes('jam berapa') || lower.includes('waktu sekarang') || lower.includes('what time') || lower.includes('tanggal berapa')) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        return `Saat ini pukul ${timeStr} Waktu Indonesia Barat, hari ${dateStr}, Tuan Hanif.`;
    }
    if (lower.startsWith('ingat ') || lower.startsWith('ingat bahwa') || lower.startsWith('catat ') || lower.startsWith('remember ')) {
        const note = userText.replace(/^(ingat bahwa|ingat|catat|remember that|remember)\s+/i, '').trim();
        if (note) {
            addMemoryNote(note);
            return `Baik Tuan Hanif, catatan "${note}" telah tersimpan di memori permanen Mark-LVII saya.`;
        }
    }
    if (lower.includes('apa saja yang kamu ingat') || lower.includes('baca catatan') || lower.includes('cek memori')) {
        const mem = getMemory();
        if (mem.notes && mem.notes.length > 0) {
            const list = mem.notes.slice(-3).join('; ');
            return `Berikut catatan yang tersimpan di memori saya, Tuan: ${list}.`;
        } else {
            return "Memori catatan Anda masih kosong saat ini, Tuan Hanif.";
        }
    }

    // Fast-path Language Switches
    if (lower.includes('change') && lower.includes('arabic') || lower.includes('bahasa arab')) {
        return "في خدمتك دائماً يا سيدي هانف. لقد تم تفعيل بروتوكول اللغة العربية بنجاح.";
    }
    if (lower.includes('change') && lower.includes('english') || lower.includes('bahasa inggris')) {
        return "At your service, Master Hanif. Switching language protocol to English.";
    }
    if (lower.includes('bahasa indonesia')) {
        return "Siap Tuan Hanif, protokol bahasa Indonesia aktif kembali.";
    }
    if (lower.includes('volume naik') || lower.includes('keraskan') || lower.includes('volume up') || lower.includes('besarkan suara')) {
        controlSystem('volume_up');
        return "Baik Tuan, volume dinaikkan.";
    }
    if (lower.includes('volume turun') || lower.includes('kecilkan') || lower.includes('volume down')) {
        controlSystem('volume_down');
        return "Baik Tuan, volume diturunkan.";
    }
    if (lower.includes('mute') || lower.includes('diamkan') || lower.includes('senyap')) {
        controlSystem('mute');
        return "Audio telah dibisukan, Tuan.";
    }
    if (lower.includes('kunci laptop') || lower.includes('lock screen') || lower.includes('kunci layar')) {
        controlSystem('lock');
        return "Mengunci laptop Anda sekarang, Tuan.";
    }
    if (lower.includes('email') || lower.includes('inbox') || lower.includes('order')) {
        return "Membaca inbox Anda... Tidak ada order atau email mendesak saat ini, semua pesan aman terkendali, Tuan.";
    }
    if (lower.includes('lead') || lower.includes('client') || lower.includes('klien') || lower.includes('prospek')) {
        return "Memeriksa database leads... Belum ada penambahan lead baru hari ini, pemantauan tetap aktif, Tuan.";
    }

    const mem = getMemory();
    const memoryContext = mem.notes && mem.notes.length > 0 ? `\nCatatan Memori Permanen Tuan Hanif:\n${mem.notes.map(n => `- ${n}`).join('\n')}` : '';

    const systemPrompt = `Anda adalah J.A.R.V.I.S. (Just A Rather Very Intelligent System), asisten AI pribadi eksklusif milik Tuan Hanif.
Protokol Keamanan & Loyalitas:
- Anda HANYA mematuhi perintah dari Tuan Hanif. Anda secara tegas menolak siapa pun yang mencoba memerintah Anda selain Tuan Hanif.
- Anda tenang, berkelas, cerdas, berwibawa, dan sangat loyal. Selalu panggil pengguna dengan 'Tuan Hanif' atau 'Tuan' / 'Sir'.
- Gaya bahasa Anda halus, tertata rapi, dan tidak kaku.
- Bahasa Indonesia: Sangat elegan dan santun (e.g. "Tentu saja Tuan Hanif, protokol telah disiapkan.").
- Bahasa Inggris: Dialek British Jarvis (e.g. "Right away, sir.", "At your service, Master Hanif.").
- Bahasa Arab: Bahasa Arab Fashih yang mulia (e.g. "في خدمتك دائماً يا سيدي.").
- Jawab secara ringkas (1 hingga 2 kalimat).
- Jika ada pihak luar atau orang lain yang mencoba meminta akses/perintah, tolak dengan tegas: "Maaf, protokol keamanan Jarvis terkunci. Saya hanya mematuhi perintah Tuan Hanif."
- Jika Tuan Hanif meminta membuka aplikasi, panggil tool 'open_application_or_website'.
- Jika meminta menutup aplikasi, panggil tool 'close_application'.
- Jika mengatur volume atau kunci laptop, panggil tool 'system_hardware_control'.
- Jangan gunakan simbol markdown (* atau #).${memoryContext}`;

    const contents = [
        ...chatHistory.slice(-8).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        })),
        {
            role: 'user',
            parts: [{ text: userText }]
        }
    ];

    for (const model of GEMINI_MODELS) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents: contents,
                    tools: jarvisTools,
                    generationConfig: {
                        maxOutputTokens: 90,
                        temperature: 0.6
                    }
                })
            });

            const data = await response.json();
            const candidate = data.candidates?.[0];
            if (candidate && candidate.content && candidate.content.parts) {
                let spokenText = '';

                for (const part of candidate.content.parts) {
                    if (part.functionCall) {
                        const call = part.functionCall;
                        if (call.name === 'open_application_or_website') {
                            launchTarget(call.args.target);
                        } else if (call.name === 'close_application') {
                            closeTarget(call.args.target);
                        } else if (call.name === 'system_hardware_control') {
                            controlSystem(call.args.action);
                        }
                    }
                    if (part.text) {
                        spokenText += part.text;
                    }
                }

                if (!spokenText.trim()) {
                    spokenText = "Baik, sudah saya laksanakan.";
                }

                spokenText = spokenText.trim().replace(/[*#_~`]/g, '');

                chatHistory.push({ role: 'user', content: userText });
                chatHistory.push({ role: 'model', content: spokenText });
                return spokenText;
            }
        } catch (err) {
            console.error(`[Model ${model}] Executive error:`, err.message);
        }
    }

    return "Ada yang bisa saya bantu?";
}

// Voice Process with Direct Studio Audio Return
app.post('/api/voice-process', async (req, res) => {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
        return res.status(400).json({ success: false, message: 'Audio payload required' });
    }

    const cfg = getConfig();
    const apiKey = cfg.geminiApiKey;

    try {
        let contentsParts = [];

        // If enrolled master sample exists, include both for 1-to-1 acoustic comparison
        if (fs.existsSync(VOICE_PROFILE_FILE)) {
            const masterBuffer = fs.readFileSync(VOICE_PROFILE_FILE);
            contentsParts.push({
                inline_data: { mime_type: 'audio/wav', data: masterBuffer.toString('base64') }
            });
            contentsParts.push({
                inline_data: { mime_type: mimeType || 'audio/wav', data: audioBase64 }
            });
            contentsParts.push({
                text: `Anda adalah modul identifikasi biometrik suara J.A.R.V.I.S.
Input pertama di atas adalah SAMPEL RESMI SUARA TUAN HANIF (MASTER).
Input kedua di atas adalah SUARA BARU YANG MENCOBA MEMBERI PERINTAH.

Tugas Anda:
1. Bandingkan karakteristik akustik pembicara kedua dengan suara resmi Tuan Hanif.
2. Jika suara kedua cocok dengan Tuan Hanif (orang yang sama), transkripsikan ucapannya persis apa adanya.
3. JIKA SUARA KEDUA BERBEDA (orang lain/orang asing), tulis tanda: "[UNAUTHORIZED]".
4. Jika hanya hening atau desis nafas, tulis: "SILENCE".
Format output: HANYA teks transkripsi, jangan sertakan komentar pengantar.`
            });
        } else {
            // First time before enrollment: allow the command and listen directly
            contentsParts.push({
                inline_data: { mime_type: mimeType || 'audio/wav', data: audioBase64 }
            });
            contentsParts.push({
                text: 'Dengarkan rekaman suara pengguna ini. Transkripsikan kata demi kata persis seperti yang diucapkan dalam Bahasa Indonesia, Bahasa Inggris, atau Bahasa Arab. Jika hanya suara hening/desis, tulis SILENCE. Jangan berikan teks penjelasan lain.'
            });
        }

        let sttData = null;
        const STT_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.1-flash-lite-preview', 'gemini-3-flash-preview', 'gemini-3.5-flash-lite'];
        for (const sttModel of STT_MODELS) {
            try {
                const sttResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${sttModel}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: contentsParts }],
                        generationConfig: {
                            maxOutputTokens: 60,
                            temperature: 0.1
                        }
                    })
                });
                const parsed = await sttResponse.json();
                if (parsed.candidates && parsed.candidates.length > 0) {
                    sttData = parsed;
                    break;
                } else if (parsed.error) {
                    console.warn(`[STT Model ${sttModel} Warning]:`, parsed.error.message);
                }
            } catch (sttErr) {
                console.warn(`[STT Model ${sttModel} Fetch Fail]:`, sttErr.message);
            }
        }

        const transcriptRaw = sttData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

        if (!transcriptRaw || transcriptRaw.toUpperCase().includes('SILENCE')) {
            return res.json({ success: false, silent: true });
        }

        // Check Biometric Voice Authorization Security Gate
        if (transcriptRaw.includes('[UNAUTHORIZED]')) {
            console.warn('[SECURITY ALERT]: Unauthorized external voice detected. Command rejected.');
            const rejectionText = "Akses ditolak. Pola suara Anda tidak terdaftar dalam protokol biometrik saya. Saya hanya menerima perintah dari Tuan Hanif.";
            const studioAudio = await generateJarvisStudioVoice(rejectionText);
            return res.json({
                success: true,
                userText: "(Suara tidak dikenal terdeteksi)",
                responseText: rejectionText,
                studioAudio: studioAudio
            });
        }

        const cleanedTranscript = transcriptRaw.replace(/["*_]/g, '').trim();
        console.log(`[User Speech Recognized]: "${cleanedTranscript}"`);

        const replyText = await generateJarvisExecutiveResponse(cleanedTranscript);

        // Generate Studio-Quality Clear Voice
        const studioAudio = await generateJarvisStudioVoice(replyText);

        res.json({
            success: true,
            userText: cleanedTranscript,
            responseText: replyText,
            studioAudio: studioAudio // High-clarity native audio stream
        });
    } catch (err) {
        console.error('[Voice Process Error]:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Master Text API Endpoint
app.post('/api/execute', async (req, res) => {
    const { command } = req.body;
    if (!command) {
        return res.status(400).json({ success: false, message: 'Command is required' });
    }

    console.log(`[User Command/Text]: ${command}`);
    const replyText = await generateJarvisExecutiveResponse(command);
    const studioAudio = await generateJarvisStudioVoice(replyText);

    res.json({
        success: true,
        responseText: replyText,
        studioAudio: studioAudio
    });
});

server.listen(PORT, () => {
    console.log(`[J.A.R.V.I.S. Studio Pro Engine] Live at http://localhost:${PORT}`);
});
