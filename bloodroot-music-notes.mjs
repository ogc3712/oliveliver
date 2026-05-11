const STEPS_PER_BAR = 16;
const NOTE_NAMES = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

export const bloodrootMusicLoop = {
  title: "Sun Through the Old Root",
  mood: "quiet ominous moss-ruin chiptune",
  tempo: 86,
  swing: 0.04,
  key: "D dorian",
  bars: 8,
  stepsPerBar: STEPS_PER_BAR,
  loopBeats: 32,
  mix: {
    master: 0.42,
    chords: 0.22,
    bass: 0.28,
    lead: 0.18,
    percussion: 0.16,
  },
  instruments: {
    chords: {
      wave: "soft-square",
      octave: 4,
      attack: 0.035,
      release: 0.9,
      filterHz: 1450,
      detuneCents: -5,
    },
    bass: {
      wave: "triangle",
      octave: 2,
      attack: 0.012,
      release: 0.18,
      filterHz: 620,
    },
    lead: {
      wave: "hollow-pulse",
      octave: 5,
      attack: 0.02,
      release: 0.34,
      filterHz: 2100,
      delay: { time: 0.375, feedback: 0.18, mix: 0.16 },
    },
    percussion: {
      source: "noise",
      attack: 0.004,
      release: 0.09,
      filterHz: 3600,
    },
  },
  progression: [
    { bar: 0, name: "Dm(add9)", notes: ["D3", "F3", "A3", "E4"], length: 16 },
    { bar: 1, name: "C6", notes: ["C3", "E3", "G3", "A3"], length: 16 },
    { bar: 2, name: "Gm9", notes: ["G2", "Bb2", "D3", "A3"], length: 16 },
    { bar: 3, name: "Am7sus4", notes: ["A2", "D3", "G3", "C4"], length: 16 },
    { bar: 4, name: "Dm(add9)", notes: ["D3", "F3", "A3", "E4"], length: 16 },
    { bar: 5, name: "Fmaj7/A", notes: ["A2", "F3", "C4", "E4"], length: 16 },
    { bar: 6, name: "Gm6", notes: ["G2", "Bb2", "D3", "E3"], length: 16 },
    { bar: 7, name: "A7sus4", notes: ["A2", "D3", "G3", "A3"], length: 16 },
  ],
  chordRhythm: [
    { step: 0, length: 5, velocity: 0.58 },
    { step: 7, length: 3, velocity: 0.28 },
    { step: 12, length: 4, velocity: 0.34 },
  ],
  bassPattern: [
    { step: 0, degree: 0, octave: 2, length: 2, velocity: 0.72 },
    { step: 3, degree: 0, octave: 2, length: 1, velocity: 0.34 },
    { step: 6, degree: 2, octave: 2, length: 2, velocity: 0.44 },
    { step: 10, degree: 0, octave: 1, length: 2, velocity: 0.52 },
    { step: 14, degree: 1, octave: 2, length: 1, velocity: 0.3 },
  ],
  leadMotif: [
    { bar: 0, step: 2, note: "A4", length: 2, velocity: 0.34 },
    { bar: 0, step: 5, note: "C5", length: 1, velocity: 0.28 },
    { bar: 0, step: 8, note: "D5", length: 3, velocity: 0.4 },
    { bar: 1, step: 3, note: "E5", length: 1, velocity: 0.26 },
    { bar: 1, step: 6, note: "D5", length: 2, velocity: 0.32 },
    { bar: 1, step: 11, note: "A4", length: 3, velocity: 0.24 },
    { bar: 2, step: 1, note: "G4", length: 2, velocity: 0.28 },
    { bar: 2, step: 4, note: "A4", length: 1, velocity: 0.25 },
    { bar: 2, step: 9, note: "D5", length: 2, velocity: 0.34 },
    { bar: 3, step: 6, note: "C5", length: 2, velocity: 0.28 },
    { bar: 3, step: 12, note: "E4", length: 4, velocity: 0.22 },
    { bar: 4, step: 2, note: "A4", length: 2, velocity: 0.32 },
    { bar: 4, step: 7, note: "F5", length: 1, velocity: 0.22 },
    { bar: 4, step: 10, note: "E5", length: 2, velocity: 0.3 },
    { bar: 5, step: 3, note: "C5", length: 2, velocity: 0.28 },
    { bar: 5, step: 9, note: "A4", length: 3, velocity: 0.24 },
    { bar: 6, step: 0, note: "Bb4", length: 2, velocity: 0.25 },
    { bar: 6, step: 4, note: "D5", length: 2, velocity: 0.32 },
    { bar: 6, step: 13, note: "E5", length: 1, velocity: 0.2 },
    { bar: 7, step: 2, note: "D5", length: 2, velocity: 0.28 },
    { bar: 7, step: 8, note: "C5", length: 2, velocity: 0.24 },
    { bar: 7, step: 14, note: "A4", length: 2, velocity: 0.18 },
  ],
  percussionPattern: [
    { step: 0, sound: "root-thump", length: 1, velocity: 0.34, filterHz: 520 },
    { step: 4, sound: "leaf-tick", length: 1, velocity: 0.16, filterHz: 4200 },
    { step: 6, sound: "stone-click", length: 1, velocity: 0.11, filterHz: 2800 },
    { step: 8, sound: "root-thump", length: 1, velocity: 0.22, filterHz: 580 },
    { step: 10, sound: "leaf-tick", length: 1, velocity: 0.13, filterHz: 3900 },
    { step: 12, sound: "moss-brush", length: 2, velocity: 0.18, filterHz: 2200 },
    { step: 15, sound: "stone-click", length: 1, velocity: 0.1, filterHz: 3100 },
  ],
};

