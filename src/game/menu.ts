import {
  ACHIEVEMENTS,
  achievementRows,
  type AchievementRow,
} from "../data/achievements";
import { CROPS, CROP_ORDER } from "../data/crops";
import { POTIONS, POTION_ORDER } from "../data/potions";
import type { Stats } from "../data/stats";
import type { Settings } from "./settings";

/** Which root page the menu was opened from: the title or the pause. */
export type MenuRoot = "title" | "pause";

type Page =
  | MenuRoot
  | "achievements"
  | "settings"
  | "credits"
  | "confirm";

export type MenuPage = Page;

export type MenuAction =
  | { type: "resume" }
  | { type: "saveNow" }
  | { type: "toTitle" }
  | { type: "help" }
  | { type: "dropSave" }
  | { type: "toggle"; key: SettingKey }
  | { type: "dayLength"; minutes: number };

export type SettingKey = "shake" | "radar" | "hints";

export type MenuView = {
  /** a save is waiting in this browser */
  hasSave: boolean;
  day: number;
  place: string;
  stats: Stats;
  settings: Settings;
  dayOptions: readonly number[];
};

type Item = {
  label: string;
  /** right-aligned value: a counter, «Увімкнено», «6 хв» */
  note?: string;
  detail: string;
  /** what Enter or a click does; absent for rows that only inform */
  run?: () => void;
  /** a finished badge: the wall is unreadable without a mark for it */
  done?: boolean;
};

const ON = "Увімкнено";
const OFF = "Вимкнено";

/**
 * The title screen, the pause screen and the pages that hang off them. All of
 * it is DOM over a live canvas: the grove keeps breathing behind the menu, so
 * nobody ever looks at a flat poster.
 */
export class Menu {
  private root: MenuRoot = "title";
  private page: Page = "title";
  private items: Item[] = [];
  private sel = 0;
  private view: MenuView;
  private action: (a: MenuAction) => void = () => {};

  private box = document.querySelector<HTMLElement>("#menu");
  private heading = must<HTMLHeadingElement>("#menu-title");
  private sub = must<HTMLElement>("#menu-sub");
  private list = must<HTMLElement>("#menu-items");
  private detail = must<HTMLElement>("#menu-detail");
  private buttons: HTMLButtonElement[] = [];

  constructor(view: MenuView) {
    this.view = view;
  }

  onAction(cb: (a: MenuAction) => void): void {
    this.action = cb;
  }

  get isOpen(): boolean {
    return !!this.box && !this.box.hidden;
  }

  get pageName(): Page {
    return this.page;
  }

  open(root: MenuRoot, view: MenuView): void {
    this.root = root;
    this.show(root, view);
  }

  close(): void {
    if (!this.box) return;
    this.box.hidden = true;
  }

  /** Called every frame the menu is open, so counters and toggles stay honest. */
  update(view: MenuView): void {
    this.view = view;
    if (this.isOpen) this.render(view);
  }

  /** Arrow / WASD movement, Enter and Escape, read from the game loop. */
  nav(move: number, activate: boolean, escape: boolean): void {
    if (!this.isOpen) return;
    if (escape) {
      this.escape();
      return;
    }
    if (move !== 0 && this.buttons.length) {
      const n = this.buttons.length;
      this.sel = (this.sel + move + n) % n;
      this.paintSelection();
    }
    if (activate) this.buttons[this.sel]?.click();
  }

  private escape(): void {
    if (this.page === "pause") {
      this.action({ type: "resume" });
      return;
    }
    if (this.page !== "title") this.show(this.root, this.view);
  }

  private show(next: Page, view: MenuView): void {
    if (!this.box) return;
    this.page = next;
    this.sel = 0;
    this.box.hidden = false;
    this.render(view);
  }

  private render(view: MenuView): void {
    this.view = view;
    this.heading.textContent = menuTitle(this.page);
    this.sub.textContent = menuSub(this.page, view);
    this.items = this.build(view);
    this.buttons = [];
    this.list.replaceChildren(
      ...this.items.map((item, i) => {
        const b = document.createElement("button");
        b.className = item.done ? "menu-item done" : "menu-item";
        b.type = "button";
        const label = document.createElement("span");
        label.className = "menu-label";
        label.textContent = item.label;
        b.append(label);
        if (item.note) {
          const note = document.createElement("span");
          note.className = "menu-note";
          note.textContent = item.note;
          b.append(note);
        }
        if (!item.run) b.disabled = true;
        b.addEventListener("mouseenter", () => {
          this.sel = i;
          this.paintSelection();
        });
        b.addEventListener("click", () => {
          // Without the blur, Enter would also re-fire the button the mouse
          // last touched, and one keypress would read as two choices.
          b.blur();
          item.run?.();
        });
        this.buttons.push(b);
        return b;
      }),
    );
    if (this.sel >= this.buttons.length) this.sel = 0;
    this.paintSelection();
  }

