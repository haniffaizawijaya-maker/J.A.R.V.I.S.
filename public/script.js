// J.A.R.V.I.S. Audio Diagnostic & Continuous Recognition Engine
const timeElem = document.getElementById('system-time');
const cpuCoresElem = document.getElementById('cpu-cores');
const cpuBarElem = document.getElementById('cpu-bar');
const ramUsageElem = document.getElementById('ram-usage');
const ramBarElem = document.getElementById('ram-bar');
const hostNameElem = document.getElementById('host-name');
const osPlatformElem = document.getElementById('os-platform');
const uptimeElem = document.getElementById('uptime');
const logsContainer = document.getElementById('logs-container');
const cmdInput = document.getElementById('cmd-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const voiceLabel = document.getElementById('voice-label');
const interimTextElem = document.getElementById('interim-text');
const waveform = document.getElementById('waveform');
const videoWrapper = document.getElementById('video-wrapper');
const jarvisVideo = document.getElementById('jarvis-video');
const voiceSelect = document.getElementById('voice-select');
const speechToggle = document.getElementById('speech-toggle');
const activationModal = document.getElementById('activation-modal');
const activateBtn = document.getElementById('activate-btn');

let isSpeaking = false;
let userMuted = false;
let recognition = null;
let keepListening = true;
let isRecStarted = false;
let audioContext = null;
let analyser = null;
let micStream = null;

// Clock updater
function updateClock() {
    const now = new Date();
    timeElem.textContent = now.toTimeString().split(' ')[0];
}
setInterval(updateClock, 1000);
updateClock();

// Fetch System Diagnostics
async function fetchDiagnostics() {
    try {
        const res = await fetch('/api/system-status');
        const data = await res.json();
        
        cpuCoresElem.textContent = `${data.cpuCores} CORE (${data.arch.toUpperCase()})`;
        ramUsageElem.textContent = `${data.usedMemoryGB} / ${data.totalMemoryGB} GB`;
        ramBarElem.style.width = `${data.memoryUsagePercent}%`;
        hostNameElem.textContent = data.hostname;
        osPlatformElem.textContent = `${data.platform.toUpperCase()} (${data.release})`;
        uptimeElem.textContent = data.uptimeFormatted;

        const randCpu = Math.floor(Math.random() * 25) + 20;
        cpuBarElem.style.width = `${randCpu}%`;
    } catch (e) {
        console.warn('Diagnostics polling error:', e);
    }
}
setInterval(fetchDiagnostics, 3500);
fetchDiagnostics();

// Voice Synthesis Setup (TTS)
let voices = [];
function populateVoices() {
    if (!('speechSynthesis' in window)) return;
    voices = window.speechSynthesis.getVoices();
    voiceSelect.innerHTML = '';
    
    voices.forEach((v, idx) => {
        const option = document.createElement('option');
        option.value = idx;
        option.textContent = `${v.name} (${v.lang})`;
        if (v.name.includes('UK') || v.name.includes('British') || v.name.includes('George') || v.name.includes('David') || v.name.includes('Google UK English Male')) {
            option.selected = true;
        }
        voiceSelect.appendChild(option);
    });
}
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = populateVoices;
    populateVoices();
}

function speak(text) {
    if (!speechToggle.checked || !('speechSynthesis' in window)) {
        return;
    }
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (voices[voiceSelect.value]) {
        utterance.voice = voices[voiceSelect.value];
    }
    
    utterance.rate = 1.05;
    utterance.pitch = 0.9;

    utterance.onstart = () => {
        isSpeaking = true;
        pauseRecognition();
        if (videoWrapper) videoWrapper.classList.add('speaking');
        waveform.classList.add('active');
        voiceLabel.textContent = 'J.A.R.V.I.S. BERBICARA...';
    };

    utterance.onend = () => {
        isSpeaking = false;
        if (videoWrapper) videoWrapper.classList.remove('speaking');
        waveform.classList.remove('active');
        voiceLabel.textContent = 'MENDENGARKAN... SILAKAN BICARA, SIR';
        setTimeout(() => {
            safeStartRecognition();
        }, 400);
    };

    utterance.onerror = () => {
        isSpeaking = false;
        if (videoWrapper) videoWrapper.classList.remove('speaking');
        safeStartRecognition();
    };

    window.speechSynthesis.speak(utterance);
}

