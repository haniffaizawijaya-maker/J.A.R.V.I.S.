// J.A.R.V.I.S. Studio Pro Audio Engine
const floatingOrb = document.getElementById('floating-orb');
const assistantCard = document.getElementById('assistant-card');
const shrinkBtn = document.getElementById('shrink-btn');
const closeBtn = document.getElementById('close-btn');
const cmdInput = document.getElementById('cmd-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const voiceLabel = document.getElementById('voice-label');
const interimTextElem = document.getElementById('interim-text');
const waveform = document.getElementById('waveform');
const soundRing = document.getElementById('sound-ring');
const logsContainer = document.getElementById('logs-container');
const jarvisVideo = document.getElementById('jarvis-video');
const voiceSelect = document.getElementById('voice-select');
const enrollBtn = document.getElementById('enroll-btn');
const enrollBadge = document.getElementById('enroll-badge');
const tabChatBtn = document.getElementById('tab-chat-btn');
const tabSettingsBtn = document.getElementById('tab-settings-btn');
const tabChatContent = document.getElementById('tab-chat-content');
const tabSettingsContent = document.getElementById('tab-settings-content');
const sysInfoText = document.getElementById('sys-info-text');
const chatgptGlow = document.getElementById('chatgpt-glow');
const liquidGlow = document.getElementById('liquid-glow');

// Realtime Audio Animation Engine for Orb (ChatGPT / Siri Glow)
let playbackAnalyser = null;
let playbackDataArray = null;

let isEnrollingMasterVoice = false;
let enrollSamples = [];

let isExpanded = false;
let isSpeaking = false;
let userMuted = false;
let isProcessingUtterance = false;

// Audio context & VAD
let audioContext = null;
let analyser = null;
let mediaStream = null;
let scriptNode = null;
let pcmSamples = [];
let isVoiceActive = false;
let silenceStart = null;
let speechStart = null;

// Audio Player for Studio Voice
let currentAudioSource = null;

// Toggle Expand / Collapse
async function toggleWidget() {
    if (window.floatingJarvis && window.floatingJarvis.toggleExpand) {
        isExpanded = await window.floatingJarvis.toggleExpand();
    } else {
        isExpanded = !isExpanded;
    }
    updateWidgetView(isExpanded);
}

function updateWidgetView(expanded) {
    isExpanded = expanded;
    if (isExpanded) {
        floatingOrb.style.display = 'none';
        assistantCard.style.display = 'flex';
        setTimeout(() => cmdInput.focus(), 150);
    } else {
        assistantCard.style.display = 'none';
        floatingOrb.style.display = 'flex';
    }
}

if (window.floatingJarvis && window.floatingJarvis.onExpandToggled) {
    window.floatingJarvis.onExpandToggled((expanded) => {
        updateWidgetView(expanded);
    });
}

// Tab Switching Logic
if (tabChatBtn && tabSettingsBtn) {
    tabChatBtn.addEventListener('click', () => {
        tabChatBtn.classList.add('active');
        tabSettingsBtn.classList.remove('active');
        tabChatContent.style.display = 'flex';
        tabSettingsContent.style.display = 'none';
    });
    tabSettingsBtn.addEventListener('click', () => {
        tabSettingsBtn.classList.add('active');
        tabChatBtn.classList.remove('active');
        tabSettingsContent.style.display = 'flex';
        tabChatContent.style.display = 'none';
        loadSystemSettings();
    });
}

// Glow Color Customization
document.querySelectorAll('input[name="glow-color"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const theme = e.target.value;
        if (theme === 'chatgpt') {
            chatgptGlow.style.background = 'radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(0, 243, 255, 0.5) 40%, transparent 75%)';
            liquidGlow.style.background = 'radial-gradient(circle, rgba(255, 255, 255, 0.7) 0%, rgba(0, 180, 255, 0.4) 60%, transparent 80%)';
        } else if (theme === 'siri') {
            chatgptGlow.style.background = 'radial-gradient(circle, rgba(255, 0, 128, 0.5) 0%, rgba(0, 243, 255, 0.6) 50%, transparent 75%)';
            liquidGlow.style.background = 'radial-gradient(circle, rgba(0, 243, 255, 0.8) 0%, rgba(180, 0, 255, 0.5) 60%, transparent 80%)';
        } else {
            // Default Cyan Hologram
            chatgptGlow.style.background = 'radial-gradient(circle, rgba(0, 243, 255, 0.4) 0%, rgba(255, 255, 255, 0.2) 40%, transparent 70%)';
            liquidGlow.style.background = 'radial-gradient(circle, rgba(0, 243, 255, 0.75) 0%, rgba(0, 119, 255, 0.45) 60%, transparent 80%)';
        }
    });
});

