import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, get, update, remove, push, onDisconnect, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ====== FIREBASE CONFIG ======
const firebaseConfig = {
    apiKey: "AIzaSyA8azNy6GEgD190y_fW91ahUbKa1w5veik",
    authDomain: "aawards.firebaseapp.com",
    databaseURL: "https://aawards-default-rtdb.firebaseio.com",
    projectId: "aawards",
    storageBucket: "aawards.firebasestorage.app",
    messagingSenderId: "839334918366",
    appId: "1:839334918366:web:454a259fa3e2665b46ea4f",
    measurementId: "G-NLLMB9THVX"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ====== CONSTANTS ======
const AVATARS = ['🦊', '🐼', '🐸', '🦁', '🐯', '🦄', '🐲', '🎃', '👾', '🤖', '🐙', '🦋', '🦅', '🐺', '🎭'];
const REACTIONS = ['🎉', '😂', '😱', '🔥', '👏', '😤', '🤯', '❤️', '💀', '⚡'];
const MAX_CHAT_MESSAGES = 30;

const STAGE_CONFIG = {
    1: { icon: '🔥', name: '1 Linha',      points: 50  },
    2: { icon: '⚡', name: '2 Linhas',     points: 100 },
    3: { icon: '💎', name: 'Bingo Absoluto', points: 250 }
};

// ====== STATE ======
let currentRoomId  = null;
let playerName     = localStorage.getItem('bingo_playerName') || "";
let playerAvatar   = localStorage.getItem('bingo_playerAvatar') || AVATARS[0];
let playerId       = localStorage.getItem('bingo_playerId');
if (!playerId) {
    playerId = "P_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('bingo_playerId', playerId);
}
let isHost         = false;
let myTickets      = [];
let markedCells    = new Set();
let allDrawnNumbers = [];
let remainingNumbers = [];
let currentGameStage = 1;
let myScore        = 0;
let lastRoundId    = 0;
let lastProcessedBall = 0;

// Auto‑draw
let drawInterval   = null;
let isDrawing      = false;
let timerInterval  = null;
let drawIntervalMs = 6000;
let timerSecondsLeft = 0;

// UI
let wasDrawingBeforeWin = false;
let chatUnsubscribe    = null;
let selectedHostAvatar = playerAvatar;
let selectedPlayerAvatar = playerAvatar;

// Audio
let audioCtx  = null;
let bgMusic   = null;
let isMusicPlaying = false;
let gainNode  = null;

// ====== AUDIO SYSTEM ======
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioCtx.createGain();
        gainNode.gain.value = 0.15;
        gainNode.connect(audioCtx.destination);
    }
    if (!bgMusic) {
        bgMusic = new Audio('musica.mp3');
        bgMusic.loop = true;
        bgMusic.volume = 0.3;
    }
}

function toggleMusic() {
    if (!bgMusic) return;
    if (isMusicPlaying) {
        bgMusic.pause();
        isMusicPlaying = false;
        document.getElementById('btn-toggle-music').innerText = "🔇";
    } else {
        bgMusic.play().catch(e => console.log("Music play blocked", e));
        isMusicPlaying = true;
        document.getElementById('btn-toggle-music').innerText = "🎵";
    }
}

function playTone(freq, duration, type = 'sine', vol = 0.12) {
    if (!audioCtx) return;
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playBallSound() {
    playTone(660, 0.12, 'sine', 0.12);
    setTimeout(() => playTone(880, 0.08, 'sine', 0.08), 80);
}

function playMarkSound() {
    playTone(440, 0.08, 'triangle', 0.1);
    setTimeout(() => playTone(523, 0.12, 'triangle', 0.08), 70);
}

function playWinSound() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) => setTimeout(() => playTone(n, 0.3, 'sine', 0.15), i * 100));
}

function playChatSound() {
    playTone(800, 0.06, 'sine', 0.05);
}

function playStartSound() {
    const notes = [330, 440, 550, 660];
    notes.forEach((n, i) => setTimeout(() => playTone(n, 0.15, 'square', 0.08), i * 80));
}

// ====== TOAST SYSTEM (replaces alert) ======
function showToast(message, type = 'info', emoji = '', duration = 3500) {
    const container = document.getElementById('toast-container');
    const toast     = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${emoji ? `<span>${emoji}</span>` : ''}<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 320);
    }, duration);
}

// ====== CONFETTI ======
function startConfetti(colors) {
    const canvas = document.getElementById('confetti-canvas');
    const ctx    = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const palette = colors || ['#7c3aed', '#f59e0b', '#f43f5e', '#10b981', '#06b6d4', '#ec4899'];
    let particles = [];
    for (let i = 0; i < 200; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            r: Math.random() * 7 + 3,
            d: Math.random() * 180,
            color: palette[Math.floor(Math.random() * palette.length)],
            tilt: Math.random() * 10 - 10,
            tiltAngleIncremental: Math.random() * 0.07 + 0.05,
            tiltAngle: 0,
            shape: Math.random() > 0.5 ? 'circle' : 'rect'
        });
    }

    let animId;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach((p, i) => {
            p.tiltAngle += p.tiltAngleIncremental;
            p.y += (Math.cos(p.d) + 3.5 + p.r / 2) / 2;
            p.x += Math.sin(p.d) * 1.5;
            p.tilt = Math.sin(p.tiltAngle) * 15;

            ctx.beginPath();
            ctx.fillStyle = p.color;
            if (p.shape === 'circle') {
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            } else {
                ctx.rect(p.x + p.tilt, p.y, p.r * 2, p.r * 0.7);
            }
            ctx.fill();

            if (p.y > canvas.height) {
                particles[i] = { ...p, x: Math.random() * canvas.width, y: -20, tiltAngle: 0 };
            }
        });
        animId = requestAnimationFrame(draw);
    }
    draw();
    setTimeout(() => cancelAnimationFrame(animId), 5000);
}

