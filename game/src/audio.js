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
  // The music: a step sequencer that starts with the first unlock and
  // never stops — a sub-bass pulse, a minor arpeggio that climbs an
  // octave as intensity rises, and noise hats on the off-steps.
  let musicTimer = null;
  let musicStep = 0;
  let intensity = 0.2;

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

  // A minor, because the dark is minor: A C D E G across two octaves.
  const ARP = [220, 261.63, 329.63, 392, 440, 523.25, 659.25, 783.99];
  const BASS = [55, 55, 65.41, 49];

  function musicTick() {
    if (muted || context === null) return;
    const step = musicStep;
    musicStep += 1;
    if (step % 8 === 0) tone(BASS[(step / 8) % 4], BASS[(step / 8) % 4], 0.5, 'sine', 0.30);
    if (step % 2 === 0) {
      const climb = Math.floor(intensity * 4);
      const note = ARP[(step / 2 + climb * 2) % ARP.length];
      tone(note, note, 0.16, 'triangle', 0.05 + intensity * 0.05);
    }
    if (intensity > 0.45 && step % 4 === 2) noise(0.03, 0.05, 6000);
    if (intensity > 0.75 && step % 2 === 1) tone(ARP[(step * 3) % ARP.length] * 2, ARP[(step * 3) % ARP.length] * 2, 0.08, 'sine', 0.03);
  }

  function startMusic() {
    if (musicTimer !== null || context === null) return;
    musicTimer = setInterval(musicTick, 205);
  }

  return {
    unlock() {
      if (ensure() && context.state === 'suspended') void context.resume();
      startMusic();
    },
    setIntensity(value) {
      intensity = Math.max(0, Math.min(1, value));
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
    corePickup() {
      // A stolen skill announces itself: three rising notes, quick.
      tone(660, 660, 0.09, 'sine', 0.18);
      setTimeout(() => tone(880, 880, 0.09, 'sine', 0.18), 70);
      setTimeout(() => tone(1320, 1560, 0.14, 'sine', 0.2), 140);
    },
    nova() {
      noise(0.5, 0.5, 800);
      tone(140, 36, 0.5, 'sawtooth', 0.24);
    },
    starfall() {
      noise(0.8, 0.6, 1100);
      tone(90, 30, 0.8, 'sawtooth', 0.3);
      setTimeout(() => tone(1180, 1560, 0.3, 'sine', 0.14), 120);
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
