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

/**
 * Drži etažu unutar kontejnera: ako je manja od kontejnera centrira je,
 * inače ne dopušta da se odvuče izvan rubova.
 */
export function constrainViewport(viewport: Viewport, container: Size, floor: Size): Viewport {
  const constrainAxis = (offset: number, containerSize: number, floorSize: number): number => {
    const scaled = floorSize * viewport.scale;
    if (scaled <= containerSize) return (containerSize - scaled) / 2;
    return clamp(offset, containerSize - scaled, 0);
  };
  return {
    scale: viewport.scale,
    x: constrainAxis(viewport.x, container.width, floor.width),
    y: constrainAxis(viewport.y, container.height, floor.height),
  };
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

/** Veličina područja dodira (u jedinicama tlocrta) da na ekranu bude barem 44 px. */
export function hitSize(size: number, scale: number): number {
  return Math.max(size, MIN_TOUCH_TARGET_PX / scale);
}
