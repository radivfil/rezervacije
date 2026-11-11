"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Layer, Rect, Stage } from "react-konva";
import type { Decoration, Floor, Table, VenueTheme, Zone } from "@/lib/domain/types";
import type { TableAvailability } from "@/lib/domain/table-status";
import { AVAILABILITY_COLORS } from "@/lib/floorplan/colors";
import {
  comfortableScale,
  constrainViewport,
  distance,
  fitViewport,
  focusOn,
  hitSize,
  needsZoomBeforeSelect,
  midpoint,
  ZOOM_STEP,
  zoomWithin,
  type Point,
  type Size,
  type Viewport,
} from "@/lib/floorplan/viewport";
import { interpolate, messages } from "@/lib/i18n";
import { readableTextOn } from "@/lib/theme";
import { DecorationNode } from "./DecorationNode";
import { TableNode } from "./TableNode";
import { ZoomControls } from "./ZoomControls";

export interface FloorplanCanvasProps {
  floor: Floor;
  tables: readonly Table[];
  decorations: readonly Decoration[];
  zoneColors: Readonly<Record<string, Zone["color"]>>;
  availability: Readonly<Record<string, TableAvailability>>;
  theme: VenueTheme;
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
  onClearSelection: () => void;
}

const WHEEL_STEP = 1.1;

