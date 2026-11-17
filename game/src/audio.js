// audio.js — every sound in the game is synthesised with WebAudio.
//
// There are no audio files: a shot is a falling square blip, a pickup is
// a rising sine chime, an explosion is filtered noise. The context is
// created lazily on the first user gesture (browsers refuse it sooner),
// and the whole module stays silent until then. M toggles a mute flag
// the game persists in memory only.

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context !== null) return true;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (Ctor === undefined) return false;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = 0.35;
    master.connect(context.destination);
    return true;
  }

  function tone(freqFrom, freqTo, seconds, type, volume) {
    if (muted || !ensure()) return;
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqTo), now + seconds);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + seconds);
  }

  function noise(seconds, volume, cutoff) {
    if (muted || !ensure()) return;
    const now = context.currentTime;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
  }

  return {
    unlock() {
      if (ensure() && context.state === 'suspended') void context.resume();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      tone(880, 220, 0.09, 'square', 0.10);
    },
    enemyHit() {
      tone(300, 180, 0.05, 'triangle', 0.12);
    },
    explosion(big) {
      noise(big ? 0.45 : 0.25, big ? 0.5 : 0.3, big ? 900 : 1400);
      tone(big ? 160 : 220, 40, big ? 0.4 : 0.22, 'sawtooth', 0.16);
    },
    pickup(combo) {
      const base = 520 + Math.min(combo, 10) * 40;
      tone(base, base * 1.5, 0.12, 'sine', 0.18);
    },
    playerHurt() {
      tone(200, 60, 0.3, 'sawtooth', 0.3);
      noise(0.2, 0.25, 700);
    },
    dash() {
      noise(0.16, 0.16, 2600);
    },
    upgrade() {
      tone(440, 440, 0.1, 'sine', 0.16);
      setTimeout(() => tone(660, 660, 0.1, 'sine', 0.16), 90);
      setTimeout(() => tone(880, 990, 0.16, 'sine', 0.18), 180);
    },
    waveStart() {
      tone(330, 495, 0.14, 'triangle', 0.18);
    },
    gameOver() {
      tone(392, 392, 0.18, 'triangle', 0.2);
      setTimeout(() => tone(330, 330, 0.18, 'triangle', 0.2), 170);
      setTimeout(() => tone(262, 196, 0.34, 'triangle', 0.22), 340);
    },
  };
}
