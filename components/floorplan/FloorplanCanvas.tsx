"use client";

import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import type Konva from "konva";
import { Circle, Group, Layer, Rect, Stage, Text } from "react-konva";
import type { Decoration, Floor, Table, VenueTheme } from "@/lib/domain/types";
import type { TableAvailability } from "@/lib/domain/table-status";
import { ViewportEngine } from "@/lib/floorplan/engine";
import {
  clamp,
  comfortableScale,
  isRectVisible,
  nearestTable,
  NO_INSETS,
  ZOOM_STEP,
  type Insets,
  type Point,
  type Size,
  type Viewport,
} from "@/lib/floorplan/viewport";
import { zoneAreas } from "@/lib/floorplan/zones";
import { interpolate, messages } from "@/lib/i18n";
import { readableTextOn, statusPalette, withAlpha } from "@/lib/theme";
import { DecorationNode } from "./DecorationNode";

export interface FloorplanCanvasProps {
  floor: Floor;
  tables: readonly Table[];
  decorations: readonly Decoration[];
  /** Boja zone po id-u; područja zona crtaju se ispod stolova. */
  zoneColors: Readonly<Record<string, string>>;
  availability: Readonly<Record<string, TableAvailability>>;
  theme: VenueTheme;
  selectedTableId: string | null;
  /** Stolovi izvan istaknute zone se prigušuju; null = svi jednako. */
  highlightZoneId: string | null;
  /** Kratki tekst ispod oznake stola kad je dovoljno približen (npr. cijena). */
  tableDetail: (table: Table) => string;
  /** Opis stola za čitače zaslona i tipkovnicu. */
  tableAriaLabel: (table: Table) => string;
  /** Stalne kontrole preko tlocrta; cijela etaža staje između njih. */
  chrome?: Insets;
  /** Sve što trenutno prekriva tlocrt: kontrole i panel odabranog stola. */
  insets?: Insets;
  /** Tlocrt ovdje predaje naredbe za gumbe zumiranja. */
  controlsRef?: RefObject<FloorplanControls | null>;
  onSelectTable: (tableId: string) => void;
  onClearSelection: () => void;
}

export interface FloorplanControls {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
}

/** Dopušteni promašaj prsta oko stola (px na ekranu). */
const TAP_SLOP_PX = 14;
/** Širina stola na ekranu (px) pri kojoj se pojavljuju oznake, odnosno detalji. */
const LABELS_FROM_PX = 17;
const DETAILS_FROM_PX = 58;
const REFERENCE_TABLE = 50;
const KEY_PAN_PX = 80;
/** Stol uži od ovoga na ekranu (px) približava se pri odabiru. */
const SMALL_TABLE_PX = 24;
/** Stolovi iste zone bliži od ovoga čine jedno područje (jedinice tlocrta). */
const ZONE_GAP = 24;
const ZONE_PADDING = 7;

function smoothstep(value: number, from: number, to: number): number {
  const t = clamp((value - from) / (to - from), 0, 1);
  return t * t * (3 - 2 * t);
}

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
    if (width === 0 || height === 0) return null;
    const key = `${width}x${height}`;
    if (sizeRef.current?.key !== key) sizeRef.current = { key, size: { width, height } };
    return sizeRef.current.size;
  }, [element]);
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

function subscribeFonts(notify: () => void): () => void {
  document.fonts.addEventListener("loadingdone", notify);
  return () => document.fonts.removeEventListener("loadingdone", notify);
}

/** Mijenja se kad se učita font, da canvas ponovno izmjeri tekst. */
function useFontEpoch(): string {
  return useSyncExternalStore(
    subscribeFonts,
    () => `${document.fonts.status}:${document.fonts.size}`,
    () => "server",
  );
}

