export interface Viewport {
  scale: number;
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export const MIN_TOUCH_TARGET_PX = 44;
export const ZOOM_STEP = 1.4;
/** Najveće povećanje u odnosu na prikaz cijele etaže. */
export const MAX_ZOOM_FACTOR = 6;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Mjerilo pri kojem cijela etaža (uz padding) stane u kontejner. */
export function fitScale(container: Size, floor: Size, padding = 8): number {
  const width = Math.max(1, container.width - padding * 2);
  const height = Math.max(1, container.height - padding * 2);
  return Math.min(width / floor.width, height / floor.height);
}

export function scaleBounds(container: Size, floor: Size): { min: number; max: number } {
  const fit = fitScale(container, floor);
  return { min: fit, max: fit * MAX_ZOOM_FACTOR };
}

/** Viewport koji centrira etažu u kontejneru. */
export function centeredViewport(container: Size, floor: Size, scale: number): Viewport {
  return {
    scale,
    x: (container.width - floor.width * scale) / 2,
    y: (container.height - floor.height * scale) / 2,
  };
}

export function fitViewport(container: Size, floor: Size): Viewport {
  return centeredViewport(container, floor, fitScale(container, floor));
}

/** Dio kontejnera koji prekriva panel (px od ruba). */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Drži etažu unutar vidljivog dijela kontejnera: ako je manja od njega centrira je,
 * inače ne dopušta da se odvuče izvan rubova.
 */
export function constrainViewport(viewport: Viewport, container: Size, floor: Size, insets: Insets = NO_INSETS): Viewport {
  const constrainAxis = (offset: number, start: number, visible: number, floorSize: number): number => {
    const scaled = floorSize * viewport.scale;
    if (scaled <= visible) return start + (visible - scaled) / 2;
    return clamp(offset, start + visible - scaled, start);
  };
  return {
    scale: viewport.scale,
    x: constrainAxis(viewport.x, insets.left, Math.max(1, container.width - insets.left - insets.right), floor.width),
    y: constrainAxis(viewport.y, insets.top, Math.max(1, container.height - insets.top - insets.bottom), floor.height),
  };
}

/** Otpor pri povlačenju preko ruba: pomak raste sve sporije i nikad ne prijeđe `dimension`. */
export function rubberBand(overshoot: number, dimension: number, stiffness = 0.55): number {
  const distance = Math.abs(overshoot);
  if (distance === 0 || dimension <= 0) return 0;
  return Math.sign(overshoot) * (1 - 1 / ((distance * stiffness) / dimension + 1)) * dimension;
}

/** Mjerilo izvan granica popušta elastično umjesto da stane naglo. */
export function rubberScale(scale: number, min: number, max: number, exponent = 0.4): number {
  if (scale < min) return min * (scale / min) ** exponent;
  if (scale > max) return max * (scale / max) ** exponent;
  return scale;
}

/** Točka tlocrta koja je u središtu kontejnera. */
export function worldCenter(viewport: Viewport, container: Size): Point {
  return {
    x: (container.width / 2 - viewport.x) / viewport.scale,
    y: (container.height / 2 - viewport.y) / viewport.scale,
  };
}

/**
 * Međukorak animacije između dva viewporta: mjerilo se mijenja geometrijski,
 * a središte pogleda putuje ravno, pa zumiranje djeluje jednoliko.
 */
export function interpolateViewport(from: Viewport, to: Viewport, t: number, container: Size): Viewport {
  if (t <= 0) return from;
  if (t >= 1) return to;
  const scale = from.scale * (to.scale / from.scale) ** t;
  const a = worldCenter(from, container);
  const b = worldCenter(to, container);
  const center = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  return { scale, x: container.width / 2 - center.x * scale, y: container.height / 2 - center.y * scale };
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** Zumiranje tako da točka ispod pokazivača (u koordinatama ekrana) ostane na mjestu. */
export function zoomAt(viewport: Viewport, anchor: Point, nextScale: number): Viewport {
  const worldX = (anchor.x - viewport.x) / viewport.scale;
  const worldY = (anchor.y - viewport.y) / viewport.scale;
  return {
    scale: nextScale,
    x: anchor.x - worldX * nextScale,
    y: anchor.y - worldY * nextScale,
  };
}

/** Zumiranje uz ograničenja mjerila i rubova. */
export function zoomWithin(
  viewport: Viewport,
  anchor: Point,
  nextScale: number,
  container: Size,
  floor: Size,
): Viewport {
  const { min, max } = scaleBounds(container, floor);
  return constrainViewport(zoomAt(viewport, anchor, clamp(nextScale, min, max)), container, floor);
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Je li stol na ekranu premalen za pouzdan dodir (pa ga prvo treba približiti). */
export function needsZoomBeforeSelect(minSide: number, scale: number): boolean {
  return minSide * scale < MIN_TOUCH_TARGET_PX;
}

/** Mjerilo pri kojem je najmanja stranica stola udobna za dodir. */
export function comfortableScale(minSide: number): number {
  return (MIN_TOUCH_TARGET_PX * 1.25) / minSide;
}

/** Viewport centriran na točku tlocrta (u vidljivom dijelu kontejnera), uz ograničenja mjerila i rubova. */
export function focusOn(world: Point, scale: number, container: Size, floor: Size, insets: Insets = NO_INSETS): Viewport {
  const { min, max } = scaleBounds(container, floor);
  const nextScale = clamp(scale, min, max);
  const centerX = insets.left + (container.width - insets.left - insets.right) / 2;
  const centerY = insets.top + (container.height - insets.top - insets.bottom) / 2;
  return constrainViewport(
    { scale: nextScale, x: centerX - world.x * nextScale, y: centerY - world.y * nextScale },
    container,
    floor,
    insets,
  );
}

/** Je li pravokutnik tlocrta cijeli unutar vidljivog dijela kontejnera (uz marginu u px). */
export function isRectVisible(
  rect: { x: number; y: number; width: number; height: number },
  viewport: Viewport,
  container: Size,
  insets: Insets = NO_INSETS,
  margin = 16,
): boolean {
  const left = viewport.x + rect.x * viewport.scale;
  const top = viewport.y + rect.y * viewport.scale;
  const right = left + rect.width * viewport.scale;
  const bottom = top + rect.height * viewport.scale;
  return (
    left >= insets.left + margin &&
    top >= insets.top + margin &&
    right <= container.width - insets.right - margin &&
    bottom <= container.height - insets.bottom - margin
  );
}

interface HitTarget {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

/**
 * Stol najbliži točki dodira (koordinate tlocrta). `slop` je dopušteni promašaj
 * u jedinicama tlocrta, pa je i mali stol lako pogoditi, a između susjeda pobjeđuje bliži.
 */
export function nearestTable<T extends HitTarget>(point: Point, tables: readonly T[], slop: number): T | null {
  let best: T | null = null;
  let bestEdge = Infinity;
  let bestCenter = Infinity;
  for (const table of tables) {
    const cx = table.x + table.width / 2;
    const cy = table.y + table.height / 2;
    const angle = (-table.rotation * Math.PI) / 180;
    const dx = point.x - cx;
    const dy = point.y - cy;
    const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
    const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
    const edge = Math.hypot(Math.max(Math.abs(localX) - table.width / 2, 0), Math.max(Math.abs(localY) - table.height / 2, 0));
    if (edge > slop) continue;
    const center = Math.hypot(dx, dy);
    if (edge < bestEdge || (edge === bestEdge && center < bestCenter)) {
      best = table;
      bestEdge = edge;
      bestCenter = center;
    }
  }
  return best;
}

/** Koliko panel stola prekriva tlocrt: na mobitelu odozdo, na širokom ekranu zdesna. */
export function sheetInsets(
  map: { top: number; right: number; bottom: number; left: number },
  sheet: { top: number; left: number; width: number; height: number } | null,
): Insets {
  if (!sheet) return NO_INSETS;
  const mapWidth = map.right - map.left;
  const mapHeight = map.bottom - map.top;
  if (sheet.width < mapWidth * 0.7) {
    return { ...NO_INSETS, right: clamp(map.right - sheet.left, 0, mapWidth * 0.6) };
  }
  return { ...NO_INSETS, bottom: clamp(map.bottom - sheet.top, 0, mapHeight * 0.7) };
}