/** Prati veličinu elementa bez setState-a u efektu. */
function useElementSize(element: HTMLElement | null): Size | null {
  const sizeRef = useRef<{ key: string; size: Size } | null>(null);
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!element) return () => undefined;
      const observer = new ResizeObserver(notify);
      observer.observe(element);
      return () => observer.disconnect();
    },
    [element],
  );
  const getSnapshot = useCallback((): Size | null => {
    if (!element) return null;
    const width = Math.floor(element.clientWidth);
    const height = Math.floor(element.clientHeight);
    const key = `${width}x${height}`;
    if (sizeRef.current?.key !== key) sizeRef.current = { key, size: { width, height } };
    return sizeRef.current.size;
  }, [element]);
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export default function FloorplanCanvas({
  floor,
  tables,
  decorations,
  zoneColors,
  availability,
  theme,
  selectedTableId,
  onSelectTable,
  onClearSelection,
}: FloorplanCanvasProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const size = useElementSize(container);
  const stageRef = useRef<Konva.Stage>(null);
  const pinchRef = useRef<{ distance: number; center: Point } | null>(null);
  const [stored, setStored] = useState<{ key: string; viewport: Viewport } | null>(null);

  const floorSize: Size = { width: floor.width, height: floor.height };
  const viewKey = size ? `${floor.id}:${size.width}x${size.height}` : "";
  const viewport =
    size && stored?.key === viewKey ? stored.viewport : size ? fitViewport(size, floorSize) : null;

  const commit = (next: Viewport): void => {
    if (!size) return;
    setStored({ key: viewKey, viewport: constrainViewport(next, size, floorSize) });
  };

  /** Trenutno stanje čita se iz Konva čvora jer se mijenja tijekom gesti. */
  const currentViewport = (): Viewport | null => {
    const stage = stageRef.current;
    return stage ? { scale: stage.scaleX(), x: stage.x(), y: stage.y() } : viewport;
  };

  const zoomBy = (factor: number, anchor?: Point): void => {
    const current = currentViewport();
    if (!size || !current) return;
    const point = anchor ?? { x: size.width / 2, y: size.height / 2 };
    commit(zoomWithin(current, point, current.scale * factor, size, floorSize));
  };

  /** Premalen stol se prvo približi, a tek sljedeći dodir ga odabire. */
  const handleTableTap = (table: Table): void => {
    const current = currentViewport();
    if (!size || !current) return;
    const minSide = Math.min(table.width, table.height);
    if (needsZoomBeforeSelect(minSide, current.scale)) {
      const center = { x: table.x + table.width / 2, y: table.y + table.height / 2 };
      commit(focusOn(center, comfortableScale(minSide), size, floorSize));
      return;
    }
    onSelectTable(table.id);
  };

  const handleWheel = (event: KonvaEventObject<WheelEvent>): void => {
    event.evt.preventDefault();
    const pointer = stageRef.current?.getPointerPosition();
    zoomBy(event.evt.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP, pointer ?? undefined);
  };

  const touchPoints = (event: TouchEvent): [Point, Point] | null => {
    const [a, b] = [event.touches[0], event.touches[1]];
    const rect = container?.getBoundingClientRect();
    if (!a || !b || !rect) return null;
    return [
      { x: a.clientX - rect.left, y: a.clientY - rect.top },
      { x: b.clientX - rect.left, y: b.clientY - rect.top },
    ];
  };

  const handleTouchMove = (event: KonvaEventObject<TouchEvent>): void => {
    const points = touchPoints(event.evt);
    const stage = stageRef.current;
    const current = currentViewport();
    if (!points || !stage || !size || !current) return;
    event.evt.preventDefault();
    if (stage.isDragging()) stage.stopDrag();

    const nextDistance = distance(points[0], points[1]);
    const nextCenter = midpoint(points[0], points[1]);
    const previous = pinchRef.current;
    pinchRef.current = { distance: nextDistance, center: nextCenter };
    if (!previous) return;

    const zoomed = zoomWithin(current, nextCenter, current.scale * (nextDistance / previous.distance), size, floorSize);
    const panned = constrainViewport(
      { ...zoomed, x: zoomed.x + nextCenter.x - previous.center.x, y: zoomed.y + nextCenter.y - previous.center.y },
      size,
      floorSize,
    );
    stage.scale({ x: panned.scale, y: panned.scale });
    stage.position({ x: panned.x, y: panned.y });
  };

  const handleTouchEnd = (): void => {
    if (!pinchRef.current) return;
    pinchRef.current = null;
    const current = currentViewport();
    if (current) commit(current);
  };

  return (
    <div
      ref={setContainer}
      className="relative h-[62dvh] min-h-80 w-full touch-none overflow-hidden rounded-xl bg-brand-surface"
      aria-label={interpolate(messages.floorplan.canvasLabel, { floor: floor.name })}
      role="img"
    >
      {size && viewport ? (
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
          x={viewport.x}
          y={viewport.y}
          draggable
          dragDistance={6}
          onClick={(event) => {
            if (event.target === stageRef.current) onClearSelection();
          }}
          onTap={(event) => {
            if (event.target === stageRef.current) onClearSelection();
          }}
          dragBoundFunc={(position) => {
            const scale = stageRef.current?.scaleX() ?? viewport.scale;
            const bounded = constrainViewport({ scale, ...position }, size, floorSize);
            return { x: bounded.x, y: bounded.y };
          }}
          onDragEnd={(event) => {
            if (event.target === stageRef.current) commit(currentViewport() ?? viewport);
          }}
          onWheel={handleWheel}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Layer>
            <Rect
              width={floor.width}
              height={floor.height}
              fill={theme.colors.background}
              stroke={theme.colors.text}
              strokeWidth={1}
              opacity={0.9}
              strokeScaleEnabled={false}
              cornerRadius={12}
              listening={false}
            />
            {decorations.map((decoration) => (
              <DecorationNode
                key={decoration.id}
                decoration={decoration}
                surface={theme.colors.surface}
                accent={theme.colors.accent}
                text={theme.colors.text}
              />
            ))}
            {tables.map((table) => {
              const fill = AVAILABILITY_COLORS[availability[table.id] ?? "free"];
              return (
                <TableNode
                  key={table.id}
                  table={table}
                  fill={fill}
                  stroke={zoneColors[table.zoneId] ?? theme.colors.text}
                  textColor={readableTextOn(fill)}
                  selected={table.id === selectedTableId}
                  selectionColor={theme.colors.primary}
                  hitSize={hitSize(Math.min(table.width, table.height), viewport.scale)}
                  onTap={() => handleTableTap(table)}
                />
              );
            })}
          </Layer>
        </Stage>
      ) : null}
      <ZoomControls
        onZoomIn={() => zoomBy(ZOOM_STEP)}
        onZoomOut={() => zoomBy(1 / ZOOM_STEP)}
        onReset={() => size && commit(fitViewport(size, floorSize))}
      />
    </div>
  );
}