function subscribeMotion(notify: () => void): () => void {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

function toWorld(point: Point, viewport: Viewport): Point {
  return { x: (point.x - viewport.x) / viewport.scale, y: (point.y - viewport.y) / viewport.scale };
}

function centerOf(table: Pick<Table, "x" | "y" | "width" | "height">): Point {
  return { x: table.x + table.width / 2, y: table.y + table.height / 2 };
}

export default function FloorplanCanvas({
  floor,
  tables,
  decorations,
  zoneColors,
  availability,
  theme,
  selectedTableId,
  highlightZoneId,
  tableDetail,
  tableAriaLabel,
  chrome = NO_INSETS,
  insets = NO_INSETS,
  controlsRef,
  onSelectTable,
  onClearSelection,
}: FloorplanCanvasProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const size = useElementSize(container);
  const fontEpoch = useFontEpoch();
  const reducedMotion = useReducedMotion();
  const stageRef = useRef<Konva.Stage>(null);
  const labelsRef = useRef<Konva.Group>(null);
  const detailsRef = useRef<Konva.Group>(null);
  const engineRef = useRef<ViewportEngine | null>(null);
  const [focusedTableId, setFocusedTableId] = useState<string | null>(null);

  const fontFamily = useMemo(
    () => (container ? getComputedStyle(container).fontFamily : "sans-serif"),
    [container],
  );
  const status = useMemo(() => statusPalette(theme), [theme]);
  const areas = useMemo(() => zoneAreas(tables, ZONE_GAP, ZONE_PADDING), [tables]);

  /** Ono što engine čita pri dodiru; uvijek zadnje vrijednosti bez ponovnog stvaranja enginea. */
  const live = useRef({ tables, onSelectTable, onClearSelection, reducedMotion });
  useEffect(() => {
    live.current = { tables, onSelectTable, onClearSelection, reducedMotion };
  });

  const hasSize = size !== null;
  useLayoutEffect(() => {
    if (!container || !hasSize) return;
    const hit = (point: Point, viewport: Viewport): Table | null =>
      nearestTable(toWorld(point, viewport), live.current.tables, TAP_SLOP_PX / viewport.scale);
    const engine = new ViewportEngine(container, {
      reducedMotion: live.current.reducedMotion,
      apply: (viewport) => {
        const stage = stageRef.current;
        if (!stage) return;
        stage.scale({ x: viewport.scale, y: viewport.scale });
        stage.position({ x: viewport.x, y: viewport.y });
        const tablePx = REFERENCE_TABLE * viewport.scale;
        labelsRef.current?.opacity(smoothstep(tablePx, LABELS_FROM_PX, LABELS_FROM_PX + 9));
        detailsRef.current?.opacity(smoothstep(tablePx, DETAILS_FROM_PX, DETAILS_FROM_PX + 16));
        stage.batchDraw();
      },
      onTap: (point, viewport) => {
        const table = hit(point, viewport);
        if (table) live.current.onSelectTable(table.id);
        else live.current.onClearSelection();
      },
      onHover: (point, viewport) => hit(point, viewport) !== null,
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [container, hasSize, reducedMotion]);

  useLayoutEffect(() => {
    if (!size) return;
    engineRef.current?.setGeometry(size, { width: floor.width, height: floor.height }, floor.id, chrome);
  }, [size, floor.id, floor.width, floor.height, chrome, container, reducedMotion]);

  // Odabrani stol dolazi u sredinu dijela tlocrta koji panel ne prekriva.
  const selectedTable = tables.find((table) => table.id === selectedTableId) ?? null;
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !size) return;
    engine.setInsets(insets);
    if (!selectedTable) return;
    // Približava se samo stol koji je na ekranu zaista sitan; inače se pogled tek pomakne ako ga panel prekriva.
    const minSide = Math.min(selectedTable.width, selectedTable.height);
    const tiny = minSide * engine.viewport.scale < SMALL_TABLE_PX;
    if (!tiny && isRectVisible(selectedTable, engine.viewport, size, insets, 20)) return;
    engine.focus(centerOf(selectedTable), tiny ? comfortableScale(minSide) : 0);
  }, [selectedTable, insets, size]);

  useImperativeHandle(
    controlsRef,
    () => ({
      zoomIn: () => engineRef.current?.zoomBy(ZOOM_STEP),
      zoomOut: () => engineRef.current?.zoomBy(1 / ZOOM_STEP),
      reset: () => engineRef.current?.reset(),
    }),
    [],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const engine = engineRef.current;
    if (!engine || event.target !== event.currentTarget) return;
    const actions: Record<string, () => void> = {
      "+": () => engine.zoomBy(ZOOM_STEP),
      "=": () => engine.zoomBy(ZOOM_STEP),
      "-": () => engine.zoomBy(1 / ZOOM_STEP),
      "0": () => engine.reset(),
      ArrowLeft: () => engine.panBy(KEY_PAN_PX, 0),
      ArrowRight: () => engine.panBy(-KEY_PAN_PX, 0),
      ArrowUp: () => engine.panBy(0, KEY_PAN_PX),
      ArrowDown: () => engine.panBy(0, -KEY_PAN_PX),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const focusTable = (table: Table): void => {
    setFocusedTableId(table.id);
    engineRef.current?.focus(centerOf(table), comfortableScale(Math.min(table.width, table.height)));
  };

  const ink = theme.colors.text;
  const ringTable = tables.find((table) => table.id === focusedTableId) ?? null;

  return (
    <div className="absolute inset-0">
      <div
        ref={setContainer}
        tabIndex={0}
        role="application"
        aria-label={interpolate(messages.floorplan.canvasLabel, { floor: floor.name })}
        aria-describedby="floorplan-keys"
        onKeyDown={handleKeyDown}
        className="absolute inset-0 cursor-grab touch-none overflow-hidden outline-none select-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-inset data-[dragging=true]:cursor-grabbing data-[hover=true]:cursor-pointer [&_canvas]:!touch-none"
      >
        {size ? (
          <Stage ref={stageRef} width={size.width} height={size.height} listening={false}>
            <Layer listening={false}>
              <Rect
                width={floor.width}
                height={floor.height}
                fill={theme.colors.surface}
                stroke={withAlpha(ink, 0.3)}
                strokeWidth={1.5}
                strokeScaleEnabled={false}
                cornerRadius={6}
              />
              {decorations.map((decoration) => (
                <DecorationNode
                  key={`${decoration.id}:${fontEpoch}`}
                  decoration={decoration}
                  surface={theme.colors.background}
                  accent={theme.colors.accent}
                  text={ink}
                  fontFamily={fontFamily}
                />
              ))}
              {areas.map((area) => {
                const color = zoneColors[area.zoneId];
                if (!color) return null;
                const lit = highlightZoneId === area.zoneId;
                const off = highlightZoneId !== null && !lit;
                return (
                  <Rect
                    key={`${area.zoneId}:${area.x}:${area.y}`}
                    x={area.x}
                    y={area.y}
                    width={area.width}
                    height={area.height}
                    cornerRadius={14}
                    fill={withAlpha(color, lit ? 0.22 : 0.1)}
                    stroke={withAlpha(color, lit ? 0.9 : 0.4)}
                    strokeWidth={1}
                    strokeScaleEnabled={false}
                    opacity={off ? 0.35 : 1}
                  />
                );
              })}
              {tables.map((table) => {
                const state = availability[table.id] ?? "free";
                const color = status[state];
                const dimmed = highlightZoneId !== null && table.zoneId !== highlightZoneId;
                const shape = {
                  fill: state === "free" ? color : withAlpha(color, state === "held" ? 0.16 : 0.13),
                  stroke: state === "free" ? undefined : withAlpha(color, state === "held" ? 1 : 0.55),
                  strokeWidth: 1.5,
                  dash: state === "held" ? [5, 4] : undefined,
                  strokeScaleEnabled: false,
                };
                const center = centerOf(table);
                return (
                  <Group key={table.id} x={center.x} y={center.y} rotation={table.rotation} opacity={dimmed ? 0.2 : 1}>
                    {table.shape === "round" ? (
                      <Circle radius={Math.min(table.width, table.height) / 2} {...shape} />
                    ) : (
                      <Rect x={-table.width / 2} y={-table.height / 2} width={table.width} height={table.height} cornerRadius={7} {...shape} />
                    )}
                  </Group>
                );
              })}
              {[selectedTable, ringTable === selectedTable ? null : ringTable].map((table, index) =>
                table ? (
                  <Group key={`${table.id}:${index}`} x={centerOf(table).x} y={centerOf(table).y} rotation={table.rotation}>
                    <Rect
                      x={-table.width / 2 - 6}
                      y={-table.height / 2 - 6}
                      width={table.width + 12}
                      height={table.height + 12}
                      cornerRadius={table.shape === "round" ? (Math.max(table.width, table.height) + 12) / 2 : 12}
                      stroke={index === 0 ? ink : theme.colors.primary}
                      strokeWidth={index === 0 ? 2.5 : 2}
                      dash={index === 0 ? undefined : [4, 3]}
                      strokeScaleEnabled={false}
                    />
                  </Group>
                ) : null,
              )}
              <Group ref={labelsRef} key={`labels:${fontEpoch}`}>
                {tables.map((table) => {
                  const state = availability[table.id] ?? "free";
                  const dimmed = highlightZoneId !== null && table.zoneId !== highlightZoneId;
                  const center = centerOf(table);
                  return (
                    <Text
                      key={table.id}
                      text={table.label}
                      x={center.x - table.width / 2}
                      y={center.y - table.height / 2}
                      width={table.width}
                      height={table.height}
                      align="center"
                      verticalAlign="middle"
                      fontFamily={fontFamily}
                      fontSize={Math.min(15, table.width / 3.1)}
                      fontStyle="700"
                      fill={state === "free" ? readableTextOn(status.free) : status[state]}
                      opacity={dimmed ? 0.25 : 1}
                    />
                  );
                })}
              </Group>
              <Group ref={detailsRef} key={`details:${fontEpoch}`}>
                {tables.map((table) => {
                  const state = availability[table.id] ?? "free";
                  if (highlightZoneId !== null && table.zoneId !== highlightZoneId) return null;
                  const center = centerOf(table);
                  return (
                    <Text
                      key={table.id}
                      text={tableDetail(table)}
                      x={center.x - table.width / 2}
                      y={center.y + Math.min(table.height / 2 - 14, 11)}
                      width={table.width}
                      align="center"
                      fontFamily={fontFamily}
                      fontSize={7.5}
                      fontStyle="600"
                      fill={state === "free" ? readableTextOn(status.free) : status[state]}
                      opacity={0.8}
                    />
                  );
                })}
              </Group>
            </Layer>
          </Stage>
        ) : null}
      </div>

      <p id="floorplan-keys" className="sr-only">
        {messages.floorplan.keyboardHint}
      </p>
      {/* Isti stolovi za tipkovnicu i čitače zaslona. */}
      <ul aria-label={interpolate(messages.floorplan.tablesLabel, { floor: floor.name })} className="sr-only">
        {tables.map((table) => (
          <li key={table.id}>
            <button
              type="button"
              aria-pressed={table.id === selectedTableId}
              onFocus={() => focusTable(table)}
              onBlur={() => setFocusedTableId(null)}
              onClick={() => onSelectTable(table.id)}
            >
              {tableAriaLabel(table)}
            </button>
          </li>
        ))}
      </ul>

    </div>
  );
}
