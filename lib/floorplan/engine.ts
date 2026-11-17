import {
  clamp,
  constrainViewport,
  distance,
  easeOutCubic,
  interpolateViewport,
  NO_INSETS,
  rubberBand,
  rubberScale,
  scaleBounds,
  worldCenter,
  zoomAt,
  type Insets,
  type Point,
  type Size,
  type Viewport,
} from "./viewport";

export interface ViewportEngineOptions {
  /** Primijeni viewport na prikaz (poziva se najviše jednom po kadru). */
  apply: (viewport: Viewport) => void;
  /** Dodir bez pomaka. Koordinate su u px kontejnera. */
  onTap: (point: Point, viewport: Viewport) => void;
  /** Pomak miša bez pritisnute tipke; vraća true ako je iznad nečeg što se može odabrati. */
  onHover?: (point: Point, viewport: Viewport) => boolean;
  reducedMotion?: boolean;
}

const TAP_SLOP_PX = 8;
const TAP_MAX_MS = 450;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP_PX = 28;
const DOUBLE_TAP_ZOOM = 2;
/** Vremenska konstanta usporavanja inercije (ms). */
const INERTIA_DECAY_MS = 325;
const INERTIA_MIN_SPEED = 0.02;
const INERTIA_START_SPEED = 0.12;
const VELOCITY_WINDOW_MS = 90;
const WHEEL_SMOOTHING_MS = 70;
const TWEEN_MS = 380;
const SETTLE_MS = 300;

type Mode =
  | { kind: "idle" }
  | { kind: "tween"; from: Viewport; to: Viewport; start: number; duration: number }
  | { kind: "inertia"; vx: number; vy: number; last: number }
  | { kind: "wheel"; scale: number; anchor: Point; last: number };

/**
 * Upravlja pomicanjem i zumiranjem tlocrta izvan Reacta: prsti, miš, kotačić i animacije
 * mijenjaju viewport izravno, kadar po kadar, bez ponovnog renderiranja komponenti.
 */
export class ViewportEngine {
  private container: Size = { width: 1, height: 1 };
  private floor: Size = { width: 1, height: 1 };
  private insets: Insets = NO_INSETS;
  /** Stalne kontrole preko tlocrta; cijela etaža mora stati između njih. */
  private chrome: Insets = NO_INSETS;
  private floorKey: string | null = null;
  /** Logički viewport; tijekom geste smije biti izvan granica. */
  private raw: Viewport = { scale: 1, x: 0, y: 0 };
  /** Prikazani viewport (s elastičnim otporom na rubovima). */
  private shown: Viewport = { scale: 1, x: 0, y: 0 };
  private mode: Mode = { kind: "idle" };
  private frame = 0;
  private dirty = false;

  private readonly pointers = new Map<number, Point>();
  private gesture: { center: Point; spread: number } | null = null;
  private samples: { time: number; center: Point }[] = [];
  private tap: { start: number; origin: Point; moved: boolean } | null = null;
  private lastTap: { time: number; point: Point } | null = null;
  private multiTouch = false;

  constructor(
    private readonly element: HTMLElement,
    private readonly options: ViewportEngineOptions,
  ) {
    element.addEventListener("pointerdown", this.onPointerDown);
    element.addEventListener("pointermove", this.onPointerMove);
    element.addEventListener("pointerup", this.onPointerEnd);
    element.addEventListener("pointercancel", this.onPointerEnd);
    element.addEventListener("wheel", this.onWheel, { passive: false });
  }

  destroy(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.element.removeEventListener("pointerdown", this.onPointerDown);
    this.element.removeEventListener("pointermove", this.onPointerMove);
    this.element.removeEventListener("pointerup", this.onPointerEnd);
    this.element.removeEventListener("pointercancel", this.onPointerEnd);
    this.element.removeEventListener("wheel", this.onWheel);
  }

  get viewport(): Viewport {
    return this.shown;
  }

