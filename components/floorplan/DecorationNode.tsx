import { Group, Rect, Text } from "react-konva";
import type { Decoration } from "@/lib/domain/types";

interface DecorationNodeProps {
  decoration: Pick<Decoration, "kind" | "label" | "x" | "y" | "width" | "height" | "rotation">;
  surface: string;
  accent: string;
  text: string;
}

export function DecorationNode({ decoration, surface, accent, text }: DecorationNodeProps) {
  const { width, height, kind } = decoration;
  const isVoid = kind === "void";
  const highlight = kind === "dancefloor" || kind === "dj";
  return (
    <Group
      x={decoration.x + width / 2}
      y={decoration.y + height / 2}
      rotation={decoration.rotation}
      listening={false}
    >
      <Rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        cornerRadius={10}
        fill={isVoid ? undefined : highlight ? accent : surface}
        opacity={highlight ? 0.35 : 1}
        stroke={text}
        strokeWidth={isVoid ? 2 : 1}
        dash={isVoid ? [10, 8] : undefined}
        strokeScaleEnabled={false}
      />
      <Text
        text={decoration.label}
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        align="center"
        verticalAlign="middle"
        fontSize={16}
        fill={text}
        opacity={0.8}
      />
    </Group>
  );
}