  private build(view: MenuView): Item[] {
    switch (this.page) {
      case "title":
        return this.titleItems(view);
      case "pause":
        return this.pauseItems(view);
      case "confirm":
        return [
          {
            label: "Стерти сейв і почати заново",
            detail: `День ${view.day} і все, що він накопичив, зникне. Сам гай лишиться тим самим: карта, дороги й склепіння ростуть з одного насіння.`,
            run: () => this.action({ type: "dropSave" }),
          },
          {
            label: "Назад",
            detail: "Повернутися до меню, нічого не стираючи.",
            run: () => this.show(this.root, view),
          },
        ];
      case "settings":
        return this.settingItems(view);
      case "achievements":
        return this.achievementItems(view);
      case "credits":
        return creditsItems(() => this.show(this.root, view));
    }
  }

  private titleItems(view: MenuView): Item[] {
    const rows: Item[] = [];
    if (view.hasSave)
      rows.push({
        label: "Продовжити",
        note: `день ${view.day}`,
        detail: `Алхімік лишився там, де його залишив — ${view.place}. Грядки, торговці й розблоковані ходи цілі.`,
        run: () => this.action({ type: "resume" }),
      });
    rows.push({
      label: view.hasSave ? "Нова гра" : "Почати гру",
      detail: view.hasSave
        ? "Світанок першого дня. Спершу меню спитає, чи справді стерти поточний сейв."
        : "Ти вигнаний алхімік із мішком насіння Місячної Пелюстки, трьома духами й гаєм, що ще не знає твого імені.",
      run: () =>
        view.hasSave
          ? this.show("confirm", view)
          : this.action({ type: "resume" }),
    });
    rows.push(this.helpItem(), ...this.sharedItems(view));
    return rows;
  }

  private pauseItems(view: MenuView): Item[] {
    return [
      {
        label: "Продовжити",
        note: `день ${view.day}`,
        detail: "Годинник, химери й прилив спор дочекаються тебе — нічого не зміниться за паузою.",
        run: () => this.action({ type: "resume" }),
      },
      {
        label: "Зберегти зараз",
        detail: "Гай зберігається сам на світанку й у кожній угоді; ця кнопка робить те саме просто тепер.",
        run: () => this.action({ type: "saveNow" }),
      },
      this.helpItem(),
      ...this.sharedItems(view),
      {
        label: "У головне меню",
        detail: "Сейв пишеться перед виходом, тож «Продовжити» верне тебе рівно туди, де ти стояв.",
        run: () => this.action({ type: "toTitle" }),
      },
    ];
  }

  private sharedItems(view: MenuView): Item[] {
    const got = achievementRows(view.stats).filter((r) => r.unlocked).length;
    return [
      {
        label: "Досягнення",
        note: `${got} / ${ACHIEVEMENTS.length}`,
        detail: "Спогади гаю: жнива, зілля, зуби ночі й Коріння — і суха статистика під ними.",
        run: () => this.show("achievements", view),
      },
      {
        label: "Налаштування",
        detail: "Тремтіння екрана, радар у куті, підказка під ногами й тривалість доби. Живуть окремо від сейва.",
        run: () => this.show("settings", view),
      },
      {
        label: "Про гай",
        detail: "Хто намалював цей світ, звідки взято тайли й де лежить код.",
        run: () => this.show("credits", view),
      },
    ];
  }

  private settingItems(view: MenuView): Item[] {
    const s = view.settings;
    const at = (key: SettingKey) => () => this.action({ type: "toggle", key });
    return [
      {
        label: "Тремтіння екрана",
        note: s.shake ? ON : OFF,
        detail: "Серп, обвал і доланий Володар трусять камеру. Вимкни, якщо пікселі завмирають перед очима.",
        run: at("shake"),
      },
      {
        label: "Радар у кутку",
        note: s.radar ? ON : OFF,
        detail: "Мапа найближчих тайлів: червоним — зуби поруч, бірюзовим — духи, жовтим — ти сам.",
        run: at("radar"),
      },
      {
        label: "Підказка під ногами",
        note: s.hints ? ON : OFF,
        detail: "Рядок, що каже, чим буде E: розорати, полити, пригостити, вдарити. Вимкнено — гай мовчить.",
        run: at("hints"),
      },
      ...view.dayOptions.map((minutes) => ({
        label: `Доба триває ${minutes} хв`,
        note: s.dayMinutes === minutes ? "зараз" : undefined,
        detail:
          minutes === 6
            ? "Швидкі жнива: світанок удвічі частіше — для тих, хто хоче бачити, як росте."
            : minutes === 24
              ? "Довгий день: цілу добу можна гуляти пішки, говорити з сусідами й не боятися ночі."
              : "Як задумано: одна секунда реального часу — одна хвилина в гаю, від 08:00 до 20:00.",
        run: () => this.action({ type: "dayLength", minutes }),
      })),
      {
        label: "Назад",
        detail: "Повернутися до меню. Усе вибране вже збережено.",
        run: () => this.show(this.root, view),
      },
    ];
  }

