import { describe, expect, it } from "vitest";
import {
  centeredViewport,
  constrainViewport,
  fitScale,
  fitViewport,
  midpoint,
  distance,
  scaleBounds,
  zoomAt,
  zoomWithin,
  needsZoomBeforeSelect,
  comfortableScale,
  focusOn,
  easeOutCubic,
  interpolateViewport,
  isRectVisible,
  nearestTable,
  NO_INSETS,
  rubberBand,
  rubberScale,
  sheetInsets,
  worldCenter,
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

describe("panel preko tlocrta", () => {
  const sheet = { ...NO_INSETS, bottom: 260 };

  it("constrainViewport centrira etažu u vidljivom dijelu iznad panela", () => {
    const fit = fitViewport(phone, floor);
    const lifted = constrainViewport(fit, phone, floor, sheet);
    expect(lifted.y).toBeCloseTo((phone.height - 260 - floor.height * fit.scale) / 2);
    expect(lifted.y).toBeLessThan(fit.y);
  });

  it("focusOn stavlja stol u sredinu vidljivog dijela", () => {
    const focused = focusOn({ x: 500, y: 350 }, 1.2, phone, floor, sheet);
    expect(focused.y + 350 * focused.scale).toBeCloseTo((phone.height - 260) / 2);
  });

  it("donji red stolova može se podići iznad panela", () => {
    const focused = focusOn({ x: 500, y: 690 }, 1.2, phone, floor, sheet);
    expect(focused.y + 690 * focused.scale).toBeLessThan(phone.height - 260);
  });

  it("isRectVisible uzima panel u obzir", () => {
    const viewport = fitViewport(phone, floor);
    const bottomTable = { x: 480, y: 640, width: 50, height: 50 };
    expect(isRectVisible(bottomTable, viewport, phone)).toBe(true);
    expect(isRectVisible(bottomTable, viewport, phone, sheet)).toBe(false);
  });

  it("sheetInsets: mobitel odozdo, široki ekran zdesna", () => {
    const map = { top: 200, right: 390, bottom: 844, left: 0 };
    expect(sheetInsets(map, null)).toEqual(NO_INSETS);
    expect(sheetInsets(map, { top: 544, left: 0, width: 390, height: 300 })).toEqual({ ...NO_INSETS, bottom: 300 });
    const wide = { top: 100, right: 1280, bottom: 800, left: 0 };
    expect(sheetInsets(wide, { top: 112, left: 888, width: 380, height: 676 })).toEqual({ ...NO_INSETS, right: 392 });
  });
});

describe("elastičnost i animacija", () => {
  it("rubberBand usporava i ostaje unutar dimenzije", () => {
    expect(rubberBand(0, 400)).toBe(0);
    expect(rubberBand(50, 400)).toBeLessThan(50);
    expect(rubberBand(50, 400)).toBeGreaterThan(0);
    expect(rubberBand(-50, 400)).toBeCloseTo(-rubberBand(50, 400));
    expect(rubberBand(100_000, 400)).toBeLessThan(400);
  });

  it("rubberScale popušta izvan granica, unutar njih ne dira", () => {
    expect(rubberScale(1, 0.5, 2)).toBe(1);
    expect(rubberScale(4, 0.5, 2)).toBeGreaterThan(2);
    expect(rubberScale(4, 0.5, 2)).toBeLessThan(4);
    expect(rubberScale(0.25, 0.5, 2)).toBeGreaterThan(0.25);
    expect(rubberScale(0.25, 0.5, 2)).toBeLessThan(0.5);
  });

  it("interpolateViewport spaja krajeve, mjerilo ide geometrijski", () => {
    const from = { scale: 0.5, x: 10, y: 20 };
    const to = { scale: 2, x: -400, y: -300 };
    expect(interpolateViewport(from, to, 0, phone)).toEqual(from);
    expect(interpolateViewport(from, to, 1, phone)).toEqual(to);
    const mid = interpolateViewport(from, to, 0.5, phone);
    expect(mid.scale).toBeCloseTo(1);
    const a = worldCenter(from, phone);
    const b = worldCenter(to, phone);
    expect(worldCenter(mid, phone).x).toBeCloseTo((a.x + b.x) / 2);
  });

  it("easeOutCubic", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe("nearestTable", () => {
  const tables = [
    { id: "a", x: 0, y: 0, width: 50, height: 50, rotation: 0 },
    { id: "b", x: 60, y: 0, width: 50, height: 50, rotation: 0 },
    { id: "c", x: 200, y: 0, width: 80, height: 20, rotation: 90 },
  ];

  it("pogodak unutar stola", () => {
    expect(nearestTable({ x: 25, y: 25 }, tables, 0)?.id).toBe("a");
  });

  it("promašaj unutar tolerancije bira bliži stol", () => {
    expect(nearestTable({ x: 53, y: 25 }, tables, 20)?.id).toBe("a");
    expect(nearestTable({ x: 57, y: 25 }, tables, 20)?.id).toBe("b");
  });

  it("izvan tolerancije nema pogotka", () => {
    expect(nearestTable({ x: 150, y: 300 }, tables, 20)).toBeNull();
  });

  it("poštuje rotaciju stola", () => {
    // Stol c je rotiran 90°, pa zauzima 20 x 80 oko središta (240, 10).
    expect(nearestTable({ x: 240, y: 45 }, tables, 0)?.id).toBe("c");
    expect(nearestTable({ x: 275, y: 10 }, tables, 0)).toBeNull();
  });
});
