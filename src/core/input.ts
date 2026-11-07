const pressed = new Set<string>();
const justPressed = new Set<string>();
let wheelDelta = 0;

export function attachInput(target: Window): void {
  target.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    for (const k of names(e)) {
      pressed.add(k);
      justPressed.add(k);
    }
    if (names(e).some((k) => BLOCKING.has(k))) e.preventDefault();
  });
  target.addEventListener("keyup", (e) => {
    for (const k of names(e)) pressed.delete(k);
  });
  target.addEventListener("blur", () => pressed.clear());
  target.addEventListener(
    "wheel",
    (e) => {
      wheelDelta += Math.sign(e.deltaY);
      e.preventDefault();
    },
    { passive: false },
  );
}

const BLOCKING = new Set([
  "space",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "/",
]);

export function isDown(key: string): boolean {
  return pressed.has(normalize(key));
}

export function wasPressed(key: string): boolean {
  return justPressed.has(normalize(key));
}

export function axis(): { x: number; y: number } {
  let x = 0;
  let y = 0;
  if (isDown("a") || isDown("arrowleft")) x -= 1;
  if (isDown("d") || isDown("arrowright")) x += 1;
  if (isDown("w") || isDown("arrowup")) y -= 1;
  if (isDown("s") || isDown("arrowdown")) y += 1;
  if (x && y) {
    x *= 0.7071;
    y *= 0.7071;
  }
  return { x, y };
}

export function takeWheel(): number {
  const d = wheelDelta;
  wheelDelta = 0;
  return d;
}

/** Call once per frame after all reads. */
export function endFrame(): void {
  justPressed.clear();
}

function normalize(key: string): string {
  const k = key.toLowerCase();
  return k === " " ? "space" : k;
}

/**
 * `e.key` answers in whatever layout the keyboard is set to, so on a
 * Ukrainian one the W key reports "г" and the alchemist never hears "w".
 * `e.code` names the physical key, and it never changes with the layout —
 * the grove listens to both, so WASD works however you type.
 */
function names(e: { key: string; code?: string }): string[] {
  const out = [normalize(e.key)];
  const physical = byCode(e.code ?? "");
  if (physical && !out.includes(physical)) out.push(physical);
  return out;
}

function byCode(code: string): string | null {
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return letter[1].toLowerCase();
  const digit = /^Digit([0-9])$/.exec(code);
  if (digit) return digit[1];
  if (code === "Space") return "space";
  if (code === "Enter" || code === "NumpadEnter") return "enter";
  if (code === "Escape") return "escape";
  if (code === "Slash") return "/";
  const arrow = /^Arrow(Up|Down|Left|Right)$/.exec(code);
  if (arrow) return `arrow${arrow[1].toLowerCase()}`;
  return null;
}