// ====== LOBBY CANVAS (Floating Balls) ======
function startLobbyCanvas() {
    const canvas = document.getElementById('lobby-bg-canvas');
    const ctx    = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const ballColors = ['#7c3aed', '#f59e0b', '#f43f5e', '#10b981', '#06b6d4', '#ec4899'];
    const balls = Array.from({ length: 18 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 24 + 12,
        dx: (Math.random() - 0.5) * 0.6,
        dy: (Math.random() - 0.5) * 0.6,
        color: ballColors[Math.floor(Math.random() * ballColors.length)],
        alpha: Math.random() * 0.12 + 0.04,
        num: Math.floor(Math.random() * 90) + 1
    }));

    let lobbyAnimId;
    function drawLobby() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        balls.forEach(b => {
            b.x += b.dx;
            b.y += b.dy;
            if (b.x < b.r || b.x > canvas.width - b.r)  b.dx *= -1;
            if (b.y < b.r || b.y > canvas.height - b.r) b.dy *= -1;

            ctx.save();
            ctx.globalAlpha = b.alpha;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fillStyle = b.color;
            ctx.fill();
            ctx.globalAlpha = b.alpha * 1.5;
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${b.r * 0.7}px Space Grotesk, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(b.num, b.x, b.y);
            ctx.restore();
        });
        lobbyAnimId = requestAnimationFrame(drawLobby);
    }
    drawLobby();
    return () => cancelAnimationFrame(lobbyAnimId);
}

// ====== AVATAR PICKER ======
function renderAvatarPicker(gridId, storageKey, onSelect) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = '';
    const current = localStorage.getItem(storageKey) || AVATARS[0];
    AVATARS.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = `avatar-option ${emoji === current ? 'selected' : ''}`;
        btn.innerText = emoji;
        btn.type = 'button';
        btn.addEventListener('click', () => {
            grid.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            localStorage.setItem(storageKey, emoji);
            onSelect(emoji);
        });
        grid.appendChild(btn);
    });
}

// ====== DOM ELEMENTS ======
const views = {
    lobby: document.getElementById('view-lobby'),
    game:  document.getElementById('view-game')
};

function switchView(viewName) {
    Object.values(views).forEach(v => {
        v.classList.remove('active');
        v.classList.add('hidden');
    });
    views[viewName].classList.remove('hidden');
    views[viewName].classList.add('active');
}

// ====== LOBBY INIT ======
let stopLobbyCanvas = null;

