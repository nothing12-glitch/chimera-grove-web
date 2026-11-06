import {
  CROPS,
  CROP_ORDER,
  NETWORK_ONLY_SEEDS,
  type CropId,
} from "../data/crops";
import {
  POTIONS,
  POTION_ORDER,
  canBrew,
  recipeText,
  type PotionId,
} from "../data/potions";
import { SPIRITS, SPIRIT_ORDER, TRUST_MAX } from "../data/spirits";
import { CAN_CAPACITY, DAY_LENGTH, type Game, type Slot } from "./state";
import type { Hint } from "./systems";

export type ShopAction = { type: "buy" | "sell"; crop: CropId; qty: number };

export type BrewAction = { type: "brew" | "drink"; potion: PotionId };

export type SpiritView = {
  id: string;
  trust: number;
  want: CropId;
  fed: boolean;
};

export type CaveView = { name: string; layer: number; tide: number };

type IconResolver = (slot: Slot) => HTMLCanvasElement | null;

export class Hud {
  private day = must<HTMLDivElement>("#stat-day");
  private clock = must<HTMLDivElement>("#stat-clock");
  private coins = must<HTMLDivElement>("#stat-coins");
  private water = must<HTMLDivElement>("#stat-water");
  private ready = must<HTMLDivElement>("#stat-ready");
  private hint = must<HTMLDivElement>("#hint");
  private hotbar = must<HTMLDivElement>("#hotbar");
  private toasts = must<HTMLDivElement>("#toasts");
  private shop = must<HTMLDivElement>("#shop");
  private shopRows = must<HTMLDivElement>("#shop-rows");
  private shopShown = false;
  private brewShown = false;
  private help = must<HTMLDivElement>("#help");
  private spiritBox = must<HTMLDivElement>("#spirits");
  private caveBox = must<HTMLDivElement>("#cave-view");
  private brew = must<HTMLDivElement>("#brew");
  private brewRows = must<HTMLDivElement>("#brew-rows");
  private buffs = must<HTMLDivElement>("#buffs");
  private caveDepth = must<HTMLSpanElement>("#cave-depth");
  private caveNameEl = must<HTMLSpanElement>("#cave-name");
  private tideFill = must<HTMLElement>("#cave-tide");
  private tideLabel = must<HTMLSpanElement>("#cave-tide-text");
  private spiritRows: {
    el: HTMLDivElement;
    dots: HTMLSpanElement;
    want: HTMLSpanElement;
  }[] = [];
  private slots: {
    el: HTMLButtonElement;
    canvas: HTMLCanvasElement;
    count: HTMLSpanElement;
    dry: HTMLSpanElement;
  }[] = [];

  constructor(
    private icon: IconResolver,
    private flask: (color: string) => HTMLCanvasElement,
  ) {
    const layout = [
      { kind: "tool", tool: "hoe" },
      { kind: "tool", tool: "can" },
    ] as Slot[];
    CROP_ORDER.forEach((crop) => layout.push({ kind: "seed", crop }));
    layout.push({ kind: "empty" });

    layout.forEach((_slot, i) => {
      const el = document.createElement("button");
      el.className = "slot";
      el.dataset.slot = String(i);
      const num = document.createElement("span");
      num.className = "num";
      num.textContent = String(i + 1);
      const canvas = document.createElement("canvas");
      const count = document.createElement("span");
      count.className = "count";
      const dry = document.createElement("span");
      dry.className = "dry";
      el.append(num, canvas, count, dry);
      this.hotbar.append(el);
      this.slots.push({ el, canvas, count, dry });
    });

    SPIRIT_ORDER.forEach((id) => {
      const def = SPIRITS[id];
      const el = document.createElement("div");
      el.className = "spirit";
      el.dataset.label = `${def.name} · ${def.latin}`;
      const name = document.createElement("span");
      name.className = "sname";
      name.textContent = def.name;
      const dots = document.createElement("span");
      dots.className = "dots";
      const want = document.createElement("span");
      want.className = "swant";
      el.append(name, dots, want);
      this.spiritBox.append(el);
      this.spiritRows.push({ el, dots, want });
    });
  }

  onSlotClick(cb: (index: number) => void): void {
    this.slots.forEach((s, i) => s.el.addEventListener("click", () => cb(i)));
  }

