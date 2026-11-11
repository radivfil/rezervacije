import { describe, expect, it } from "vitest";
import {
  centeredViewport,
  constrainViewport,
  fitScale,
  fitViewport,
  hitSize,
  midpoint,
  distance,
  scaleBounds,
  zoomAt,
  zoomWithin,
  needsZoomBeforeSelect,
  comfortableScale,
  focusOn,
} from "./viewport";

const floor = { width: 1000, height: 700 };
const phone = { width: 375, height: 560 };

describe("viewport", () => {
  it("fitScale stavlja cijelu etažu u kontejner", () => {
    const scale = fitScale(phone, floor);
    expect(floor.width * scale).toBeLessThanOrEqual(phone.width);
    expect(floor.height * scale).toBeLessThanOrEqual(phone.height);
    expect(scale).toBeCloseTo((375 - 16) / 1000);
  });

  it("fitViewport centrira etažu", () => {
    const viewport = fitViewport(phone, floor);
    expect(viewport.x).toBeCloseTo((phone.width - floor.width * viewport.scale) / 2);
    expect(viewport.y).toBeGreaterThan(0);
  });

  it("zoomAt drži točku ispod prsta na mjestu", () => {
    const start = { scale: 0.5, x: 10, y: 20 };
    const anchor = { x: 200, y: 300 };
    const next = zoomAt(start, anchor, 1.5);
    const worldBefore = { x: (anchor.x - start.x) / start.scale, y: (anchor.y - start.y) / start.scale };
    const worldAfter = { x: (anchor.x - next.x) / next.scale, y: (anchor.y - next.y) / next.scale };
    expect(worldAfter.x).toBeCloseTo(worldBefore.x);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y);
  });

  it("zoomWithin poštuje min/max mjerilo", () => {
    const { min, max } = scaleBounds(phone, floor);
    const start = fitViewport(phone, floor);
    expect(zoomWithin(start, { x: 0, y: 0 }, 100, phone, floor).scale).toBe(max);
    expect(zoomWithin(start, { x: 0, y: 0 }, 0.0001, phone, floor).scale).toBe(min);
  });

  it("constrainViewport ne dopušta odvlačenje izvan rubova", () => {
    const zoomed = { scale: 1, x: 500, y: -5000 };
    const constrained = constrainViewport(zoomed, phone, floor);
    expect(constrained.x).toBe(0);
    expect(constrained.y).toBe(phone.height - floor.height);
  });

  it("constrainViewport centrira etažu manju od kontejnera", () => {
    const small = centeredViewport(phone, floor, 0.1);
    expect(constrainViewport({ ...small, x: 0, y: 0 }, phone, floor)).toEqual(small);
  });

  it("hitSize daje najmanje 44 px na ekranu", () => {
    expect(hitSize(50, 0.35) * 0.35).toBeCloseTo(44);
    expect(hitSize(50, 2)).toBe(50);
  });

  it("distance i midpoint", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(midpoint({ x: 0, y: 0 }, { x: 4, y: 2 })).toEqual({ x: 2, y: 1 });
  });
});

describe("dodir na mali stol", () => {
  it("needsZoomBeforeSelect ispod 44 px", () => {
    expect(needsZoomBeforeSelect(50, 0.36)).toBe(true);
    expect(needsZoomBeforeSelect(44, 1)).toBe(false);
  });

  it("comfortableScale daje stol veći od 44 px", () => {
    expect(44 * comfortableScale(44)).toBeGreaterThan(44);
    expect(needsZoomBeforeSelect(50, comfortableScale(50))).toBe(false);
  });

  it("focusOn centrira točku i poštuje rubove", () => {
    const centered = focusOn({ x: 500, y: 350 }, 1.2, phone, floor);
    expect(centered.x + 500 * centered.scale).toBeCloseTo(phone.width / 2);
    expect(centered.y + 350 * centered.scale).toBeCloseTo(phone.height / 2);
    const corner = focusOn({ x: 0, y: 0 }, 1.2, phone, floor);
    expect(corner.x).toBe(0);
    expect(corner.y).toBe(0);
  });
});