  /** Nova veličina kontejnera ili druga etaža. Druga etaža kreće od prikaza cijele etaže. */
  setGeometry(container: Size, floor: Size, floorKey: string, chrome: Insets = NO_INSETS): void {
    const sameFloor = this.floorKey === floorKey;
    const previous = this.container;
    const previousFit = sameFloor ? this.bounds().min : 0;
    const center = worldCenter(this.raw, previous);
    this.container = container;
    this.floor = floor;
    this.floorKey = floorKey;
    this.chrome = chrome;
    if (this.insets === NO_INSETS) this.insets = chrome;
    this.stop();
    if (!sameFloor) {
      this.set(this.fit());
      this.flush();
      return;
    }
    // Ista etaža u novoj veličini: zadrži isto mjesto i isti relativni zoom.
    const scale = this.raw.scale * (this.bounds().min / previousFit);
    this.set(
      this.constrain({ scale, x: container.width / 2 - center.x * scale, y: container.height / 2 - center.y * scale }),
    );
    this.flush();
  }

  /** Panel je prekrio dio tlocrta (ili ga otkrio): vrati sadržaj u vidljivi dio. */
  setInsets(insets: Insets): void {
    this.insets = insets;
    if (this.pointers.size === 0 && this.mode.kind === "idle") this.animateTo(this.constrain(this.raw), SETTLE_MS);
  }

  zoomBy(factor: number, anchor?: Point): void {
    const point = anchor ?? this.visibleCenter();
    const base = this.mode.kind === "tween" ? this.mode.to : this.raw;
    const { min, max } = this.bounds();
    this.animateTo(this.constrain(zoomAt(base, point, clamp(base.scale * factor, min, max))));
  }

  panBy(dx: number, dy: number): void {
    const base = this.mode.kind === "tween" ? this.mode.to : this.raw;
    this.animateTo(this.constrain({ ...base, x: base.x + dx, y: base.y + dy }), 180);
  }

  reset(): void {
    this.animateTo(this.fit());
  }

  /** Dovedi točku tlocrta u sredinu vidljivog dijela, uz najmanje zadano mjerilo. */
  focus(world: Point, minScale: number): void {
    const { min, max } = this.bounds();
    const scale = clamp(Math.max(this.raw.scale, minScale), min, max);
    const center = this.visibleCenter();
    this.animateTo(this.constrain({ scale, x: center.x - world.x * scale, y: center.y - world.y * scale }));
  }

  /** Cijela etaža, centrirana u dijelu koji kontrole i panel ne prekrivaju. */
  private fit(): Viewport {
    return this.constrain({ scale: this.bounds().min, x: 0, y: 0 });
  }

  private bounds(): { min: number; max: number } {
    const { chrome, container } = this;
    return scaleBounds(
      {
        width: Math.max(1, container.width - chrome.left - chrome.right),
        height: Math.max(1, container.height - chrome.top - chrome.bottom),
      },
      this.floor,
    );
  }

  private constrain(viewport: Viewport): Viewport {
    return constrainViewport(viewport, this.container, this.floor, this.insets);
  }

  private visibleCenter(): Point {
    return {
      x: this.insets.left + (this.container.width - this.insets.left - this.insets.right) / 2,
      y: this.insets.top + (this.container.height - this.insets.top - this.insets.bottom) / 2,
    };
  }

  private set(viewport: Viewport): void {
    this.raw = viewport;
    this.show(viewport);
  }

  /** Primijeni odmah, bez čekanja sljedećeg kadra (prvi prikaz, promjena veličine). */
  private flush(): void {
    this.dirty = false;
    this.options.apply(this.shown);
  }

  private show(viewport: Viewport): void {
    this.shown = viewport;
    this.dirty = true;
    this.schedule();
  }

  private schedule(): void {
    if (this.frame === 0) this.frame = requestAnimationFrame(this.tick);
  }

  private stop(): void {
    if (this.mode.kind === "tween" || this.mode.kind === "wheel") this.raw = this.shown;
    this.mode = { kind: "idle" };
  }

  private animateTo(target: Viewport, duration = TWEEN_MS): void {
    const from = this.shown;
    const still =
      Math.abs(from.x - target.x) < 0.5 && Math.abs(from.y - target.y) < 0.5 && Math.abs(from.scale / target.scale - 1) < 0.001;
    if (still || this.options.reducedMotion) {
      this.mode = { kind: "idle" };
      this.set(target);
      return;
    }
    this.raw = target;
    this.mode = { kind: "tween", from, to: target, start: performance.now(), duration };
    this.schedule();
  }

