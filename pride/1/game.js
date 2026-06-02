const PRIDE_COLORS = [
  { id: 'red', hex: '#E40303', label: 'Vida' },
  { id: 'orange', hex: '#FF8C00', label: 'Cura' },
  { id: 'yellow', hex: '#FFED00', label: 'Sol' },
  { id: 'green', hex: '#008026', label: 'Natureza' },
  { id: 'blue', hex: '#24408E', label: 'Serenidade' },
  { id: 'purple', hex: '#732982', label: 'Espírito' },
];

const PRIDE_WORDS = [
  "AMOR", "ORGULHO", "RESPEITO", "DIVERSIDADE", 
  "IGUALDADE", "ESPERANÇA", "LIBERDADE", "EMPATIA", "UNIÃO",
  "SLAY!", "YAAAS!", "FIERCE!", "FABULOSO!", "TRANS RIGHTS!",
  "QUEER POWER!", "RESISTÊNCIA!", "AMOR É AMOR!", "FAMÍLIA!", "BORN THIS WAY!"
];

const FLAGS = [
  { name: 'Trans', colors: ['#55CDfc', '#f7a8b8', '#ffffff', '#f7a8b8', '#55CDfc'] },
  { name: 'Rainbow', colors: ['#E40303', '#FF8C00', '#FFED00', '#008026', '#24408E', '#732982'] },
  { name: 'Bi', colors: ['#D60270', '#D60270', '#9B4F96', '#0038A8', '#0038A8'] },
  { name: 'Pan', colors: ['#FF218C', '#FFD800', '#21B1FF'] },
  { name: 'Lesbian', colors: ['#D52D00', '#EF7627', '#FF9A56', '#FFFFFF', '#D162A4', '#B55690', '#A30262'] }
];

const MAP_SIZE = 8000;

