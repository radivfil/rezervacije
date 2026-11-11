import { Circle, Group, Rect, Text } from "react-konva";
import type { Table } from "@/lib/domain/types";

interface TableNodeProps {
  table: Pick<Table, "x" | "y" | "width" | "height" | "rotation" | "shape" | "label">;
  fill: string;
  stroke: string;
  textColor: string;
}

/** Stol centriran u svojoj grupi, da rotacija ide oko središta. */
export function TableNode({ table, fill, stroke, textColor }: TableNodeProps) {
  const { width, height } = table;
  return (
    <Group x={table.x + width / 2} y={table.y + height / 2} rotation={table.rotation} listening={false}>
      {table.shape === "round" ? (
        <Circle radius={Math.min(width, height) / 2} fill={fill} stroke={stroke} strokeWidth={3} />
      ) : (
        <Rect
          x={-width / 2}
          y={-height / 2}
          width={width}
          height={height}
          cornerRadius={8}
          fill={fill}
          stroke={stroke}
          strokeWidth={3}
        />
      )}
      <Text
        text={table.label}
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        align="center"
        verticalAlign="middle"
        fontSize={14}
        fontStyle="bold"
        fill={textColor}
      />
    </Group>
  );
}
