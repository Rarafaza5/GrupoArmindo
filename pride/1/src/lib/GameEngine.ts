import { audio } from './audio';
import { PRIDE_COLORS, MAP_SIZE, PRIDE_WORDS, FLAGS } from './constants';

interface StateCallbacks {
  onCollect: (colorId: string) => void;
  onDialogue: (text: string, color: string) => void;
  onCloseDialogue: () => void;
  onWin: () => void;
  onStatsChange: (stats: {level: number, xp: number, maxXp: number, coins: number, hp: number, maxHp: number}) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private running: boolean = false;
  private lastTime: number = 0;
  
  private joystick = { dx: 0, dy: 0 };
  private keys: Record<string, boolean> = {};
  private callbacks: StateCallbacks;

  // Player state
  private player = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 16,
    speed: 700,
    dashSpeed: 1600,
    dashing: false,
    dashTimer: 0,
    trail: [] as {x: number, y: number, r: number, color: string}[],
    hp: 100,
    maxHp: 100,
    level: 1,
    xp: 0,
    maxXp: 100,
    coins: 0,
    lastShootTime: 0,
    shootCooldown: 0.5,
  };

  private camera = { x: 0, y: 0 };
  private shakeTimer: number = 0;
  private shakeIntensity: number = 0;
  
  private combo: number = 0;
  private comboTimer: number = 0;
  
  // Game world
  private collectedColors = new Set<string>();
  private npcs = [
    { id: 'red', text: 'O Vermelho é Vida! O nosso amor resiste. O preconceito não nos calará! (Poder de Fogo)', color: '#E40303', x: 0, y: -2000, collected: false },
    { id: 'orange', text: 'O Laranja é Cura! Curamos as feridas da opressão com solidariedade e orgulho. (Regeneração)', color: '#FF8C00', x: 2000, y: -1000, collected: false },
    { id: 'yellow', text: 'Amarelo é Luz! Saia do armário, brilhe imenso e ofusque os intolerantes! (Dano Duplo)', color: '#FFED00', x: 2000, y: 1000, collected: false },
    { id: 'green', text: 'Verde é Natureza! Ser LGBTQIA+ é natural, diverso e maravilhoso. (Velocidade Extra)', color: '#008026', x: 0, y: 2000, collected: false },
    { id: 'blue', text: 'Azul traz a Serenidade e afasta o ódio de quem quer oprimir nosso afeto. (Escudo Anti-Ódio)', color: '#24408E', x: -2000, y: 1000, collected: false },
    { id: 'purple', text: 'Roxo é o Espírito! O espírito da nossa comunidade é inquebrável. SLAY! (Dash Expandido)', color: '#732982', x: -2000, y: -1000, collected: false },
  ];

  private particles: {x: number, y: number, vx: number, vy: number, life: number, maxLife: number, color: string, r: number}[] = [];
  private coins: {x: number, y: number, active: boolean, bob: number}[] = [];
  private enemySpawnTimer: number = 2; // initial spawn timer
  private enemies: {x: number, y: number, vx: number, vy: number, hp: number, maxHp: number, active: boolean, type: string}[] = [];
  private projectiles: {x: number, y: number, vx: number, vy: number, life: number, active: boolean, color: string, damage: number}[] = [];
  private floatingTexts: {x: number, y: number, text: string, life: number, maxLife: number, color: string}[] = [];
  private flags: {x: number, y: number, type: typeof FLAGS[0], bob: number, angle: number, size: number}[] = [];

  private dialogueActive: boolean = false;

  constructor(canvas: HTMLCanvasElement, callbacks: StateCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    
    // Generate some random ambient coins/stars to collect
    for(let i=0; i<400; i++) {
       this.coins.push({
         x: (Math.random() - 0.5) * MAP_SIZE,
         y: (Math.random() - 0.5) * MAP_SIZE,
         active: true,
         bob: Math.random() * Math.PI * 2
       });
    }

    // Generate flags scattered around
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

    this.bindEvents();
    this.notifyStats();
  }

  private notifyStats() {
    this.callbacks.onStatsChange({
      level: this.player.level,
      xp: this.player.xp,
      maxXp: this.player.maxXp,
      coins: this.player.coins,
      hp: this.player.hp,
      maxHp: this.player.maxHp
    });
  }

  private bindEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  public unbindEvents() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.running = false;
  }

  public setJoystick(dx: number, dy: number) {
    this.joystick.dx = dx;
    this.joystick.dy = dy;
  }

  public triggerAction() {
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

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') {
      this.triggerAction();
    }
  }

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
  }

  public start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  public stop() {
    this.running = false;
  }

  private loop = (time: number) => {
    if (!this.running) return;
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;

    this.update(Math.min(dt, 0.1)); // cap dt
    this.draw(Math.min(dt, 0.1));

    requestAnimationFrame(this.loop);
  }

  private update(dt: number) {
    if (this.dialogueActive) return;

    // Movement
    let dx = this.joystick.dx;
    let dy = this.joystick.dy;
    
    if (Number.isNaN(dx)) dx = 0;
    if (Number.isNaN(dy)) dy = 0;

    if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
    if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) dx += 1;

    const length = Math.sqrt(dx * dx + dy * dy);
    if (length > 0) {
      dx /= length;
      dy /= length;
    }

    // Active Abilities based on collected colors
    if (this.collectedColors.has('orange') && this.player.hp < this.player.maxHp) {
       this.player.hp += 2 * dt; // Regen 2 HP per second
    }
    
    // Green = Speed
    const speedMultiplier = this.collectedColors.has('green') ? 1.5 : 1;
    const currentSpeed = (this.player.dashing ? this.player.dashSpeed : this.player.speed) * speedMultiplier;
    
    // Blue = Defense (handled in collision)
    // Red = Fire rate (handled in auto shoot)
    // Purple = Dash cooldown (handled in dash logic - actually wait, dash is spacebar, we don't have a hard cooldown, but we can make dash duration longer or cost stamina. Right now dash just sets timer. Let's make dash length longer)

    // Smooth velocity
    this.player.vx = this.player.vx * 0.8 + (dx * currentSpeed) * 0.2;
    this.player.vy = this.player.vy * 0.8 + (dy * currentSpeed) * 0.2;

    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    if (Number.isNaN(this.player.x) || !Number.isFinite(this.player.x)) this.player.x = 0;
    if (Number.isNaN(this.player.y) || !Number.isFinite(this.player.y)) this.player.y = 0;

    // Boundaries
    const limit = MAP_SIZE / 2 - this.player.radius;
    this.player.x = Math.max(-limit, Math.min(limit, this.player.x));
    this.player.y = Math.max(-limit, Math.min(limit, this.player.y));

    // Dash logic
    if (this.player.dashing) {
      this.player.dashTimer -= dt;
      if (this.player.dashTimer <= 0) {
        this.player.dashing = false;
      }
    }

    // Trail logic
    if (length > 0 || this.player.dashing) {
       let trailColor = this.getCurrentPlayerColor();
       if (this.player.dashing && this.collectedColors.size > 0) {
          const colors = Array.from(this.collectedColors).map(id => PRIDE_COLORS.find(c => c.id === id)?.hex || '#fff');
          trailColor = colors[Math.floor(Math.random() * colors.length)];
       }
       this.player.trail.unshift({
           x: this.player.x, 
           y: this.player.y, 
           r: this.player.radius * (this.player.dashing ? 1.5 : 1),
           color: trailColor
       });
    }
    if (this.player.trail.length > (this.player.dashing ? 30 : 15)) {
        this.player.trail.pop();
    }
    this.player.trail.forEach(t => t.r *= 0.9); // shrink trail

    // Camera follow
    this.camera.x += (this.player.x - this.camera.x) * 5 * dt;
    this.camera.y += (this.player.y - this.camera.y) * 5 * dt;
    
    if (Number.isNaN(this.camera.x) || !Number.isFinite(this.camera.x)) this.camera.x = this.player.x;
    if (Number.isNaN(this.camera.y) || !Number.isFinite(this.camera.y)) this.camera.y = this.player.y;

    // Screen shake
    if (this.shakeTimer > 0) {
        this.shakeTimer -= dt;
    }
    
    // Combo timer
    if (this.comboTimer > 0) {
       this.comboTimer -= dt;
       if (this.comboTimer <= 0) {
          this.combo = 0;
       }
    }

    // Check Coins
    this.coins.forEach(coin => {
      coin.bob += dt * 5;
      if (!coin.active) return;
      const coinDist = Math.hypot(this.player.x - coin.x, this.player.y - coin.y);
      if (coinDist < 150) { // Magnet effect
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

    // Handle Enemies Spawning
    this.enemySpawnTimer -= dt;
    if (this.enemySpawnTimer <= 0) {
      // Spawn rate gets faster as level increases and more colors are collected
      this.enemySpawnTimer = Math.max(0.2, 2.0 - (this.player.level * 0.1) - (this.collectedColors.size * 0.2));
      
      const angle = Math.random() * Math.PI * 2;
      const dist = 800 + Math.random() * 400; // spawn offscreen
      
      // HP scales with level
      const hp = 30 + (this.player.level * 10);
      
      this.enemies.push({
        x: this.player.x + Math.cos(angle) * dist,
        y: this.player.y + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        hp: hp,
        maxHp: hp,
        active: true,
        type: 'duller'
      });
    }

    // Handle Auto-Shooting
    this.player.lastShootTime += dt;
    const cooldownMultiplier = this.collectedColors.has('red') ? 0.4 : 1; // 2.5x fire rate
    if (this.player.lastShootTime >= this.player.shootCooldown * cooldownMultiplier && this.collectedColors.size > 0 && this.enemies.some(e => e.active)) {
      this.player.lastShootTime = 0;
      // Find closest enemy
      let closest = null;
      let minD = Infinity;
      this.enemies.forEach(e => {
         if (!e.active) return;
         const d = Math.hypot(this.player.x - e.x, this.player.y - e.y);
         if (d < minD && d < 800) {
            minD = d;
            closest = e;
         }
      });
      if (closest) {
         const enemy = closest as any;
         const angle = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
         const speed = 800;
         
         // Yellow gives double damage
         const dmgMultiplier = this.collectedColors.has('yellow') ? 2 : 1;
         
         this.projectiles.push({
           x: this.player.x,
           y: this.player.y,
           vx: Math.cos(angle) * speed,
           vy: Math.sin(angle) * speed,
           life: 1.5,
           active: true,
           color: this.getCurrentPlayerColor(),
           damage: (15 + this.player.level * 2) * dmgMultiplier
         });
         audio.playTone(1200, 'sine', 0.05, 0.03); // light pew
      }
    }

    // Update Projectiles
    this.projectiles.forEach(p => {
       if (!p.active) return;
       p.x += p.vx * dt;
       p.y += p.vy * dt;
       p.life -= dt;
       if (p.life <= 0) p.active = false;

       // Collision with enemies
       this.enemies.forEach(e => {
          if (!e.active || !p.active) return;
          const d = Math.hypot(p.x - e.x, p.y - e.y);
          if (d < 30) { // hit!
             p.active = false;
             e.hp -= p.damage;
             this.spawnExplosion(e.x, e.y, p.color, 10);
             this.spawnFloatingText(e.x, e.y - 10, Math.floor(p.damage).toString(), p.color);
             if (e.hp <= 0) {
                e.active = false;
                this.spawnExplosion(e.x, e.y, p.color, 30); // colorful explosion
                this.triggerShake(0.1, 5);
                
                this.combo++;
                this.comboTimer = 2.0;

                const randomWord = PRIDE_WORDS[Math.floor(Math.random() * PRIDE_WORDS.length)];
                this.spawnFloatingText(e.x, e.y - 30, randomWord, p.color);
                if (this.combo > 1) {
                   this.spawnFloatingText(e.x, e.y - 50, `${this.combo}x COMBO!`, '#FFED00');
                }

                // drop XP/Coin
                this.coins.push({ x: e.x, y: e.y, active: true, bob: Math.random() * Math.PI * 2 });
                this.player.xp += 10 * this.combo;
                this.notifyStats();
             }
          }
       });
    });

    // Update Enemies
    this.enemies.forEach(e => {
       if (!e.active) return;
       const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
       e.vx = Math.cos(angle) * 150;
       e.vy = Math.sin(angle) * 150;
       e.x += e.vx * dt;
       e.y += e.vy * dt;

       // Player collision
       const playerDist = Math.hypot(this.player.x - e.x, this.player.y - e.y);
       if (playerDist < this.player.radius + 15 && !this.player.dashing) {
          // Player takes damage
          e.active = false;
          
          // Blue reduces damage taken by 50%
          const dmgTaken = this.collectedColors.has('blue') ? 5 : 10;
          this.player.hp -= dmgTaken;
          
          this.spawnExplosion(this.player.x, this.player.y, '#E40303', 20);
          this.triggerShake(0.2, 10);
          this.spawnFloatingText(this.player.x, this.player.y - 20, `-${dmgTaken} HP`, '#E40303');
          audio.playTone(200, 'sawtooth', 0.2, 0.1);
          
          this.combo = 0;
          if (this.player.hp <= 0) {
             this.player.hp = 0;
             // Here we could trigger game over, but let's just respawn them at center
             this.player.x = 0;
             this.player.y = 0;
             this.player.hp = this.player.maxHp;
             this.player.coins = Math.floor(this.player.coins / 2);
             this.spawnFloatingText(0, -50, 'REVIVED', '#ffffff');
          }
          this.notifyStats();
       }
    });

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
       const ft = this.floatingTexts[i];
       ft.y -= 30 * dt;
       ft.life -= dt;
       if (ft.life <= 0) {
          this.floatingTexts.splice(i, 1);
       }
    }

    // Check NPCs/Altars
    this.npcs.forEach(npc => {
      if (npc.collected) return;
      const dist = Math.hypot(this.player.x - npc.x, this.player.y - npc.y);
      if (dist < this.player.radius + 50) {
        // Collect!
        npc.collected = true;
        this.collectedColors.add(npc.id);
        this.spawnExplosion(npc.x, npc.y, npc.color, 40);
        this.triggerShake(0.3, 10);
        audio.playColorCollect();
        
        this.dialogueActive = true;
        // Bleed momentum
        this.player.vx = 0;
        this.player.vy = 0;
        
        this.callbacks.onCollect(npc.id);
        this.callbacks.onDialogue(npc.text, npc.color);
      }
    });

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private triggerShake(duration: number, intensity: number) {
      if (this.shakeTimer < duration) {
          this.shakeTimer = duration;
      }
      this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  private getCurrentPlayerColor() {
      const size = this.collectedColors.size;
      if (size === 0) return '#ffffff';
      if (size === 6) {
          // Rainbow cycle if all collected
          const now = performance.now() / 200;
          return `hsl(${now % 360}, 100%, 50%)`;
      }
      // Return the most recently collected color (approx)
      const arr = Array.from(this.collectedColors);
      const lastId = arr[arr.length - 1];
      return PRIDE_COLORS.find(c => c.id === lastId)?.hex || '#ffffff';
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string) {
      this.floatingTexts.push({ x, y, text, life: 1, maxLife: 1, color });
  }

  private spawnExplosion(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
       const angle = Math.random() * Math.PI * 2;
       const speed = Math.random() * 300 + 100;
       this.particles.push({
           x, y,
           vx: Math.cos(angle) * speed,
           vy: Math.sin(angle) * speed,
           life: Math.random() * 0.5 + 0.3,
           maxLife: 0.8,
           color: color === '#ffffff' ? `hsl(${Math.random()*360}, 100%, 70%)` : color,
           r: Math.random() * 5 + 3
       });
    }
  }

  private checkWinCondition() {
      if (this.collectedColors.size === 6) {
         setTimeout(() => {
             audio.playWin();
             this.callbacks.onWin();
             // Giant explosion
             this.triggerShake(1.0, 20);
             this.spawnExplosion(this.player.x, this.player.y, '#ffffff', 200);
         }, 500);
      }
  }

  private draw(dt: number) {
    const { width, height } = this.canvas;
    
    // Clear and draw background
    this.ctx.fillStyle = '#111827'; // Dark background
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.save();
    
    // Screenshake
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTimer > 0) {
        shakeX = (Math.random() - 0.5) * this.shakeIntensity;
        shakeY = (Math.random() - 0.5) * this.shakeIntensity;
    }
    
    // Center camera
    this.ctx.translate(width / 2 - this.camera.x + shakeX, height / 2 - this.camera.y + shakeY);

    // Draw Grid (Floor)
    this.ctx.strokeStyle = `hsl(${(performance.now() / 50) % 360}, 50%, 25%)`;
    this.ctx.lineWidth = 2;
    const gridSpacing = 200;
    const limit = MAP_SIZE / 2;
    
    this.ctx.beginPath();
    for (let x = -limit; x <= limit; x += gridSpacing) {
       this.ctx.moveTo(x, -limit);
       this.ctx.lineTo(x, limit);
    }
    for (let y = -limit; y <= limit; y += gridSpacing) {
       this.ctx.moveTo(-limit, y);
       this.ctx.lineTo(limit, y);
    }
    this.ctx.stroke();

    // Map bounds
    this.ctx.strokeStyle = `hsl(${(performance.now() / 10) % 360}, 100%, 50%)`;
    this.ctx.lineWidth = 15;
    this.ctx.strokeRect(-limit, -limit, MAP_SIZE, MAP_SIZE);

    // Center Stage (Grupo Armindo Float)
    this.ctx.fillStyle = this.collectedColors.size === 6 ? '#ffffff' : '#1f2937';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 150, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#4b5563';
    this.ctx.lineWidth = 4;
    this.ctx.stroke();
    
    // Draw "Grupo Armindo" on the stage
    this.ctx.fillStyle = this.collectedColors.size === 6 ? '#000000' : '#6b7280';
    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GRUPO', 0, -10);
    this.ctx.fillText('ARMINDO', 0, 20);

    // Draw Coins
    this.coins.forEach(coin => {
      if (!coin.active) return;
      this.ctx.fillStyle = `hsl(${(coin.bob * 50) % 360}, 100%, 60%)`;
      this.ctx.beginPath();
      this.ctx.arc(coin.x, coin.y + Math.sin(coin.bob) * 5, 6, 0, Math.PI * 2);
      this.ctx.fill();
      // Glow
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = this.ctx.fillStyle;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    });

    // Draw NPCs/Altars
    this.npcs.forEach(npc => {
      // Base
      this.ctx.fillStyle = npc.collected ? npc.color : '#374151';
      this.ctx.beginPath();
      this.ctx.arc(npc.x, npc.y, 40, 0, Math.PI * 2);
      this.ctx.fill();

      // Aura if not collected
      if (!npc.collected) {
         this.ctx.strokeStyle = npc.color;
         this.ctx.lineWidth = 4;
         this.ctx.beginPath();
         this.ctx.arc(npc.x, npc.y, 50 + Math.sin(performance.now() / 200) * 10, 0, Math.PI * 2);
         this.ctx.stroke();
      }

      // Inner icon
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

    // Draw Projectiles
    this.projectiles.forEach(p => {
       if (!p.active) return;
       
       // Draw a fabulous trail
       const angle = Math.atan2(p.vy, p.vx);
       this.ctx.save();
       this.ctx.translate(p.x, p.y);
       this.ctx.rotate(angle);
       
       this.ctx.fillStyle = p.color;
       this.ctx.beginPath(); // Rainbow-like capsule
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
       
       // Sparkles!
       if (Math.random() < 0.5) {
         this.spawnExplosion(p.x - p.vx * 0.02, p.y - p.vy * 0.02, p.color, 1);
       }
    });

    // Draw Enemies
    this.enemies.forEach(e => {
       if (!e.active) return;
       this.ctx.fillStyle = '#4b5563'; // dull gray
       this.ctx.beginPath();
       this.ctx.arc(e.x, e.y, 18, 0, Math.PI * 2);
       this.ctx.fill();
       
       // Sad face
       this.ctx.strokeStyle = '#1f2937';
       this.ctx.lineWidth = 2;
       this.ctx.beginPath();
       this.ctx.moveTo(e.x - 6, e.y - 3);
       this.ctx.lineTo(e.x - 2, e.y + 1);
       this.ctx.moveTo(e.x + 6, e.y - 3);
       this.ctx.lineTo(e.x + 2, e.y + 1);
       this.ctx.stroke();
       this.ctx.beginPath();
       this.ctx.arc(e.x, e.y + 8, 5, Math.PI, Math.PI * 2); // sad mouth
       this.ctx.stroke();

       // health bar
       this.ctx.fillStyle = '#ef4444';
       this.ctx.fillRect(e.x - 15, e.y - 30, 30, 4);
       this.ctx.fillStyle = '#22c55e';
       this.ctx.fillRect(e.x - 15, e.y - 30, 30 * (e.hp / e.maxHp), 4);
    });

    // Draw Flags (Scenery)
    this.flags.forEach(f => {
       const isFullPride = this.collectedColors.size >= 6;
       // Bobbing logic
       f.bob += dt * 2;
       
       this.ctx.save();
       this.ctx.translate(f.x, f.y + Math.sin(f.bob) * 10);
       this.ctx.rotate(f.angle + Math.sin(f.bob * 0.5) * 0.1);
       
       // Flag pole
       this.ctx.fillStyle = isFullPride ? '#fde047' : '#9ca3af';
       this.ctx.fillRect(-2, 0, 4, f.size * 1.5);
       
       // Flag cloth
       if (isFullPride || this.collectedColors.size >= 2) {
          const stripeHeight = f.size / f.type.colors.length;
          f.type.colors.forEach((color, i) => {
             this.ctx.fillStyle = color;
             this.ctx.beginPath();
             // Wavy flag!
             this.ctx.moveTo(0, i * stripeHeight);
             this.ctx.quadraticCurveTo(f.size * 0.5, i * stripeHeight + Math.sin(f.bob * 2) * 5, f.size, i * stripeHeight);
             this.ctx.lineTo(f.size, (i + 1) * stripeHeight);
             this.ctx.quadraticCurveTo(f.size * 0.5, (i + 1) * stripeHeight + Math.sin(f.bob * 2) * 5, 0, (i + 1) * stripeHeight);
             this.ctx.fill();
          });
       } else {
          // Grey flag until more colors are found
          this.ctx.fillStyle = '#4b5563';
          this.ctx.fillRect(0, 0, f.size, f.size);
       }
       
       this.ctx.restore();
    });

    // Draw Trail
    this.player.trail.forEach((t, i) => {
        this.ctx.fillStyle = t.color;
        this.ctx.globalAlpha = 1 - (i / this.player.trail.length);
        this.ctx.beginPath();
        this.ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;

    // Draw Player
    this.ctx.fillStyle = this.getCurrentPlayerColor();
    
    // Add an outline so the player doesn't blend in
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 3;

    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Player Eyes
    this.ctx.fillStyle = '#000000';
    const eyeOffset = this.player.dashing ? 6 : 4;
    this.ctx.beginPath();
    this.ctx.arc(this.player.x - 5, this.player.y - eyeOffset, 2, 0, Math.PI * 2);
    this.ctx.arc(this.player.x + 5, this.player.y - eyeOffset, 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw Particles
    this.particles.forEach(p => {
       this.ctx.fillStyle = p.color;
       this.ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
       this.ctx.beginPath();
       this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
       this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;

    // Draw Floating Texts
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
