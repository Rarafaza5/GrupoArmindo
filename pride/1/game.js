const PRIDE_COLORS = [
  { id: 'red', hex: '#E40303', label: 'Vida' },
  { id: 'orange', hex: '#FF8C00', label: 'Cura' },
  { id: 'yellow', hex: '#FFED00', label: 'Luz do Sol' },
  { id: 'green', hex: '#008026', label: 'Natureza' },
  { id: 'blue', hex: '#24408E', label: 'Serenidade' },
  { id: 'purple', hex: '#732982', label: 'Espírito' }
];

const PRIDE_WORDS = ['SLAY!', 'YAAAS!', 'FIERCE!', 'WORK!', 'WERQ!', 'FABULOSO!', 'ORGULHO!'];
const MAP_SIZE = 4000;

const FLAGS = [
  { id: 'rainbow', colors: ['#E40303', '#FF8C00', '#FFED00', '#008026', '#24408E', '#732982'] },
  { id: 'trans', colors: ['#5BCEFA', '#F5A9B8', '#FFFFFF', '#F5A9B8', '#5BCEFA'] },
  { id: 'bi', colors: ['#D60270', '#9B4F96', '#0038A8'] },
  { id: 'pan', colors: ['#FF218C', '#FFD800', '#21B1FF'] },
  { id: 'lesbian', colors: ['#D52D00', '#EF7627', '#FF9A56', '#FFFFFF', '#D162A4', '#B55690', '#A30262'] },
  { id: 'nonbinary', colors: ['#FCF434', '#FFFFFF', '#9C59D1', '#2C2C2C'] }
];

// -- Audio System --
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let masterGain, musicOscillator;

const audio = {
  init() {
    if (masterGain) return;
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.2;
    masterGain.connect(audioContext.destination);
  },
  playTone(freq, type = 'sine', duration = 0.1, vol = 0.1) {
    if(!masterGain) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioContext.currentTime);
    gain.gain.setValueAtTime(vol, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(audioContext.currentTime + duration);
  },
  playDash() { this.playTone(400, 'square', 0.2, 0.05); },
  playCoin() { this.playTone(800, 'sine', 0.1, 0.05); this.playTone(1200, 'sine', 0.2, 0.05); },
  playColorCollect() {
    [440, 554, 659, 880].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.3, 0.1), i * 100);
    });
  },
  playWin() {
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.3, 0.1), i * 150);
    });
  },
  startMusic() {
    if(audioContext.state === 'suspended') audioContext.resume();
  },
  stopMusic() { }
};