  private achievementItems(view: MenuView): Item[] {
    const rows: AchievementRow[] = achievementRows(view.stats);
    return [
      ...rows.map((r) => ({
        label: r.a.name,
        note: `${fmt(r.value)} / ${fmt(r.a.goal)}${r.a.unit ? ` ${r.a.unit}` : ""}`,
        detail: r.a.blurb + (r.unlocked ? " — здобуто" : ""),
        done: r.unlocked,
      })),
      ...statItems(view.stats),
      {
        label: "Назад",
        detail: "Повернутися до меню.",
        run: () => this.show(this.root, view),
      },
    ];
  }

  private helpItem(): Item {
    return {
      label: "Як грати",
      detail:
        "Керування, цикл гри, п'ять біомів, Мережа Коренів, зілля й зуби ночі — усе в одному вікні (клавіша H).",
      run: () => this.action({ type: "help" }),
    };
  }

  private paintSelection(): void {
    this.buttons.forEach((b, i) => b.classList.toggle("sel", i === this.sel));
    this.detail.textContent = this.items[this.sel]?.detail ?? "—";
    this.buttons[this.sel]?.scrollIntoView({ block: "nearest" });
  }
}

function menuTitle(page: Page): string {
  if (page === "title") return "Химерний Гай";
  if (page === "pause") return "Гай застиг";
  if (page === "achievements") return "Спогади гаю";
  if (page === "settings") return "Налаштування";
  if (page === "credits") return "Про гай";
  return "Перевір ще раз";
}

function menuSub(page: Page, view: MenuView): string {
  const badges = achievementRows(view.stats).filter((r) => r.unlocked).length;
  if (page === "pause")
    return `День ${view.day} · ${view.place} · спогади ${badges}/${ACHIEVEMENTS.length}`;
  if (page === "confirm") return `Сейв дня ${view.day} — ${view.place}`;
  if (page === "achievements") return "Що гай запам'ятав про тебе";
  if (page === "settings") return "Окремо від сейва, у цьому браузері";
  if (page === "credits") return "Арт, код і подяки";
  return view.hasSave
    ? "Гай пам'ятає твій останній ранок"
    : "Піксельна алхімія у браузері";
}

function creditsItems(back: () => void): Item[] {
  const row = (label: string, detail: string): Item => ({ label, detail });
  return [
    row(
      "Арт — Pixel Crawler",
      "Усі тайли, дерева, хати, станції, екіпажі та смуги падіння взято з безкоштовного набору «Pixel Crawler — Topdown Tileset RPG 16×16 Sprites» автора Anokolisa. Умови використання лежать поруч з артом: public/art/pack/LICENSE-Pixel-Crawler.txt.",
    ),
    row(
      "Код — Chimera Grove",
      "TypeScript, Vite і Canvas 2D без рушія: 320×180 арт-пікселів, цілий масштаб, нуль згладжування. Дизайн-конспект для Godot лишився в репозиторії nothing12-glitch/chimera-grove.",
    ),
    row(
      "Мова гаю",
      "Усі підказки, імена культур і репліки сусідів — українською. Марта поливає грядки звечора, Гриць не виходить з-за столі вночі, а серп у руках алхіміка — молитва, а не зброя.",
    ),
    { label: "Назад", detail: "Повернутися до меню.", run: back },
  ];
}

function statItems(s: Stats): Item[] {
  const crops = CROP_ORDER.map((c) => `${CROPS[c].name} ${s.crops[c]}`)
    .filter((t) => !t.endsWith(" 0"))
    .join(" · ");
  const brews = POTION_ORDER.map((p) => `${POTIONS[p].name} ${s.brews[p]}`)
    .filter((t) => !t.endsWith(" 0"))
    .join(" · ");
  return [
    {
      label: "Світанків пережито",
      note: fmt(s.dawns),
      detail: "Кожна доба, яку алхімік дочекав — біля вогню, у печері чи в дорозі між біомами.",
    },
    {
      label: "Урожаю зібрано",
      note: fmt(s.harvested),
      detail: crops || "Грядки ще не давали нічого: мотика, насінина, лійка — і чекай світанку.",
    },
    {
      label: "Зілля зварено",
      note: fmt(s.brewed),
      detail: brews || "Казан ще не горів.",
    },
    {
      label: "Химер валено",
      note: fmt(s.felled),
      detail: "Зуби ночі та мешканці глибин, що не дочекались світанку.",
    },
    {
      label: "Сонцязі зароблено",
      note: fmt(s.earned),
      detail: "Усі надходження разом: жнива, торгівля, духи, вузлики та вбиті. Витрачене не віднімається.",
    },
    {
      label: "Кроків пройдено",
      note: `${fmt(s.steps)} тайлів`,
      detail: "Шлях ногами, а не камерою — від галявини до останнього розв'язаного вузлика.",
    },
  ];
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n));
}

function must<T extends HTMLElement>(sel: string): T {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing element ${sel}`);
  return el;
}
