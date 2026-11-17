import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";

/** UI stanje tlocrta (bez poslovne logike). */
export interface FloorplanState {
  activeFloorId: string | null;
  selectedTableId: string | null;
  /** Zona istaknuta na tlocrtu (ostali stolovi su prigušeni). */
  highlightZoneId: string | null;
  setFloor: (floorId: string) => void;
  selectTable: (tableId: string) => void;
  clearSelection: () => void;
  toggleZone: (zoneId: string) => void;
  reset: () => void;
}

export function createFloorplanStore() {
  return createStore<FloorplanState>()((set) => ({
    activeFloorId: null,
    selectedTableId: null,
    highlightZoneId: null,
    setFloor: (floorId) => set({ activeFloorId: floorId, selectedTableId: null, highlightZoneId: null }),
    selectTable: (tableId) => set({ selectedTableId: tableId }),
    clearSelection: () => set({ selectedTableId: null }),
    toggleZone: (zoneId) => set((state) => ({ highlightZoneId: state.highlightZoneId === zoneId ? null : zoneId })),
    reset: () => set({ activeFloorId: null, selectedTableId: null, highlightZoneId: null }),
  }));
}

export const floorplanStore = createFloorplanStore();

export function useFloorplanStore<T>(selector: (state: FloorplanState) => T): T {
  return useStore(floorplanStore, selector);
}
