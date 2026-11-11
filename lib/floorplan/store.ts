import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";

/** UI stanje tlocrta (bez poslovne logike). */
export interface FloorplanState {
  activeFloorId: string | null;
  selectedTableId: string | null;
  setFloor: (floorId: string) => void;
  selectTable: (tableId: string) => void;
  clearSelection: () => void;
  reset: () => void;
}

export function createFloorplanStore() {
  return createStore<FloorplanState>()((set) => ({
    activeFloorId: null,
    selectedTableId: null,
    setFloor: (floorId) => set({ activeFloorId: floorId, selectedTableId: null }),
    selectTable: (tableId) => set({ selectedTableId: tableId }),
    clearSelection: () => set({ selectedTableId: null }),
    reset: () => set({ activeFloorId: null, selectedTableId: null }),
  }));
}

export const floorplanStore = createFloorplanStore();

export function useFloorplanStore<T>(selector: (state: FloorplanState) => T): T {
  return useStore(floorplanStore, selector);
}