window.addEventListener('load', () => {
    stopLobbyCanvas = startLobbyCanvas();

    // Restore saved name
    const savedName = localStorage.getItem('bingo_playerName');
    if (savedName) {
        document.getElementById('host-name').value = savedName;
        document.getElementById('input-player-name').value = savedName;
    }

    // Avatar pickers
    renderAvatarPicker('host-avatar-grid', 'bingo_hostAvatar', emoji => {
        selectedHostAvatar = emoji;
        playerAvatar = emoji;
    });
    renderAvatarPicker('player-avatar-grid', 'bingo_playerAvatar', emoji => {
        selectedPlayerAvatar = emoji;
    });

    // Uppercase room code
    const codeInput = document.getElementById('input-room-code');
    codeInput.addEventListener('input', () => {
        codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });

    // Pre-fill room code from URL ?room=XXXX
    const urlRoom = new URLSearchParams(window.location.search).get('room');
    if (urlRoom) {
        const clean = urlRoom.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
        codeInput.value = clean;
        // Scroll player card into view
        document.getElementById('player-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});

// ====== ROOM CODE COPY ======
document.getElementById('btn-kicked-ok').addEventListener('click', () => {
    document.getElementById('kicked-popup').classList.add('hidden');
    switchView('lobby');
    if (!stopLobbyCanvas) stopLobbyCanvas = startLobbyCanvas();
});

// ====== LOBBY LOGIC ======
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789';
    return Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}

// CREATE ROOM (Host)
document.getElementById('btn-create-room').addEventListener('click', async () => {
    const nameInput  = document.getElementById('host-name').value.trim();
    const cardCount  = parseInt(document.getElementById('host-card-count').value);
    const roundsCount = parseInt(document.getElementById('host-rounds-count').value) || 1;

    if (!nameInput) { showToast("Insere o teu nome para continuar!", 'error', '👤'); return; }

    const roomId = generateRoomCode();
    playerName   = nameInput;
    playerAvatar = selectedHostAvatar || localStorage.getItem('bingo_hostAvatar') || AVATARS[0];
    localStorage.setItem('bingo_playerName', playerName);
    localStorage.setItem('bingo_playerAvatar', playerAvatar);

    await set(ref(db, `rooms/${roomId}`), {
        created:      Date.now(),
        drawnNumbers: false,
        lastDrawn:    0,
        winners:      false,
        gameStage:    1,
        roundId:      1,
        currentRound: 1,
        totalRounds:  roundsCount,
        isGameOver:   false,
        players: {
            [playerId]: { name: playerName, isHost: true, score: 0, avatar: playerAvatar }
        }
    });

    currentRoomId = roomId;
    isHost = true;
    // Update URL so the host can share it
    history.replaceState(null, '', `?room=${roomId}`);
    if (stopLobbyCanvas) { stopLobbyCanvas(); stopLobbyCanvas = null; }
    setupGameScreen(cardCount);
    showToast(`Sala ${roomId} criada! Partilha o link com os teus amigos.`, 'success', '🎉', 5000);
});

// JOIN ROOM (Player)
document.getElementById('btn-join-room').addEventListener('click', async () => {
    const codeInput  = document.getElementById('input-room-code').value.toUpperCase().trim();
    const nameInput  = document.getElementById('input-player-name').value.trim();
    const cardCount  = parseInt(document.getElementById('input-card-count').value);
    const errorEl    = document.getElementById('join-error');

    if (codeInput.length !== 4 || !nameInput) {
        errorEl.innerText = "Insere o código (4 caracteres) e o teu nome.";
        return;
    }

    const roomRef  = ref(db, `rooms/${codeInput}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
        errorEl.innerText = "Sala não encontrada. Verifica o código.";
    } else {
        errorEl.innerText = "";
        currentRoomId = codeInput;
        playerName    = nameInput;
        playerAvatar  = selectedPlayerAvatar || localStorage.getItem('bingo_playerAvatar') || AVATARS[0];
        localStorage.setItem('bingo_playerName', playerName);
        localStorage.setItem('bingo_playerAvatar', playerAvatar);
        isHost = false;

        const playerRef = ref(db, `rooms/${currentRoomId}/players/${playerId}`);
        const pSnap     = await get(playerRef);

        await set(playerRef, {
            name:   playerName,
            isHost: false,
            score:  pSnap.exists() ? (pSnap.val().score || 0) : 0,
            avatar: playerAvatar
        });

        onDisconnect(playerRef).remove();

        // Notify room via chat
        await push(ref(db, `rooms/${currentRoomId}/chat`), {
            type:   'system',
            text:   `${playerAvatar} ${playerName} entrou na sala!`,
            ts:     Date.now()
        });

        if (stopLobbyCanvas) { stopLobbyCanvas(); stopLobbyCanvas = null; }
        history.replaceState(null, '', `?room=${currentRoomId}`);
        setupGameScreen(cardCount);
    }
});

// Copy room link button
document.getElementById('btn-copy-link').addEventListener('click', () => {
    const link = `${location.origin}${location.pathname}?room=${currentRoomId}`;
    navigator.clipboard.writeText(link).then(() => {
        showToast('Link copiado!', 'success', '🔗', 2000);
    }).catch(() => {
        // Fallback for non-https
        prompt('Copia este link:', link);
    });
});

function setupGameScreen(cardCount) {
    document.getElementById('game-room-code').innerText = currentRoomId;
    document.getElementById('display-player-name').innerText = playerName;
    document.getElementById('display-player-avatar').innerText = playerAvatar;
    document.getElementById('display-player-role').innerText = isHost ? '👑 Anfitrião' : '🎮 Jogador';

    const hostPanel = document.getElementById('host-control-panel');
    if (isHost) {
        hostPanel.classList.add('active');
        generateHostBoard();
        document.getElementById('auto-mark-box').style.display = 'none';
    } else {
        hostPanel.classList.remove('active');
    }

    generatePlayerTickets(cardCount);
    switchView('game');
    initAudio();
    toggleMusic();
    listenToRoom();
    listenToChat();
}

document.getElementById('btn-toggle-music').addEventListener('click', toggleMusic);

function leaveRoom(wasKicked = false) {
    if (currentRoomId) {
        remove(ref(db, `rooms/${currentRoomId}/players/${playerId}`));
    }
    if (drawInterval) clearInterval(drawInterval);
    if (timerInterval) clearInterval(timerInterval);
    if (chatUnsubscribe) chatUnsubscribe();

    stopTimer();
    currentRoomId    = null;
    markedCells.clear();
    allDrawnNumbers  = [];
    myTickets        = [];
    lastRoundId      = 0;
    lastProcessedBall = 0;
    isDrawing        = false;
    chatUnsubscribe  = null;

    document.getElementById('chat-messages').innerHTML = '';
    document.getElementById('timer-wrapper').style.display = 'none';

    switchView('lobby');
    if (!stopLobbyCanvas) stopLobbyCanvas = startLobbyCanvas();

    if (wasKicked) {
        document.getElementById('kicked-popup').classList.remove('hidden');
    }
}

document.getElementById('btn-leave-room').addEventListener('click', () => leaveRoom(false));

// ====== HOST DRAWING LOGIC ======
function generateHostBoard() {
    const grid = document.getElementById('number-grid');
    grid.innerHTML = '';
    remainingNumbers = Array.from({ length: 90 }, (_, i) => i + 1);

    for (let i = 1; i <= 90; i++) {
        const div = document.createElement('div');
        div.className = 'grid-num';
        div.id        = `host-num-${i}`;
        div.innerText = i;
        grid.appendChild(div);
    }
}

const btnStartDraw    = document.getElementById('btn-start-draw');
const btnPauseDraw    = document.getElementById('btn-pause-draw');
const inputDrawSeconds = document.getElementById('input-draw-seconds');
const inputTotalMinutes = document.getElementById('input-total-minutes');

inputDrawSeconds.addEventListener('input', () => {
    const secs = parseFloat(inputDrawSeconds.value) || 0;
    if (secs > 0) inputTotalMinutes.value = ((secs * 90) / 60).toFixed(1);
});

inputTotalMinutes.addEventListener('input', () => {
    const mins = parseFloat(inputTotalMinutes.value) || 0;
    if (mins > 0) inputDrawSeconds.value = ((mins * 60) / 90).toFixed(1);
});

btnStartDraw.addEventListener('click', () => {
    if (isDrawing || remainingNumbers.length === 0) return;
    isDrawing = true;
    drawIntervalMs = (parseFloat(inputDrawSeconds.value) || 6) * 1000;

    btnStartDraw.classList.add('hidden');
    btnPauseDraw.classList.remove('hidden');

    // Show timer
    document.getElementById('timer-wrapper').style.display = '';
    playStartSound();
    showToast("Sorteio iniciado! Boa sorte a todos! 🎱", 'info', '🚀', 3000);

    drawNumberLogic();
    startTimer(drawIntervalMs);
    drawInterval = setInterval(() => {
        drawNumberLogic();
        startTimer(drawIntervalMs);
    }, drawIntervalMs);
});

btnPauseDraw.addEventListener('click', () => {
    isDrawing = false;
    btnStartDraw.classList.remove('hidden');
    btnPauseDraw.classList.add('hidden');
    clearInterval(drawInterval);
    stopTimer();
    document.getElementById('timer-wrapper').style.display = 'none';
});

// Timer Bar
function startTimer(ms) {
    stopTimer();
    timerSecondsLeft = ms / 1000;
    const fill       = document.getElementById('timer-bar-fill');
    const countdown  = document.getElementById('timer-countdown');

    fill.style.width = '100%';
    fill.classList.remove('danger');
    countdown.innerText = Math.ceil(timerSecondsLeft) + 's';

    timerInterval = setInterval(() => {
        timerSecondsLeft -= 0.1;
        const pct = Math.max(0, (timerSecondsLeft / (ms / 1000)) * 100);
        fill.style.width = pct + '%';
        countdown.innerText = Math.ceil(timerSecondsLeft) + 's';

        if (pct < 25) fill.classList.add('danger');
        else fill.classList.remove('danger');

        if (timerSecondsLeft <= 0) stopTimer();
    }, 100);
}

function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

async function drawNumberLogic() {
    if (!isHost || remainingNumbers.length === 0) {
        clearInterval(drawInterval);
        stopTimer();
        return;
    }
    const rIndex = Math.floor(Math.random() * remainingNumbers.length);
    const drawn  = remainingNumbers.splice(rIndex, 1)[0];

    const roomRef = ref(db, `rooms/${currentRoomId}`);
    const snap    = await get(roomRef);
    const data    = snap.val();
    if (!data) return;

    let draws = data.drawnNumbers ? [...data.drawnNumbers] : [];
    draws.push(drawn);
    await update(roomRef, { drawnNumbers: draws, lastDrawn: drawn });
}

// ====== REALTIME ROOM SYNC ======
function listenToRoom() {
    const roomRef = ref(db, `rooms/${currentRoomId}`);
    onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) { leaveRoom(); return; }

        // Kick detection
        if (data.players && !data.players[playerId] && !isHost) {
            leaveRoom(true); return;
        }

        // Player list (host)
        if (data.players) {
            renderPlayerList(data.players);
        }

        // Drawn numbers
        if (data.drawnNumbers) {
            allDrawnNumbers = data.drawnNumbers;
            document.getElementById('ball-count-display').innerText = `${allDrawnNumbers.length} bola${allDrawnNumbers.length !== 1 ? 's' : ''} sorteada${allDrawnNumbers.length !== 1 ? 's' : ''}`;

            if (isHost) {
                document.getElementById('drawn-count').innerText = allDrawnNumbers.length;
                allDrawnNumbers.forEach(n => {
                    const el = document.getElementById(`host-num-${n}`);
                    if (el) el.classList.add('drawn');
                });
            }
        }

        // New ball drawn
        if (data.lastDrawn > 0 && data.lastDrawn !== lastProcessedBall) {
            lastProcessedBall = data.lastDrawn;
            animateBall(data.lastDrawn);
            playBallSound();
            updateProbabilities(data.gameStage || 1);

            // Auto‑mark
            if (!isHost && document.getElementById('auto-mark-toggle').checked) {
                autoMarkNumber(data.lastDrawn, data.gameStage || 1);
            }
        }

        // Winner
        if (data.winners) {
            showWinPopup(data.winners, data.gameStage);
            startConfetti();
        }

        // My score
        if (data.players && data.players[playerId]) {
            myScore = data.players[playerId].score || 0;
            document.getElementById('display-player-score').innerText = myScore;
        }

        // Tournament badge
        const badge    = document.getElementById('tournament-badge');
        const progress = document.getElementById('display-round-progress');
        if (data.totalRounds > 1) {
            badge.classList.remove('hidden');
            progress.innerText = `Ronda ${data.currentRound || 1} / ${data.totalRounds}`;
        } else {
            badge.classList.add('hidden');
        }

        // Game over
        if (data.isGameOver) {
            showFinalPodium(data.players);
        } else {
            document.getElementById('podium-modal').classList.add('hidden');
        }

        // Next round button
        const btnNextRound = document.getElementById('btn-next-round');
        if (isHost) {
            if (data.gameStage > 3 && !data.isGameOver) {
                btnNextRound.classList.remove('hidden');
                btnNextRound.innerText = (data.currentRound || 1) >= data.totalRounds ? "🏁 Finalizar Torneio" : "⏭ Nova Ronda";
            } else {
                btnNextRound.classList.add('hidden');
            }
        }

        // New round detected
        if (data.roundId && data.roundId !== lastRoundId) {
            lastRoundId = data.roundId;
            const cardCount = parseInt(document.getElementById('input-card-count')?.value || 3);
            generatePlayerTickets(cardCount);
            document.getElementById('player-current-number').innerText = "--";
            document.getElementById('ball-announcement').innerText    = "Nova Ronda — Boa sorte!";
            document.getElementById('ball-count-display').innerText   = "0 bolas sorteadas";
            markedCells.clear();
            lastProcessedBall = 0;
            allDrawnNumbers   = [];

            if (isHost) {
                generateHostBoard();
                remainingNumbers = Array.from({ length: 90 }, (_, i) => i + 1);
                isDrawing = false;
                btnStartDraw.classList.remove('hidden');
                btnPauseDraw.classList.add('hidden');
                stopTimer();
                document.getElementById('timer-wrapper').style.display = 'none';
            }
        }

        // Stage / Prize display
        if (data.gameStage) {
            currentGameStage = data.gameStage;
            const cfg = STAGE_CONFIG[data.gameStage];
            if (cfg) {
                document.getElementById('prize-icon').innerText              = cfg.icon;
                document.getElementById('display-current-prize').innerText  = cfg.name;
                document.getElementById('display-current-points').innerText = cfg.points + ' Pontos';
            } else {
                document.getElementById('prize-icon').innerText              = '🎊';
                document.getElementById('display-current-prize').innerText  = 'Fim de Jogo';
                document.getElementById('display-current-points').innerText = 'Excelente Partida!';
            }
        }
    });
}

// ====== CHAT SYSTEM ======
function listenToChat() {
    if (chatUnsubscribe) chatUnsubscribe();

    const chatRef = ref(db, `rooms/${currentRoomId}/chat`);
    chatUnsubscribe = onValue(chatRef, (snapshot) => {
        const chatEl = document.getElementById('chat-messages');
        chatEl.innerHTML = '';

        if (!snapshot.exists()) return;

        const messages = [];
        snapshot.forEach(child => {
            messages.push(child.val());
        });

        // Only show last MAX_CHAT_MESSAGES
        const recent = messages.slice(-MAX_CHAT_MESSAGES);
        recent.forEach(msg => {
            appendChatMessage(msg);
        });
        chatEl.scrollTop = chatEl.scrollHeight;
        playChatSound();
    });

    // Render reaction buttons
    const reactionsEl = document.getElementById('chat-reactions');
    reactionsEl.innerHTML = '';
    REACTIONS.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'reaction-btn';
        btn.innerText = emoji;
        btn.title     = emoji;
        btn.addEventListener('click', () => sendChatReaction(emoji));
        reactionsEl.appendChild(btn);
    });
}

function appendChatMessage(msg) {
    const chatEl = document.getElementById('chat-messages');
    const div    = document.createElement('div');

    if (msg.type === 'system') {
        div.className = 'chat-msg system';
        div.innerHTML = `<span class="chat-msg-text">${escapeHtml(msg.text)}</span>`;
    } else {
        div.className = 'chat-msg';
        div.innerHTML = `
            <span class="chat-msg-avatar">${escapeHtml(msg.avatar || '🎮')}</span>
            <div class="chat-msg-content">
                <div class="chat-msg-name">${escapeHtml(msg.name || 'Anónimo')}</div>
                <div class="chat-msg-text">${escapeHtml(msg.text)}</div>
            </div>`;
    }
    chatEl.appendChild(div);
}

async function sendChatMessage(text) {
    if (!text.trim() || !currentRoomId) return;
    await push(ref(db, `rooms/${currentRoomId}/chat`), {
        type:   'player',
        name:   playerName,
        avatar: playerAvatar,
        text:   text.trim(),
        ts:     Date.now()
    });
}

async function sendChatReaction(emoji) {
    await sendChatMessage(emoji);
}

document.getElementById('btn-send-chat').addEventListener('click', () => {
    const input = document.getElementById('chat-input');
    sendChatMessage(input.value);
    input.value = '';
});

document.getElementById('chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const input = document.getElementById('chat-input');
        sendChatMessage(input.value);
        input.value = '';
    }
});

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ====== PLAYER LIST RENDER ======
function renderPlayerList(players) {
    const ul = document.getElementById('player-list-ul');
    ul.innerHTML = '';

    const sorted = Object.entries(players).sort(([, a], [, b]) => (b.score || 0) - (a.score || 0));

    sorted.forEach(([pId, pInfo]) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="player-online-dot"></span>
            <span class="player-list-avatar">${pInfo.avatar || '🎮'}</span>
            <span class="player-list-name">${escapeHtml(pInfo.name)}</span>
            <span class="player-list-score">${pInfo.score || 0}pts</span>
        `;

        if (isHost && pId !== playerId) {
            const kBtn = document.createElement('button');
            kBtn.className   = 'btn kick';
            kBtn.innerText   = '✕';
            kBtn.title       = 'Expulsar';
            kBtn.addEventListener('click', async () => {
                await remove(ref(db, `rooms/${currentRoomId}/players/${pId}`));
                showToast(`${pInfo.name} foi removido da sala.`, 'warning', '🚪');
            });
            li.appendChild(kBtn);
        }
        ul.appendChild(li);
    });
}

// ====== BALL ANIMATION ======
function animateBall(number) {
    const numEl  = document.getElementById('player-current-number');
    const shell  = document.getElementById('ball-shell');
    const textEl = document.getElementById('ball-announcement');

    numEl.innerText = number;
    textEl.innerText = `Sorteada a bola ${number}!`;

    shell.classList.remove('new-ball');
    void shell.offsetWidth; // reflow
    shell.classList.add('new-ball');
}

// ====== PROBABILITY & AUTO-MARK ======
function autoMarkNumber(num, stage) {
    myTickets.forEach((ticket, tIdx) => {
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 9; c++) {
                if (ticket[r][c] === num) {
                    const cellId = `${tIdx}-${r}-${c}`;
                    if (!markedCells.has(cellId)) {
                        markedCells.add(cellId);
                        const cellEl = document.getElementById(`cell-${cellId}`);
                        if (cellEl) {
                            cellEl.classList.add('auto-marked');
                            playMarkSound();
                        }
                        updateProbabilities(stage);
                    }
                }
            }
        }
    });
}

function updateProbabilities(stage) {
    let closestId  = -1;
    let minMissing = Infinity;
    let canWinNow  = false;

    myTickets.forEach((ticket, tIdx) => {
        let linesInfo = [];
        for (let r = 0; r < 3; r++) {
            let missing = 0;
            for (let c = 0; c < 9; c++) {
                const n = ticket[r][c];
                if (n !== null && !markedCells.has(`${tIdx}-${r}-${c}`)) missing++;
            }
            linesInfo.push(missing);
        }

        let neededMissing = Infinity;
        if (stage === 1)      neededMissing = Math.min(...linesInfo);
        else if (stage === 2) { linesInfo.sort((a,b) => a-b); neededMissing = linesInfo[0] + linesInfo[1]; }
        else if (stage === 3) neededMissing = linesInfo.reduce((a, b) => a + b, 0);

        const wrapper = document.querySelectorAll('.ticket-wrapper')[tIdx];
        if (wrapper) wrapper.classList.remove('closest');

        if (neededMissing < minMissing) {
            minMissing = neededMissing;
            closestId  = tIdx;
        }
        if (neededMissing === 0) canWinNow = true;
    });

    const wrappers = document.querySelectorAll('.ticket-wrapper');
    if (closestId !== -1 && wrappers[closestId]) {
        wrappers[closestId].classList.add('closest');
        wrappers[closestId].setAttribute('data-missing', `${minMissing === 0 ? 'PRONTO!' : 'Faltam ' + minMissing}`);
    }

    const bingoBtn = document.getElementById('btn-call-bingo');
    if (canWinNow) bingoBtn.classList.add('ready');
    else bingoBtn.classList.remove('ready');
}

// ====== BINGO CALL ======
document.getElementById('btn-call-bingo').addEventListener('click', async () => {
    const roomRef = ref(db, `rooms/${currentRoomId}`);
    const snap    = await get(roomRef);
    const data    = snap.val();
    const currentStage = data.gameStage || 1;

    let bestWin = 0;
    for (let t = 0; t < myTickets.length; t++) {
        let linesCompleted = 0;
        const ticketMatrix = myTickets[t];
        for (let r = 0; r < 3; r++) {
            let rowFinished = true;
            for (let c = 0; c < 9; c++) {
                const num = ticketMatrix[r][c];
                if (num !== null) {
                    const cellId = `${t}-${r}-${c}`;
                    if (!markedCells.has(cellId) || !allDrawnNumbers.includes(num)) {
                        rowFinished = false; break;
                    }
                }
            }
            if (rowFinished) linesCompleted++;
        }
        if (linesCompleted > bestWin) bestWin = linesCompleted;
    }

    if (bestWin >= currentStage) {
        const cfg   = STAGE_CONFIG[currentStage];
        const points = cfg ? cfg.points : 0;
        const name   = cfg ? cfg.name : '';

        const winMessage = `${playerAvatar} ${playerName} venceu ${name} (+${points} pts)!`;

        await update(roomRef, {
            winners:  winMessage,
            gameStage: currentStage + 1,
            [`players/${playerId}/score`]: myScore + points
        });

        // Also send to chat
        await push(ref(db, `rooms/${currentRoomId}/chat`), {
            type: 'system',
            text: `🏆 ${winMessage}`,
            ts:   Date.now()
        });

    } else {
        const stageName = STAGE_CONFIG[currentStage]?.name || '';
        showToast(`Ainda não completaste: ${stageName}`, 'error', '❌');
    }
});

// ====== NEXT ROUND ======
document.getElementById('btn-next-round').addEventListener('click', async () => {
    if (!isHost) return;

    const roomRef = ref(db, `rooms/${currentRoomId}`);
    const snap    = await get(roomRef);
    const data    = snap.val();

    const currentRound = data.currentRound || 1;
    const totalRounds  = data.totalRounds || 1;

    if (currentRound >= totalRounds) {
        await update(roomRef, { isGameOver: true });
    } else {
        const nextRound = currentRound + 1;
        await update(roomRef, {
            drawnNumbers: false,
            lastDrawn:    0,
            winners:      false,
            gameStage:    1,
            currentRound: nextRound,
            roundId:      Date.now()
        });
        await push(ref(db, `rooms/${currentRoomId}/chat`), {
            type: 'system',
            text: `🎱 Ronda ${nextRound} de ${totalRounds} iniciada! Boa sorte a todos!`,
            ts:   Date.now()
        });
        showToast(`Ronda ${nextRound} de ${totalRounds} iniciada!`, 'info', '🎱');
    }
});

// ====== FINAL PODIUM ======
function showFinalPodium(players) {
    const modal = document.getElementById('podium-modal');
    const list  = document.getElementById('podium-list');
    list.innerHTML = '';

    const sorted = Object.values(players).sort((a, b) => (b.score || 0) - (a.score || 0));
    const rankClasses = ['first', 'second', 'third'];
    const medals      = ['🥇', '🥈', '🥉'];

    sorted.forEach((p, index) => {
        const item   = document.createElement('div');
        const rankCls = rankClasses[index] || '';
        item.className = `podium-item ${rankCls}`;
        item.style.animationDelay = `${index * 0.12}s`;

        item.innerHTML = `
            <div class="podium-player-info">
                <div class="rank-badge">${medals[index] || (index + 1)}</div>
                <span class="podium-avatar">${p.avatar || '🎮'}</span>
                <span class="podium-name">${escapeHtml(p.name)} ${index === 0 ? '👑' : ''}</span>
            </div>
            <div class="podium-score-val">${p.score || 0} pts</div>
        `;
        list.appendChild(item);
    });

    modal.classList.remove('hidden');
    modal.classList.add('active');

    const restartBtn    = document.getElementById('btn-restart-tournament');
    const waitText      = document.getElementById('wait-host-restart');
    if (isHost) {
        restartBtn.classList.remove('hidden');
        waitText.classList.add('hidden');
    } else {
        restartBtn.classList.add('hidden');
        waitText.classList.remove('hidden');
    }

    if (sorted[0]) {
        startConfetti(['#fbbf24', '#f97316', '#fcd34d', '#fef3c7']);
        playWinSound();
    }
}

// ====== RESTART TOURNAMENT ======
document.getElementById('btn-restart-tournament').addEventListener('click', async () => {
    if (!isHost) return;

    const roomRef = ref(db, `rooms/${currentRoomId}`);
    const snap    = await get(roomRef);
    const data    = snap.val();

    const updates = {
        drawnNumbers: false,
        lastDrawn:    0,
        winners:      false,
        gameStage:    1,
        currentRound: 1,
        isGameOver:   false,
        roundId:      Date.now()
    };

    Object.keys(data.players).forEach(pId => {
        updates[`players/${pId}/score`] = 0;
    });

    await update(roomRef, updates);
    await push(ref(db, `rooms/${currentRoomId}/chat`), {
        type: 'system',
        text: '🔄 Novo torneio iniciado! Pontuações reiniciadas. Boa sorte a todos!',
        ts:   Date.now()
    });
    showToast("Novo torneio iniciado! Boa sorte! 🎉", 'success', '🔄');
});

// ====== WIN POPUP ======
function showWinPopup(message, stage) {
    if (isHost && isDrawing) {
        wasDrawingBeforeWin = true;
        document.getElementById('btn-pause-draw').click();
    }

    const icons = { 1: '🔥', 2: '⚡', 3: '💎' };
    const popup  = document.getElementById('win-popup');
    const msgEl  = document.getElementById('win-message');
    const closeBtn = document.getElementById('btn-close-win');
    const iconEl = document.getElementById('win-icon');

    msgEl.innerText  = message;
    iconEl.innerText = icons[stage - 1] || '🏆';
    popup.classList.remove('hidden');
    popup.classList.add('active');
    playWinSound();

    let secondsLeft = 3;
    closeBtn.innerText = `Continuar (${secondsLeft}s)`;
    closeBtn.disabled  = true;

    const timer = setInterval(() => {
        secondsLeft--;
        if (secondsLeft > 0) {
            closeBtn.innerText = `Continuar (${secondsLeft}s)`;
        } else {
            clearInterval(timer);
            autoResume();
        }
    }, 1000);

    async function autoResume() {
        closeWinPopup();
        if (isHost) {
            await update(ref(db, `rooms/${currentRoomId}`), { winners: false });
            if (wasDrawingBeforeWin) {
                wasDrawingBeforeWin = false;
                document.getElementById('btn-start-draw').click();
            }
        }
    }
}

function closeWinPopup() {
    const popup = document.getElementById('win-popup');
    popup.classList.remove('active');
    popup.classList.add('hidden');
}

document.getElementById('btn-close-win').addEventListener('click', closeWinPopup);

// ====== TICKET GENERATION ======
function generatePlayerTickets(count) {
    const containerEl = document.getElementById('ticket-container');
    containerEl.innerHTML = '';
    myTickets = [];
    markedCells.clear();

    let globalPool       = [];
    let remainingCapacity = [];

    function resetPool() {
        globalPool        = [];
        remainingCapacity = [];
        for (let c = 0; c < 9; c++) {
            let min = c * 10 + 1;
            let max = c === 8 ? 90 : c * 10 + 10;
            if (c === 0) min = 1;
            let arr = [];
            for (let i = min; i <= max; i++) arr.push(i);
            arr.sort(() => Math.random() - 0.5);
            globalPool.push(arr);
            remainingCapacity.push(arr.length);
        }
    }

    resetPool();

    for (let t = 0; t < count; t++) {
        if (remainingCapacity.reduce((a, b) => a + b, 0) < 15) resetPool();

        let ticketMatrix = [
            [null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null]
        ];

        for (let r = 0; r < 3; r++) {
            let sortedCols = [];
            for (let c = 0; c < 9; c++) {
                if (remainingCapacity[c] > 0) sortedCols.push({ c, rem: remainingCapacity[c] });
            }
            sortedCols.sort((a, b) => b.rem - a.rem);
            let candidates  = sortedCols.slice(0, 7).map(x => x.c);
            candidates.sort(() => Math.random() - 0.5);
            let selectedCols = candidates.slice(0, 5);
            if (selectedCols.length < 5) selectedCols = sortedCols.map(x => x.c).slice(0, 5);

            selectedCols.forEach(col => {
                ticketMatrix[r][col] = "placeholder";
                remainingCapacity[col]--;
            });
        }

        for (let c = 0; c < 9; c++) {
            let rowSpots = [];
            for (let r = 0; r < 3; r++) {
                if (ticketMatrix[r][c] === "placeholder") rowSpots.push(r);
            }
            let picked = rowSpots.map(() => globalPool[c].pop());
            picked.sort((a, b) => a - b);
            rowSpots.forEach((r, i) => ticketMatrix[r][c] = picked[i]);
        }

        myTickets.push(ticketMatrix);

        // Render
        const wrapper = document.createElement('div');
        wrapper.className        = 'ticket-wrapper';
        wrapper.setAttribute('data-card-label', `Cartão ${t + 1}`);

        const grid = document.createElement('div');
        grid.className = 'bingo-ticket';

        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.createElement('div');
                cell.className = 'ticket-cell';
                const num = ticketMatrix[r][c];
                if (num === null) {
                    cell.classList.add('empty');
                } else {
                    cell.innerText = num;
                    const cellId   = `${t}-${r}-${c}`;
                    cell.id        = `cell-${cellId}`;
                    cell.addEventListener('click', () => toggleMarkNumber(num, cellId, cell, currentGameStage));
                }
                grid.appendChild(cell);
            }
        }

        wrapper.appendChild(grid);
        containerEl.appendChild(wrapper);
    }

    // Dynamic sizing: make tickets as large as possible
    applyTicketLayout(count, containerEl);
}

