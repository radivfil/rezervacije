"use client";

import { createContext, useCallback, useRef, useSyncExternalStore } from "react";
import { NO_INSETS, sheetInsets, type Insets } from "@/lib/floorplan/viewport";

/** Panel stola se ovdje prijavljuje tlocrtu, da tlocrt zna koliki je dio prekriven. */
export const SheetAnchorContext = createContext<((element: HTMLElement | null) => void) | null>(null);

/** Koliko panel prekriva tlocrt (px), mjereno po konačnom položaju panela, ne po animaciji. */
export function useSheetInsets(map: HTMLElement | null, sheet: HTMLElement | null): Insets {
  const cache = useRef<{ key: string; insets: Insets }>({ key: "", insets: NO_INSETS });
  const subscribe = useCallback(
    (notify: () => void) => {
      const observer = new ResizeObserver(notify);
      if (map) observer.observe(map);
      if (sheet) observer.observe(sheet);
      window.addEventListener("resize", notify);
      window.addEventListener("scroll", notify, { passive: true });
      return () => {
        observer.disconnect();
        window.removeEventListener("resize", notify);
        window.removeEventListener("scroll", notify);
      };
    },
    [map, sheet],
  );
  const getSnapshot = useCallback((): Insets => {
    if (!map || !sheet) return NO_INSETS;
    const mapRect = map.getBoundingClientRect();
    const width = sheet.offsetWidth;
    const height = sheet.offsetHeight;
    const docked = width < mapRect.width * 0.7;
    const insets = sheetInsets(
      mapRect,
      docked
        ? { top: mapRect.top, left: mapRect.right - width - 12, width, height }
        : { top: window.innerHeight - height, left: 0, width, height },
    );
    const key = `${Math.round(insets.right)}:${Math.round(insets.bottom)}`;
    if (cache.current.key !== key) cache.current = { key, insets };
    return cache.current.insets;
  }, [map, sheet]);
  return useSyncExternalStore(subscribe, getSnapshot, () => NO_INSETS);
}
