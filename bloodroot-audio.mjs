const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext;

const DEFAULTS = {
  masterVolume: 0.72,
  musicVolume: 0.24,
  sfxVolume: 0.58,
  tempo: 112,
  step: 0.25,
  lookAheadMs: 80,
  scheduleAheadSec: 0.18,
};

const DEFAULT_LOOP = {
  tempo: DEFAULTS.tempo,
  step: DEFAULTS.step,
  eventSteps: 0,
  events: null,
  scale: [0, 3, 5, 7, 10, 12, 15, 17],
  root: 110,
  lead: [12, null, 15, 12, 17, null, 15, 10, 12, null, 19, 17, 15, 12, 10, null],
  bass: [0, null, 0, null, 7, null, 7, null, 5, null, 5, null, 3, null, 10, null],
  pulse: [1, 0, 0, 0.45, 0, 0.35, 0, 0.55, 1, 0, 0.35, 0, 0.65, 0, 0.35, 0],
};

let ctx = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let musicEnabled = true;
let sfxEnabled = true;
let masterVolume = DEFAULTS.masterVolume;
let musicVolume = DEFAULTS.musicVolume;
let sfxVolume = DEFAULTS.sfxVolume;
let musicPlaying = false;
let musicTimer = 0;
let musicStep = 0;
let nextMusicTime = 0;
let musicLoop = { ...DEFAULT_LOOP };
let musicAssetSrc = null;
let musicAssetElement = null;
let musicAssetSource = null;
let musicAssetGain = null;
let musicAssetPauseTimer = 0;
let musicAssetPlaying = false;
const MELEE_SAMPLE_ASSETS = {
  sword: "./assets/audio/sfx/sword-sound.wav",
  melee: "./assets/audio/sfx/melee-sound.wav",
  animal: "./assets/audio/sfx/animal-melee-sound.wav"
};
const meleeSampleBuffers = new Map();
const meleeSamplePromises = new Map();
let meleeSamplesPreloadStarted = false;
let lastMeleeSampleId = null;