export const bloodrootBossMusicLoop = {
  title: "Huge Root Heartbeat",
  mood: "urgent retro boss chiptune with root-thump drums",
  tempo: 124,
  swing: 0.015,
  key: "D phrygian",
  bars: 8,
  stepsPerBar: STEPS_PER_BAR,
  loopBeats: 32,
  mix: {
    master: 0.52,
    chords: 0.24,
    bass: 0.38,
    lead: 0.28,
    percussion: 0.34,
  },
  instruments: {
    chords: {
      wave: "square",
      octave: 3,
      attack: 0.018,
      release: 0.34,
      filterHz: 980,
      detuneCents: -9,
    },
    bass: {
      wave: "triangle",
      octave: 1,
      attack: 0.006,
      release: 0.14,
      filterHz: 480,
    },
    lead: {
      wave: "square",
      octave: 5,
      attack: 0.008,
      release: 0.18,
      filterHz: 2500,
      delay: { time: 0.25, feedback: 0.14, mix: 0.12 },
    },
    percussion: {
      source: "noise",
      attack: 0.002,
      release: 0.055,
      filterHz: 4200,
    },
  },
  progression: [
    { bar: 0, name: "Dm(b9)", notes: ["D2", "F2", "A2", "Eb3"], length: 16 },
    { bar: 1, name: "Eb5/D", notes: ["D2", "Eb2", "Bb2", "Eb3"], length: 16 },
    { bar: 2, name: "Cdim/D", notes: ["D2", "C3", "Eb3", "Gb3"], length: 16 },
    { bar: 3, name: "A7b9", notes: ["A1", "C#2", "G2", "Bb2"], length: 16 },
    { bar: 4, name: "Dm(b9)", notes: ["D2", "F2", "A2", "Eb3"], length: 16 },
    { bar: 5, name: "Bb/D", notes: ["D2", "F2", "Bb2", "D3"], length: 16 },
    { bar: 6, name: "Gm(addb9)", notes: ["G1", "Bb2", "D3", "Ab3"], length: 16 },
    { bar: 7, name: "A7sus(b9)", notes: ["A1", "D2", "G2", "Bb2"], length: 16 },
  ],
  chordRhythm: [
    { step: 0, length: 3, velocity: 0.46 },
    { step: 5, length: 2, velocity: 0.28 },
    { step: 8, length: 3, velocity: 0.5 },
    { step: 13, length: 2, velocity: 0.32 },
  ],
  bassPattern: [
    { step: 0, degree: 0, octave: 1, length: 2, velocity: 0.98 },
    { step: 2, degree: 0, octave: 1, length: 1, velocity: 0.42 },
    { step: 4, degree: 1, octave: 1, length: 1, velocity: 0.52 },
    { step: 6, degree: 0, octave: 1, length: 2, velocity: 0.78 },
    { step: 8, degree: 2, octave: 1, length: 2, velocity: 0.9 },
    { step: 11, degree: 0, octave: 1, length: 1, velocity: 0.48 },
    { step: 14, degree: 3, octave: 1, length: 1, velocity: 0.62 },
  ],
  leadMotif: [
    { bar: 0, step: 1, note: "D5", length: 1, velocity: 0.36 },
    { bar: 0, step: 3, note: "Eb5", length: 1, velocity: 0.38 },
    { bar: 0, step: 6, note: "F5", length: 2, velocity: 0.42 },
    { bar: 0, step: 10, note: "A4", length: 1, velocity: 0.28 },
    { bar: 1, step: 0, note: "Bb4", length: 2, velocity: 0.34 },
    { bar: 1, step: 4, note: "A4", length: 1, velocity: 0.24 },
    { bar: 1, step: 7, note: "F5", length: 1, velocity: 0.36 },
    { bar: 1, step: 12, note: "Eb5", length: 3, velocity: 0.34 },
    { bar: 2, step: 2, note: "Gb5", length: 1, velocity: 0.42 },
    { bar: 2, step: 5, note: "F5", length: 1, velocity: 0.36 },
    { bar: 2, step: 8, note: "Eb5", length: 1, velocity: 0.32 },
    { bar: 2, step: 11, note: "C5", length: 2, velocity: 0.3 },
    { bar: 3, step: 0, note: "Bb4", length: 1, velocity: 0.28 },
    { bar: 3, step: 3, note: "C#5", length: 1, velocity: 0.36 },
    { bar: 3, step: 6, note: "E5", length: 2, velocity: 0.42 },
    { bar: 3, step: 13, note: "A5", length: 1, velocity: 0.3 },
    { bar: 4, step: 1, note: "D5", length: 1, velocity: 0.38 },
    { bar: 4, step: 4, note: "A5", length: 1, velocity: 0.42 },
    { bar: 4, step: 7, note: "G5", length: 1, velocity: 0.34 },
    { bar: 4, step: 10, note: "F5", length: 2, velocity: 0.36 },
    { bar: 5, step: 2, note: "D5", length: 1, velocity: 0.3 },
    { bar: 5, step: 5, note: "F5", length: 1, velocity: 0.34 },
    { bar: 5, step: 9, note: "Bb5", length: 1, velocity: 0.38 },
    { bar: 5, step: 12, note: "A5", length: 2, velocity: 0.28 },
    { bar: 6, step: 0, note: "G5", length: 1, velocity: 0.34 },
    { bar: 6, step: 3, note: "Ab5", length: 1, velocity: 0.42 },
    { bar: 6, step: 6, note: "Bb5", length: 1, velocity: 0.36 },
    { bar: 6, step: 10, note: "D6", length: 1, velocity: 0.32 },
    { bar: 7, step: 1, note: "C#5", length: 1, velocity: 0.35 },
    { bar: 7, step: 4, note: "E5", length: 1, velocity: 0.38 },
    { bar: 7, step: 8, note: "Bb4", length: 2, velocity: 0.42 },
    { bar: 7, step: 13, note: "A4", length: 2, velocity: 0.26 },
  ],
  percussionPattern: [
    { step: 0, sound: "root-thump", length: 1, velocity: 0.92, filterHz: 420 },
    { step: 2, sound: "stone-click", length: 1, velocity: 0.22, filterHz: 3400 },
    { step: 4, sound: "root-thump", length: 1, velocity: 0.42, filterHz: 500 },
    { step: 6, sound: "bone-tick", length: 1, velocity: 0.3, filterHz: 4700 },
    { step: 8, sound: "root-thump", length: 1, velocity: 0.82, filterHz: 460 },
    { step: 10, sound: "stone-click", length: 1, velocity: 0.2, filterHz: 3600 },
    { step: 12, sound: "root-thump", length: 1, velocity: 0.5, filterHz: 520 },
    { step: 14, sound: "moss-brush", length: 2, velocity: 0.34, filterHz: 2200 },
    { step: 15, sound: "bone-tick", length: 1, velocity: 0.26, filterHz: 5200 },
  ],
};

