interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ZonedBox extends Box {
  zoneId: string;
}

export interface ZoneArea extends Box {
  zoneId: string;
}

function gapBetween(a: Box, b: Box): number {
  const dx = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width), 0);
  const dy = Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height), 0);
  return Math.hypot(dx, dy);
}

/**
 * Područja zona na tlocrtu: stolovi iste zone koji su međusobno bliže od `maxGap`
 * čine jednu skupinu, a područje je njezin okvir proširen za `padding`.
 */
export function zoneAreas(tables: readonly ZonedBox[], maxGap: number, padding: number): ZoneArea[] {
  const parent = tables.map((_, index) => index);
  const find = (index: number): number => {
    let root = index;
    while (parent[root] !== root) root = parent[root] ?? root;
    parent[index] = root;
    return root;
  };
  tables.forEach((a, i) => {
    for (let j = i + 1; j < tables.length; j += 1) {
      const b = tables[j];
      if (b && a.zoneId === b.zoneId && gapBetween(a, b) <= maxGap) parent[find(j)] = find(i);
    }
  });

  const groups = new Map<number, ZoneArea & { right: number; bottom: number }>();
  tables.forEach((table, index) => {
    const root = find(index);
    const right = table.x + table.width;
    const bottom = table.y + table.height;
    const group = groups.get(root);
    if (!group) {
      groups.set(root, { zoneId: table.zoneId, x: table.x, y: table.y, width: 0, height: 0, right, bottom });
      return;
    }
    group.x = Math.min(group.x, table.x);
    group.y = Math.min(group.y, table.y);
    group.right = Math.max(group.right, right);
    group.bottom = Math.max(group.bottom, bottom);
  });

  return [...groups.values()].map((group) => ({
    zoneId: group.zoneId,
    x: group.x - padding,
    y: group.y - padding,
    width: group.right - group.x + padding * 2,
    height: group.bottom - group.y + padding * 2,
  }));
}