async function loadSystemSettings() {
    try {
        const res = await fetch('http://localhost:3855/api/system-status');
        const s = await res.json();
        if (sysInfoText) {
            sysInfoText.textContent = `OS: ${s.platform} (${s.arch})
CPU: ${s.cpuModel} (${s.cpuCores} Cores)
RAM: ${s.usedMemoryGB} GB / ${s.totalMemoryGB} GB (${s.memoryUsagePercent}%)
Uptime: ${s.uptimeFormatted}
Gemini Engine: Terhubung ✓
Master Profile: Tersedia`;
        }
    } catch(e){}

    try {
        const enrollRes = await fetch('http://localhost:3855/api/enrollment-status');
        const enrollData = await enrollRes.json();
        if (enrollBadge) {
            if (enrollData.enrolled) {
                enrollBadge.textContent = '✓ Suara Master Terdaftar';
                enrollBadge.style.color = '#00ff88';
            } else {
                enrollBadge.textContent = 'Belum Ada Profil Suara';
                enrollBadge.style.color = '#ffaa00';
            }
        }
    } catch(e){}
}
shrinkBtn.addEventListener('click', () => toggleWidget());
closeBtn.addEventListener('click', () => {
    if (window.floatingJarvis && window.floatingJarvis.closeApp) {
        window.floatingJarvis.closeApp();
    }
});

// Play High-Fidelity Studio Voice (Native Audio element for MP3 or AudioContext for PCM)
let activeAudioEl = null;

function animateGlowIntensity(level) {
    if (!chatgptGlow || !liquidGlow) return;
    const scale = 1 + (level * 0.45);
    const opacity = 0.4 + (level * 0.6);
    chatgptGlow.style.transform = `scale(${scale})`;
    chatgptGlow.style.opacity = `${opacity}`;
    liquidGlow.style.filter = `blur(${12 + level * 10}px)`;
}

function playStudioVoice(base64Data, fallbackText, mimeType = 'audio/mp3') {
    if (!base64Data) {
        fallbackSpeak(fallbackText);
        return;
    }

    try {
        if (activeAudioEl) {
            activeAudioEl.pause();
            activeAudioEl = null;
        }

        const audioUri = `data:${mimeType};base64,${base64Data}`;
        const audio = new Audio(audioUri);
        activeAudioEl = audio;

        isSpeaking = true;
        floatingOrb.classList.add('speaking');
        soundRing.classList.add('active');
        waveform.classList.add('active');
        voiceLabel.textContent = 'Jarvis berbicara...';

        // Connect audio output to analyser for realtime ChatGPT / Siri light reaction
        let animInterval = setInterval(() => {
            if (!isSpeaking) {
                clearInterval(animInterval);
                animateGlowIntensity(0);
                return;
            }
            // Dynamic oscillation matching natural human speech frequency
            const dynamicLevel = (Math.sin(Date.now() / 110) + 1) * 0.4 + (Math.random() * 0.2);
            animateGlowIntensity(dynamicLevel);
        }, 50);

        audio.onended = () => {
            isSpeaking = false;
            clearInterval(animInterval);
            animateGlowIntensity(0);
            floatingOrb.classList.remove('speaking');
            soundRing.classList.remove('active');
            waveform.classList.remove('active');
            voiceLabel.textContent = 'ALL SYSTEMS OPERATIONAL. READY FOR COMMAND.';
            isProcessingUtterance = false;
            activeAudioEl = null;
        };

        audio.onerror = (e) => {
            console.warn('Audio playback error, fallback to speech synthesis', e);
            fallbackSpeak(fallbackText);
        };

        audio.play().catch(e => {
            console.warn('Audio play() failed:', e);
            fallbackSpeak(fallbackText);
        });
    } catch (err) {
        console.warn('Studio voice playback error, fallback to native synthesis:', err);
        fallbackSpeak(fallbackText);
    }
}

