import { describe, expect, it } from "vitest";
import { createFloorplanStore } from "./store";

describe("floorplan store", () => {
  it("odabir stola i promjena etaže", () => {
    const store = createFloorplanStore();
    store.getState().selectTable("t1");
    expect(store.getState().selectedTableId).toBe("t1");
    store.getState().setFloor("kat");
    expect(store.getState()).toMatchObject({ activeFloorId: "kat", selectedTableId: null });
  });

  it("clearSelection i reset", () => {
    const store = createFloorplanStore();
    store.getState().setFloor("kat");
    store.getState().selectTable("t2");
    store.getState().clearSelection();
    expect(store.getState().selectedTableId).toBeNull();
    store.getState().reset();
    expect(store.getState().activeFloorId).toBeNull();
  });

  it("toggleZone ističe zonu, ponovni dodir i promjena etaže je gase", () => {
    const store = createFloorplanStore();
    store.getState().toggleZone("vip");
    expect(store.getState().highlightZoneId).toBe("vip");
    store.getState().toggleZone("vip");
    expect(store.getState().highlightZoneId).toBeNull();
    store.getState().toggleZone("vip");
    store.getState().setFloor("kat");
    expect(store.getState().highlightZoneId).toBeNull();
  });
});