  private readonly tick = (now: number): void => {
    this.frame = 0;
    const mode = this.mode;
    if (mode.kind === "tween") {
      const t = clamp((now - mode.start) / mode.duration, 0, 1);
      this.shown = interpolateViewport(mode.from, mode.to, easeOutCubic(t), this.container);
      this.dirty = true;
      if (t >= 1) this.mode = { kind: "idle" };
    } else if (mode.kind === "inertia") {
      const dt = Math.min(now - mode.last, 48);
      mode.last = now;
      const moved = { ...this.raw, x: this.raw.x + mode.vx * dt, y: this.raw.y + mode.vy * dt };
      const bounded = this.constrain(moved);
      if (bounded.x !== moved.x) mode.vx = 0;
      if (bounded.y !== moved.y) mode.vy = 0;
      const decay = Math.exp(-dt / INERTIA_DECAY_MS);
      mode.vx *= decay;
      mode.vy *= decay;
      this.raw = bounded;
      this.shown = bounded;
      this.dirty = true;
      if (Math.hypot(mode.vx, mode.vy) < INERTIA_MIN_SPEED) this.mode = { kind: "idle" };
    } else if (mode.kind === "wheel") {
      const dt = Math.min(now - mode.last, 48);
      mode.last = now;
      const ratio = mode.scale / this.raw.scale;
      const done = Math.abs(Math.log(ratio)) < 0.002;
      const scale = done ? mode.scale : this.raw.scale * ratio ** (1 - Math.exp(-dt / WHEEL_SMOOTHING_MS));
      this.raw = this.constrain(zoomAt(this.raw, mode.anchor, scale));
      this.shown = this.raw;
      this.dirty = true;
      if (done) this.mode = { kind: "idle" };
    }
    if (this.dirty) {
      this.dirty = false;
      this.options.apply(this.shown);
    }
    if (this.mode.kind !== "idle") this.schedule();
  };