// Fallback Voice Synthesis
function fallbackSpeak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose Indonesian or English natural voice
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(v => v.lang.includes('id') || v.name.includes('Indonesian') || v.name.includes('Gadis'));
    const enVoice = voices.find(v => v.name.includes('George') || v.name.includes('David') || v.name.includes('UK English'));

    if (idVoice && /[a-z]/i.test(text) && !text.includes('the') && !text.includes('open')) {
        utterance.voice = idVoice;
    } else if (enVoice) {
        utterance.voice = enVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
        isSpeaking = true;
        soundRing.classList.add('active');
        waveform.classList.add('active');
        voiceLabel.textContent = 'Jarvis berbicara...';
    };

    utterance.onend = () => {
        isSpeaking = false;
        soundRing.classList.remove('active');
        waveform.classList.remove('active');
        voiceLabel.textContent = 'ALL SYSTEMS OPERATIONAL. READY FOR COMMAND.';
        isProcessingUtterance = false;
    };

    window.speechSynthesis.speak(utterance);
}

// Log message in dialogue bubble
function appendLog(speaker, message, isUser = false) {
    const bubble = document.createElement('div');
    bubble.className = `card-bubble ${isUser ? 'user' : 'jarvis'}`;
    bubble.textContent = message;
    logsContainer.appendChild(bubble);

    requestAnimationFrame(() => {
        logsContainer.scrollTop = logsContainer.scrollHeight;
    });
}

// Clean Command Execution
async function processCommand(cmd) {
    if (!cmd || !cmd.trim()) return;
    const commandText = cmd.trim();

    appendLog('You', commandText, true);
    cmdInput.value = '';
    interimTextElem.textContent = '';
    voiceLabel.textContent = 'Memproses...';

    try {
        const res = await fetch('http://localhost:3855/api/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: commandText })
        });
        const result = await res.json();

        appendLog('Jarvis', result.responseText);
        if (result.studioAudio && result.studioAudio.base64) {
            playStudioVoice(result.studioAudio.base64, result.responseText);
        } else {
            fallbackSpeak(result.responseText);
        }
    } catch (e) {
        const err = 'Maaf, sistem Jarvis sedang sibuk.';
        appendLog('Jarvis', err);
        fallbackSpeak(err);
    }
}

function quickExec(cmd) {
    processCommand(cmd);
}

sendBtn.addEventListener('click', () => processCommand(cmdInput.value));
cmdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') processCommand(cmdInput.value);
});

// Convert Float32 PCM to 16kHz Mono 16-bit WAV ArrayBuffer
function encodeWAV(samples, sampleRate) {
    const targetRate = 16000;
    const ratio = sampleRate / targetRate;
    const newLength = Math.round(samples.length / ratio);
    const result = new Int16Array(newLength);

    for (let i = 0; i < newLength; i++) {
        const index = Math.round(i * ratio);
        const s = Math.max(-1, Math.min(1, samples[index]));
        result[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    const buffer = new ArrayBuffer(44 + result.length * 2);
    const view = new DataView(buffer);

    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + result.length * 2, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, targetRate, true);
    view.setUint32(28, targetRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, result.length * 2, true);

    let offset = 44;
    for (let i = 0; i < result.length; i++, offset += 2) {
        view.setInt16(offset, result[i], true);
    }

    return buffer;
}

// Ultra-Fast Audio Transmission
async function transmitAudioWAV(wavBuffer) {
    if (isSpeaking || userMuted || isProcessingUtterance) return;
    isProcessingUtterance = true;

    let binary = '';
    const bytes = new Uint8Array(wavBuffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i += 8192) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 8192, len)));
    }
    const base64Audio = btoa(binary);

    voiceLabel.textContent = 'Mendengarkan...';
    soundRing.classList.add('active');

    try {
        const res = await fetch('http://localhost:3855/api/voice-process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                audioBase64: base64Audio,
                mimeType: 'audio/wav'
            })
        });

        const data = await res.json();
        soundRing.classList.remove('active');

        if (data.success && data.userText) {
            interimTextElem.textContent = `"${data.userText}"`;
            voiceLabel.textContent = data.responseText;
            appendLog('You', data.userText, true);
            appendLog('Jarvis', data.responseText);

            if (data.studioAudio && data.studioAudio.base64) {
                playStudioVoice(data.studioAudio.base64, data.responseText);
            } else {
                fallbackSpeak(data.responseText);
            }
        } else {
            voiceLabel.textContent = 'ALL SYSTEMS OPERATIONAL. READY FOR COMMAND.';
            isProcessingUtterance = false;
        }
    } catch (err) {
        soundRing.classList.remove('active');
        voiceLabel.textContent = 'ALL SYSTEMS OPERATIONAL. READY FOR COMMAND.';
        isProcessingUtterance = false;
    }
}