export const swampBogMusicLoop = {
  title: "Dead Marsh Pulse",
  mood: "murky swamp tension loop with wet drums, low reeds, and distant wolf pressure",
  tempo: 104,
  swing: 0.035,
  key: "E phrygian",
  bars: 8,
  stepsPerBar: STEPS_PER_BAR,
  loopBeats: 32,
  mix: {
    master: 0.46,
    chords: 0.18,
    bass: 0.34,
    lead: 0.2,
    percussion: 0.32,
  },
  instruments: {
    chords: {
      wave: "soft-square",
      octave: 3,
      attack: 0.028,
      release: 0.62,
      filterHz: 820,
      detuneCents: -11,
    },
    bass: {
      wave: "triangle",
      octave: 1,
      attack: 0.009,
      release: 0.2,
      filterHz: 360,
    },
    lead: {
      wave: "hollow-pulse",
      octave: 5,
      attack: 0.012,
      release: 0.26,
      filterHz: 1700,
      delay: { time: 0.375, feedback: 0.16, mix: 0.14 },
    },
    percussion: {
      source: "noise",
      attack: 0.003,
      release: 0.075,
      filterHz: 2600,
    },
  },
  progression: [
    { bar: 0, name: "Em(b9)", notes: ["E2", "G2", "B2", "F3"], length: 16 },
    { bar: 1, name: "F/E", notes: ["E2", "F2", "A2", "C3"], length: 16 },
    { bar: 2, name: "Dm/E", notes: ["E2", "D3", "F3", "A3"], length: 16 },
    { bar: 3, name: "Bb(add#11)", notes: ["Bb1", "F2", "A2", "E3"], length: 16 },
    { bar: 4, name: "Em(b9)", notes: ["E2", "G2", "B2", "F3"], length: 16 },
    { bar: 5, name: "C/E", notes: ["E2", "G2", "C3", "E3"], length: 16 },
    { bar: 6, name: "Am6", notes: ["A1", "C2", "E2", "F#2"], length: 16 },
    { bar: 7, name: "B7(b9)", notes: ["B1", "D#2", "A2", "C3"], length: 16 },
  ],
  chordRhythm: [
    { step: 0, length: 5, velocity: 0.36 },
    { step: 6, length: 2, velocity: 0.18 },
    { step: 11, length: 4, velocity: 0.24 },
  ],
  bassPattern: [
    { step: 0, degree: 0, octave: 1, length: 3, velocity: 0.84 },
    { step: 3, degree: 0, octave: 1, length: 1, velocity: 0.34 },
    { step: 7, degree: 2, octave: 1, length: 2, velocity: 0.5 },
    { step: 10, degree: 0, octave: 1, length: 2, velocity: 0.68 },
    { step: 14, degree: 3, octave: 1, length: 1, velocity: 0.42 },
  ],
  leadMotif: [
    { bar: 0, step: 4, note: "B4", length: 2, velocity: 0.28 },
    { bar: 0, step: 9, note: "F5", length: 1, velocity: 0.34 },
    { bar: 1, step: 2, note: "E5", length: 2, velocity: 0.3 },
    { bar: 1, step: 12, note: "C5", length: 2, velocity: 0.22 },
    { bar: 2, step: 1, note: "D5", length: 1, velocity: 0.3 },
    { bar: 2, step: 7, note: "A4", length: 2, velocity: 0.24 },
    { bar: 3, step: 5, note: "Bb4", length: 1, velocity: 0.27 },
    { bar: 3, step: 11, note: "E5", length: 3, velocity: 0.31 },
    { bar: 4, step: 3, note: "G5", length: 1, velocity: 0.3 },
    { bar: 4, step: 8, note: "F5", length: 1, velocity: 0.36 },
    { bar: 5, step: 2, note: "E5", length: 2, velocity: 0.26 },
    { bar: 5, step: 10, note: "C5", length: 3, velocity: 0.2 },
    { bar: 6, step: 0, note: "A4", length: 2, velocity: 0.24 },
    { bar: 6, step: 6, note: "F#5", length: 1, velocity: 0.33 },
    { bar: 7, step: 3, note: "D#5", length: 1, velocity: 0.34 },
    { bar: 7, step: 12, note: "B4", length: 3, velocity: 0.22 },
  ],
  percussionPattern: [
    { step: 0, sound: "root-thump", length: 1, velocity: 0.72, filterHz: 300 },
    { step: 3, sound: "moss-brush", length: 1, velocity: 0.26, filterHz: 1500 },
    { step: 5, sound: "leaf-tick", length: 1, velocity: 0.16, filterHz: 2300 },
    { step: 8, sound: "root-thump", length: 1, velocity: 0.62, filterHz: 340 },
    { step: 10, sound: "moss-brush", length: 2, velocity: 0.32, filterHz: 1200 },
    { step: 12, sound: "stone-click", length: 1, velocity: 0.18, filterHz: 2100 },
    { step: 15, sound: "bone-tick", length: 1, velocity: 0.2, filterHz: 3200 },
  ],
};

