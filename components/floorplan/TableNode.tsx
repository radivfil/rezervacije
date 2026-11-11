import { Circle, Group, Rect, Text } from "react-konva";
import type { Table } from "@/lib/domain/types";

interface TableNodeProps {
  table: Pick<Table, "x" | "y" | "width" | "height" | "rotation" | "shape" | "label">;
  fill: string;
  stroke: string;
  textColor: string;
  selected: boolean;
  selectionColor: string;
  /** Veličina područja dodira u jedinicama tlocrta (>= 44 px na ekranu). */
  hitSize: number;
  onTap: () => void;
}

/** Stol centriran u svojoj grupi, da rotacija ide oko središta. */
export function TableNode({ table, fill, stroke, textColor, selected, selectionColor, hitSize, onTap }: TableNodeProps) {
  const { width, height } = table;
  const hitWidth = Math.max(width, hitSize);
  const hitHeight = Math.max(height, hitSize);
  return (
    <Group
      x={table.x + width / 2}
      y={table.y + height / 2}
      rotation={table.rotation}
      onClick={onTap}
      onTap={onTap}
      onMouseEnter={(event) => {
        const container = event.target.getStage()?.container();
        if (container) container.style.cursor = "pointer";
      }}
      onMouseLeave={(event) => {
        const container = event.target.getStage()?.container();
        if (container) container.style.cursor = "";
      }}
    >
      {/* Nevidljivo područje dodira. */}
      <Rect x={-hitWidth / 2} y={-hitHeight / 2} width={hitWidth} height={hitHeight} fill="#000" opacity={0} />
      {selected ? (
        <Rect
          x={-width / 2 - 7}
          y={-height / 2 - 7}
          width={width + 14}
          height={height + 14}
          cornerRadius={table.shape === "round" ? Math.max(width, height) : 12}
          stroke={selectionColor}
          strokeWidth={4}
          listening={false}
        />
      ) : null}
      {table.shape === "round" ? (
        <Circle radius={Math.min(width, height) / 2} fill={fill} stroke={stroke} strokeWidth={3} listening={false} />
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
          listening={false}
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
        listening={false}
      />
    </Group>
  );
}
