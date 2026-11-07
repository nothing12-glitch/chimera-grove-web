/**
 * The grove must answer to the key you physically press, not to whatever
 * letter the current layout prints on it. This check types with a Ukrainian
 * keyboard and expects the alchemist to walk.
 */
import {
  attachInput,
  axis,
  endFrame,
  isDown,
  wasPressed,
} from "../src/core/input";

type Fake = {
  key: string;
  code: string;
  repeat: boolean;
  prevented: boolean;
  preventDefault(): void;
};

const listeners = new Map<string, ((e: Fake) => void)[]>();
const target = {
  addEventListener(type: string, fn: (e: Fake) => void) {
    const list = listeners.get(type) ?? [];
    list.push(fn);
    listeners.set(type, list);
  },
} as unknown as Window;

function send(type: "keydown" | "keyup", key: string, code: string): Fake {
  const e: Fake = {
    key,
    code,
    repeat: false,
    prevented: false,
    preventDefault: () => {
      e.prevented = true;
    },
  };
  for (const fn of listeners.get(type) ?? []) fn(e);
  return e;
}

attachInput(target);

let bad = 0;
const fail = (m: string) => {
  console.error(m);
  bad++;
};

/** [physical key, the letter a Ukrainian layout prints for it] */
const LAYOUT: [string, string][] = [
  ["KeyW", "г"],
  ["KeyA", "ф"],
  ["KeyS", "і"],
  ["KeyD", "в"],
  ["KeyE", "у"],
  ["KeyM", "и"],
];

for (const [code, cyrillic] of LAYOUT) {
  const letter = code.slice(3).toLowerCase();
  send("keydown", cyrillic, code);
  if (!wasPressed(cyrillic)) fail(`${code} printed as "${cyrillic}" lost its letter`);
  if (!wasPressed(letter)) fail(`${code} did not also register as "${letter}"`);
  if (!isDown(letter)) fail(`${code} printed as "${cyrillic}" is not held`);
  send("keyup", cyrillic, code);
  if (isDown(letter)) fail(`${code} stuck down`);
  endFrame();
  if (wasPressed(letter)) fail(`${letter} still counted as pressed next frame`);
}

send("keydown", "в", "KeyD");
send("keydown", "г", "KeyW");
const a = axis();
if (a.x <= 0 || a.y >= 0) fail(`walking up-right on a Ukrainian layout gave ${a.x},${a.y}`);
send("keyup", "в", "KeyD");
send("keyup", "г", "KeyW");

send("keydown", "4", "Digit4");
if (!wasPressed("4")) fail("Digit4 did not select slot four");
send("keyup", "4", "Digit4");

const arrow = send("keydown", "ArrowLeft", "ArrowLeft");
if (!isDown("arrowleft")) fail("ArrowLeft ignored");
if (!arrow.prevented) fail("ArrowLeft scrolled the page instead of walking");
send("keyup", "ArrowLeft", "ArrowLeft");

// Some layouts print a word on the arrows; the code alone must still walk.
const odd = send("keydown", "ливоруч", "ArrowLeft");
if (!isDown("arrowleft")) fail("ArrowLeft lost its physical name");
if (!odd.prevented) fail("ArrowLeft printed as a word scrolled the page");
send("keyup", "ливоруч", "ArrowLeft");

send("keydown", " ", "Space");
if (!isDown("space")) fail("Space did not become space");
send("keyup", " ", "Space");
endFrame();

console.log(
  bad
    ? `${bad} input problem(s)`
    : "WASD, digits, arrows and space all answer to the physical key",
);
process.exit(bad ? 1 : 0);
