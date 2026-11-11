/// <reference types="vite/client" />
// Hover sound for buttons and logos. Each play is slightly different: the
// pitch and volume are nudged at random so repeat hovers don't sound robotic.
import hoverUrl from "../assets/sfx/menu-hover-1.wav";

export const HOVER_SFX = {
  volume: 0.35, // 0–1, before randomization
  basePlaybackRate: 2.8, // 1 = original pitch and speed; 2 = an octave up
  pitchRandomization: 0.1, // each play's rate lands within ± this fraction of the base
  volumeRandomization: 0.25, // each play's volume lands within ± this fraction of `volume`
  trebleCutDb: 0, // how much to turn down the highs, in dB (0 = no cut)
  trebleCutHz: 4000, // where the treble cut starts
  minInterval: 40, // ms; hovers closer together than this are skipped
};

// Played when the mouse moves off. Same knobs, tuned separately.
export const HOVER_OFF_SFX = {
  volume: 0.25,
  basePlaybackRate: 2.5,
  pitchRandomization: 0.1,
  volumeRandomization: 0.25,
  trebleCutDb: 72,
  trebleCutHz: 4000,
  minInterval: 40,
};

type SfxSettings = typeof HOVER_SFX;

let ctx: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let loading: Promise<void> | null = null;
const lastPlay = new Map<SfxSettings, number>();

function load() {
  if (loading) return loading;
  ctx = new AudioContext();
  loading = fetch(hoverUrl)
    .then((r) => r.arrayBuffer())
    .then((data) => ctx!.decodeAudioData(data))
    .then((decoded) => {
      buffer = decoded;
    })
    .catch(() => {
      loading = null; // allow a retry later
    });
  return loading;
}

// Browsers keep audio muted until the visitor clicks or presses a key, and a
// hover doesn't count, so unlock on the first real interaction.
function unlock() {
  load();
  ctx?.resume();
}
if (typeof window !== "undefined") {
  for (const type of ["pointerdown", "keydown", "touchstart"]) {
    window.addEventListener(type, unlock, { capture: true, passive: true });
  }
  load();
}

const vary = (base: number, amount: number) => base * (1 + (Math.random() * 2 - 1) * amount);

// The sound toggle (top right) flips this. Off silences every sfx.
let soundOn = true;
export function setSoundOn(on: boolean) {
  soundOn = on;
}

function play(s: SfxSettings) {
  if (!soundOn || !ctx || !buffer || ctx.state !== "running") return;
  const now = performance.now();
  if (now - (lastPlay.get(s) ?? -Infinity) < s.minInterval) return;
  lastPlay.set(s, now);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = Math.max(0.01, vary(s.basePlaybackRate, s.pitchRandomization));

  const treble = ctx.createBiquadFilter();
  treble.type = "highshelf";
  treble.frequency.value = s.trebleCutHz;
  treble.gain.value = -s.trebleCutDb;

  const gain = ctx.createGain();
  gain.gain.value = Math.min(1, Math.max(0, vary(s.volume, s.volumeRandomization)));

  source.connect(treble).connect(gain).connect(ctx.destination);
  source.start();
}

export const playHover = () => play(HOVER_SFX);
export const playHoverOff = () => play(HOVER_OFF_SFX);

// For React pointer handlers: mouse only, so taps on touch screens stay quiet.
export function onHoverSfx(e: { pointerType: string }) {
  if (e.pointerType === "mouse") playHover();
}
export function onHoverOffSfx(e: { pointerType: string }) {
  if (e.pointerType === "mouse") playHoverOff();
}