class AudioSys {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.musicEnabled = false;
    this.musicInterval = null;
    this.nextNoteTime = 0;
    this.beatIndex = 0;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.enabled = true;
  }

  startMusic() {
    if (!this.enabled || !this.ctx || this.musicEnabled) return;
    this.musicEnabled = true;
    
    const tempo = 125; 
    const secondsPerBeat = 60.0 / tempo;
    
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.beatIndex = 0;
    
    const scheduleNext = () => {
      if (!this.musicEnabled) return;
      while (this.ctx && this.nextNoteTime < this.ctx.currentTime + 0.1) {
        this.scheduleBeat(this.beatIndex, this.nextNoteTime, secondsPerBeat);
        this.nextNoteTime += secondsPerBeat / 4; 
        this.beatIndex++;
      }
      this.musicInterval = setTimeout(scheduleNext, 25);
    };
    
    scheduleNext();
  }

  scheduleBeat(beatIdx, time, secondsPerBeat) {
    if (!this.ctx) return;
    const isQuarterNote = beatIdx % 4 === 0;
    const step = beatIdx % 16;
    
    // More dynamic volumes
    const kickVol = 0.4;
    const hihatVol = 0.08;
    const clapVol = 0.2;
    const bassVol = 0.25;
    const chordVol = 0.06;
    const melodyVol = 0.08;

    // 1. Kick drum (Punchier)
    if (isQuarterNote) {
      const kick = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(150, time);
      kick.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);
      kickGain.gain.setValueAtTime(kickVol, time);
      kickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
      kick.connect(kickGain);
      kickGain.connect(this.ctx.destination);
      kick.start(time);
      kick.stop(time + 0.15);
    }
    
    // 2. Offbeat Hi-hat & 16th notes
    if (step % 4 === 2 || step % 4 === 3) {
      const hat = this.ctx.createOscillator();
      const hatGain = this.ctx.createGain();
      const bandpass = this.ctx.createBiquadFilter();
      
      bandpass.type = 'highpass';
      bandpass.frequency.value = 6000;
      
      hat.type = 'square';
      hat.frequency.setValueAtTime(8000, time);
      hatGain.gain.setValueAtTime(step % 4 === 2 ? hihatVol : hihatVol * 0.3, time);
      hatGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
      
      hat.connect(bandpass);
      bandpass.connect(hatGain);
      hatGain.connect(this.ctx.destination);
      hat.start(time);
      hat.stop(time + 0.05);
    }

    // 3. Clap on 2 and 4 (step 4 and 12)
    if (step === 4 || step === 12) {
      const clap = this.ctx.createOscillator();
      const clapGain = this.ctx.createGain();
      const bp = this.ctx.createBiquadFilter();
      
      bp.type = 'bandpass';
      bp.frequency.value = 1500;
      
      clap.type = 'square';
      clap.frequency.setValueAtTime(400, time);
      // Simulate noise
      clap.frequency.exponentialRampToValueAtTime(100, time + 0.1);

      clapGain.gain.setValueAtTime(clapVol, time);
      clapGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
      
      clap.connect(bp);
      bp.connect(clapGain);
      clapGain.connect(this.ctx.destination);
      clap.start(time);
      clap.stop(time + 0.15);
    }

    // 4. Funky Synth Bass
    const bassRhythm = [1, 0, 0, 1,  0, 0, 1, 0,  1, 0, 1, 0,  0, 1, 0, 0];
    if (bassRhythm[step] === 1) {
       const bass = this.ctx.createOscillator();
       const bassGain = this.ctx.createGain();
       const filter = this.ctx.createBiquadFilter();
       
       bass.type = 'sawtooth';
       filter.type = 'lowpass';
       filter.frequency.setValueAtTime(1000, time);
       filter.frequency.exponentialRampToValueAtTime(80, time + 0.15);
       
       // Cool club bass progression (A, G, F, E)
       const prog = [55, 49, 43.65, 41.20]; // A1, G1, F1, E1
       const measure = Math.floor(beatIdx / 16) % 4;
       
       bass.frequency.setValueAtTime(prog[measure], time);
       bassGain.gain.setValueAtTime(bassVol, time);
       bassGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
       
       bass.connect(filter);
       filter.connect(bassGain);
       bassGain.connect(this.ctx.destination);
       bass.start(time);
       bass.stop(time + 0.2);
    }

    // 5. Pride Chords (Pad/Stabs) on the offbeat
    if (step % 8 === 2 || step % 8 === 5) {
       const measure = Math.floor(beatIdx / 16) % 4;
       const chords = [
         [440, 523.25, 659.25], // Am
         [392, 493.88, 587.33], // G
         [349.23, 440, 523.25], // F
         [329.63, 415.30, 493.88] // E
       ];
       const chord = chords[measure];
       
       chord.forEach(freq => {
         const osc = this.ctx.createOscillator();
         const gain = this.ctx.createGain();
         const filter = this.ctx.createBiquadFilter();
         
         osc.type = 'triangle';
         osc.frequency.setValueAtTime(freq, time);
         
         filter.type = 'lowpass';
         filter.frequency.setValueAtTime(2000, time);
         filter.frequency.exponentialRampToValueAtTime(500, time + 0.2);

         gain.gain.setValueAtTime(chordVol, time);
         gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
         
         osc.connect(filter);
         filter.connect(gain);
         gain.connect(this.ctx.destination);
         osc.start(time);
         osc.stop(time + 0.2);
       });
    }
    
    // 6. Arp / Melody Pluck (Only activates when intense, e.g., > 32 beats)
    if (beatIdx > 32) {
      const arpRhythm = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0];
      if (arpRhythm[step] === 1) {
         const arp = this.ctx.createOscillator();
         const arpGain = this.ctx.createGain();
         arp.type = 'square';
         
         const measure = Math.floor(beatIdx / 16) % 4;
         // Pentatonic scales mapping to the chords
         const scales = [
           [880, 1046.5, 1318.5, 1760], // Am pentatonic upper
           [783.99, 987.77, 1174.66, 1567.98], // G pentatonic upper
           [698.46, 880, 1046.5, 1396.91], // F pentatonic upper
           [659.25, 830.61, 987.77, 1318.51] // E pentatonic upper
         ];
         
         const arpNotes = scales[measure]; 
         const noteIndex = (step + Math.floor(beatIdx / 32)) % 4;
         
         arp.frequency.setValueAtTime(arpNotes[noteIndex], time);
         arpGain.gain.setValueAtTime(melodyVol, time);
         arpGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
         
         arp.connect(arpGain);
         arpGain.connect(this.ctx.destination);
         arp.start(time);
         arp.stop(time + 0.15);
      }
    }
  }

  stopMusic() {
    this.musicEnabled = false;
    if (this.musicInterval) {
       clearTimeout(this.musicInterval);
       this.musicInterval = null;
    }
  }

  playTone(freq, type, duration, vol = 0.1) {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playCoin() {
    this.playTone(880, 'sine', 0.1, 0.05);
    setTimeout(() => this.playTone(1200, 'sine', 0.15, 0.05), 50);
  }

  playDash() {
    this.playTone(150, 'sawtooth', 0.2, 0.02);
  }

  playColorCollect() {
    const notes = [440, 554, 659, 880]; 
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.3, 0.1), i * 100);
    });
  }

  playWin() {
    const notes = [440, 493, 554, 587, 659, 739, 830, 880, 1108]; 
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'square', 0.2, 0.08), i * 150);
    });
  }
}

