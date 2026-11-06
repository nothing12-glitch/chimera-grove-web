import { GRASS_TUFT, WILD_FLOWER } from "../data/art";
import { buildSprite } from "./sprites";

export type Splash = {
  /** honest one-liner under the progress bar */
  stage(label: string): void;
  /** boot finished: the splash fades once the grass had its moment */
  ready(onGone?: () => void): void;
};

const BLADE_TONES = ["#3f6d3a", "#527f44", "#679653", "#7fc48a"];
const BLOOM_TONES = ["#e6c34a", "#e0607a", "#9d7fd6"];
/** the shortest time the splash may stay, so the growth reads as growth */
const MIN_MS = 2100;
/** last stretch of the bar, after boot is already done */
const BAR_MS = 500;
const FADE_MS = 700;

type Blade = {
  x: number;
  y: number;
  h: number;
  lean: number;
  /** the art-pixel this blade is drawn in, so it stays blocky like the game */
  px: number;
  base: string;
  tip: string;
  phase: number;
  bloom: string | null;
  delay: number;
};

type Fly = { x: number; y: number; r: number; phase: number; drift: number };
type Mote = { x: number; y: number; vy: number; wob: number; phase: number };

function must<T>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el as T;
}

/** One span per glyph, so CSS can sprout them in turn and we can measure each. */
function splitLetters(el: HTMLElement): HTMLElement[] {
  const text = el.textContent ?? "";
  el.textContent = "";
  const letters: HTMLElement[] = [];
  let i = 0;
  for (const ch of text) {
    const span = document.createElement("span");
    if (ch === " ") span.innerHTML = "&nbsp;";
    else {
      span.textContent = ch;
      letters.push(span);
    }
    span.style.setProperty("--i", String(i));
    el.append(span);
    i++;
  }
  return letters;
}

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

