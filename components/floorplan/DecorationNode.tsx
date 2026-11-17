import { Circle, Group, Rect, Shape, Text } from "react-konva";
import type { Decoration } from "@/lib/domain/types";
import { withAlpha } from "@/lib/theme";

interface DecorationNodeProps {
  decoration: Pick<Decoration, "kind" | "label" | "x" | "y" | "width" | "height" | "rotation">;
  surface: string;
  accent: string;
  text: string;
  fontFamily: string;
}

const TILE = 40;
const TREAD = 13;

/** Nepomični elementi etaže, crtani kao na arhitektonskom nacrtu. */
export function DecorationNode({ decoration, surface, accent, text, fontFamily }: DecorationNodeProps) {
  const { width, height, kind } = decoration;
  const left = -width / 2;
  const top = -height / 2;
  const line = withAlpha(text, 0.26);
  const faint = withAlpha(text, 0.1);
  const label = {
    text: decoration.label.toUpperCase(),
    x: left,
    y: top,
    width,
    height,
    align: "center",
    verticalAlign: "middle",
    fontFamily,
    fontStyle: "600",
    letterSpacing: 2.5,
    fontSize: Math.min(13, Math.max(9, Math.min(width, height) / 3.2)),
  } as const;

  return (
    <Group x={decoration.x + width / 2} y={decoration.y + height / 2} rotation={decoration.rotation}>
      {kind === "dancefloor" ? (
        <>
          <Rect x={left} y={top} width={width} height={height} fill={withAlpha(accent, 0.08)} />
          <Shape
            stroke={withAlpha(accent, 0.2)}
            strokeWidth={1}
            strokeScaleEnabled={false}
            sceneFunc={(context, shape) => {
              context.beginPath();
              for (let x = left + TILE; x < left + width - 1; x += TILE) {
                context.moveTo(x, top);
                context.lineTo(x, top + height);
              }
              for (let y = top + TILE; y < top + height - 1; y += TILE) {
                context.moveTo(left, y);
                context.lineTo(left + width, y);
              }
              context.strokeShape(shape);
            }}
          />
          <Rect x={left} y={top} width={width} height={height} stroke={withAlpha(accent, 0.6)} strokeWidth={1.5} strokeScaleEnabled={false} />
          <Text {...label} fontSize={17} letterSpacing={7} fill={withAlpha(accent, 0.85)} />
        </>
      ) : kind === "dj" ? (
        <>
          <Rect x={left} y={top} width={width} height={height} cornerRadius={4} fill={withAlpha(accent, 0.14)} stroke={withAlpha(accent, 0.7)} strokeWidth={1.5} strokeScaleEnabled={false} />
          {[-1, 1].map((side) => (
            <Group key={side} x={side * (width / 2 - height * 0.48)}>
              <Circle radius={height * 0.3} stroke={withAlpha(accent, 0.8)} strokeWidth={1.25} strokeScaleEnabled={false} />
              <Circle radius={height * 0.07} fill={withAlpha(accent, 0.8)} />
            </Group>
          ))}
          <Text {...label} fill={accent} />
        </>
      ) : kind === "bar" ? (
        <>
          <Rect x={left} y={top} width={width} height={height} cornerRadius={3} fill={surface} stroke={line} strokeWidth={1.5} strokeScaleEnabled={false} />
          <Rect x={left + 7} y={top + 7} width={width - 14} height={height - 14} cornerRadius={2} fill={faint} />
          <Text {...label} fill={withAlpha(text, 0.7)} rotation={0} />
        </>
      ) : kind === "stairs" ? (
        <>
          <Shape
            stroke={withAlpha(text, 0.16)}
            strokeWidth={1}
            strokeScaleEnabled={false}
            sceneFunc={(context, shape) => {
              context.beginPath();
              for (let x = left + TREAD; x < left + width - 1; x += TREAD) {
                context.moveTo(x, top);
                context.lineTo(x, top + height);
              }
              context.strokeShape(shape);
            }}
          />
          <Rect x={left} y={top} width={width} height={height} stroke={line} strokeWidth={1.25} strokeScaleEnabled={false} />
          <Text {...label} fontSize={9} letterSpacing={1.5} fill={withAlpha(text, 0.75)} />
        </>
      ) : kind === "void" ? (
        <>
          <Shape
            stroke={faint}
            strokeWidth={1}
            strokeScaleEnabled={false}
            sceneFunc={(context, shape) => {
              context.beginPath();
              context.moveTo(left, top);
              context.lineTo(left + width, top + height);
              context.moveTo(left + width, top);
              context.lineTo(left, top + height);
              context.strokeShape(shape);
            }}
          />
          <Rect x={left} y={top} width={width} height={height} stroke={line} strokeWidth={1.25} dash={[8, 6]} strokeScaleEnabled={false} />
          <Text {...label} fill={withAlpha(text, 0.55)} />
        </>
      ) : (
        <>
          <Rect x={left} y={top} width={width} height={height} stroke={line} strokeWidth={1.25} strokeScaleEnabled={false} />
          <Text {...label} fill={withAlpha(text, 0.6)} />
        </>
      )}
    </Group>
  );
}