function toggleMarkNumber(num, cellId, cellEl, stage) {
    if (markedCells.has(cellId)) return;
    if (allDrawnNumbers.includes(num)) {
        markedCells.add(cellId);
        cellEl.classList.add('marked');
        playMarkSound();
        updateProbabilities(stage);
    }
    // silently ignore clicks on numbers not yet drawn
}

// Calculates the best cols/rows grid to maximise ticket area
function applyTicketLayout(count, containerEl) {
    const TICKET_ASPECT = 9 / 3; // width:height ratio of a bingo ticket

    requestAnimationFrame(() => {
        const vault = containerEl.parentElement; // .ticket-vault
        const vaultW = vault.clientWidth;
        const vaultH = vault.clientHeight;
        const GAP = 12; // 0.8rem gap

        let bestArea = 0;
        let bestCols = 1, bestRows = 1;

        for (let cols = 1; cols <= count; cols++) {
            const rows = Math.ceil(count / cols);
            const cellW = (vaultW - GAP * (cols - 1)) / cols;
            const cellH = (vaultH - GAP * (rows - 1)) / rows;

            // Constrain ticket to fit within cell respecting aspect ratio
            let ticketW = cellW;
            let ticketH = cellW / TICKET_ASPECT;
            if (ticketH > cellH) {
                ticketH = cellH;
                ticketW = cellH * TICKET_ASPECT;
            }

            const area = ticketW * ticketH;
            if (area > bestArea) {
                bestArea = area;
                bestCols = cols;
                bestRows = rows;
            }
        }

        // Font size proportional to ticket height
        const cellH = (vaultH - GAP * (bestRows - 1)) / bestRows;
        const cellW = (vaultW - GAP * (bestCols - 1)) / bestCols;
        const ticketH = Math.min(cellH, cellW / TICKET_ASPECT);
        const fontPx = Math.max(8, Math.round(ticketH / 4.5));

        containerEl.style.setProperty('--ticket-cols', bestCols);
        containerEl.style.setProperty('--ticket-rows', bestRows);
        containerEl.style.setProperty('--ticket-font', fontPx + 'px');
    });
}