export const castleWarMusicLoop = {
  title: "Keep Under Siege",
  mood: "fast war-tension castle chiptune with heavy drums and sharp lead stabs",
  tempo: 132,
  swing: 0.01,
  key: "C phrygian",
  bars: 8,
  stepsPerBar: STEPS_PER_BAR,
  loopBeats: 32,
  mix: {
    master: 0.48,
    chords: 0.18,
    bass: 0.36,
    lead: 0.24,
    percussion: 0.38,
  },
  instruments: {
    chords: {
      wave: "square",
      octave: 3,
      attack: 0.012,
      release: 0.28,
      filterHz: 920,
      detuneCents: -7,
    },
    bass: {
      wave: "triangle",
      octave: 1,
      attack: 0.004,
      release: 0.12,
      filterHz: 420,
    },
    lead: {
      wave: "sharp-pulse",
      octave: 5,
      attack: 0.006,
      release: 0.14,
      filterHz: 2700,
      delay: { time: 0.25, feedback: 0.1, mix: 0.1 },
    },
    percussion: {
      source: "noise",
      attack: 0.002,
      release: 0.045,
      filterHz: 4600,
    },
  },
  progression: [
    { bar: 0, name: "Cm(b9)", notes: ["C2", "Eb2", "G2", "Db3"], length: 16 },
    { bar: 1, name: "Db5/C", notes: ["C2", "Db2", "Ab2", "Db3"], length: 16 },
    { bar: 2, name: "Bb/C", notes: ["C2", "Bb2", "D3", "F3"], length: 16 },
    { bar: 3, name: "Gdim/C", notes: ["C2", "G2", "Bb2", "Db3"], length: 16 },
    { bar: 4, name: "Cm(b9)", notes: ["C2", "Eb2", "G2", "Db3"], length: 16 },
    { bar: 5, name: "Ab/C", notes: ["C2", "Ab2", "C3", "Eb3"], length: 16 },
    { bar: 6, name: "Fm(addb9)", notes: ["F1", "Ab2", "C3", "Gb3"], length: 16 },
    { bar: 7, name: "G7sus(b9)", notes: ["G1", "C2", "F2", "Ab2"], length: 16 },
  ],
  chordRhythm: [
    { step: 0, length: 2, velocity: 0.44 },
    { step: 4, length: 1, velocity: 0.22 },
    { step: 8, length: 2, velocity: 0.48 },
    { step: 12, length: 1, velocity: 0.25 },
  ],
  bassPattern: [
    { step: 0, degree: 0, octave: 1, length: 2, velocity: 0.95 },
    { step: 2, degree: 0, octave: 1, length: 1, velocity: 0.42 },
    { step: 4, degree: 1, octave: 1, length: 1, velocity: 0.58 },
    { step: 6, degree: 0, octave: 1, length: 2, velocity: 0.72 },
    { step: 8, degree: 2, octave: 1, length: 2, velocity: 0.9 },
    { step: 11, degree: 0, octave: 1, length: 1, velocity: 0.5 },
    { step: 14, degree: 3, octave: 1, length: 1, velocity: 0.68 },
  ],
  leadMotif: [
    { bar: 0, step: 1, note: "C5", length: 1, velocity: 0.34 },
    { bar: 0, step: 5, note: "Db5", length: 1, velocity: 0.38 },
    { bar: 0, step: 9, note: "G5", length: 1, velocity: 0.42 },
    { bar: 1, step: 3, note: "Ab4", length: 1, velocity: 0.28 },
    { bar: 1, step: 7, note: "C5", length: 1, velocity: 0.36 },
    { bar: 1, step: 13, note: "Db5", length: 2, velocity: 0.3 },
    { bar: 2, step: 0, note: "Bb4", length: 1, velocity: 0.34 },
    { bar: 2, step: 4, note: "D5", length: 1, velocity: 0.4 },
    { bar: 2, step: 10, note: "F5", length: 1, velocity: 0.34 },
    { bar: 3, step: 2, note: "Db5", length: 1, velocity: 0.36 },
    { bar: 3, step: 6, note: "G5", length: 1, velocity: 0.42 },
    { bar: 3, step: 13, note: "Bb4", length: 2, velocity: 0.26 },
    { bar: 4, step: 1, note: "C5", length: 1, velocity: 0.36 },
    { bar: 4, step: 5, note: "G5", length: 1, velocity: 0.4 },
    { bar: 4, step: 8, note: "Eb5", length: 1, velocity: 0.32 },
    { bar: 5, step: 3, note: "Ab5", length: 1, velocity: 0.38 },
    { bar: 5, step: 9, note: "C6", length: 1, velocity: 0.34 },
    { bar: 5, step: 12, note: "Ab5", length: 2, velocity: 0.28 },
    { bar: 6, step: 0, note: "F5", length: 1, velocity: 0.34 },
    { bar: 6, step: 4, note: "Gb5", length: 1, velocity: 0.42 },
    { bar: 6, step: 11, note: "C5", length: 1, velocity: 0.3 },
    { bar: 7, step: 1, note: "Ab4", length: 1, velocity: 0.36 },
    { bar: 7, step: 6, note: "C5", length: 1, velocity: 0.4 },
    { bar: 7, step: 12, note: "G4", length: 2, velocity: 0.28 },
  ],
  percussionPattern: [
    { step: 0, sound: "root-thump", length: 1, velocity: 1, filterHz: 380 },
    { step: 2, sound: "stone-click", length: 1, velocity: 0.28, filterHz: 3500 },
    { step: 4, sound: "root-thump", length: 1, velocity: 0.52, filterHz: 480 },
    { step: 6, sound: "bone-tick", length: 1, velocity: 0.34, filterHz: 5200 },
    { step: 8, sound: "root-thump", length: 1, velocity: 0.9, filterHz: 430 },
    { step: 10, sound: "stone-click", length: 1, velocity: 0.24, filterHz: 3900 },
    { step: 12, sound: "root-thump", length: 1, velocity: 0.58, filterHz: 500 },
    { step: 14, sound: "bone-tick", length: 1, velocity: 0.32, filterHz: 5400 },
    { step: 15, sound: "moss-brush", length: 1, velocity: 0.24, filterHz: 2400 },
  ],
};