  private localPoint(event: { clientX: number; clientY: number }): Point {
    const rect = this.element.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private centroid(): { center: Point; spread: number } {
    const points = [...this.pointers.values()];
    const center = {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    };
    const [a, b] = points;
    return { center, spread: a && b ? Math.max(distance(a, b), 1) : 0 };
  }

  /** Novi broj prstiju: nastavi od trenutnog položaja, bez skoka. */
  private rebase(now: number): void {
    this.gesture = this.centroid();
    this.samples = [{ time: now, center: this.gesture.center }];
  }

  /** Prikaz logičkog viewporta s elastičnim otporom izvan granica. */
  private soften(anchor: Point): Viewport {
    const { min, max } = this.bounds();
    const scaled = zoomAt(this.raw, anchor, rubberScale(this.raw.scale, min, max));
    const bounded = this.constrain(scaled);
    return {
      scale: scaled.scale,
      x: bounded.x + rubberBand(scaled.x - bounded.x, this.container.width),
      y: bounded.y + rubberBand(scaled.y - bounded.y, this.container.height),
    };
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const point = this.localPoint(event);
    const now = performance.now();
    this.element.setPointerCapture(event.pointerId);
    if (this.pointers.size === 0) {
      // Zaustavi inerciju ili animaciju točno tamo gdje je sada.
      this.raw = this.shown;
      this.mode = { kind: "idle" };
      this.tap = { start: now, origin: point, moved: false };
      this.multiTouch = false;
    } else {
      this.multiTouch = true;
      if (this.tap) this.tap.moved = true;
    }
    this.pointers.set(event.pointerId, point);
    this.rebase(now);
    this.element.dataset.dragging = "true";
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const point = this.localPoint(event);
    if (!this.pointers.has(event.pointerId)) {
      if (event.pointerType === "mouse" && this.options.onHover) {
        this.element.dataset.hover = this.options.onHover(point, this.shown) ? "true" : "false";
      }
      return;
    }
    this.pointers.set(event.pointerId, point);
    const previous = this.gesture;
    if (!previous) return;
    const next = this.centroid();
    if (this.tap && !this.tap.moved) {
      // Unutar tolerancije dodira tlocrt miruje; nakon nje pomak kreće od trenutnog položaja prsta.
      if (distance(this.tap.origin, point) <= TAP_SLOP_PX) return;
      this.tap.moved = true;
      this.rebase(performance.now());
      return;
    }

    const factor = previous.spread > 0 && next.spread > 0 ? next.spread / previous.spread : 1;
    const zoomed = zoomAt(this.raw, next.center, this.raw.scale * factor);
    this.raw = {
      scale: zoomed.scale,
      x: zoomed.x + next.center.x - previous.center.x,
      y: zoomed.y + next.center.y - previous.center.y,
    };
    this.gesture = next;
    const now = performance.now();
    this.samples.push({ time: now, center: next.center });
    while (this.samples.length > 2 && now - (this.samples[0]?.time ?? now) > VELOCITY_WINDOW_MS) this.samples.shift();
    this.show(this.soften(next.center));
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    if (!this.pointers.has(event.pointerId)) return;
    const point = this.pointers.get(event.pointerId) ?? this.localPoint(event);
    this.pointers.delete(event.pointerId);
    const now = performance.now();
    if (this.pointers.size > 0) {
      this.rebase(now);
      return;
    }
    delete this.element.dataset.dragging;
    const anchor = this.gesture?.center ?? point;
    this.gesture = null;

    const tap = this.tap;
    this.tap = null;
    if (event.type === "pointerup" && tap && !tap.moved && now - tap.start < TAP_MAX_MS) {
      this.handleTap(point, now);
      return;
    }
    this.release(anchor, now);
  };

  private handleTap(point: Point, now: number): void {
    const previous = this.lastTap;
    if (previous && now - previous.time < DOUBLE_TAP_MS && distance(previous.point, point) < DOUBLE_TAP_SLOP_PX) {
      this.lastTap = null;
      const { max } = this.bounds();
      if (this.raw.scale >= max * 0.95) this.reset();
      else this.zoomBy(DOUBLE_TAP_ZOOM, point);
      return;
    }
    this.lastTap = { time: now, point };
    this.options.onTap(point, this.shown);
  }

  /** Kraj geste: vrati unutar granica ili nastavi klizanje brzinom prsta. */
  private release(anchor: Point, now: number): void {
    const { min, max } = this.bounds();
    const target = this.constrain(zoomAt(this.raw, anchor, clamp(this.raw.scale, min, max)));
    const outOfBounds =
      Math.abs(target.x - this.shown.x) > 0.5 ||
      Math.abs(target.y - this.shown.y) > 0.5 ||
      Math.abs(target.scale / this.shown.scale - 1) > 0.001;
    if (outOfBounds) {
      this.animateTo(target, SETTLE_MS);
      return;
    }
    this.raw = target;
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    this.samples = [];
    if (this.multiTouch || this.options.reducedMotion || !first || !last || now - last.time > 60) return;
    const elapsed = Math.max(last.time - first.time, 1);
    const vx = (last.center.x - first.center.x) / elapsed;
    const vy = (last.center.y - first.center.y) / elapsed;
    if (Math.hypot(vx, vy) < INERTIA_START_SPEED) return;
    this.mode = { kind: "inertia", vx, vy, last: now };
    this.schedule();
  }

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    if (this.pointers.size > 0) return;
    const anchor = this.localPoint(event);
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.container.height : 1;
    const delta = clamp(event.deltaY * unit, -240, 240);
    const { min, max } = this.bounds();
    // ctrlKey = pinch na trackpadu: precizno i bez zaglađivanja.
    if (event.ctrlKey || this.options.reducedMotion) {
      this.stop();
      const factor = Math.exp(-delta * (event.ctrlKey ? 0.01 : 0.002));
      this.set(this.constrain(zoomAt(this.raw, anchor, clamp(this.raw.scale * factor, min, max))));
      return;
    }
    const base = this.mode.kind === "wheel" ? this.mode.scale : this.shown.scale;
    if (this.mode.kind !== "wheel") this.raw = this.shown;
    const scale = clamp(base * Math.exp(-delta * 0.002), min, max);
    this.mode = { kind: "wheel", scale, anchor, last: performance.now() };
    this.schedule();
  };
}