// -- Game Engine --
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
      x: 0, y: 0, vx: 0, vy: 0, radius: 16,
      speed: 700, dashSpeed: 1600, dashing: false, dashTimer: 0,
      trail: [], hp: 100, maxHp: 100, level: 1, xp: 0, maxXp: 100, coins: 0,
      lastShootTime: 0, shootCooldown: 0.5
    };
    
    this.camera = { x: 0, y: 0 };
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.combo = 0;
    this.comboTimer = 0;
    
    this.collectedColors = new Set();
    const pr = () => MAP_SIZE * (0.35 + Math.random() * 0.1);
    const pa = () => Math.random() * Math.PI * 2;
    this.npcs = [
      { id: 'red', text: 'O Vermelho é Vida! O nosso amor resiste. O preconceito não nos calará! (Poder de Fogo)', color: '#E40303', x: Math.cos(0 + Math.random()*0.5) * pr(), y: Math.sin(0 + Math.random()*0.5) * pr(), collected: false },
      { id: 'orange', text: 'O Laranja é Cura! Curamos as feridas da opressão com solidariedade e orgulho. (Regeneração)', color: '#FF8C00', x: Math.cos(Math.PI/3 + Math.random()*0.5) * pr(), y: Math.sin(Math.PI/3 + Math.random()*0.5) * pr(), collected: false },
      { id: 'yellow', text: 'Amarelo é Luz! Saia do armário, brilhe imenso e ofusque os intolerantes! (Dano Duplo)', color: '#FFED00', x: Math.cos(2*Math.PI/3 + Math.random()*0.5) * pr(), y: Math.sin(2*Math.PI/3 + Math.random()*0.5) * pr(), collected: false },
      { id: 'green', text: 'Verde é Natureza! Ser LGBTQIA+ é natural, diverso e maravilhoso. (Velocidade Extra)', color: '#008026', x: Math.cos(Math.PI + Math.random()*0.5) * pr(), y: Math.sin(Math.PI + Math.random()*0.5) * pr(), collected: false },
      { id: 'blue', text: 'Azul traz a Serenidade e afasta o ódio de quem quer oprimir nosso afeto. (Escudo Anti-Ódio)', color: '#24408E', x: Math.cos(4*Math.PI/3 + Math.random()*0.5) * pr(), y: Math.sin(4*Math.PI/3 + Math.random()*0.5) * pr(), collected: false },
      { id: 'purple', text: 'Roxo é o Espírito de Comunidade! Símbolos vazios não mudam o mundo, mas juntos damos poder às nossas Bandeiras! (Bandeiras ativadas)', color: '#732982', x: Math.cos(5*Math.PI/3 + Math.random()*0.5) * pr(), y: Math.sin(5*Math.PI/3 + Math.random()*0.5) * pr(), collected: false },
    ];
    
    // Shuffle npcs positions so it's not always in the same order
    const positions = this.npcs.map(n => ({x: n.x, y: n.y}));
    for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    this.npcs.forEach((n, i) => {
        n.x = positions[i].x;
        n.y = positions[i].y;
    });
    
    this.particles = [];
    this.coins = [];
    this.enemies = [];
    this.projectiles = [];
    this.floatingTexts = [];
    this.flags = [];
    this.dialogueActive = false;
    this.enemySpawnTimer = 2;
    this.prideBoostTime = 0;

    for(let i=0; i<400; i++) {
       this.coins.push({ x: (Math.random() - 0.5) * MAP_SIZE, y: (Math.random() - 0.5) * MAP_SIZE, active: true, bob: Math.random() * Math.PI * 2 });
    }
    for(let i=0; i<15; i++) {
       this.flags.push({
         x: (Math.random() - 0.5) * MAP_SIZE, y: (Math.random() - 0.5) * MAP_SIZE,
         type: FLAGS[Math.floor(Math.random() * FLAGS.length)],
         bob: Math.random() * Math.PI * 2, angle: (Math.random() - 0.5) * 0.4, size: Math.random() * 20 + 30, active: true
       });
    }

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.loop = this.loop.bind(this);
  }

  notifyStats() {
    this.callbacks.onStatsChange({
      level: this.player.level, xp: this.player.xp, maxXp: this.player.maxXp, coins: this.player.coins, hp: this.player.hp, maxHp: this.player.maxHp
    });
  }

  triggerAction() {
    if (this.dialogueActive) {
      this.dialogueActive = false;
      this.callbacks.onCloseDialogue();
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
    if (e.key === ' ') this.triggerAction();
  }
  handleKeyUp(e) { this.keys[e.key.toLowerCase()] = false; }

  bindEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }
  unbindEvents() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.running = false;
  }

  start() {
    this.bindEvents();
    this.notifyStats();
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }
  stop() { this.running = false; this.unbindEvents(); }

  setJoystick(dx, dy) {
    this.joystick.dx = dx;
    this.joystick.dy = dy;
  }

  loop(time) {
    if (!this.running) return;
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    this.update(Math.min(dt, 0.1));
    this.draw();
    requestAnimationFrame(this.loop);
  }

  update(dt) {
    if (this.dialogueActive) return;

    let dx = this.joystick.dx;
    let dy = this.joystick.dy;
    
    if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
    if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) dx += 1;

    const length = Math.sqrt(dx * dx + dy * dy);
    if (length > 0) { dx /= length; dy /= length; }

    if (this.collectedColors.has('orange') && this.player.hp < this.player.maxHp) {
       this.player.hp += 2 * dt; 
    }
    
    if (this.prideBoostTime > 0) {
       this.prideBoostTime -= dt;
    }
    
    let speedMultiplier = this.collectedColors.has('green') ? 1.5 : 1;
    if (this.prideBoostTime > 0) speedMultiplier *= 2.5;

    const currentSpeed = (this.player.dashing ? this.player.dashSpeed : this.player.speed) * speedMultiplier;
    
    this.player.vx = this.player.vx * 0.8 + (dx * currentSpeed) * 0.2;
    this.player.vy = this.player.vy * 0.8 + (dy * currentSpeed) * 0.2;
    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    if (isNaN(this.player.x)) this.player.x = 0;
    if (isNaN(this.player.y)) this.player.y = 0;

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
          const colors = Array.from(this.collectedColors).map(id => PRIDE_COLORS.find(c => c.id === id).hex);
          trailColor = colors[Math.floor(Math.random() * colors.length)];
       }
       this.player.trail.unshift({
           x: this.player.x, y: this.player.y, 
           r: this.player.radius * (this.player.dashing ? 1.5 : 1),
           color: trailColor
       });
    }
    if (this.player.trail.length > (this.player.dashing ? 30 : 15)) this.player.trail.pop();
    this.player.trail.forEach(t => t.r *= 0.9);

    this.camera.x += (this.player.x - this.camera.x) * 5 * dt;
    this.camera.y += (this.player.y - this.camera.y) * 5 * dt;

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
           this.spawnFloatingText(this.player.x, this.player.y - 30, 'LEVEL UP! ✨', '#FFED00');
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
        vx: 0, vy: 0, hp: hp, maxHp: hp, active: true
      });
    }

    this.player.lastShootTime += dt;
    const cooldownMultiplier = this.collectedColors.has('red') ? 0.4 : 1;
    if (this.player.lastShootTime >= this.player.shootCooldown * cooldownMultiplier && this.collectedColors.size > 0 && this.enemies.some(e => e.active)) {
      this.player.lastShootTime = 0;
      let closest = null; let minD = Infinity;
      this.enemies.forEach(e => {
         if (!e.active) return;
         const d = Math.hypot(this.player.x - e.x, this.player.y - e.y);
         if (d < minD && d < 800) { minD = d; closest = e; }
      });
      if (closest) {
         const angle = Math.atan2(closest.y - this.player.y, closest.x - this.player.x);
         const dmgMultiplier = this.collectedColors.has('yellow') ? 2 : 1;
         
         this.projectiles.push({
           x: this.player.x, y: this.player.y,
           vx: Math.cos(angle) * 800, vy: Math.sin(angle) * 800,
           life: 1.5, active: true, color: this.getCurrentPlayerColor(),
           damage: (15 + this.player.level * 2) * dmgMultiplier
         });
         audio.playTone(1200, 'sine', 0.05, 0.03);
      }
    }

    this.projectiles.forEach(p => {
       if (!p.active) return;
       p.x += p.vx * dt; p.y += p.vy * dt;
       p.life -= dt;
       if (p.life <= 0) p.active = false;

       this.enemies.forEach(e => {
          if (!e.active || !p.active) return;
          if (Math.hypot(p.x - e.x, p.y - e.y) < 30) {
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
                if (this.combo > 1) this.spawnFloatingText(e.x, e.y - 50, `${this.combo}x COMBO!`, '#FFED00');

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
       e.vx = Math.cos(angle) * 150; e.vy = Math.sin(angle) * 150;
       e.x += e.vx * dt; e.y += e.vy * dt;

       if (Math.hypot(this.player.x - e.x, this.player.y - e.y) < this.player.radius + 15 && !this.player.dashing) {
          e.active = false;
          const dmgTaken = this.collectedColors.has('blue') ? 5 : 10;
          this.player.hp -= dmgTaken;
          
          this.spawnExplosion(this.player.x, this.player.y, '#E40303', 20);
          this.triggerShake(0.2, 10);
          this.spawnFloatingText(this.player.x, this.player.y - 20, `-${dmgTaken} HP`, '#E40303');
          audio.playTone(200, 'sawtooth', 0.2, 0.1);
          
          this.combo = 0;
          if (this.player.hp <= 0 && !this.isGameOver) {
             this.player.hp = 0;
             this.isGameOver = true;
             this.running = false;
             if (this.callbacks.onGameOver) this.callbacks.onGameOver();
          }
          if (!this.isGameOver) this.notifyStats();
       }
    });

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
       const ft = this.floatingTexts[i];
       ft.y -= 30 * dt; ft.life -= dt;
       if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    this.npcs.forEach(npc => {
      // existing npc code ...
      if (npc.collected) return;
      if (Math.hypot(this.player.x - npc.x, this.player.y - npc.y) < this.player.radius + 50) {
        npc.collected = true;
        this.collectedColors.add(npc.id);
        this.spawnExplosion(npc.x, npc.y, npc.color, 40);
        this.triggerShake(0.3, 10);
        audio.playColorCollect();
        
        this.dialogueActive = true;
        this.player.vx = 0; this.player.vy = 0;
        
        this.callbacks.onCollect(npc.id);
        this.callbacks.onDialogue(npc.text, npc.color);
      }
    });

    this.flags.forEach(f => {
       if (!f.active) return;
       if (Math.hypot(this.player.x - f.x, this.player.y - f.y) < this.player.radius + f.size) {
          if (this.collectedColors.has('purple')) {
             f.active = false;
             // Heal the player
             if (this.player.hp < this.player.maxHp) {
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
             }
             this.player.xp += 10;
             this.notifyStats();
             audio.playTone(600, 'sine', 0.1, 0.05);

             const flagColor = f.type.colors[0];
             this.spawnExplosion(f.x, f.y, flagColor, 20);
             this.spawnFloatingText(f.x, f.y - 20, "ORGULHO!", flagColor);
             
             this.prideBoostTime = 15;
             
             // AOE blast
             this.triggerShake(0.2, 5);
             this.enemies.forEach(e => {
                if (e.active && Math.hypot(e.x - f.x, e.y - f.y) < 250) {
                    e.hp -= 40;
                    if (e.hp <= 0) {
                        e.active = false;
                        this.spawnExplosion(e.x, e.y, flagColor, 20);
                        this.player.xp += 5;
                    }
                }
             });
          }
       }
    });

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.95; p.vy *= 0.95; p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  triggerShake(duration, intensity) {
      if (this.shakeTimer < duration) this.shakeTimer = duration;
      this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  getCurrentPlayerColor() {
      if (this.prideBoostTime > 0) return `hsl(${(performance.now() / 50) % 360}, 100%, 50%)`;
      const size = this.collectedColors.size;
      if (size === 0) return '#ffffff';
      if (size === 6) return `hsl(${(performance.now() / 200) % 360}, 100%, 50%)`;
      const arr = Array.from(this.collectedColors);
      return PRIDE_COLORS.find(c => c.id === arr[arr.length - 1]).hex;
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
             this.callbacks.onWin();
             this.triggerShake(1.0, 20);
             this.spawnExplosion(this.player.x, this.player.y, '#ffffff', 200);
         }, 500);
      }
  }

  draw() {
    const { width, height } = this.canvas;
    const now = performance.now();
    const dtSeconds = 0.016; 

    // Dark background with slight radial gradient
    const bgGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, MAP_SIZE);
    bgGradient.addColorStop(0, '#0f172a'); // Very dark blue/slate
    bgGradient.addColorStop(1, '#020617'); // Almost black
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.save();
    
    let shakeX = 0, shakeY = 0;
    if (this.shakeTimer > 0) {
        shakeX = (Math.random() - 0.5) * this.shakeIntensity;
        shakeY = (Math.random() - 0.5) * this.shakeIntensity;
    }
    
    this.ctx.translate(width / 2 - this.camera.x + shakeX, height / 2 - this.camera.y + shakeY);

    // Glowing Grid
    this.ctx.strokeStyle = this.prideBoostTime > 0 ? `hsla(${(now / 30) % 360}, 100%, 50%, 0.5)` : `hsla(${(now / 100) % 360}, 40%, 15%, 0.5)`;
    this.ctx.lineWidth = 1;
    const gridSpacing = 150;
    const limit = MAP_SIZE / 2;
    
    this.ctx.beginPath();
    for (let x = -limit; x <= limit; x += gridSpacing) { this.ctx.moveTo(x, -limit); this.ctx.lineTo(x, limit); }
    for (let y = -limit; y <= limit; y += gridSpacing) { this.ctx.moveTo(-limit, y); this.ctx.lineTo(limit, y); }
    this.ctx.stroke();

    // Border Glow
    this.ctx.strokeStyle = this.prideBoostTime > 0 ? `hsla(${(now / 20) % 360}, 100%, 50%, 0.8)` : `hsla(${(now / 20) % 360}, 80%, 40%, 0.8)`;
    this.ctx.lineWidth = 8;
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = this.ctx.strokeStyle;
    this.ctx.strokeRect(-limit, -limit, MAP_SIZE, MAP_SIZE);
    this.ctx.shadowBlur = 0; // Reset

    // Center Arena
    this.ctx.fillStyle = this.collectedColors.size === 6 ? 'rgba(255,255,255,0.05)' : 'rgba(31, 41, 55, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 200, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(75, 85, 99, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    this.ctx.fillStyle = this.collectedColors.size === 6 ? 'rgba(255,255,255,0.8)' : 'rgba(107, 114, 128, 0.6)';
    this.ctx.font = '900 32px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.letterSpacing = '2px';
    this.ctx.fillText('GRUPO', 0, -10);
    this.ctx.fillText('ARMINDO', 0, 25);

    // Coins (Glowing Orbs)
    this.ctx.globalCompositeOperation = 'lighter';
    this.coins.forEach(coin => {
      if (!coin.active) return;
      const hue = (coin.bob * 50) % 360;
      
      const grad = this.ctx.createRadialGradient(coin.x, coin.y + Math.sin(coin.bob) * 5, 0, coin.x, coin.y + Math.sin(coin.bob) * 5, 12);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, `hsl(${hue}, 100%, 70%)`);
      grad.addColorStop(1, 'transparent');
      
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(coin.x, coin.y + Math.sin(coin.bob) * 5, 12, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalCompositeOperation = 'source-over';

    // NPCs
    this.npcs.forEach(npc => {
      const grad = this.ctx.createRadialGradient(npc.x, npc.y, 0, npc.x, npc.y, 45);
      grad.addColorStop(0, npc.collected ? npc.color : '#4b5563');
      grad.addColorStop(1, npc.collected ? '#111827' : '#1f2937');
      
      this.ctx.fillStyle = grad;
      this.ctx.shadowBlur = npc.collected ? 30 : 0;
      this.ctx.shadowColor = npc.color;
      this.ctx.beginPath();
      this.ctx.arc(npc.x, npc.y, 40, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      if (!npc.collected) {
         this.ctx.strokeStyle = npc.color;
         this.ctx.lineWidth = 3;
         this.ctx.beginPath();
         this.ctx.arc(npc.x, npc.y, 55 + Math.sin(now / 150) * 15, 0, Math.PI * 2);
         this.ctx.stroke();
      }

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '28px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(!npc.collected ? '❓' : '✨', npc.x, npc.y);
    });

    // Projectiles
    this.projectiles.forEach(p => {
       if (!p.active) return;
       const angle = Math.atan2(p.vy, p.vx);
       this.ctx.save();
       this.ctx.translate(p.x, p.y);
       this.ctx.rotate(angle);
       
       this.ctx.shadowBlur = 20;
       this.ctx.shadowColor = p.color;
       this.ctx.fillStyle = p.color;
       this.ctx.beginPath();
       this.ctx.ellipse(0, 0, 20, 6, 0, 0, Math.PI * 2);
       this.ctx.fill();
       
       this.ctx.fillStyle = '#ffffff';
       this.ctx.beginPath();
       this.ctx.ellipse(0, 0, 10, 2, 0, 0, Math.PI * 2);
       this.ctx.fill();
       
       this.ctx.shadowBlur = 0;
       this.ctx.restore();
       if (Math.random() < 0.6) this.spawnExplosion(p.x - p.vx * 0.03, p.y - p.vy * 0.03, p.color, 1);
    });

    // Enemies
    this.enemies.forEach(e => {
       if (!e.active) return;
       
       this.ctx.shadowBlur = 15;
       this.ctx.shadowColor = '#000000';
       this.ctx.fillStyle = '#1e293b'; 
       this.ctx.beginPath();
       this.ctx.arc(e.x, e.y, 20, 0, Math.PI * 2);
       this.ctx.fill();
       this.ctx.shadowBlur = 0;
       
       // Evil Eyes
       this.ctx.fillStyle = '#ef4444';
       this.ctx.shadowBlur = 10;
       this.ctx.shadowColor = '#ef4444';
       this.ctx.beginPath();
       this.ctx.ellipse(e.x - 7, e.y - 4, 4, 6, Math.PI/6, 0, Math.PI * 2);
       this.ctx.ellipse(e.x + 7, e.y - 4, 4, 6, -Math.PI/6, 0, Math.PI * 2);
       this.ctx.fill();
       this.ctx.shadowBlur = 0;
       
       // Health Bar
       this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
       this.ctx.fillRect(e.x - 16, e.y - 32, 32, 6);
       this.ctx.fillStyle = '#22c55e';
       this.ctx.fillRect(e.x - 15, e.y - 31, 30 * (e.hp / e.maxHp), 4);
    });

    // Flags
    this.flags.forEach(f => {
       if (!f.active) return;
       const isFullPride = this.collectedColors.has('purple');
       f.bob += dtSeconds * 2;
       this.ctx.save();
       this.ctx.translate(f.x, f.y + Math.sin(f.bob) * 10);
       this.ctx.rotate(f.angle + Math.sin(f.bob * 0.5) * 0.1);
       
       this.ctx.fillStyle = isFullPride ? '#fde047' : 'rgba(156, 163, 175, 0.5)';
       this.ctx.fillRect(-2, 0, 4, f.size * 1.5);
       
       if (isFullPride) {
          const stripeHeight = f.size / f.type.colors.length;
          f.type.colors.forEach((color, i) => {
             this.ctx.fillStyle = color;
             this.ctx.beginPath();
             this.ctx.moveTo(0, i * stripeHeight);
             this.ctx.quadraticCurveTo(f.size * 0.5, i * stripeHeight + Math.sin(f.bob * 2) * 4, f.size, i * stripeHeight);
             this.ctx.lineTo(f.size, (i + 1) * stripeHeight);
             this.ctx.quadraticCurveTo(f.size * 0.5, (i + 1) * stripeHeight + Math.sin(f.bob * 2) * 4, 0, (i + 1) * stripeHeight);
             this.ctx.fill();
          });
          this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
          this.ctx.fillRect(0, 0, f.size, f.size); // Slight sheen
       } else {
          this.ctx.fillStyle = 'rgba(75, 85, 99, 0.5)';
          this.ctx.fillRect(0, 0, f.size, f.size);
       }
       this.ctx.restore();
    });

    // Player Trail
    this.ctx.globalCompositeOperation = 'lighter';
    this.player.trail.forEach((t, i) => {
        this.ctx.fillStyle = t.color;
        this.ctx.globalAlpha = (1 - (i / this.player.trail.length)) * 0.6;
        this.ctx.beginPath();
        this.ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'source-over';

    // Player
    const playerColor = this.getCurrentPlayerColor();
    this.ctx.fillStyle = playerColor;
    this.ctx.shadowBlur = 25;
    this.ctx.shadowColor = playerColor;
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    // Player Eyes (Determined by movement)
    this.ctx.fillStyle = '#0f172a';
    const eyeOffset = this.player.dashing ? 8 : 4;
    const eyeDirX = (this.player.vx / this.player.speed) * 3 || 0;
    const eyeDirY = (this.player.vy / this.player.speed) * 3 || 0;
    this.ctx.beginPath();
    this.ctx.ellipse(this.player.x - 5 + eyeDirX, this.player.y - eyeOffset + eyeDirY, 2.5, 4, 0, 0, Math.PI * 2);
    this.ctx.ellipse(this.player.x + 5 + eyeDirX, this.player.y - eyeOffset + eyeDirY, 2.5, 4, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Player cheeks
    this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
    this.ctx.beginPath();
    this.ctx.arc(this.player.x - 8, this.player.y, 2, 0, Math.PI * 2);
    this.ctx.arc(this.player.x + 8, this.player.y, 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Particles
    this.ctx.globalCompositeOperation = 'lighter';
    this.particles.forEach(p => {
       const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
       grad.addColorStop(0, '#ffffff');
       grad.addColorStop(0.4, p.color);
       grad.addColorStop(1, 'transparent');
       
       this.ctx.fillStyle = grad;
       this.ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
       this.ctx.beginPath();
       this.ctx.arc(p.x, p.y, p.r * 2, 0, Math.PI * 2);
       this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'source-over';

    // Floating Text
    this.floatingTexts.forEach(ft => {
       this.ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
       this.ctx.font = '900 22px sans-serif';
       this.ctx.textAlign = 'center';
       
       this.ctx.shadowBlur = 4;
       this.ctx.shadowColor = '#000000';
       this.ctx.fillStyle = '#000000';
       this.ctx.fillText(ft.text, ft.x, ft.y + 2); // shadow offset
       
       this.ctx.shadowBlur = 10;
       this.ctx.shadowColor = ft.color;
       this.ctx.fillStyle = '#ffffff';
       this.ctx.fillText(ft.text, ft.x, ft.y);
       
       this.ctx.fillStyle = ft.color;
       this.ctx.fillText(ft.text, ft.x, ft.y);
       this.ctx.shadowBlur = 0;
    });
    this.ctx.globalAlpha = 1;

    this.ctx.restore();
  }
}

// -- Main Application Logic --
document.addEventListener('DOMContentLoaded', () => {
  const doodleTrigger = document.getElementById('doodleTrigger');
  const googleView = document.getElementById('googleView');
  const gameView = document.getElementById('gameView');
  
  const startScreen = document.getElementById('startScreen');
  const gamePlayContainer = document.getElementById('gamePlayContainer');
  const btnStartGame = document.getElementById('btnStartGame');
  const btnFullscreen = document.getElementById('btnFullscreen');
  const btnCloseGame = document.getElementById('btnCloseGame');
  
  const canvas = document.getElementById('gameCanvas');
  let engine = null;

  // -- UI Element Refs --
  const dialogueOverlay = document.getElementById('dialogueOverlay');
  const dialogueCard = document.getElementById('dialogueCard');
  const dialogueText = document.getElementById('dialogueText');
  const dialogueGlow = document.getElementById('dialogueGlow');
  
  const winOverlay = document.getElementById('winOverlay');
  const btnContinue = document.getElementById('btnContinue');
  const btnWinClose = document.getElementById('btnWinClose');
  const confettiContainer = document.getElementById('confettiContainer');

  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const btnRestart = document.getElementById('btnRestart');
  const btnGameOverClose = document.getElementById('btnGameOverClose');

  const hudHpBar = document.getElementById('hudHpBar');
  const hudHpText = document.getElementById('hudHpText');
  const hudLevelText = document.getElementById('hudLevelText');
  const hudXpBar = document.getElementById('hudXpBar');
  const hudXpText = document.getElementById('hudXpText');
  const hudCoinsText = document.getElementById('hudCoinsText');

  // Launch Game View
  if (doodleTrigger) {
    doodleTrigger.addEventListener('click', () => {
      googleView.classList.remove('active');
      googleView.classList.add('hidden');
      gameView.classList.remove('hidden');
      gameView.classList.add('active');
    });
  }

  const btnLucky = document.getElementById('btnLucky');
  if (btnLucky) {
    btnLucky.addEventListener('click', () => {
      document.body.classList.add('rainbow-fullscreen');
      const startScreen = document.getElementById('startScreen');
      const logoContainer = document.querySelector('.logo-container');
      const logoText = document.querySelector('.logo-text');
      
      startScreen.classList.add('lucky-dance');
      if (logoContainer) logoContainer.classList.add('lucky-spin');
      if (logoText) logoText.classList.add('lucky-color');
      
      const tempConfetti = document.createElement('div');
      tempConfetti.className = 'confetti-container';
      tempConfetti.style.position = 'fixed';
      tempConfetti.style.zIndex = '10000';
      document.body.appendChild(tempConfetti);
      
      const colors = ['#E40303', '#FF8C00', '#FFED00', '#008026', '#24408E', '#732982'];
      for (let i = 0; i < 250; i++) {
        const conf = document.createElement('div');
        conf.classList.add('confetti');
        conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.animationDuration = (Math.random() * 1.5 + 0.5) + 's'; // Fast fall
        conf.style.animationDelay = (Math.random() * 0.2) + 's';
        conf.style.width = (Math.random() * 10 + 5) + 'px';
        conf.style.height = (Math.random() * 10 + 5) + 'px';
        tempConfetti.appendChild(conf);
      }

      // Initialize audio if not done yet
      if (window.audio && !window.audio.ctx) {
         window.audio.init();
      }
      
      if (window.audio) {
        for(let i=0; i<30; i++) {
           setTimeout(() => {
              window.audio.playTone(400 + Math.random() * 800, 'square', 0.1, 0.05);
           }, i * 100);
        }
      }

      setTimeout(() => {
        document.body.classList.remove('rainbow-fullscreen');
        startScreen.classList.remove('lucky-dance');
        if (logoContainer) logoContainer.classList.remove('lucky-spin');
        if (logoText) logoText.classList.remove('lucky-color');
        
        tempConfetti.style.transition = 'opacity 1s';
        tempConfetti.style.opacity = '0';
        setTimeout(() => {
           if (tempConfetti.parentNode) tempConfetti.parentNode.removeChild(tempConfetti);
        }, 1000);
      }, 3000);
    });
  }

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    const prideCycle = "pride ";
    searchInput.addEventListener('input', (e) => {
      const len = e.target.value.length;
      if (len === 0) return;
      
      let result = "";
      for (let i = 0; i < len; i++) {
        result += prideCycle[i % prideCycle.length];
      }
      e.target.value = result;
    });
  }

  // Start Game Engine
  if (btnStartGame) {
    btnStartGame.addEventListener('click', startGame);
  }

  function startGame() {
    if(engine) {
       engine.stop();
       engine = null;
    }
    audio.init();
    audio.startMusic();
    
    startScreen.classList.remove('active');
    startScreen.classList.add('hidden');
    gameOverOverlay.classList.remove('active');
    gameOverOverlay.classList.add('hidden');
    gamePlayContainer.classList.remove('hidden');
    btnFullscreen.style.display = 'flex';
    
    resizeCanvas();
    
    engine = new GameEngine(canvas, {
      onCollect: (colorId) => {
        const badge = document.getElementById(`badge-${colorId}`);
        if(badge) {
           badge.classList.add('collected');
           badge.style.backgroundColor = PRIDE_COLORS.find(c => c.id === colorId).hex;
           badge.style.borderColor = '#ffffff';
           badge.style.boxShadow = `0 0 20px ${badge.style.backgroundColor}`;
        }
      },
      onDialogue: (text, color) => {
        dialogueText.textContent = `"${text}"`;
        dialogueCard.style.borderColor = color;
        dialogueGlow.style.background = `radial-gradient(circle at center, ${color} 0%, transparent 70%)`;
        dialogueOverlay.classList.remove('hidden');
      },
      onCloseDialogue: () => {
        dialogueOverlay.classList.add('hidden');
      },
      onWin: () => {
        generateConfetti();
        winOverlay.classList.remove('hidden');
      },
      onGameOver: () => {
        gameOverOverlay.classList.remove('hidden');
        gameOverOverlay.classList.add('active');
      },
      onStatsChange: (stats) => {
         hudHpText.textContent = `${Math.floor(stats.hp)} / ${stats.maxHp}`;
         hudHpBar.style.width = `${(stats.hp / stats.maxHp) * 100}%`;
         hudLevelText.textContent = `★ Nível ${stats.level}`;
         hudXpText.textContent = `${stats.xp} / ${stats.maxXp} XP`;
         hudXpBar.style.width = `${(stats.xp / stats.maxXp) * 100}%`;
         hudCoinsText.textContent = stats.coins;
      }
    });

    engine.start();
  }

  // Resize Handling
  function resizeCanvas() {
    if(gamePlayContainer) {
      canvas.width = gamePlayContainer.clientWidth;
      canvas.height = gamePlayContainer.clientHeight;
    }
  }
  window.addEventListener('resize', resizeCanvas);

  // Fullscreen
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        gameView.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    });
  }

  // Close Game completely
  if (btnCloseGame) btnCloseGame.addEventListener('click', closeGame);
  if (btnWinClose) btnWinClose.addEventListener('click', closeGame);
  if (btnGameOverClose) btnGameOverClose.addEventListener('click', closeGame);
  if (btnRestart) btnRestart.addEventListener('click', startGame);

  function closeGame() {
    if(engine) {
       engine.stop();
       engine = null;
    }
    audio.stopMusic();
    
    // reset UI
    gameView.classList.add('hidden');
    gameView.classList.remove('active');
    googleView.classList.remove('hidden');
    googleView.classList.add('active');
    startScreen.classList.add('active');
    startScreen.classList.remove('hidden');
    gamePlayContainer.classList.add('hidden');
    winOverlay.classList.add('hidden');
    dialogueOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    gameOverOverlay.classList.remove('active');
    btnFullscreen.style.display = 'none';
    if (document.fullscreenElement) document.exitFullscreen();
    
    // reset badges
    PRIDE_COLORS.forEach(c => {
       const badge = document.getElementById(`badge-${c.id}`);
       if(badge) {
         badge.classList.remove('collected');
         badge.style.backgroundColor = '#1f2937';
         badge.style.borderColor = '#374151';
         badge.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.5)';
       }
    });
  }

  if (btnContinue) {
    btnContinue.addEventListener('click', () => {
      winOverlay.classList.add('hidden');
    });
  }

  // --- Mobile Controls ---
  const joystickBase = document.getElementById('joystickBase');
  const joystickKnob = document.getElementById('joystickKnob');
  const btnAction = document.getElementById('btnAction');
  const maxJoystickDist = 50;
  let isDraggingJoystick = false;

  function handleJoystickMove(clientX, clientY) {
    if(!engine) return;
    if(!joystickBase || !joystickKnob) return;
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
    
    joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    engine.setJoystick(dx / maxJoystickDist, dy / maxJoystickDist);
  }

  if (joystickBase) {
    joystickBase.addEventListener('touchstart', e => {
      isDraggingJoystick = true;
      handleJoystickMove(e.touches[0].clientX, e.touches[0].clientY);
    }, {passive: false});

    joystickBase.addEventListener('touchmove', e => {
      if(isDraggingJoystick) {
        e.preventDefault();
        handleJoystickMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, {passive: false});

    const endTouch = () => {
      isDraggingJoystick = false;
      if (joystickKnob) joystickKnob.style.transform = `translate(-50%, -50%)`;
      if(engine) engine.setJoystick(0, 0);
    };
    joystickBase.addEventListener('touchend', endTouch);
    joystickBase.addEventListener('touchcancel', endTouch);
  }

  if (btnAction) {
    btnAction.addEventListener('touchstart', e => {
      e.preventDefault();
      if(engine) engine.triggerAction();
    }, {passive: false});
    
    btnAction.addEventListener('mousedown', e => {
      e.preventDefault();
      if(engine) engine.triggerAction();
    });
  }

  function generateConfetti() {
    confettiContainer.innerHTML = '';
    const emojis = ['🌸', '✨', '🌈', '🏳️‍🌈', '🏳️‍⚧️', '💖', '🦄'];
    for(let i=0; i<30; i++) {
       const el = document.createElement('div');
       el.className = 'confetti';
       el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
       el.style.left = `${Math.random() * 100}vw`;
       el.style.animationDuration = `${3 + Math.random() * 2}s`;
       el.style.animationDelay = `${Math.random() * 2}s`;
       el.style.color = PRIDE_COLORS[Math.floor(Math.random() * PRIDE_COLORS.length)].hex;
       confettiContainer.appendChild(el);
    }
  }
});