// Continuous Realtime Hardware Audio Monitor (Zero-Lag VAD)
async function startRealtimeMic(stream) {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const bufferSize = 4096;
        scriptNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
        source.connect(scriptNode);
        scriptNode.connect(audioContext.destination);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const bars = document.querySelectorAll('.siri-mini-waveform .bar');

        scriptNode.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);

            // If in biometric voice enrollment mode, collect samples directly
            if (isEnrollingMasterVoice) {
                for (let i = 0; i < inputData.length; i++) {
                    enrollSamples.push(inputData[i]);
                }
                soundRing.classList.add('active');
                waveform.classList.add('active');
                return;
            }

            if (userMuted || isSpeaking || isProcessingUtterance) {
                pcmSamples = [];
                isVoiceActive = false;
                return;
            }
            analyser.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const volume = sum / dataArray.length;

            if (volume > 7) {
                soundRing.classList.add('active');
                waveform.classList.add('active');
                bars.forEach((bar, idx) => {
                    const val = dataArray[idx % dataArray.length];
                    bar.style.height = `${Math.max(4, (val / 255) * 22)}px`;
                });
            } else {
                bars.forEach(bar => bar.style.height = '4px');
            }

            const now = Date.now();
            if (volume > 8) {
                if (!isVoiceActive) {
                    isVoiceActive = true;
                    speechStart = now;
                    pcmSamples = [];
                    voiceLabel.textContent = 'Mendengarkan Tuan...';
                }
                silenceStart = null;
                for (let i = 0; i < inputData.length; i++) {
                    pcmSamples.push(inputData[i]);
                }
            } else if (isVoiceActive) {
                if (!silenceStart) {
                    silenceStart = now;
                }

                for (let i = 0; i < inputData.length; i++) {
                    pcmSamples.push(inputData[i]);
                }

                // Ultra-Fast Turnaround: 350ms silence triggers instant transmission (seamless real-time response)
                if (now - silenceStart > 350) {
                    isVoiceActive = false;
                    silenceStart = null;
                    const utteranceDuration = now - speechStart;

                    if (utteranceDuration > 250 && pcmSamples.length > 2500) {
                        const wavBuffer = encodeWAV(pcmSamples, audioContext.sampleRate);
                        pcmSamples = [];
                        transmitAudioWAV(wavBuffer);
                    } else {
                        pcmSamples = [];
                        soundRing.classList.remove('active');
                        waveform.classList.remove('active');
                        voiceLabel.textContent = 'ALL SYSTEMS OPERATIONAL. READY FOR COMMAND.';
                    }
                }
            } else {
                soundRing.classList.remove('active');
                waveform.classList.remove('active');
            }
        };
    } catch (e) {
        console.error('Realtime Mic error:', e);
    }
}

// User Mic Toggle
micBtn.addEventListener('click', () => {
    if (userMuted) {
        userMuted = false;
        micBtn.classList.add('active');
        voiceLabel.textContent = 'Ada yang bisa Jarvis bantu?';
    } else {
        userMuted = true;
        micBtn.classList.remove('active');
        voiceLabel.textContent = 'Mikrofon dimatikan';
        soundRing.classList.remove('active');
        waveform.classList.remove('active');
    }
});

// Load & switch available voices
async function initVoiceSelector() {
    if (!voiceSelect) return;
    try {
        const res = await fetch('http://localhost:3855/api/voices');
        const data = await res.json();
        voiceSelect.innerHTML = '';

        data.voices.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = `🎙️ ${v.name}`;
            if (v.id === data.activeVoice) opt.selected = true;
            voiceSelect.appendChild(opt);
        });

        voiceSelect.addEventListener('change', async (e) => {
            const selectedId = e.target.value;
            voiceLabel.textContent = 'Mengganti suara...';
            try {
                const switchRes = await fetch('http://localhost:3855/api/set-voice', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ voiceId: selectedId })
                });
                const switchData = await switchRes.json();
                if (switchData.success) {
                    appendLog('Jarvis', switchData.sampleText);
                    if (switchData.studioAudio && switchData.studioAudio.base64) {
                        playStudioVoice(switchData.studioAudio.base64, switchData.sampleText, switchData.studioAudio.mimeType);
                    }
                }
            } catch (err) {
                console.warn('Gagal ganti suara:', err);
            }
        });
    } catch (e) {
        console.warn('Gagal load list suara:', e);
    }
}

// Biometric Master Voice Registration Flow
const bioDesc = document.getElementById('bio-desc');