  onShopAction(cb: (a: ShopAction) => void): void {
    this.shopRows.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>(
        "button[data-act]",
      );
      if (!b) return;
      cb({
        type: b.dataset.act as "buy" | "sell",
        crop: b.dataset.crop as CropId,
        qty: Number(b.dataset.qty),
      });
    });
  }

  onShopClose(cb: () => void): void {
    must<HTMLButtonElement>("#shop-close").addEventListener("click", cb);
  }

  onBrewAction(cb: (a: BrewAction) => void): void {
    this.brewRows.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>(
        "button[data-act]",
      );
      if (!b) return;
      cb({
        type: b.dataset.act as "brew" | "drink",
        potion: b.dataset.potion as PotionId,
      });
    });
  }

  onBrewClose(cb: () => void): void {
    must<HTMLButtonElement>("#brew-close").addEventListener("click", cb);
  }

  onHelpToggle(cb: (open: boolean) => void): void {
    must<HTMLButtonElement>("#btn-help").addEventListener("click", () =>
      cb(true),
    );
    must<HTMLButtonElement>("#help-close").addEventListener("click", () =>
      cb(false),
    );
  }

  onReset(cb: () => void): void {
    must<HTMLButtonElement>("#btn-reset").addEventListener("click", cb);
  }

  refresh(
    g: Game,
    hint: Hint | null,
    readyCount: number,
    spirits: SpiritView[] = [],
    cave: CaveView | null = null,
  ): void {
    this.day.textContent = `День ${g.day}`;
    const hours = 8 + (g.dayTime / DAY_LENGTH) * 12;
    const hh = Math.floor(hours);
    const mm = Math.floor((hours - hh) * 60);
    this.clock.textContent = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    this.coins.textContent = String(g.coins);
    this.water.textContent = `${g.charges}/${CAN_CAPACITY}`;
    this.ready.classList.toggle("on", readyCount > 0);
    this.ready.textContent = readyCount ? `Готово до збору: ${readyCount}` : "";

    this.hint.classList.toggle("on", !!hint);
    if (hint)
      this.hint.innerHTML = `<b>${escape(hint.key)}</b>${escape(hint.label)}`;

    this.caveBox.hidden = !cave;
    if (cave) {
      this.caveDepth.textContent = `Глибина ${cave.layer + 1}`;
      this.caveNameEl.textContent = cave.name;
      this.tideFill.style.width = `${Math.round(cave.tide * 100)}%`;
      this.caveBox.classList.toggle("danger", cave.tide >= 0.62);
      this.tideLabel.textContent =
        cave.tide >= 0.62 ? "Прилив надходить!" : "Прилив спор";
    }

    // Systems only flip the flags; nobody else tells the DOM panels about it.
    if (g.shopOpen !== this.shopShown) this.setShop(g.shopOpen, g);
    if (g.brewOpen !== this.brewShown) this.setBrew(g.brewOpen, g);

    const active: { text: string; color: string }[] = [];
    if (g.effects.speed > 0)
      active.push({
        text: `Роса ${Math.ceil(g.effects.speed)} с`,
        color: POTIONS.dew.color,
      });
    if (g.effects.light > 0)
      active.push({
        text: `Мастило ${Math.ceil(g.effects.light)} с`,
        color: POTIONS.lamp_oil.color,
      });
    if (g.effects.calm > 0)
      active.push({
        text: `Вітер ${Math.ceil(g.effects.calm)} с`,
        color: POTIONS.calm_wind.color,
      });
    if (g.growth > 0)
      active.push({
        text: `Квінтесенція ${g.growth} св.`,
        color: POTIONS.quintessence.color,
      });
    this.buffs.hidden = active.length === 0;
    this.buffs.replaceChildren(
      ...active.map((b) => {
        const chip = document.createElement("span");
        chip.textContent = b.text;
        chip.style.setProperty("--brew", b.color);
        return chip;
      }),
    );

    g.slots.forEach((slot, i) => {
      const cell = this.slots[i];
      if (!cell) return;
      cell.el.classList.toggle("sel", i === g.selected);
      cell.el.classList.toggle("empty", slot.kind === "empty");
      const src = this.icon(slot);
      if (src) blit(cell.canvas, src);
      else
        cell.canvas
          .getContext("2d")!
          .clearRect(0, 0, cell.canvas.width, cell.canvas.height);

      let label = "";
      if (slot.kind === "seed") {
        const n = g.seeds[slot.crop];
        label = `×${n}`;
        cell.count.classList.toggle("zero", n === 0);
        cell.el.dataset.label = `${CROPS[slot.crop].name} · ${CROPS[slot.crop].latin}`;
      } else {
        cell.count.classList.remove("zero");
        cell.el.dataset.label =
          slot.kind === "tool"
            ? slot.tool === "can"
              ? "Лійка"
              : "Мотика"
            : "Порожньо";
      }
      cell.count.textContent = label;
      cell.dry.textContent =
        slot.kind === "tool" && slot.tool === "can"
          ? `${g.charges}`
          : slot.kind === "seed"
            ? `${g.harvest[slot.crop]}`
            : "";
    });

    SPIRIT_ORDER.forEach((id, i) => {
      const row = this.spiritRows[i];
      if (!row) return;
      const s = spirits.find((v) => v.id === id);
      if (!s) {
        row.el.classList.add("off");
        return;
      }
      row.el.classList.toggle("fed", s.fed);
      row.el.classList.toggle("friend", s.trust >= TRUST_MAX);
      row.dots.textContent =
        "●".repeat(s.trust) + "○".repeat(TRUST_MAX - s.trust);
      row.want.textContent = s.fed ? "ситий" : CROPS[s.want].name;
    });
  }

  setShop(open: boolean, g: Game): void {
    this.shopShown = open;
    this.shop.hidden = !open;
    if (!open) return;
    this.shopRows.replaceChildren(
      ...CROP_ORDER.map((crop) => {
        const def = CROPS[crop];
        const row = document.createElement("div");
        row.className = "row";

        const icon = document.createElement("canvas");
        const src = this.icon({ kind: "seed", crop });
        if (src) blit(icon, src);

        const info = document.createElement("div");
        const owned = g.seeds[crop];
        const stock = g.harvest[crop];
        info.innerHTML = `<h3>${escape(def.name)}</h3><p class="sub">${escape(def.latin)} · насіння ${def.seedCost} · урожай ${def.sellPrice} · у мішку ${owned} · зібрано ${stock}</p>`;

        const acts = document.createElement("div");
        acts.className = "acts";
        if (NETWORK_ONLY_SEEDS.includes(crop)) {
          const note = document.createElement("span");
          note.className = "nope";
          note.textContent = "Спори лише з Мережі Коренів";
          acts.append(
            note,
            btn("sell", crop, 1, "Продати 1", stock < 1),
            btn(
              "sell",
              crop,
              stock || 1,
              `Продати все · ${stock * def.sellPrice}`,
              stock < 1,
            ),
          );
        } else {
          acts.append(
            btn(
              "buy",
              crop,
              1,
              `Купити 1 · ${def.seedCost}`,
              g.coins < def.seedCost,
            ),
            btn(
              "buy",
              crop,
              5,
              `×5 · ${def.seedCost * 5}`,
              g.coins < def.seedCost * 5,
            ),
            btn("sell", crop, 1, "Продати 1", stock < 1),
            btn(
              "sell",
              crop,
              stock || 1,
              `Продати все · ${stock * def.sellPrice}`,
              stock < 1,
            ),
          );
        }

        row.append(icon, info, acts);
        return row;
      }),
    );
  }

  setHelp(open: boolean): void {
    this.help.hidden = !open;
  }

  setBrew(open: boolean, g: Game): void {
    this.brewShown = open;
    this.brew.hidden = !open;
    if (!open) return;
    this.brewRows.replaceChildren(
      ...POTION_ORDER.map((id) => {
        const def = POTIONS[id];
        const row = document.createElement("div");
        row.className = "row";

        const icon = document.createElement("canvas");
        blit(icon, this.flask(def.color));

        const info = document.createElement("div");
        const title = document.createElement("h3");
        title.textContent = def.name;
        const sub = document.createElement("p");
        sub.className = "sub";
        sub.textContent = `${def.latin} · у кишені ${g.potions[id]}`;
        const list = document.createElement("p");
        list.className = "sub needs";
        for (const [crop, qty] of Object.entries(def.needs)) {
          const need = qty ?? 0;
          const have = g.harvest[crop as CropId];
          const chip = document.createElement("span");
          chip.className = have >= need ? "ok" : "lack";
          chip.textContent = `${CROPS[crop as CropId].name} ${have}/${need}`;
          list.append(chip);
        }
        const blurb = document.createElement("p");
        blurb.className = "sub";
        blurb.textContent = def.blurb;
        info.append(title, sub, list, blurb);

        const acts = document.createElement("div");
        acts.className = "acts";
        acts.append(
          brewBtn(
            "brew",
            id,
            `Варити · ${recipeText(def)}`,
            !canBrew(g.harvest, def),
          ),
          brewBtn("drink", id, `Випити`, g.potions[id] < 1),
        );

        row.append(icon, info, acts);
        return row;
      }),
    );
  }

  get helpOpen(): boolean {
    return !this.help.hidden;
  }

  toast(text: string, tone: "good" | "bad" | "info" = "info"): void {
    const el = document.createElement("div");
    el.className = `toast ${tone}`;
    el.textContent = text;
    this.toasts.append(el);
    while (this.toasts.children.length > 5)
      this.toasts.firstElementChild?.remove();
    setTimeout(() => {
      el.classList.add("fade");
      setTimeout(() => el.remove(), 520);
    }, 2600);
  }
}

function btn(
  act: "buy" | "sell",
  crop: CropId,
  qty: number,
  label: string,
  disabled: boolean,
): HTMLButtonElement {
  const b = document.createElement("button");
  b.textContent = label;
  b.disabled = disabled;
  b.dataset.act = act;
  b.dataset.crop = crop;
  b.dataset.qty = String(qty);
  return b;
}

function brewBtn(
  act: "brew" | "drink",
  potion: PotionId,
  label: string,
  disabled: boolean,
): HTMLButtonElement {
  const b = document.createElement("button");
  b.textContent = label;
  b.disabled = disabled;
  b.dataset.act = act;
  b.dataset.potion = potion;
  return b;
}

function blit(target: HTMLCanvasElement, src: HTMLCanvasElement): void {
  target.width = src.width;
  target.height = src.height;
  const c = target.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, target.width, target.height);
  c.drawImage(src, 0, 0);
}

function must<T extends HTMLElement>(sel: string): T {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing element ${sel}`);
  return el;
}

function escape(s: string): string {
  return s.replace(
    /[&<>]/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch] ?? ch,
  );
}
