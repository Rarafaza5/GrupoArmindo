export class AudioSys {
  private ctx: AudioContext | null = null;
  private enabled: boolean = false;

  private musicEnabled: boolean = false;
  private musicInterval: any = null;
  private nextNoteTime: number = 0;
  private beatIndex: number = 0;

  public init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.enabled = true;
  }

  public startMusic() {
    if (!this.enabled || !this.ctx || this.musicEnabled) return;
    this.musicEnabled = true;
    
    // 4-on-the-floor gay club beat loop
    const tempo = 125; // Club tempo
    const secondsPerBeat = 60.0 / tempo;
    
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.beatIndex = 0;
    
    const scheduleNext = () => {
      if (!this.musicEnabled) return;
      while (this.ctx && this.nextNoteTime < this.ctx.currentTime + 0.1) {
        this.scheduleBeat(this.beatIndex, this.nextNoteTime, secondsPerBeat);
        this.nextNoteTime += secondsPerBeat / 4; // Schedule 16th notes
        this.beatIndex++;
      }
      this.musicInterval = setTimeout(scheduleNext, 25);
    };
    
    scheduleNext();
  }

  private scheduleBeat(beatIdx: number, time: number, secondsPerBeat: number) {
    if (!this.ctx) return;
    const isQuarterNote = beatIdx % 4 === 0;
    const step = beatIdx % 16;
    
    const kickVol = 0.3;
    const hihatVol = 0.05;
    const bassVol = 0.15;
    const melodyVol = 0.03;

    // Kick drum
    if (isQuarterNote) {
      const kick = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(150, time);
      kick.frequency.exponentialRampToValueAtTime(0.01, time + 0.1);
      kickGain.gain.setValueAtTime(kickVol, time);
      kickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      kick.connect(kickGain);
      kickGain.connect(this.ctx.destination);
      kick.start(time);
      kick.stop(time + 0.1);
    }
    
    // Offbeat Hi-hat
    if (step % 4 === 2) {
      const hat = this.ctx.createOscillator();
      const hatGain = this.ctx.createGain();
      const bandpass = this.ctx.createBiquadFilter();
      
      bandpass.type = 'highpass';
      bandpass.frequency.value = 5000;
      
      hat.type = 'triangle';
      hat.frequency.setValueAtTime(8000, time);
      hatGain.gain.setValueAtTime(hihatVol, time);
      hatGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
      
      hat.connect(bandpass);
      bandpass.connect(hatGain);
      hatGain.connect(this.ctx.destination);
      hat.start(time);
      hat.stop(time + 0.05);
    }

    // Synth Bass
    const bassRhythm = [0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0];
    if (bassRhythm[step] === 1) {
       const bass = this.ctx.createOscillator();
       const bassGain = this.ctx.createGain();
       const filter = this.ctx.createBiquadFilter();
       
       bass.type = 'sawtooth';
       
       filter.type = 'lowpass';
       filter.frequency.setValueAtTime(800, time);
       filter.frequency.exponentialRampToValueAtTime(100, time + 0.1);
       
       const bassNotes = [55, 55, 65.41, 65.41, 73.42, 73.42, 65.41, 65.41]; // A1, C2, D2, C2
       const cycle = Math.floor(beatIdx / 16) % 8;
       
       bass.frequency.setValueAtTime(bassNotes[cycle], time);
       bassGain.gain.setValueAtTime(bassVol, time);
       bassGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
       
       bass.connect(filter);
       filter.connect(bassGain);
       bassGain.connect(this.ctx.destination);
       bass.start(time);
       bass.stop(time + 0.15);
    }
    
    // Arp / Melody Pluck
    const arpRhythm = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0];
    if (arpRhythm[step] === 1) {
       const arp = this.ctx.createOscillator();
       const arpGain = this.ctx.createGain();
       arp.type = 'square';
       
       const arpNotes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
       const noteIndex = (step + Math.floor(beatIdx / 32)) % 4;
       
       arp.frequency.setValueAtTime(arpNotes[noteIndex], time);
       arpGain.gain.setValueAtTime(melodyVol, time);
       arpGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
       
       arp.connect(arpGain);
       arpGain.connect(this.ctx.destination);
       arp.start(time);
       arp.stop(time + 0.1);
    }
  }

  public stopMusic() {
    this.musicEnabled = false;
    if (this.musicInterval) {
       clearTimeout(this.musicInterval);
       this.musicInterval = null;
    }
  }

  public playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1) {
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

  public playCoin() {
    this.playTone(880, 'sine', 0.1, 0.05);
    setTimeout(() => this.playTone(1200, 'sine', 0.15, 0.05), 50);
  }

  public playDash() {
    this.playTone(150, 'sawtooth', 0.2, 0.02);
  }

  public playColorCollect() {
    const notes = [440, 554, 659, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.3, 0.1), i * 100);
    });
  }

  public playWin() {
    const notes = [440, 493, 554, 587, 659, 739, 830, 880, 1108]; 
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'square', 0.2, 0.08), i * 150);
    });
  }
}

export const audio = new AudioSys();