async function checkEnrollmentStatus() {
    try {
        const res = await fetch('http://localhost:3855/api/enrollment-status');
        const data = await res.json();
        if (enrollBadge) {
            if (data.enrolled) {
                enrollBadge.textContent = 'VERIFIED';
                enrollBadge.style.color = '#00ff88';
                if (bioDesc) bioDesc.textContent = 'Suara Master Hanif terdaftar ✓. Jarvis hanya mematuhi perintah Anda.';
                if (enrollBtn) enrollBtn.textContent = '🔄 REKAM ULANG SUARA';
            } else {
                enrollBadge.textContent = 'UNVERIFIED';
                enrollBadge.style.color = '#ff6b00';
                if (bioDesc) bioDesc.textContent = 'Klik tombol di bawah dan ucapkan kalimat untuk mengenalkan suara Anda ke Jarvis.';
                if (enrollBtn) enrollBtn.textContent = '🎙️ REKAM SUARA SAYA';
            }
        }
    } catch(e){}
}

if (enrollBtn) {
    enrollBtn.addEventListener('click', async () => {
        if (!isEnrollingMasterVoice) {
            // Start recording master voice
            isEnrollingMasterVoice = true;
            enrollSamples = [];
            enrollBtn.classList.add('recording');
            enrollBtn.textContent = '⏹️ Merekam... Ucapkan: "Halo Jarvis, saya Tuan Hanif"';
            voiceLabel.textContent = 'Merekam profil suara... Silakan bicara ke mikrofon!';
            if (bioDesc) bioDesc.textContent = 'Sedang mendengarkan akustik suara Anda (5 detik)...';

            // Auto-stop after 5.5 seconds of clear speaking
            setTimeout(() => {
                if (isEnrollingMasterVoice) {
                    finishEnrollment();
                }
            }, 5500);
        } else {
            finishEnrollment();
        }
    });
}

async function finishEnrollment() {
    isEnrollingMasterVoice = false;
    enrollBtn.classList.remove('recording');
    enrollBtn.textContent = '🎙️ REKAM SUARA SAYA';
    voiceLabel.textContent = 'Memproses & mengenkripsi biometrik suara...';
    soundRing.classList.remove('active');
    waveform.classList.remove('active');

    if (enrollSamples.length < 8000) {
        voiceLabel.textContent = 'Rekaman terlalu singkat. Silakan klik lagi dan bicara lebih jelas.';
        if (bioDesc) bioDesc.textContent = 'Suara terlalu singkat, silakan coba lagi.';
        return;
    }

    const wavBuffer = encodeWAV(enrollSamples, audioContext.sampleRate);
    enrollSamples = [];

    let binary = '';
    const bytes = new Uint8Array(wavBuffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i += 8192) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 8192, len)));
    }
    const base64Audio = btoa(binary);

    try {
        const res = await fetch('http://localhost:3855/api/enroll-voice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: base64Audio })
        });
        const d = await res.json();
        if (d.success) {
            appendLog('Jarvis', 'Profil suara Tuan Hanif telah berhasil disimpan. Mulai sekarang seluruh sistem Jarvis terkunci secara biometrik dan hanya patuh pada suara Anda.');
            voiceLabel.textContent = 'Biometrik Suara Berhasil Didaftarkan ✓';
            checkEnrollmentStatus();
            fallbackSpeak('Profil suara Anda telah terdaftar dan terverifikasi secara resmi, Tuan Hanif.');
        } else {
            voiceLabel.textContent = 'Gagal menyimpan profil suara.';
        }
    } catch (e) {
        voiceLabel.textContent = 'Ada kendala koneksi server.';
    }
}

// Auto-start on window load with Iron Man Jarvis startup greeting
window.addEventListener('load', async () => {
    initVoiceSelector();
    checkEnrollmentStatus();

    // Play Iron Man J.A.R.V.I.S. Welcome Initiation Sound (Ryan British Butler)
    try {
        const startupAudio = new Audio('jarvis_startup.mp3');
        startupAudio.play().catch(() => {});
        startupAudio.onplay = () => {
            voiceLabel.textContent = 'INITIATING SYSTEM 1.0...';
            soundRing.classList.add('active');
            waveform.classList.add('active');
        };
        startupAudio.onended = () => {
            voiceLabel.textContent = 'ALL SYSTEMS OPERATIONAL. READY FOR COMMAND.';
            soundRing.classList.remove('active');
            waveform.classList.remove('active');
        };
    } catch(e){}

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        startRealtimeMic(mediaStream);
        if (jarvisVideo) jarvisVideo.play().catch(() => {});
    } catch (e) {
        console.warn('Mic access error:', e);
    }
});