const audio = new AudioSys();

class GameEngine {
  constructor(canvas, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.callbacks = callbacks;
    this.running = false;
    this.lastTime = 0;
    
    this.joystick = { dx: 0, dy: 0 };
    this.keys = {};

    this.player = {
      x: 0, y: 0, vx: 0, vy: 0,
      radius: 16, speed: 700, dashSpeed: 1600,
      dashing: false, dashTimer: 0, trail: [],
      hp: 100, maxHp: 100, level: 1, xp: 0,
      maxXp: 100, coins: 0, lastShootTime: 0, shootCooldown: 0.5,
    };

    this.camera = { x: 0, y: 0 };
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.combo = 0;
    this.comboTimer = 0;
    
    this.collectedColors = new Set();
    this.npcs = [
      { id: 'red', text: 'O Vermelho é Vida! O nosso amor resiste. O preconceito não nos calará! (Poder de Fogo)', color: '#E40303', x: 0, y: -2000, collected: false },
      { id: 'orange', text: 'O Laranja é Cura! Curamos as feridas da opressão com solidariedade e orgulho. (Regeneração)', color: '#FF8C00', x: 2000, y: -1000, collected: false },
      { id: 'yellow', text: 'Amarelo é Luz! Saia do armário, brilhe imenso e ofusque os intolerantes! (Dano Duplo)', color: '#FFED00', x: 2000, y: 1000, collected: false },
      { id: 'green', text: 'Verde é Natureza! Ser LGBTQIA+ é natural, diverso e maravilhoso. (Velocidade Extra)', color: '#008026', x: 0, y: 2000, collected: false },
      { id: 'blue', text: 'Azul traz a Serenidade e afasta o ódio de quem quer oprimir nosso afeto. (Escudo Anti-Ódio)', color: '#24408E', x: -2000, y: 1000, collected: false },
      { id: 'purple', text: 'Roxo é o Espírito! O espírito da nossa comunidade é inquebrável. SLAY! (Dash Expandido)', color: '#732982', x: -2000, y: -1000, collected: false },
    ];

    this.particles = [];
    this.coins = [];
    this.enemySpawnTimer = 2; 
    this.enemies = [];
    this.projectiles = [];
    this.floatingTexts = [];
    this.flags = [];
    this.dialogueActive = false;

    // init entities
    for(let i=0; i<400; i++) {
       this.coins.push({
         x: (Math.random() - 0.5) * MAP_SIZE,
         y: (Math.random() - 0.5) * MAP_SIZE,
         active: true, bob: Math.random() * Math.PI * 2
       });
    }

    for(let i=0; i<300; i++) {
       this.flags.push({
         x: (Math.random() - 0.5) * MAP_SIZE,
         y: (Math.random() - 0.5) * MAP_SIZE,
         type: FLAGS[Math.floor(Math.random() * FLAGS.length)],
         bob: Math.random() * Math.PI * 2,
         angle: (Math.random() - 0.5) * 0.4,
         size: Math.random() * 20 + 30
       });
    }

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.loop = this.loop.bind(this);

    this.bindEvents();
    this.notifyStats();
  }

  notifyStats() {
    if(this.callbacks.onStatsChange) this.callbacks.onStatsChange({
      level: this.player.level, xp: this.player.xp, maxXp: this.player.maxXp,
      coins: this.player.coins, hp: this.player.hp, maxHp: this.player.maxHp
    });
  }

  bindEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  unbindEvents() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.running = false;
  }

  setJoystick(dx, dy) {
    this.joystick.dx = dx;
    this.joystick.dy = dy;
  }

  triggerAction() {
    if (this.dialogueActive) {
      this.dialogueActive = false;
      if(this.callbacks.onCloseDialogue) this.callbacks.onCloseDialogue();
      this.checkWinCondition();
    } else if (!this.player.dashing) {
      this.player.dashing = true;
      this.player.dashTimer = this.collectedColors.has('purple') ? 0.6 : 0.2;
      audio.playDash();
      this.spawnExplosion(this.player.x, this.player.y, '#ffffff', 10);
    }
  }

  handleKeyDown(e) {
    this.keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') {
      this.triggerAction();
    }
  }

  handleKeyUp(e) {
    this.keys[e.key.toLowerCase()] = false;
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
  }

  loop(time) {
    if (!this.running) return;
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;

    this.update(Math.min(dt, 0.1)); 
    this.draw(Math.min(dt, 0.1));

    requestAnimationFrame(this.loop);
  }

  update(dt) {
    if (this.dialogueActive) return;

    let dx = this.joystick.dx;
    let dy = this.joystick.dy;
    
    if (Number.isNaN(dx)) dx = 0;
    if (Number.isNaN(dy)) dy = 0;

    if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
    if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) dx += 1;

    const length = Math.sqrt(dx * dx + dy * dy);
    if (length > 0) { dx /= length; dy /= length; }

    if (this.collectedColors.has('orange') && this.player.hp < this.player.maxHp) {
       this.player.hp += 2 * dt; 
    }
    
    const speedMultiplier = this.collectedColors.has('green') ? 1.5 : 1;
    const currentSpeed = (this.player.dashing ? this.player.dashSpeed : this.player.speed) * speedMultiplier;
    
    this.player.vx = this.player.vx * 0.8 + (dx * currentSpeed) * 0.2;
    this.player.vy = this.player.vy * 0.8 + (dy * currentSpeed) * 0.2;

    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    if (Number.isNaN(this.player.x) || !Number.isFinite(this.player.x)) this.player.x = 0;
    if (Number.isNaN(this.player.y) || !Number.isFinite(this.player.y)) this.player.y = 0;

    const limit = MAP_SIZE / 2 - this.player.radius;
    this.player.x = Math.max(-limit, Math.min(limit, this.player.x));
    this.player.y = Math.max(-limit, Math.min(limit, this.player.y));

    if (this.player.dashing) {
      this.player.dashTimer -= dt;
      if (this.player.dashTimer <= 0) this.player.dashing = false;
    }

    if (length > 0 || this.player.dashing) {
       let trailColor = this.getCurrentPlayerColor();
       if (this.player.dashing && this.collectedColors.size > 0) {
          const colors = Array.from(this.collectedColors).map(id => PRIDE_COLORS.find(c => c.id === id)?.hex || '#fff');
          trailColor = colors[Math.floor(Math.random() * colors.length)];
       }
       this.player.trail.unshift({
           x: this.player.x, y: this.player.y, 
           r: this.player.radius * (this.player.dashing ? 1.5 : 1),
           color: trailColor
       });
    }
    if (this.player.trail.length > (this.player.dashing ? 30 : 15)) {
        this.player.trail.pop();
    }
    this.player.trail.forEach(t => t.r *= 0.9);

    this.camera.x += (this.player.x - this.camera.x) * 5 * dt;
    this.camera.y += (this.player.y - this.camera.y) * 5 * dt;
    
    if (Number.isNaN(this.camera.x) || !Number.isFinite(this.camera.x)) this.camera.x = this.player.x;
    if (Number.isNaN(this.camera.y) || !Number.isFinite(this.camera.y)) this.camera.y = this.player.y;

    if (this.shakeTimer > 0) this.shakeTimer -= dt;
    if (this.comboTimer > 0) {
       this.comboTimer -= dt;
       if (this.comboTimer <= 0) this.combo = 0;
    }

    this.coins.forEach(coin => {
      coin.bob += dt * 5;
      if (!coin.active) return;
      const coinDist = Math.hypot(this.player.x - coin.x, this.player.y - coin.y);
      if (coinDist < 150) { 
        coin.x += (this.player.x - coin.x) * dt * 5;
        coin.y += (this.player.y - coin.y) * dt * 5;
      }
      if (coinDist < this.player.radius + 15) {
        coin.active = false;
        audio.playCoin();
        this.spawnExplosion(coin.x, coin.y, '#ffffff', 5);
        this.player.coins += 1;
        this.player.xp += 5;
        if (this.player.xp >= this.player.maxXp) {
           this.player.level++;
           this.player.xp = 0;
           this.player.maxXp = Math.floor(this.player.maxXp * 1.5);
           this.player.maxHp += 20;
           this.player.hp = this.player.maxHp;
           this.spawnFloatingText(this.player.x, this.player.y - 30, 'LEVEL UP, QUEEN! ✨', '#FFED00');
           this.spawnExplosion(this.player.x, this.player.y, '#FFED00', 50);
        }
        this.notifyStats();
      }
    });

    this.enemySpawnTimer -= dt;
    if (this.enemySpawnTimer <= 0) {
      this.enemySpawnTimer = Math.max(0.2, 2.0 - (this.player.level * 0.1) - (this.collectedColors.size * 0.2));
      const angle = Math.random() * Math.PI * 2;
      const dist = 800 + Math.random() * 400; 
      const hp = 30 + (this.player.level * 10);
      this.enemies.push({
        x: this.player.x + Math.cos(angle) * dist,
        y: this.player.y + Math.sin(angle) * dist,
        vx: 0, vy: 0, hp: hp, maxHp: hp, active: true, type: 'duller'
      });
    }

    this.player.lastShootTime += dt;
    const cooldownMultiplier = this.collectedColors.has('red') ? 0.4 : 1; 
    if (this.player.lastShootTime >= this.player.shootCooldown * cooldownMultiplier && this.collectedColors.size > 0 && this.enemies.some(e => e.active)) {
      this.player.lastShootTime = 0;
      let closest = null;
      let minD = Infinity;
      this.enemies.forEach(e => {
         if (!e.active) return;
         const d = Math.hypot(this.player.x - e.x, this.player.y - e.y);
         if (d < minD && d < 800) { minD = d; closest = e; }
      });
      if (closest) {
         const enemy = closest;
         const angle = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
         const speed = 800;
         const dmgMultiplier = this.collectedColors.has('yellow') ? 2 : 1;
         this.projectiles.push({
           x: this.player.x, y: this.player.y,
           vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
           life: 1.5, active: true, color: this.getCurrentPlayerColor(), damage: (15 + this.player.level * 2) * dmgMultiplier
         });
         audio.playTone(1200, 'sine', 0.05, 0.03); 
      }
    }

    this.projectiles.forEach(p => {
       if (!p.active) return;
       p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
       if (p.life <= 0) p.active = false;
       this.enemies.forEach(e => {
          if (!e.active || !p.active) return;
          const d = Math.hypot(p.x - e.x, p.y - e.y);
          if (d < 30) { 
             p.active = false;
             e.hp -= p.damage;
             this.spawnExplosion(e.x, e.y, p.color, 10);
             this.spawnFloatingText(e.x, e.y - 10, Math.floor(p.damage).toString(), p.color);
             if (e.hp <= 0) {
                e.active = false;
                this.spawnExplosion(e.x, e.y, p.color, 30); 
                this.triggerShake(0.1, 5);
                this.combo++;
                this.comboTimer = 2.0;

                const randomWord = PRIDE_WORDS[Math.floor(Math.random() * PRIDE_WORDS.length)];
                this.spawnFloatingText(e.x, e.y - 30, randomWord, p.color);
                if (this.combo > 1) {
                   this.spawnFloatingText(e.x, e.y - 50, `${this.combo}x COMBO!`, '#FFED00');
                }

                this.coins.push({ x: e.x, y: e.y, active: true, bob: Math.random() * Math.PI * 2 });
                this.player.xp += 10 * this.combo;
                this.notifyStats();
             }
          }
       });
    });

    this.enemies.forEach(e => {
       if (!e.active) return;
       const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
       e.vx = Math.cos(angle) * 150;
       e.vy = Math.sin(angle) * 150;
       e.x += e.vx * dt;
       e.y += e.vy * dt;

       const playerDist = Math.hypot(this.player.x - e.x, this.player.y - e.y);
       if (playerDist < this.player.radius + 15 && !this.player.dashing) {
          e.active = false;
          const dmgTaken = this.collectedColors.has('blue') ? 5 : 10;
          this.player.hp -= dmgTaken;
          this.spawnExplosion(this.player.x, this.player.y, '#E40303', 20);
          this.triggerShake(0.2, 10);
          this.spawnFloatingText(this.player.x, this.player.y - 20, `-${dmgTaken} HP`, '#E40303');
          audio.playTone(200, 'sawtooth', 0.2, 0.1);
          
          this.combo = 0;
          if (this.player.hp <= 0) {
             this.player.hp = 0;
             this.player.x = 0; this.player.y = 0;
             this.player.hp = this.player.maxHp;
             this.player.coins = Math.floor(this.player.coins / 2);
             this.spawnFloatingText(0, -50, 'REVIVED', '#ffffff');
          }
          this.notifyStats();
       }
    });

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
       const ft = this.floatingTexts[i];
       ft.y -= 30 * dt;
       ft.life -= dt;
       if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    this.npcs.forEach(npc => {
      if (npc.collected) return;
      const dist = Math.hypot(this.player.x - npc.x, this.player.y - npc.y);
      if (dist < this.player.radius + 50) {
        npc.collected = true;
        this.collectedColors.add(npc.id);
        this.spawnExplosion(npc.x, npc.y, npc.color, 40);
        this.triggerShake(0.3, 10);
        audio.playColorCollect();
        
        this.dialogueActive = true;
        this.player.vx = 0; this.player.vy = 0;
        
        if(this.callbacks.onCollect) this.callbacks.onCollect(npc.id);
        if(this.callbacks.onDialogue) this.callbacks.onDialogue(npc.text, npc.color);
      }
    });

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.95; p.vy *= 0.95;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  triggerShake(duration, intensity) {
      if (this.shakeTimer < duration) this.shakeTimer = duration;
      this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  getCurrentPlayerColor() {
      const size = this.collectedColors.size;
      if (size === 0) return '#ffffff';
      if (size === 6) {
          const now = performance.now() / 200;
          return `hsl(${now % 360}, 100%, 50%)`;
      }
      const arr = Array.from(this.collectedColors);
      const lastId = arr[arr.length - 1];
      return PRIDE_COLORS.find(c => c.id === lastId)?.hex || '#ffffff';
  }

  spawnFloatingText(x, y, text, color) {
      this.floatingTexts.push({ x, y, text, life: 1, maxLife: 1, color });
  }

  spawnExplosion(x, y, color, count) {
    for (let i = 0; i < count; i++) {
       const angle = Math.random() * Math.PI * 2;
       const speed = Math.random() * 300 + 100;
       this.particles.push({
           x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
           life: Math.random() * 0.5 + 0.3, maxLife: 0.8,
           color: color === '#ffffff' ? `hsl(${Math.random()*360}, 100%, 70%)` : color,
           r: Math.random() * 5 + 3
       });
    }
  }

  checkWinCondition() {
      if (this.collectedColors.size === 6) {
         setTimeout(() => {
             audio.playWin();
             if(this.callbacks.onWin) this.callbacks.onWin();
             this.triggerShake(1.0, 20);
             this.spawnExplosion(this.player.x, this.player.y, '#ffffff', 200);
         }, 500);
      }
  }

  draw(dt) {
    const { width, height } = this.canvas;
    this.ctx.fillStyle = '#111827'; 
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.save();
    
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTimer > 0) {
        shakeX = (Math.random() - 0.5) * this.shakeIntensity;
        shakeY = (Math.random() - 0.5) * this.shakeIntensity;
    }
    this.ctx.translate(width / 2 - this.camera.x + shakeX, height / 2 - this.camera.y + shakeY);

    this.ctx.strokeStyle = `hsl(${(performance.now() / 50) % 360}, 50%, 25%)`;
    this.ctx.lineWidth = 2;
    const gridSpacing = 200;
    const limit = MAP_SIZE / 2;
    
    this.ctx.beginPath();
    for (let x = -limit; x <= limit; x += gridSpacing) {
       this.ctx.moveTo(x, -limit); this.ctx.lineTo(x, limit);
    }
    for (let y = -limit; y <= limit; y += gridSpacing) {
       this.ctx.moveTo(-limit, y); this.ctx.lineTo(limit, y);
    }
    this.ctx.stroke();

    this.ctx.strokeStyle = `hsl(${(performance.now() / 10) % 360}, 100%, 50%)`;
    this.ctx.lineWidth = 15;
    this.ctx.strokeRect(-limit, -limit, MAP_SIZE, MAP_SIZE);

    this.ctx.fillStyle = this.collectedColors.size === 6 ? '#ffffff' : '#1f2937';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 150, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#4b5563';
    this.ctx.lineWidth = 4;
    this.ctx.stroke();
    
    this.ctx.fillStyle = this.collectedColors.size === 6 ? '#000000' : '#6b7280';
    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GRUPO', 0, -10);
    this.ctx.fillText('ARMINDO', 0, 20);

    this.coins.forEach(coin => {
      if (!coin.active) return;
      this.ctx.fillStyle = `hsl(${(coin.bob * 50) % 360}, 100%, 60%)`;
      this.ctx.beginPath();
      this.ctx.arc(coin.x, coin.y + Math.sin(coin.bob) * 5, 6, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = this.ctx.fillStyle;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    });

    this.npcs.forEach(npc => {
      this.ctx.fillStyle = npc.collected ? npc.color : '#374151';
      this.ctx.beginPath();
      this.ctx.arc(npc.x, npc.y, 40, 0, Math.PI * 2);
      this.ctx.fill();

      if (!npc.collected) {
         this.ctx.strokeStyle = npc.color;
         this.ctx.lineWidth = 4;
         this.ctx.beginPath();
         this.ctx.arc(npc.x, npc.y, 50 + Math.sin(performance.now() / 200) * 10, 0, Math.PI * 2);
         this.ctx.stroke();
      }

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '24px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      if (!npc.collected) {
         this.ctx.fillText('❓', npc.x, npc.y);
      } else {
         this.ctx.fillText('✨', npc.x, npc.y);
      }
    });

    this.projectiles.forEach(p => {
       if (!p.active) return;
       const angle = Math.atan2(p.vy, p.vx);
       this.ctx.save();
       this.ctx.translate(p.x, p.y);
       this.ctx.rotate(angle);
       this.ctx.fillStyle = p.color;
       this.ctx.beginPath(); 
       this.ctx.roundRect(-20, -5, 30, 10, 5);
       this.ctx.fill();
       
       this.ctx.shadowBlur = 15;
       this.ctx.shadowColor = p.color;
       this.ctx.fillStyle = '#ffffff';
       this.ctx.beginPath();
       this.ctx.roundRect(-10, -2, 18, 4, 2);
       this.ctx.fill();
       this.ctx.shadowBlur = 0;
       this.ctx.restore();
       
       if (Math.random() < 0.5) {
         this.spawnExplosion(p.x - p.vx * 0.02, p.y - p.vy * 0.02, p.color, 1);
       }
    });

    this.enemies.forEach(e => {
       if (!e.active) return;
       this.ctx.fillStyle = '#4b5563'; 
       this.ctx.beginPath();
       this.ctx.arc(e.x, e.y, 18, 0, Math.PI * 2);
       this.ctx.fill();
       
       this.ctx.strokeStyle = '#1f2937';
       this.ctx.lineWidth = 2;
       this.ctx.beginPath();
       this.ctx.moveTo(e.x - 6, e.y - 3);
       this.ctx.lineTo(e.x - 2, e.y + 1);
       this.ctx.moveTo(e.x + 6, e.y - 3);
       this.ctx.lineTo(e.x + 2, e.y + 1);
       this.ctx.stroke();
       this.ctx.beginPath();
       this.ctx.arc(e.x, e.y + 8, 5, Math.PI, Math.PI * 2); 
       this.ctx.stroke();

       this.ctx.fillStyle = '#ef4444';
       this.ctx.fillRect(e.x - 15, e.y - 30, 30, 4);
       this.ctx.fillStyle = '#22c55e';
       this.ctx.fillRect(e.x - 15, e.y - 30, 30 * (e.hp / e.maxHp), 4);
    });

    this.flags.forEach(f => {
       const isFullPride = this.collectedColors.size >= 6;
       f.bob += dt * 2;
       
       this.ctx.save();
       this.ctx.translate(f.x, f.y + Math.sin(f.bob) * 10);
       this.ctx.rotate(f.angle + Math.sin(f.bob * 0.5) * 0.1);
       
       this.ctx.fillStyle = isFullPride ? '#fde047' : '#9ca3af';
       this.ctx.fillRect(-2, 0, 4, f.size * 1.5);
       
       if (isFullPride || this.collectedColors.size >= 2) {
          const stripeHeight = f.size / f.type.colors.length;
          f.type.colors.forEach((color, i) => {
             this.ctx.fillStyle = color;
             this.ctx.beginPath();
             this.ctx.moveTo(0, i * stripeHeight);
             this.ctx.quadraticCurveTo(f.size * 0.5, i * stripeHeight + Math.sin(f.bob * 2) * 5, f.size, i * stripeHeight);
             this.ctx.lineTo(f.size, (i + 1) * stripeHeight);
             this.ctx.quadraticCurveTo(f.size * 0.5, (i + 1) * stripeHeight + Math.sin(f.bob * 2) * 5, 0, (i + 1) * stripeHeight);
             this.ctx.fill();
          });
       } else {
          this.ctx.fillStyle = '#4b5563';
          this.ctx.fillRect(0, 0, f.size, f.size);
       }
       
       this.ctx.restore();
    });

    this.player.trail.forEach((t, i) => {
        this.ctx.fillStyle = t.color;
        this.ctx.globalAlpha = 1 - (i / this.player.trail.length);
        this.ctx.beginPath();
        this.ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;

    this.ctx.fillStyle = this.getCurrentPlayerColor();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#000000';
    const eyeOffset = this.player.dashing ? 6 : 4;
    this.ctx.beginPath();
    this.ctx.arc(this.player.x - 5, this.player.y - eyeOffset, 2, 0, Math.PI * 2);
    this.ctx.arc(this.player.x + 5, this.player.y - eyeOffset, 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.particles.forEach(p => {
       this.ctx.fillStyle = p.color;
       this.ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
       this.ctx.beginPath();
       this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
       this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;

    this.floatingTexts.forEach(ft => {
       this.ctx.fillStyle = ft.color;
       this.ctx.font = 'bold 20px sans-serif';
       this.ctx.textAlign = 'center';
       this.ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
       this.ctx.fillText(ft.text, ft.x, ft.y);
    });
    this.ctx.globalAlpha = 1;

    this.ctx.restore();
  }
}

document.addEventListener('DOMContentLoaded', () => {
    const startScreen = document.getElementById('startScreen');
    const startObj = document.getElementById('btnStart');
    
    const uiOverlay = document.getElementById('uiOverlay');
    const colorsList = document.getElementById('colorsList');
    const hudHpBar = document.getElementById('hudHpBar');
    const hudHpText = document.getElementById('hudHpText');
    const hudLevelText = document.getElementById('hudLevelText');
    const hudXpText = document.getElementById('hudXpText');
    const hudXpBar = document.getElementById('hudXpBar');
    const hudCoinsText = document.getElementById('hudCoinsText');
    
    const dialogueOverlay = document.getElementById('dialogueOverlay');
    const dialogueText = document.getElementById('dialogueText');
    
    const winOverlay = document.getElementById('winOverlay');
    const btnContinue = document.getElementById('btnContinue');

    const joystickBase = document.getElementById('joystickBase');
    const joystickKnob = document.getElementById('joystickKnob');
    const btnAction = document.getElementById('btnAction');

    const canvas = document.getElementById('gameCanvas');
    let engine = null;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function updateHud(stats) {
        hudHpText.textContent = `${Math.floor(stats.hp)} / ${stats.maxHp}`;
        hudHpBar.style.width = `${(stats.hp / stats.maxHp) * 100}%`;
        hudLevelText.textContent = `★ Nível ${stats.level}`;
        hudXpText.textContent = `${stats.xp} / ${stats.maxXp} XP`;
        hudXpBar.style.width = `${(stats.xp / stats.maxXp) * 100}%`;
        hudCoinsText.textContent = stats.coins;
    }

    function initGame() {
        audio.init();
        audio.startMusic();
        
        startScreen.style.display = 'none';
        uiOverlay.style.display = 'block';

        engine = new GameEngine(canvas, {
            onCollect: (colorId) => {
                const badge = document.getElementById(`color-badge-${colorId}`);
                if(badge) {
                    badge.classList.add('collected');
                    const cInfo = PRIDE_COLORS.find(c => c.id === colorId);
                    if(cInfo) {
                        badge.style.backgroundColor = cInfo.hex;
                        badge.style.boxShadow = `0 0 20px ${cInfo.hex}`;
                        badge.style.borderColor = '#ffffff';
                        const emoji = badge.querySelector('.badge-emoji');
                        if(emoji) emoji.style.display = 'inline';
                    }
                }
            },
            onDialogue: (text, color) => {
                dialogueOverlay.style.border = `4px solid ${color}`;
                dialogueText.textContent = `"${text}"`;
                dialogueOverlay.style.display = 'flex';
                dialogueOverlay.style.background = `radial-gradient(circle at center, ${color}33 0%, transparent 70%), #1f2937`;
            },
            onCloseDialogue: () => {
                dialogueOverlay.style.display = 'none';
            },
            onWin: () => {
                winOverlay.style.display = 'flex';
            },
            onStatsChange: updateHud
        });

        engine.start();
    }

    startObj.addEventListener('click', initGame);
    btnContinue.addEventListener('click', () => {
        winOverlay.style.display = 'none';
    });

    let isDraggingJoystick = false;
    const maxJoystickDist = 50;

    function handleJoystickMove(clientX, clientY) {
        if(!engine) return;
        const rect = joystickBase.getBoundingClientRect();
        const basePathX = rect.left + rect.width / 2;
        const basePathY = rect.top + rect.height / 2;
        
        let dx = clientX - basePathX;
        let dy = clientY - basePathY;
        
        const dist = Math.hypot(dx, dy);
        if (dist > maxJoystickDist) {
            dx = (dx / dist) * maxJoystickDist;
            dy = (dy / dist) * maxJoystickDist;
        }
        
        joystickKnob.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`;
        engine.setJoystick(dx / maxJoystickDist, dy / maxJoystickDist);
    }

    function onTouchStart(e) { e.preventDefault(); isDraggingJoystick = true; handleJoystickMove(e.touches[0].clientX, e.touches[0].clientY); }
    function onTouchMove(e) { e.preventDefault(); if(isDraggingJoystick) handleJoystickMove(e.touches[0].clientX, e.touches[0].clientY); }
    function onTouchEnd(e) { e.preventDefault(); isDraggingJoystick = false; joystickKnob.style.transform = 'translate(-50%, -50%)'; if(engine) engine.setJoystick(0,0); }

    joystickBase.addEventListener('touchstart', onTouchStart, {passive: false});
    joystickBase.addEventListener('touchmove', onTouchMove, {passive: false});
    joystickBase.addEventListener('touchend', onTouchEnd);
    joystickBase.addEventListener('touchcancel', onTouchEnd);

    btnAction.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if(engine) engine.triggerAction();
    });
    btnAction.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if(engine) engine.triggerAction();
    });

    document.addEventListener('keydown', (e) => {
        if(e.key === ' ' && engine && engine.dialogueActive) {
            engine.triggerAction();
        }
    });
});