// Log Message with Smooth Auto-Scroll to Bottom
function appendLog(speaker, message, isUser = false) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${isUser ? 'user' : 'jarvis'}`;
    entry.innerHTML = `
        <span class="log-speaker">[${speaker.toUpperCase()}]</span>
        <p>${message}</p>
    `;
    logsContainer.appendChild(entry);
    
    requestAnimationFrame(() => {
        logsContainer.scrollTop = logsContainer.scrollHeight;
    });
}

function clearLogs() {
    logsContainer.innerHTML = `
        <div class="log-entry jarvis">
            <span class="log-speaker">[J.A.R.V.I.S.]</span>
            <p>Log memori layar telah dibersihkan, sir. Semua sistem tetap beroperasi normal.</p>
        </div>
    `;
}

// Command Execution
async function processCommand(cmd) {
    if (!cmd || !cmd.trim()) return;
    const commandText = cmd.trim();

    appendLog('Tony Stark', commandText, true);
    cmdInput.value = '';
    interimTextElem.textContent = '';
    voiceLabel.textContent = 'MEMPROSES PERINTAH...';
    
    try {
        const res = await fetch('/api/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: commandText })
        });
        const result = await res.json();
        
        appendLog('J.A.R.V.I.S.', result.responseText);
        speak(result.responseText);
    } catch (e) {
        const err = 'Gangguan komunikasi dengan server Jarvis.';
        appendLog('SYSTEM', err);
        speak(err);
    }
}

function quickExec(cmd) {
    processCommand(cmd);
}

// Input Handlers
sendBtn.addEventListener('click', () => {
    processCommand(cmdInput.value);
});

cmdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        processCommand(cmdInput.value);
    }
});

// Microphone Volume Visualizer (Web Audio API)
async function startAudioVisualizer(stream) {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const bars = document.querySelectorAll('.waveform .bar');

        function renderAudio() {
            if (!userMuted && !isSpeaking) {
                analyser.getByteFrequencyData(dataArray);
                let avg = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    avg += dataArray[i];
                }
                avg = avg / dataArray.length;

                if (avg > 15) {
                    if (videoWrapper) videoWrapper.classList.add('hearing');
                    bars.forEach((bar, idx) => {
                        const val = dataArray[idx % dataArray.length];
                        bar.style.height = `${Math.max(4, (val / 255) * 28)}px`;
                    });
                } else {
                    if (videoWrapper) videoWrapper.classList.remove('hearing');
                    bars.forEach(bar => bar.style.height = '4px');
                }
            }
            requestAnimationFrame(renderAudio);
        }
        renderAudio();
    } catch (err) {
        console.warn('Audio visualizer error:', err);
    }
}

// Speech Recognition Engine Setup
function setupSpeechRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
        appendLog('SYSTEM', 'Browser ini tidak mendukung Web Speech Recognition. Gunakan Chrome atau Edge.');
        voiceLabel.textContent = 'SPEECH API NOT SUPPORTED';
        return false;
    }

    recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'id-ID';

    recognition.onstart = () => {
        isRecStarted = true;
        micBtn.classList.add('active');
        voiceLabel.textContent = 'MENDENGARKAN... SILAKAN BICARA, SIR';
    };

    recognition.onresult = (event) => {
        if (isSpeaking) return;

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                final += transcript;
            } else {
                interim += transcript;
            }
        }

        if (interim) {
            interimTextElem.textContent = `"${interim}"`;
            voiceLabel.textContent = 'MENDETEKSI SUARA...';
        }

        if (final) {
            interimTextElem.textContent = '';
            processCommand(final);
        }
    };

    recognition.onerror = (event) => {
        console.warn('Speech Engine Warning:', event.error);
        if (event.error === 'not-allowed') {
            appendLog('SYSTEM', 'PERINGATAN: Izin mikrofon di browser diblokir. Izinkan di browser.');
            voiceLabel.textContent = 'IZIN MIC DITOLAK';
            keepListening = false;
        }
    };

    recognition.onend = () => {
        isRecStarted = false;
        if (keepListening && !userMuted && !isSpeaking) {
            setTimeout(() => {
                safeStartRecognition();
            }, 300);
        } else {
            micBtn.classList.remove('active');
        }
    };

    return true;
}

function safeStartRecognition() {
    if (!recognition || isRecStarted || isSpeaking || userMuted || !keepListening) return;
    try {
        recognition.start();
    } catch (e) {}
}

function pauseRecognition() {
    if (recognition && isRecStarted) {
        try {
            recognition.abort();
            isRecStarted = false;
        } catch (e) {}
    }
}

// User Mic Toggle (Mute / Unmute)
micBtn.addEventListener('click', () => {
    if (userMuted) {
        userMuted = false;
        keepListening = true;
        safeStartRecognition();
        appendLog('SYSTEM', 'Mikrofon diaktifkan kembali. Siap mendengar.');
    } else {
        userMuted = true;
        keepListening = false;
        pauseRecognition();
        micBtn.classList.remove('active');
        voiceLabel.textContent = 'MIC DIMATIKAN (KLIK UNTUK HIDUPKAN)';
        appendLog('SYSTEM', 'Mikrofon dimatikan sementara oleh Anda.');
    }
});

// Master Initialization Button
activateBtn.addEventListener('click', async () => {
    try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        startAudioVisualizer(micStream);
        
        activationModal.classList.add('hidden');
        keepListening = true;
        userMuted = false;

        if (jarvisVideo) {
            jarvisVideo.play().catch(e => console.log('Video autoplay error:', e));
        }

        const supported = setupSpeechRecognition();
        if (supported) {
            safeStartRecognition();
            appendLog('SYSTEM', 'Protokol audio aktif. Mikrofon standby siap mendengar Anda.');
            setTimeout(() => {
                speak("All holographic visual protocols online, sir. Visual interface updated.");
            }, 400);
        }
    } catch (err) {
        console.error('Mic access error:', err);
        alert('Gagal mengakses mikrofon: ' + err.message);
        appendLog('SYSTEM', 'Error akses mikrofon: ' + err.message);
    }
});
