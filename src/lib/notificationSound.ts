/**
 * Kitchen: `/public/notification.mp3.wav` (HTMLAudioElement, volume ~0.5, cooldown).
 * Legacy: Web Audio beep for `playNotificationSound`.
 * Silent unlock: first click / keydown / touchstart runs `unlockAudioWithUserGesture()` (no UI).
 */
let audioContext: AudioContext | null = null;

let gestureListenersActive = false;
let audioUnlockedByGesture = false;

function removeSilentGestureUnlockListeners(): void {
  if (!gestureListenersActive) return;
  gestureListenersActive = false;
  (['click', 'keydown', 'touchstart'] as const).forEach((ev) =>
    document.removeEventListener(ev, onFirstGestureUnlock, true)
  );
}

function onFirstGestureUnlock(): void {
  if (audioUnlockedByGesture) return;
  audioUnlockedByGesture = true;
  removeSilentGestureUnlockListeners();
  void unlockAudioWithUserGesture().catch(() => {});
}

/** Idempotent: listen for first user gesture, then prime MP3 + Web Audio. No UI. */
export function attachSilentAudioUnlockOnFirstInteraction(): void {
  if (typeof document === 'undefined' || audioUnlockedByGesture || gestureListenersActive) return;
  gestureListenersActive = true;
  const opts: AddEventListenerOptions = { capture: true, passive: true };
  (['click', 'keydown', 'touchstart'] as const).forEach((ev) =>
    document.addEventListener(ev, onFirstGestureUnlock, opts)
  );
}

/** Kitchen unmount: drop pending listeners if the user never interacted (unlock stays false). */
export function detachSilentAudioUnlockIfPending(): void {
  if (audioUnlockedByGesture) return;
  removeSilentGestureUnlockListeners();
}

const rawBase = (import.meta.env.BASE_URL as string | undefined) || '/';
const pathBase = rawBase.replace(/\/$/, '');
const KITCHEN_NOTIFICATION_SRC =
  pathBase === '' ? '/notification.mp3.wav' : `${pathBase}/notification.mp3.wav`;
const ORDER_READY_NOTIFICATION_SRC =
  pathBase === '' ? '/ready-notification.mp3' : `${pathBase}/ready-notification.mp3`;
const KITCHEN_NOTIFICATION_VOLUME = 0.5;
const ORDER_READY_NOTIFICATION_VOLUME = 0.5;
/** No overlapping / stacked plays (in addition to Kitchen page throttle). */
const KITCHEN_MP3_COOLDOWN_MS = 2000;
const ORDER_READY_MP3_COOLDOWN_MS = 2000;
/** Optional cap so a long file cannot run past ~2s. */
const KITCHEN_MP3_MAX_DURATION_SEC = 2.2;
const ORDER_READY_MP3_MAX_DURATION_SEC = 2.2;

let kitchenAudioEl: HTMLAudioElement | null = null;
let lastKitchenMp3PlayAt = 0;
let kitchenTimeTrimListener: (() => void) | null = null;

let orderReadyAudioEl: HTMLAudioElement | null = null;
let lastOrderReadyMp3PlayAt = 0;
let orderReadyTimeTrimListener: (() => void) | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioContext;
}

function getKitchenAudioElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!kitchenAudioEl) {
    try {
      const a = new Audio(KITCHEN_NOTIFICATION_SRC);
      a.preload = 'auto';
      a.volume = KITCHEN_NOTIFICATION_VOLUME;
      a.loop = false;
      kitchenAudioEl = a;
    } catch {
      return null;
    }
  }
  return kitchenAudioEl;
}

function detachKitchenTimeTrimListener(): void {
  const a = kitchenAudioEl;
  if (a && kitchenTimeTrimListener) {
    a.removeEventListener('timeupdate', kitchenTimeTrimListener);
    kitchenTimeTrimListener = null;
  }
}

function getOrderReadyAudioElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!orderReadyAudioEl) {
    try {
      const a = new Audio(ORDER_READY_NOTIFICATION_SRC);
      a.preload = 'auto';
      a.volume = ORDER_READY_NOTIFICATION_VOLUME;
      a.loop = false;
      orderReadyAudioEl = a;
    } catch {
      return null;
    }
  }
  return orderReadyAudioEl;
}

function detachOrderReadyTimeTrimListener(): void {
  const a = orderReadyAudioEl;
  if (a && orderReadyTimeTrimListener) {
    a.removeEventListener('timeupdate', orderReadyTimeTrimListener);
    orderReadyTimeTrimListener = null;
  }
}

async function primeAudioElementSilentPlay(a: HTMLAudioElement, restoreVolume: number): Promise<boolean> {
  try {
    a.volume = restoreVolume;
    await new Promise<void>((resolve) => {
      if (a.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        resolve();
        return;
      }
      const done = () => {
        a.removeEventListener('canplaythrough', done);
        a.removeEventListener('error', done);
        resolve();
      };
      a.addEventListener('canplaythrough', done, { once: true });
      a.addEventListener('error', done, { once: true });
      a.load();
    });
    if (a.error) return false;
    a.pause();
    a.currentTime = 0;
    a.volume = 0;
    await a.play();
    a.pause();
    a.currentTime = 0;
    a.volume = restoreVolume;
    return true;
  } catch {
    return false;
  }
}

/**
 * Run inside a user gesture so the browser allows later `play()` on the MP3.
 */