function now() {
  return ctx ? ctx.currentTime : 0;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function midiRatio(semitones) {
  return 2 ** (semitones / 12);
}

function ensureAudio() {
  if (!AudioContextCtor) return null;
  if (!ctx) {
    ctx = new AudioContextCtor();
    masterGain = ctx.createGain();
    musicGain = ctx.createGain();
    sfxGain = ctx.createGain();

    masterGain.gain.value = masterVolume;
    musicGain.gain.value = musicEnabled ? musicVolume : 0;
    sfxGain.gain.value = sfxEnabled ? sfxVolume : 0;

    musicGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
  return ctx;
}

function setGain(gain, value, at = now(), ramp = 0.018) {
  if (!gain) return;
  gain.gain.cancelScheduledValues(at);
  gain.gain.setTargetAtTime(clamp01(value), at, ramp);
}

function clearMusicTimer() {
  if (musicTimer) globalThis.clearInterval(musicTimer);
  musicTimer = 0;
}

function generatedFallbackLoop(loop = {}) {
  if (loop.fallbackLoop) return loop.fallbackLoop;
  const { assetSrc, fallbackLoop, ...generatedLoop } = loop;
  return generatedLoop;
}

function updateMusicGains(ramp = 0.035) {
  const at = now();
  setGain(musicGain, musicEnabled && musicPlaying && !musicAssetPlaying ? musicVolume : 0, at, ramp);
  if (musicAssetGain) {
    setGain(musicAssetGain, musicEnabled && musicPlaying && musicAssetPlaying ? musicVolume : 0, at, ramp);
  }
}

function ensureMusicAssetGain() {
  if (!ensureAudio()) return null;
  if (!musicAssetGain) {
    musicAssetGain = ctx.createGain();
    musicAssetGain.gain.value = 0;
    musicAssetGain.connect(masterGain);
  }
  return musicAssetGain;
}

function stopAssetMusic(resetPosition = true) {
  musicAssetPlaying = false;
  if (musicAssetPauseTimer) {
    globalThis.clearTimeout(musicAssetPauseTimer);
    musicAssetPauseTimer = 0;
  }
  if (musicAssetGain) setGain(musicAssetGain, 0, now(), 0.055);
  if (!musicAssetElement) return;
  const element = musicAssetElement;
  musicAssetPauseTimer = globalThis.setTimeout(() => {
    musicAssetPauseTimer = 0;
    if (element !== musicAssetElement) return;
    element.pause();
    if (resetPosition) {
      try {
        element.currentTime = 0;
      } catch {}
    }
  }, 95);
}

function loadMeleeSample(id, src) {
  if (meleeSampleBuffers.has(id) || meleeSamplePromises.has(id) || !globalThis.fetch) return;
  const promise = globalThis.fetch(src)
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${src}`);
      return response.arrayBuffer();
    })
    .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
    .then((buffer) => {
      meleeSampleBuffers.set(id, buffer);
      meleeSamplePromises.delete(id);
      return buffer;
    })
    .catch(() => {
      meleeSamplePromises.delete(id);
      return null;
    });
  meleeSamplePromises.set(id, promise);
}

function preloadMeleeSamples() {
  if (!ensureAudio() || meleeSamplesPreloadStarted) return false;
  meleeSamplesPreloadStarted = true;
  for (const [id, src] of Object.entries(MELEE_SAMPLE_ASSETS)) {
    loadMeleeSample(id, src);
  }
  return true;
}

function meleeSamplePool(family = "sword") {
  if (family === "punching") return ["melee", "animal", "sword", "melee"];
  if (family === "great" || family === "axe") return ["melee", "sword", "animal", "melee"];
  if (family === "dagger" || family === "dual") return ["sword", "animal", "melee", "sword"];
  if (family === "spear") return ["sword", "melee", "animal"];
  return ["sword", "melee", "animal"];
}

function fallbackMeleeSfx(family = "sword") {
  if (family === "punching") return brawlerPunch();
  if (family === "dagger") return knifeSlash();
  return swordSlash();
}

function playDecodedMeleeSample(sampleId, family = "sword") {
  if (!ensureAudio() || !sfxGain) return false;
  const buffer = meleeSampleBuffers.get(sampleId);
  if (!buffer) return false;
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  const at = now();
  const heavy = family === "great" || family === "axe";
  const quick = family === "dagger" || family === "dual";
  const punchy = family === "punching";
  const baseGain = heavy ? 0.68 : punchy ? 0.58 : quick ? 0.46 : 0.52;
  const playbackRate = (heavy ? 0.88 : quick ? 1.06 : 0.98) + (Math.random() - 0.5) * 0.12;

  source.buffer = buffer;
  source.playbackRate.setValueAtTime(Math.max(0.72, playbackRate), at);
  gain.gain.setValueAtTime(Math.max(0.0001, baseGain), at);
  gain.gain.setTargetAtTime(0.0001, at + Math.min(buffer.duration / Math.max(0.72, playbackRate), 0.62), 0.035);
  source.connect(gain);
  gain.connect(sfxGain);
  source.start(at);
  source.stop(at + buffer.duration / Math.max(0.72, playbackRate) + 0.04);
  return true;
}

export function weaponMelee(family = "sword") {
  if (!sfxEnabled) return false;
  preloadMeleeSamples();
  const loadedPool = meleeSamplePool(family).filter((id) => meleeSampleBuffers.has(id));
  if (!loadedPool.length) return fallbackMeleeSfx(family);
  let sampleId = loadedPool[Math.floor(Math.random() * loadedPool.length)];
  if (loadedPool.length > 1 && sampleId === lastMeleeSampleId) {
    sampleId = loadedPool[(loadedPool.indexOf(sampleId) + 1 + Math.floor(Math.random() * (loadedPool.length - 1))) % loadedPool.length];
  }
  lastMeleeSampleId = sampleId;
  return playDecodedMeleeSample(sampleId, family) || fallbackMeleeSfx(family);
}

function startAssetMusic(loop) {
  const src = loop?.assetSrc;
  if (!src) return false;
  const fallbackLoop = generatedFallbackLoop(loop);
  setMusicLoop(fallbackLoop);
  if (!ensureMusicAssetGain() || !globalThis.Audio) return startMusic(fallbackLoop);

  clearMusicTimer();
  if (musicAssetPauseTimer) {
    globalThis.clearTimeout(musicAssetPauseTimer);
    musicAssetPauseTimer = 0;
  }

  if (musicAssetSrc !== src || !musicAssetElement) {
    if (musicAssetElement) musicAssetElement.pause();
    if (musicAssetSource) {
      try {
        musicAssetSource.disconnect();
      } catch {}
      musicAssetSource = null;
    }
    musicAssetSrc = src;
    musicAssetElement = new globalThis.Audio(src);
    musicAssetElement.loop = true;
    musicAssetElement.preload = "auto";
    musicAssetElement.volume = 1;
    musicAssetSource = ctx.createMediaElementSource(musicAssetElement);
    musicAssetSource.connect(musicAssetGain);
  }

  musicPlaying = true;
  musicAssetPlaying = true;
  musicStep = 0;
  nextMusicTime = now() + 0.04;
  try {
    musicAssetElement.currentTime = 0;
  } catch {}
  updateMusicGains(0.05);

  const element = musicAssetElement;
  const playResult = element.play();
  if (playResult?.catch) {
    playResult.catch(() => {
      if (element !== musicAssetElement) return;
      stopAssetMusic(true);
      startMusic(fallbackLoop);
    });
  }
  return true;
}

function envelope(gain, at, peak, attack = 0.006, decay = 0.1, end = 0.001) {
  gain.gain.cancelScheduledValues(at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), at + attack);
  gain.gain.exponentialRampToValueAtTime(end, at + attack + decay);
}

function tone({
  frequency = 220,
  type = "square",
  duration = 0.16,
  peak = 0.28,
  attack = 0.004,
  decay = 0.12,
  destination = sfxGain,
  slideTo = null,
  delay = 0,
  detune = 0,
}) {
  if (!ensureAudio() || !destination) return false;
  const at = now() + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(1, frequency), at);
  osc.detune.setValueAtTime(detune, at);
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), at + duration);
  }

  envelope(gain, at, peak, attack, decay);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(at);
  osc.stop(at + duration + 0.04);
  return true;
}

function noise({
  duration = 0.12,
  peak = 0.22,
  attack = 0.003,
  decay = 0.1,
  destination = sfxGain,
  delay = 0,
  filterType = "bandpass",
  frequency = 900,
  q = 1.2,
}) {
  if (!ensureAudio() || !destination) return false;
  const at = now() + delay;
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }

  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  src.buffer = buffer;
  filter.type = filterType;
  filter.frequency.setValueAtTime(frequency, at);
  filter.Q.setValueAtTime(q, at);
  envelope(gain, at, peak, attack, decay);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  src.start(at);
  src.stop(at + duration + 0.04);
  return true;
}

function playChord(root, intervals, delay = 0, peak = 0.13, duration = 0.24) {
  intervals.forEach((interval, index) => {
    tone({
      frequency: root * midiRatio(interval),
      type: index % 2 ? "triangle" : "square",
      duration,
      peak,
      decay: duration * 0.72,
      destination: sfxGain,
      delay: delay + index * 0.012,
      detune: index * 4,
    });
  });
}

function scheduleMusicEvent(event, at) {
  const delay = Math.max(0, at - now());
  const stepDuration = (60 / (musicLoop.tempo || DEFAULTS.tempo)) * (musicLoop.step || DEFAULTS.step);
  const length = Math.max(1, event.length || 1);
  const duration = Math.max(0.04, length * stepDuration * 0.92);
  const velocity = Math.max(0, event.velocity ?? 0.35);

  if (event.type === "chord") {
    const frequencies = event.frequencies || [];
    frequencies.forEach((frequency, index) => {
      tone({
        frequency,
        type: index % 2 ? "triangle" : "square",
        duration,
        peak: 0.025 * velocity,
        attack: 0.018,
        decay: Math.max(0.12, duration * 0.78),
        destination: musicGain,
        delay: delay + index * 0.007,
        detune: index % 2 ? 4 : -4,
      });
    });
  } else if (event.type === "bass") {
    tone({
      frequency: event.frequency,
      type: "triangle",
      duration,
      peak: 0.07 * velocity,
      attack: 0.01,
      decay: Math.max(0.08, duration * 0.64),
      destination: musicGain,
      delay,
    });
  } else if (event.type === "lead") {
    tone({
      frequency: event.frequency,
      type: "square",
      duration,
      peak: 0.055 * velocity,
      attack: 0.012,
      decay: Math.max(0.08, duration * 0.72),
      destination: musicGain,
      delay,
      detune: event.at % 2 ? 5 : -5,
    });
  } else if (event.type === "percussion") {
    const low = event.sound === "root-thump";
    const brush = event.sound === "moss-brush";
    noise({
      duration: brush ? 0.075 : 0.038,
      peak: (low ? 0.04 : 0.026) * velocity,
      decay: brush ? 0.055 : 0.026,
      destination: musicGain,
      delay,
      filterType: low ? "lowpass" : "bandpass",
      frequency: event.filterHz || (low ? 560 : 3100),
      q: low ? 0.8 : 1.3,
    });
  }
}

function scheduleMusicStep(at) {
  if (musicLoop.eventsByStep) {
    const loopLength = Math.max(1, musicLoop.eventSteps || musicLoop.eventsByStep.length);
    const index = musicStep % loopLength;
    for (const event of musicLoop.eventsByStep[index] || []) scheduleMusicEvent(event, at);
    musicStep += 1;
    return;
  }

  const loopLength = Math.max(musicLoop.lead?.length || 0, musicLoop.bass?.length || 0, musicLoop.pulse?.length || 0, 1);
  const index = musicStep % loopLength;
  const root = musicLoop.root || DEFAULT_LOOP.root;
  const scale = musicLoop.scale || DEFAULT_LOOP.scale;
  const leadNote = musicLoop.lead?.[index];
  const bassNote = musicLoop.bass?.[index];
  const pulse = musicLoop.pulse?.[index] || 0;

  if (leadNote !== null && leadNote !== undefined) {
    const interval = scale[leadNote % scale.length] + 12 * Math.floor(leadNote / scale.length);
    tone({
      frequency: root * midiRatio(interval + 12),
      type: "square",
      duration: 0.12,
      peak: 0.055,
      decay: 0.09,
      destination: musicGain,
      delay: Math.max(0, at - now()),
      detune: index % 2 ? 4 : -4,
    });
  }

  if (bassNote !== null && bassNote !== undefined) {
    const interval = scale[bassNote % scale.length] + 12 * Math.floor(bassNote / scale.length);
    tone({
      frequency: root * midiRatio(interval - 12),
      type: "sawtooth",
      duration: 0.18,
      peak: 0.045,
      decay: 0.14,
      destination: musicGain,
      delay: Math.max(0, at - now()),
    });
  }

  if (pulse > 0) {
    noise({
      duration: 0.035,
      peak: 0.028 * pulse,
      decay: 0.025,
      destination: musicGain,
      delay: Math.max(0, at - now()),
      filterType: "highpass",
      frequency: 2400,
      q: 0.8,
    });
  }

  musicStep += 1;
}

function pumpMusic() {
  if (!ensureAudio() || !musicPlaying) return;
  const secondsPerStep = (60 / (musicLoop.tempo || DEFAULTS.tempo)) * (musicLoop.step || DEFAULTS.step);

  while (nextMusicTime < now() + DEFAULTS.scheduleAheadSec) {
    scheduleMusicStep(nextMusicTime);
    nextMusicTime += secondsPerStep;
  }
}

export function initAudio() {
  const ready = Boolean(ensureAudio());
  if (ready) preloadMeleeSamples();
  return ready;
}

export function installAudioUnlock(target = globalThis.window) {
  if (!target?.addEventListener) return () => {};
  const unlock = () => {
    initAudio();
    target.removeEventListener("pointerdown", unlock);
    target.removeEventListener("touchend", unlock);
    target.removeEventListener("keydown", unlock);
  };

  target.addEventListener("pointerdown", unlock, { once: true, passive: true });
  target.addEventListener("touchend", unlock, { once: true, passive: true });
  target.addEventListener("keydown", unlock, { once: true });

  return () => {
    target.removeEventListener("pointerdown", unlock);
    target.removeEventListener("touchend", unlock);
    target.removeEventListener("keydown", unlock);
  };
}

export function getAudioState() {
  return {
    supported: Boolean(AudioContextCtor),
    initialized: Boolean(ctx),
    contextState: ctx?.state || "none",
    musicPlaying,
    musicAssetPlaying,
    musicAssetSrc,
    musicEnabled,
    sfxEnabled,
    masterVolume,
    musicVolume,
    sfxVolume,
  };
}

export function setMasterVolume(value) {
  masterVolume = clamp01(value);
  ensureAudio();
  setGain(masterGain, masterVolume);
}

export function setMusicVolume(value) {
  musicVolume = clamp01(value);
  ensureAudio();
  updateMusicGains();
}

export function setSfxVolume(value) {
  sfxVolume = clamp01(value);
  ensureAudio();
  setGain(sfxGain, sfxEnabled ? sfxVolume : 0);
}

export function setMusicEnabled(enabled) {
  musicEnabled = Boolean(enabled);
  ensureAudio();
  updateMusicGains(0.035);
}

export function setSfxEnabled(enabled) {
  sfxEnabled = Boolean(enabled);
  ensureAudio();
  setGain(sfxGain, sfxEnabled ? sfxVolume : 0, now(), 0.02);
}

export function setMusicLoop(loop = {}) {
  const events = Array.isArray(loop.events) ? loop.events : null;
  const eventSteps = events ? Math.max(1, loop.eventSteps || Math.ceil(Math.max(...events.map((event) => event.at + (event.length || 1)), 1))) : 0;
  const eventsByStep = events ? Array.from({ length: eventSteps }, () => []) : null;
  if (eventsByStep) {
    for (const event of events) {
      const step = ((Math.floor(event.at) % eventSteps) + eventSteps) % eventSteps;
      eventsByStep[step].push(event);
    }
  }

  musicLoop = {
    ...DEFAULT_LOOP,
    ...loop,
    lead: loop.lead || DEFAULT_LOOP.lead,
    bass: loop.bass || DEFAULT_LOOP.bass,
    pulse: loop.pulse || DEFAULT_LOOP.pulse,
    scale: loop.scale || DEFAULT_LOOP.scale,
    events,
    eventSteps,
    eventsByStep,
  };
  musicStep = 0;
}

export function startMusic(loop = null) {
  if (loop?.assetSrc) return startAssetMusic(loop);
  if (loop) setMusicLoop(loop);
  if (!ensureAudio()) return false;
  stopAssetMusic(true);
  musicPlaying = true;
  musicAssetPlaying = false;
  musicStep = 0;
  nextMusicTime = now() + 0.04;
  updateMusicGains(0.05);
  clearMusicTimer();
  musicTimer = globalThis.setInterval(pumpMusic, DEFAULTS.lookAheadMs);
  pumpMusic();
  return true;
}

export function stopMusic() {
  musicPlaying = false;
  clearMusicTimer();
  if (musicGain) setGain(musicGain, 0, now(), 0.055);
  stopAssetMusic(true);
}

export function attack() {
  if (!sfxEnabled) return false;
  knifeSlash();
  return true;
}

export function knifeSlash() {
  if (!sfxEnabled) return false;
  tone({ frequency: 680, slideTo: 210, type: "sawtooth", duration: 0.105, peak: 0.34, decay: 0.07 });
  tone({ frequency: 1180, slideTo: 760, type: "square", duration: 0.065, peak: 0.08, decay: 0.045, delay: 0.012 });
  noise({ duration: 0.045, peak: 0.14, decay: 0.032, filterType: "highpass", frequency: 2200, q: 1.4 });
  return true;
}

export function swordSlash() {
  if (!sfxEnabled) return false;
  tone({ frequency: 410, slideTo: 118, type: "sawtooth", duration: 0.17, peak: 0.31, decay: 0.12 });
  tone({ frequency: 720, slideTo: 510, type: "triangle", duration: 0.16, peak: 0.11, attack: 0.006, decay: 0.1, delay: 0.03 });
  noise({ duration: 0.07, peak: 0.13, decay: 0.052, filterType: "bandpass", frequency: 1250, q: 1.05 });
  return true;
}

export function brawlerPunch() {
  if (!sfxEnabled) return false;
  tone({ frequency: 130, slideTo: 82, type: "triangle", duration: 0.105, peak: 0.34, decay: 0.065 });
  noise({ duration: 0.055, peak: 0.18, decay: 0.036, filterType: "lowpass", frequency: 780, q: 0.9 });
  noise({ duration: 0.026, peak: 0.1, decay: 0.018, filterType: "highpass", frequency: 3100, q: 1.2, delay: 0.018 });
  return true;
}

export function bowRelease() {
  if (!sfxEnabled) return false;
  tone({ frequency: 740, slideTo: 370, type: "triangle", duration: 0.14, peak: 0.2, attack: 0.002, decay: 0.09 });
  tone({ frequency: 185, slideTo: 155, type: "square", duration: 0.12, peak: 0.07, decay: 0.08, delay: 0.01 });
  noise({ duration: 0.06, peak: 0.09, decay: 0.043, filterType: "highpass", frequency: 3300, q: 0.7, delay: 0.018 });
  return true;
}

export function staffCast() {
  if (!sfxEnabled) return false;
  playChord(196, [0, 7, 12], 0, 0.075, 0.22);
  tone({ frequency: 260, slideTo: 880, type: "sawtooth", duration: 0.22, peak: 0.15, attack: 0.012, decay: 0.16 });
  noise({ duration: 0.11, peak: 0.11, decay: 0.082, filterType: "bandpass", frequency: 2800, q: 2.4, delay: 0.035 });
  return true;
}

export function hit() {
  if (!sfxEnabled) return false;
  tone({ frequency: 180, slideTo: 92, type: "square", duration: 0.16, peak: 0.31, decay: 0.12 });
  noise({ duration: 0.09, peak: 0.17, decay: 0.065, frequency: 620, q: 1.1 });
  return true;
}

export function kill() {
  if (!sfxEnabled) return false;
  tone({ frequency: 360, slideTo: 72, type: "sawtooth", duration: 0.32, peak: 0.3, decay: 0.24 });
  tone({ frequency: 720, slideTo: 110, type: "square", duration: 0.26, peak: 0.15, decay: 0.2, delay: 0.018 });
  noise({ duration: 0.18, peak: 0.16, decay: 0.15, filterType: "lowpass", frequency: 950, q: 0.7 });
  return true;
}

export function jump() {
  if (!sfxEnabled) return false;
  tone({ frequency: 220, slideTo: 520, type: "triangle", duration: 0.14, peak: 0.22, decay: 0.095 });
  return true;
}

export function dodge() {
  if (!sfxEnabled) return false;
  noise({ duration: 0.08, peak: 0.16, decay: 0.055, filterType: "highpass", frequency: 1900, q: 0.9 });
  tone({ frequency: 340, slideTo: 240, type: "triangle", duration: 0.08, peak: 0.08, decay: 0.045 });
  return true;
}

export function land() {
  if (!sfxEnabled) return false;
  tone({ frequency: 120, slideTo: 88, type: "triangle", duration: 0.09, peak: 0.16, decay: 0.06 });
  noise({ duration: 0.055, peak: 0.1, decay: 0.04, filterType: "lowpass", frequency: 720, q: 0.8 });
  return true;
}

export function interact() {
  if (!sfxEnabled) return false;
  tone({ frequency: 420, type: "sine", duration: 0.08, peak: 0.16, decay: 0.055 });
  tone({ frequency: 630, type: "sine", duration: 0.08, peak: 0.13, decay: 0.055, delay: 0.055 });
  return true;
}

export function pickup() {
  if (!sfxEnabled) return false;
  tone({ frequency: 560, type: "square", duration: 0.075, peak: 0.18, decay: 0.05 });
  tone({ frequency: 840, type: "square", duration: 0.095, peak: 0.16, decay: 0.065, delay: 0.055 });
  return true;
}

export function levelUp() {
  if (!sfxEnabled) return false;
  const notes = [0, 3, 5, 7, 10, 12];
  notes.forEach((interval, index) => {
    tone({
      frequency: 330 * midiRatio(interval),
      type: index % 2 ? "triangle" : "square",
      duration: 0.18,
      peak: Math.max(0.055, 0.16 - index * 0.012),
      attack: 0.004,
      decay: 0.12,
      delay: index * 0.055,
      detune: index % 2 ? 5 : -5
    });
  });
  playChord(220, [0, 7, 12, 15], 0.28, 0.09, 0.38);
  noise({ duration: 0.12, peak: 0.08, decay: 0.09, filterType: "highpass", frequency: 3600, q: 1.2, delay: 0.18 });
  return true;
}

export function chest() {
  if (!sfxEnabled) return false;
  playChord(220, [0, 4, 7, 12], 0, 0.13, 0.36);
  tone({ frequency: 880, type: "triangle", duration: 0.18, peak: 0.12, decay: 0.12, delay: 0.11 });
  return true;
}

export function knifeBreak() {
  if (!sfxEnabled) return false;
  noise({ duration: 0.18, peak: 0.24, decay: 0.12, filterType: "highpass", frequency: 2700, q: 2.2 });
  tone({ frequency: 980, slideTo: 260, type: "square", duration: 0.15, peak: 0.2, decay: 0.11 });
  tone({ frequency: 1320, slideTo: 420, type: "square", duration: 0.13, peak: 0.13, decay: 0.09, delay: 0.035 });
  return true;
}

export function ability() {
  if (!sfxEnabled) return false;
  playChord(165, [0, 7, 10, 15], 0, 0.12, 0.28);
  tone({ frequency: 330, slideTo: 990, type: "sawtooth", duration: 0.26, peak: 0.12, decay: 0.18 });
  return true;
}

export function brawlerRoar() {
  if (!sfxEnabled) return false;
  tone({ frequency: 118, slideTo: 70, type: "sawtooth", duration: 0.42, peak: 0.31, attack: 0.014, decay: 0.32 });
  tone({ frequency: 59, slideTo: 47, type: "triangle", duration: 0.48, peak: 0.2, attack: 0.018, decay: 0.38 });
  noise({ duration: 0.26, peak: 0.19, attack: 0.012, decay: 0.2, filterType: "lowpass", frequency: 560, q: 1.35 });
  tone({ frequency: 235, slideTo: 150, type: "square", duration: 0.18, peak: 0.08, decay: 0.12, delay: 0.045 });
  return true;
}

export function elfPiercingShot() {
  if (!sfxEnabled) return false;
  bowRelease();
  tone({ frequency: 1120, slideTo: 1660, type: "square", duration: 0.11, peak: 0.13, attack: 0.002, decay: 0.075, delay: 0.025 });
  noise({ duration: 0.12, peak: 0.1, decay: 0.085, filterType: "highpass", frequency: 4200, q: 1.1, delay: 0.028 });
  tone({ frequency: 560, type: "triangle", duration: 0.07, peak: 0.06, decay: 0.045, delay: 0.09 });
  return true;
}

export function apprenticeArcaneVolley() {
  if (!sfxEnabled) return false;
  playChord(130.81, [0, 3, 7, 10], 0, 0.09, 0.34);
  tone({ frequency: 196, slideTo: 784, type: "sawtooth", duration: 0.32, peak: 0.18, attack: 0.018, decay: 0.24 });
  for (let i = 0; i < 5; i += 1) {
    tone({
      frequency: 520 + i * 95,
      slideTo: 740 + i * 120,
      type: i % 2 ? "triangle" : "square",
      duration: 0.13,
      peak: 0.055,
      attack: 0.003,
      decay: 0.09,
      delay: 0.045 + i * 0.028,
      detune: i % 2 ? 6 : -6
    });
  }
  noise({ duration: 0.18, peak: 0.11, attack: 0.012, decay: 0.14, filterType: "bandpass", frequency: 3150, q: 2.6, delay: 0.04 });
  return true;
}

export function rootboundThornGrab() {
  if (!sfxEnabled) return false;
  tone({ frequency: 154, slideTo: 96, type: "triangle", duration: 0.18, peak: 0.16, attack: 0.004, decay: 0.13 });
  tone({ frequency: 392, slideTo: 185, type: "square", duration: 0.22, peak: 0.11, attack: 0.006, decay: 0.17, delay: 0.025 });
  noise({ duration: 0.18, peak: 0.12, attack: 0.006, decay: 0.13, filterType: "bandpass", frequency: 1150, q: 1.9, delay: 0.02 });
  return true;
}

export function frenziedGroundSlamJump() {
  if (!sfxEnabled) return false;
  tone({ frequency: 86, slideTo: 44, type: "sawtooth", duration: 0.32, peak: 0.28, attack: 0.004, decay: 0.24 });
  tone({ frequency: 172, slideTo: 68, type: "square", duration: 0.2, peak: 0.13, attack: 0.004, decay: 0.15, delay: 0.035 });
  noise({ duration: 0.24, peak: 0.18, attack: 0.005, decay: 0.18, filterType: "lowpass", frequency: 520, q: 1.3, delay: 0.045 });
  return true;
}

export function hollowUnstableBlast() {
  if (!sfxEnabled) return false;
  playChord(110, [0, 3, 6, 10], 0, 0.08, 0.26);
  tone({ frequency: 220, slideTo: 660, type: "sawtooth", duration: 0.24, peak: 0.14, attack: 0.014, decay: 0.18 });
  noise({ duration: 0.17, peak: 0.12, attack: 0.008, decay: 0.12, filterType: "bandpass", frequency: 2600, q: 2.4, delay: 0.035 });
  return true;
}

export const weaponKnife = knifeSlash;
export const weaponBrokenKnife = knifeSlash;
export const weaponSword = swordSlash;
export const weaponBrawler = brawlerPunch;
export const weaponBow = bowRelease;
export const weaponStaff = staffCast;
export const abilityRoar = brawlerRoar;
export const abilityPiercingShot = elfPiercingShot;
export const abilityArcaneVolley = apprenticeArcaneVolley;
export const abilityThornGrab = rootboundThornGrab;
export const abilityGroundSlamJump = frenziedGroundSlamJump;
export const abilityUnstableBlast = hollowUnstableBlast;

export function thud() {
  if (!sfxEnabled) return false;
  tone({ frequency: 72, slideTo: 43, type: "triangle", duration: 0.48, peak: 0.34, attack: 0.004, decay: 0.34 });
  tone({ frequency: 118, slideTo: 62, type: "sawtooth", duration: 0.28, peak: 0.18, attack: 0.003, decay: 0.22, delay: 0.018 });
  noise({ duration: 0.32, peak: 0.2, attack: 0.004, decay: 0.24, filterType: "lowpass", frequency: 360, q: 1.1, delay: 0.012 });
  return true;
}

export function boss() {
  if (!sfxEnabled) return false;
  tone({ frequency: 82, slideTo: 55, type: "sawtooth", duration: 0.55, peak: 0.36, decay: 0.42 });
  tone({ frequency: 123, slideTo: 74, type: "square", duration: 0.5, peak: 0.18, decay: 0.38, delay: 0.025 });
  noise({ duration: 0.34, peak: 0.17, decay: 0.28, filterType: "lowpass", frequency: 520, q: 1.4, delay: 0.04 });
  return true;
}

export function bossVictory() {
  if (!sfxEnabled) return false;
  noise({ duration: 0.24, peak: 0.18, attack: 0.004, decay: 0.18, filterType: "lowpass", frequency: 780, q: 1.2 });
  tone({ frequency: 82, slideTo: 41, type: "sawtooth", duration: 0.34, peak: 0.26, attack: 0.006, decay: 0.24 });
  tone({ frequency: 196, type: "square", duration: 0.16, peak: 0.11, attack: 0.004, decay: 0.12, delay: 0.12 });
  tone({ frequency: 247, type: "triangle", duration: 0.18, peak: 0.1, attack: 0.004, decay: 0.13, delay: 0.2 });
  tone({ frequency: 330, type: "square", duration: 0.24, peak: 0.12, attack: 0.004, decay: 0.18, delay: 0.3 });
  playChord(196, [0, 7, 12], 0.36, 0.1, 0.42);
  return true;
}

export const sfx = {
  attack,
  knifeSlash,
  swordSlash,
  brawlerPunch,
  bowRelease,
  staffCast,
  weaponKnife,
  weaponBrokenKnife,
  weaponSword,
  weaponBrawler,
  weaponMelee,
  weaponBow,
  weaponStaff,
  hit,
  kill,
  jump,
  dodge,
  land,
  interact,
  pickup,
  levelUp,
  chest,
  knifeBreak,
  ability,
  brawlerRoar,
  elfPiercingShot,
  apprenticeArcaneVolley,
  rootboundThornGrab,
  frenziedGroundSlamJump,
  hollowUnstableBlast,
  abilityRoar,
  abilityPiercingShot,
  abilityArcaneVolley,
  abilityThornGrab,
  abilityGroundSlamJump,
  abilityUnstableBlast,
  thud,
  boss,
  bossVictory,
};

export default {
  initAudio,
  installAudioUnlock,
  getAudioState,
  setMasterVolume,
  setMusicVolume,
  setSfxVolume,
  setMusicEnabled,
  setSfxEnabled,
  setMusicLoop,
  startMusic,
  stopMusic,
  sfx,
  attack,
  knifeSlash,
  swordSlash,
  brawlerPunch,
  bowRelease,
  staffCast,
  weaponKnife,
  weaponBrokenKnife,
  weaponSword,
  weaponBrawler,
  weaponMelee,
  weaponBow,
  weaponStaff,
  hit,
  kill,
  jump,
  dodge,
  land,
  interact,
  pickup,
  levelUp,
  chest,
  knifeBreak,
  ability,
  brawlerRoar,
  elfPiercingShot,
  apprenticeArcaneVolley,
  rootboundThornGrab,
  frenziedGroundSlamJump,
  hollowUnstableBlast,
  abilityRoar,
  abilityPiercingShot,
  abilityArcaneVolley,
  abilityThornGrab,
  abilityGroundSlamJump,
  abilityUnstableBlast,
  thud,
  boss,
  bossVictory,
};