export function initSplash(): Splash | null {
  const root = must<HTMLDivElement>("splash");
  const canvas = must<HTMLCanvasElement>("splash-art");
  const title = must<HTMLHeadingElement>("splash-title");
  const fill = must<HTMLElement>("splash-fill");
  const statusEl = must<HTMLParagraphElement>("splash-status");
  if (root.hidden) return null;

  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) return null;
  const ctx = ctx2d;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const letters = splitLetters(title);
  const tuft = buildSprite("splash_tuft", GRASS_TUFT);
  const flower = buildSprite("splash_flower", WILD_FLOWER);

  let w = 0;
  let h = 0;
  let blades: Blade[] = [];
  let mounds: { x: number; y: number; w: number; h: number }[] = [];
  let ground: Blade[] = [];
  let flies: Fly[] = [];
  let motes: Mote[] = [];
  let raf = 0;
  let start = performance.now();
  let readyAt = 0;
  let gone = false;
  let onGone: (() => void) | null = null;

  function seedTuft(x: number, y: number, scale: number, delay: number): Blade {
    const hgt = scale * (7 + Math.random() * 9);
    const tone = (Math.random() * (BLADE_TONES.length - 1)) | 0;
    return {
      x,
      y,
      h: hgt,
      lean: (Math.random() - 0.5) * hgt * 0.9,
      px: Math.max(1, Math.round(scale * 1.6)),
      base: BLADE_TONES[tone],
      tip: BLADE_TONES[Math.min(BLADE_TONES.length - 1, tone + 1)],
      phase: Math.random() * Math.PI * 2,
      bloom: Math.random() < 0.12 ? BLOOM_TONES[(Math.random() * 3) | 0] : null,
      delay,
    };
  }

  function layout(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    blades = [];
    mounds = [];
    for (const letter of letters) {
      const r = letter.getBoundingClientRect();
      if (r.width < 1) continue;
      mounds.push({
        x: r.left - r.width * 0.08,
        y: r.bottom - r.height * 0.07,
        w: r.width * 1.16,
        h: Math.max(3, r.height * 0.075),
      });
      const n = Math.max(3, Math.round(r.width / 6));
      for (let k = 0; k < n; k++) {
        const x =
          r.left + (r.width * (k + 0.5)) / n + (Math.random() - 0.5) * 2;
        const b = seedTuft(x, r.bottom - r.height * 0.04, r.height / 34, 0.55);
        b.h = r.height * (0.14 + Math.random() * 0.42);
        b.lean = (Math.random() - 0.5) * b.h * 0.9;
        b.px = Math.max(1, Math.round(r.height / 30));
        b.delay = 0.45 + Math.random() * 0.7;
        blades.push(b);
      }
    }

    ground = [];
    const step = Math.max(18, Math.round(w / 46));
    for (let x = -step; x < w + step; x += step) {
      const jitter = (Math.random() - 0.5) * step * 0.4;
      const at = (o: number) =>
        seedTuft(
          x + jitter + o,
          h - Math.random() * h * 0.03,
          h / 150,
          0.1 + (x / w) * 0.5 + Math.random() * 0.15,
        );
      ground.push(at(0), at(step * 0.35), at(step * 0.7));
    }

    flies = Array.from({ length: reduce ? 8 : 26 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h * 0.85,
      r: 8 + Math.random() * 16,
      phase: Math.random() * Math.PI * 2,
      drift: 6 + Math.random() * 14,
    }));

    motes = Array.from({ length: reduce ? 10 : 40 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vy: 6 + Math.random() * 14,
      wob: 8 + Math.random() * 18,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  function drawBlade(b: Blade, t: number): void {
    const grow = reduce ? 1 : ease(clamp01((t - b.delay) / 0.9));
    if (grow <= 0.02) return;
    const sway = reduce ? 0 : Math.sin(t * 1.3 + b.phase) * b.h * 0.12;
    const tall = b.h * grow;
    const steps = Math.max(2, Math.round(tall / b.px));
    for (let s = 0; s < steps; s++) {
      const p = s / (steps - 1);
      const bend = (b.lean + sway) * p * p;
      const x = Math.round((b.x + bend) / b.px) * b.px;
      const y = Math.round((b.y - tall * p) / b.px) * b.px - b.px;
      ctx.fillStyle = p > 0.55 ? b.tip : b.base;
      ctx.fillRect(x, y, p < 0.3 ? b.px * 2 : b.px, b.px);
    }
    if (b.bloom && grow > 0.9) {
      ctx.fillStyle = b.bloom;
      ctx.fillRect(
        Math.round((b.x + b.lean + sway) / b.px) * b.px,
        Math.round((b.y - tall) / b.px) * b.px - b.px * 2,
        b.px,
        b.px,
      );
    }
  }

  function drawSprites(t: number): void {
    const k = Math.max(2, Math.round(h / 170));
    const size = 16 * k;
    const rowY = h - size * 0.72;
    for (let x = 0, i = 0; x < w + size; x += size * 0.85, i++) {
      const grow = reduce ? 1 : ease(clamp01((t - 0.1 - (x / w) * 0.6) / 0.5));
      if (grow <= 0.02) continue;
      ctx.globalAlpha = grow;
      const y = rowY + (1 - grow) * size * 0.4 + ((i * 7) % 3);
      ctx.drawImage(tuft, Math.round(x), Math.round(y), size, size);
      if (i % 5 === 2) {
        ctx.drawImage(
          flower,
          Math.round(x + size * 0.2),
          Math.round(y + size * 0.1),
          size,
          size,
        );
      }
    }
    ctx.globalAlpha = 1;
  }

  function frame(now: number): void {
    const t = (now - start) / 1000;
    ctx.clearRect(0, 0, w, h);

    const soil = ctx.createLinearGradient(0, h * 0.7, 0, h);
    soil.addColorStop(0, "rgba(10, 18, 14, 0)");
    soil.addColorStop(1, "rgba(18, 34, 22, 0.85)");
    ctx.fillStyle = soil;
    ctx.fillRect(0, h * 0.7, w, h * 0.3);

    ctx.globalCompositeOperation = "lighter";
    for (const f of flies) {
      const pulse = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.9 + f.phase));
      const x = f.x + Math.sin(t * 0.4 + f.phase) * f.drift;
      const y = f.y + Math.cos(t * 0.33 + f.phase * 1.7) * f.drift * 0.6;
      const halo = ctx.createRadialGradient(x, y, 0, x, y, f.r);
      halo.addColorStop(0, `rgba(232, 191, 94, ${0.5 * pulse})`);
      halo.addColorStop(1, "rgba(232, 191, 94, 0)");
      ctx.fillStyle = halo;
      ctx.fillRect(x - f.r, y - f.r, f.r * 2, f.r * 2);
      ctx.fillStyle = `rgba(255, 236, 170, ${pulse})`;
      ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
    ctx.globalCompositeOperation = "source-over";

    ctx.fillStyle = "rgba(203, 184, 255, 0.5)";
    for (const m of motes) {
      const y = (m.y + t * m.vy) % (h + 20);
      const x = m.x + Math.sin(t * 0.6 + m.phase) * m.wob;
      ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    }

    drawSprites(t);
    for (const b of ground) drawBlade(b, t);

    const crust = reduce ? 1 : ease(clamp01((t - 0.35) / 0.7));
    ctx.globalAlpha = crust;
    for (const m of mounds) {
      ctx.fillStyle = "#22301f";
      ctx.fillRect(
        Math.round(m.x),
        Math.round(m.y),
        Math.round(m.w),
        Math.round(m.h),
      );
      ctx.fillStyle = "#33502f";
      ctx.fillRect(
        Math.round(m.x),
        Math.round(m.y),
        Math.round(m.w),
        Math.max(1, Math.round(m.h * 0.4)),
      );
    }
    ctx.globalAlpha = 1;
    for (const b of blades) drawBlade(b, t);

    const vignette = ctx.createRadialGradient(
      w / 2,
      h * 0.42,
      Math.min(w, h) * 0.25,
      w / 2,
      h * 0.42,
      Math.max(w, h) * 0.72,
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.55)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    const elapsed = now - start;
    const target = readyAt
      ? 0.9 + 0.1 * clamp01((now - readyAt) / BAR_MS)
      : Math.min(0.9, elapsed / MIN_MS);
    fill.style.width = `${Math.round(target * 100)}%`;

    if (readyAt && elapsed >= MIN_MS && now - readyAt >= BAR_MS) hide();
    else raf = requestAnimationFrame(frame);
  }

  function hide(): void {
    if (gone) return;
    gone = true;
    cancelAnimationFrame(raf);
    root.classList.add("hide");
    window.setTimeout(() => {
      root.hidden = true;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointerdown", onSkip);
      window.removeEventListener("keydown", onSkip);
      onGone?.();
    }, FADE_MS + 40);
  }

  function onResize(): void {
    layout();
  }

  function onSkip(): void {
    if (readyAt) hide();
  }

  layout();
  window.addEventListener("resize", onResize);
  window.addEventListener("pointerdown", onSkip);
  window.addEventListener("keydown", onSkip);
  raf = requestAnimationFrame(frame);

  return {
    stage(label: string) {
      statusEl.textContent = label;
    },
    ready(onGoneCb?: () => void) {
      onGone = onGoneCb ?? null;
      if (!readyAt) readyAt = performance.now();
    },
  };
}