export async function primeKitchenNotificationAudio(): Promise<boolean> {
  const a = getKitchenAudioElement();
  if (!a) return false;
  return primeAudioElementSilentPlay(a, KITCHEN_NOTIFICATION_VOLUME);
}

export async function primeOrderReadyNotificationAudio(): Promise<boolean> {
  const a = getOrderReadyAudioElement();
  if (!a) return false;
  return primeAudioElementSilentPlay(a, ORDER_READY_NOTIFICATION_VOLUME);
}

async function unlockWebAudioSilent(): Promise<boolean> {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;
    await ctx.resume();
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0);
    return ctx.state === 'running';
  } catch {
    return false;
  }
}

/**
 * Call once inside a click / touchstart / keydown handler (user gesture).
 */
export async function unlockAudioWithUserGesture(): Promise<boolean> {
  const [web, kitchen, ready] = await Promise.all([
    unlockWebAudioSilent(),
    primeKitchenNotificationAudio(),
    primeOrderReadyNotificationAudio(),
  ]);
  return web || kitchen || ready;
}

/** Short beep (legacy, ~0.15s). */
export function playNotificationSound(): void {
  attachSilentAudioUnlockOnFirstInteraction();
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume().then(() => playShortBeep(ctx)).catch(() => {});
    return;
  }
  playShortBeep(ctx);
}

function playShortBeep(ctx: AudioContext): void {
  try {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 880;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  } catch {
    /* ignore */
  }
}

/**
 * Kitchen new order: `public/notification.mp3`, single reused `Audio`, no loop.
 * Cooldown prevents overlap; falls back to soft synthesized chime if MP3 missing/errors.
 */
export function playKitchenNewOrderSound(): void {
  const now = Date.now();
  if (now - lastKitchenMp3PlayAt < KITCHEN_MP3_COOLDOWN_MS) return;

  const a = getKitchenAudioElement();
  const tryMp3 = Boolean(a && !a.error);

  if (tryMp3 && a) {
    lastKitchenMp3PlayAt = now;
    a.volume = KITCHEN_NOTIFICATION_VOLUME;
    detachKitchenTimeTrimListener();
    a.pause();
    a.currentTime = 0;

    const trim = () => {
      if (a.currentTime >= KITCHEN_MP3_MAX_DURATION_SEC) {
        a.pause();
        a.currentTime = 0;
        detachKitchenTimeTrimListener();
      }
    };
    kitchenTimeTrimListener = trim;
    a.addEventListener('timeupdate', trim);

    const onEnded = () => {
      detachKitchenTimeTrimListener();
      a.removeEventListener('ended', onEnded);
    };
    a.addEventListener('ended', onEnded, { once: true });

    void a.play().catch(() => {
      detachKitchenTimeTrimListener();
      a.removeEventListener('ended', onEnded);
      playKitchenBellFallback();
    });
    return;
  }

  lastKitchenMp3PlayAt = now;
  playKitchenBellFallback();
}

/**
 * Customer tracking: `public/ready-notification.mp3`, separate `Audio` from kitchen chime.
 */
export function playOrderReadyNotificationSound(): void {
  const now = Date.now();
  if (now - lastOrderReadyMp3PlayAt < ORDER_READY_MP3_COOLDOWN_MS) return;

  const a = getOrderReadyAudioElement();
  const tryMp3 = Boolean(a && !a.error);

  if (tryMp3 && a) {
    lastOrderReadyMp3PlayAt = now;
    a.volume = ORDER_READY_NOTIFICATION_VOLUME;
    detachOrderReadyTimeTrimListener();
    a.pause();
    a.currentTime = 0;

    const trim = () => {
      if (a.currentTime >= ORDER_READY_MP3_MAX_DURATION_SEC) {
        a.pause();
        a.currentTime = 0;
        detachOrderReadyTimeTrimListener();
      }
    };
    orderReadyTimeTrimListener = trim;
    a.addEventListener('timeupdate', trim);

    const onEnded = () => {
      detachOrderReadyTimeTrimListener();
      a.removeEventListener('ended', onEnded);
    };
    a.addEventListener('ended', onEnded, { once: true });

    void a.play().catch(() => {
      detachOrderReadyTimeTrimListener();
      a.removeEventListener('ended', onEnded);
      lastOrderReadyMp3PlayAt = now;
      playKitchenBellFallback();
    });
    return;
  }

  lastOrderReadyMp3PlayAt = now;
  playKitchenBellFallback();
}

/** Softer fallback if `notification.mp3` is missing or blocked. */
function playKitchenBellFallback(): void {
  attachSilentAudioUnlockOnFirstInteraction();
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume().then(() => playKitchenBellSequence(ctx)).catch(() => {});
    return;
  }
  playKitchenBellSequence(ctx);
}

function playKitchenBellSequence(ctx: AudioContext): void {
  try {
    const base = ctx.currentTime;
    scheduleTone(ctx, base + 0.05, 784, 0.22, 0.08);
    scheduleTone(ctx, base + 0.4, 1046.5, 0.26, 0.07);
  } catch {
    /* ignore */
  }
}

function scheduleTone(
  ctx: AudioContext,
  startAt: number,
  frequency: number,
  duration: number,
  peakGain: number
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = frequency;
  osc.type = 'sine';
  const end = startAt + duration;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.start(startAt);
  osc.stop(end + 0.03);
}
