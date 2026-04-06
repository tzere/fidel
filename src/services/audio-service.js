export class AudioService {
  constructor() {
    this.audioMap = {};
    this.currentAudio = null;
  }

  async loadAudioMap() {
    const response = await fetch('sounds.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load sounds.json');

    const payload = await response.json();
    const rawMap = payload.symbols && typeof payload.symbols === 'object' ? payload.symbols : payload;
    this.audioMap = Object.fromEntries(
      Object.entries(rawMap).filter(([, value]) => typeof value === 'string' && value.trim())
    );

    return this.audioMap;
  }

  hasAudio(symbol) {
    return typeof this.audioMap[symbol] === 'string' && this.audioMap[symbol].trim().length > 0;
  }

  stop() {
    if (!this.currentAudio) return;
    try {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    } catch {
      // Ignore playback cleanup failures.
    }
    this.currentAudio = null;
  }

  async playSource(path) {
    this.stop();
    const audio = new Audio(path);
    this.currentAudio = audio;
    await audio.play();
    return path;
  }

  async playSymbol(symbol) {
    if (!this.hasAudio(symbol)) {
      throw new Error('No audio file is available for this symbol yet.');
    }

    return this.playSource(this.audioMap[symbol]);
  }

  async playVariantUnlock() {
    try {
      await this.playSource('audio/variant-unlock.mp3');
    } catch {
      // Celebration audio should not block progression.
    }
  }

  async playFinalCelebration() {
    try {
      await this.playSource('audio/final-celebration.mp3');
    } catch {
      // Celebration audio should not block progression.
    }
  }

  speak(text, options = {}) {
    if (!('speechSynthesis' in window) || !text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate ?? 0.92;
    utterance.pitch = options.pitch ?? 1.02;
    utterance.lang = options.lang ?? 'ti-ER';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  playSuccessTone() {
    try {
      const AudioContextRef = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextRef) return;
      const context = new AudioContextRef();
      const now = context.currentTime;
      [392, 523.25, 659.25].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(frequency, now + index * 0.08);
        gain.gain.setValueAtTime(0.0001, now + index * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.1, now + index * 0.08 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.22);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now + index * 0.08);
        oscillator.stop(now + index * 0.08 + 0.24);
      });
    } catch {
      // Ignore synthesis failures.
    }
  }
}