export function noteToMidi(note) {
  const match = /^([A-G](?:#|b)?)(-?\d+)$/.exec(note);
  if (!match || NOTE_NAMES[match[1]] === undefined) {
    throw new Error(`Invalid note name: ${note}`);
  }

  return 12 * (Number(match[2]) + 1) + NOTE_NAMES[match[1]];
}

export function noteToFrequency(note, tuning = 440) {
  return tuning * 2 ** ((noteToMidi(note) - 69) / 12);
}

export function stepToSeconds(step, tempo = bloodrootMusicLoop.tempo) {
  return step * (60 / tempo / 4);
}

export function makeBloodrootMusicEvents(loop = bloodrootMusicLoop) {
  const events = [];

  for (const chord of loop.progression) {
    for (const hit of loop.chordRhythm) {
      events.push({
        type: "chord",
        at: chord.bar * STEPS_PER_BAR + hit.step,
        notes: chord.notes,
        length: Math.min(hit.length, chord.length - hit.step),
        velocity: hit.velocity,
        chord: chord.name,
      });
    }

    for (const bass of loop.bassPattern) {
      events.push({
        type: "bass",
        at: chord.bar * STEPS_PER_BAR + bass.step,
        note: transposeChordTone(chord.notes, bass.degree, bass.octave),
        length: bass.length,
        velocity: bass.velocity,
      });
    }

    for (const hit of loop.percussionPattern) {
      events.push({
        type: "percussion",
        at: chord.bar * STEPS_PER_BAR + hit.step,
        sound: hit.sound,
        length: hit.length,
        velocity: hit.velocity,
        filterHz: hit.filterHz,
      });
    }
  }

  for (const lead of loop.leadMotif) {
    events.push({
      type: "lead",
      at: lead.bar * STEPS_PER_BAR + lead.step,
      note: lead.note,
      length: lead.length,
      velocity: lead.velocity,
    });
  }

  return events.sort((a, b) => a.at - b.at || typeOrder(a.type) - typeOrder(b.type));
}

export function makeTimedBloodrootMusicEvents(loop = bloodrootMusicLoop) {
  return makeBloodrootMusicEvents(loop).map((event) => ({
    ...event,
    time: stepToSeconds(event.at, loop.tempo),
    duration: stepToSeconds(event.length, loop.tempo),
  }));
}

export function makeBloodrootAudioLoop(loop = bloodrootMusicLoop) {
  return {
    title: loop.title,
    tempo: loop.tempo,
    step: 0.25,
    eventSteps: loop.bars * loop.stepsPerBar,
    events: makeBloodrootMusicEvents(loop).map((event) => ({
      ...event,
      frequency: event.note ? noteToFrequency(event.note) : undefined,
      frequencies: event.notes ? event.notes.map((note) => noteToFrequency(note)) : undefined,
    })),
  };
}

export const bloodrootAudioLoop = makeBloodrootAudioLoop();
export const bloodrootBossAudioLoop = makeBloodrootAudioLoop(bloodrootBossMusicLoop);
export const swampBogAudioLoop = makeBloodrootAudioLoop(swampBogMusicLoop);
export const castleWarAudioLoop = makeBloodrootAudioLoop(castleWarMusicLoop);

function transposeChordTone(notes, degree, octave) {
  const source = notes[degree % notes.length];
  return source.replace(/-?\d+$/, String(octave));
}

function typeOrder(type) {
  return ["percussion", "bass", "chord", "lead"].indexOf(type);
}
