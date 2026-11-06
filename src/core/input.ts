const pressed = new Set<string>();
const justPressed = new Set<string>();
let wheelDelta = 0;

export function attachInput(target: Window): void {
  target.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    const k = normalize(e.key);
    pressed.add(k);
    justPressed.add(k);
    if (BLOCKING.has(k)) e.preventDefault();
  });
  target.addEventListener("keyup", (e) => pressed.delete(normalize(e.key)));
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
