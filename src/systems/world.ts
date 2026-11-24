/**
 * ASCII-карты и поиск пути по 4 направлениям. Чистая логика, без движка.
 */

export function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

export interface ParsedMap {
  width: number;
  height: number;
  walkable: Set<string>;
  walls: Set<string>;
  markers: Record<string, { x: number; y: number }>;
}

const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** '.' и 'b' — пол, '#' — стена, A-Z — маркер (ключ — строчная буква, клетка проходима). */
export function parseMap(rows: string[]): ParsedMap {
  const height = rows.length;
  const width = height > 0 ? rows[0].length : 0;
  const walkable = new Set<string>();
  const walls = new Set<string>();
  const markers: Record<string, { x: number; y: number }> = {};

  for (let y = 0; y < height; y += 1) {
    const row = rows[y];
    for (let x = 0; x < row.length; x += 1) {
      const ch = row[x];
      const key = tileKey(x, y);
      if (ch === "." || ch === "b") {
        walkable.add(key);
      } else if (ch === "#") {
        walls.add(key);
      } else if (ch >= "A" && ch <= "Z") {
        markers[ch.toLowerCase()] = { x, y };
        walkable.add(key);
      }
    }
  }

  return { width, height, walkable, walls, markers };
}

/** Путь включает стартовую и целевую клетки; null, если цель недостижима. */
export function bfsPath(
  map: ParsedMap,
  from: { x: number; y: number },
  to: { x: number; y: number },
): Array<{ x: number; y: number }> | null {
  const startKey = tileKey(from.x, from.y);
  const goalKey = tileKey(to.x, to.y);

  const valid = (p: { x: number; y: number }) =>
    p.x >= 0 && p.y >= 0 && p.x < map.width && p.y < map.height;

  if (!valid(from) || !valid(to)) return null;
  if (!map.walkable.has(startKey) || !map.walkable.has(goalKey)) return null;

  if (startKey === goalKey) return [{ x: from.x, y: from.y }];

  const queue: Array<{ x: number; y: number }> = [{ x: from.x, y: from.y }];
  const cells = new Map<string, { x: number; y: number }>([[startKey, { x: from.x, y: from.y }]]);
  const parent = new Map<string, string | null>([[startKey, null]]);
  let head = 0;

  while (head < queue.length) {
    const current = queue[head];
    head += 1;

    for (const [dx, dy] of DIRECTIONS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;

      const key = tileKey(nx, ny);
      if (parent.has(key) || !map.walkable.has(key)) continue;

      parent.set(key, tileKey(current.x, current.y));
      cells.set(key, { x: nx, y: ny });

      if (key === goalKey) {
        const path: Array<{ x: number; y: number }> = [];
        let cursor: string | null = key;
        while (cursor !== null) {
          path.unshift(cells.get(cursor) as { x: number; y: number });
          cursor = parent.get(cursor) ?? null;
        }
        return path;
      }

      queue.push({ x: nx, y: ny });
    }
  }

  return null;
}

/** Следующая клетка на кратчайшем пути или null, если пути нет. */
export function nextStep(
  map: ParsedMap,
  from: { x: number; y: number },
  to: { x: number; y: number },
): { x: number; y: number } | null {
  const path = bfsPath(map, from, to);
  return path && path.length > 1 ? path[1] : null;
}
