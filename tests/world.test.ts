import { describe, expect, it } from "vitest";
import worldData from "../public/data/world.json";
import { bfsPath, nextStep, parseMap, tileKey } from "../src/systems/world";

describe("world", () => {
  it("tileKey задаёт координаты в виде строки", () => {
    expect(tileKey(3, 7)).toBe("3,7");
    expect(tileKey(0, 0)).toBe("0,0");
  });

  it("parseMap различает пол, стены и маркеры", () => {
    const map = parseMap(["#..A", ".b##"]);
    expect(map.width).toBe(4);
    expect(map.height).toBe(2);
    expect(map.walkable.has("0,0")).toBe(false);
    expect(map.walkable.has("1,0")).toBe(true);
    expect(map.walkable.has("1,1")).toBe(true);
    expect(map.walls.has("0,0")).toBe(true);
    expect(map.walls.has("3,1")).toBe(true);
    expect(map.markers).toEqual({ a: { x: 3, y: 0 } });
    // Маркерная клетка проходима, иначе до неё нельзя дойти.
    expect(map.walkable.has("3,0")).toBe(true);
  });

  it("карты из world.json имеют ровно 3 зоны по 10 строк длиной 20", () => {
    expect(worldData.version).toBe(1);
    expect(worldData.zones).toHaveLength(3);
    expect(worldData.zones.map((zone) => zone.id)).toEqual(["approach", "ossuary", "abyss"]);
    expect(worldData.zones.map((zone) => zone.order)).toEqual([1, 2, 3]);

    for (const zone of worldData.zones) {
      expect(zone.map, zone.id).toHaveLength(10);
      for (const row of zone.map) expect(row, `${zone.id}: ${row}`).toHaveLength(20);
      const upper = zone.map.join("").match(/[A-Z]/g) ?? [];
      expect(upper, zone.id).toHaveLength(1);
    }
  });

  it("bfsPath находит путь от спавна до маркера в каждой зоне", () => {
    for (const zone of worldData.zones) {
      const map = parseMap(zone.map);
      expect(map.walkable.has(tileKey(zone.spawn.x, zone.spawn.y)), zone.id).toBe(true);

      for (const marker of zone.markers) {
        const path = bfsPath(map, zone.spawn, marker);
        expect(path, `${zone.id} -> ${marker.episode}`).not.toBeNull();
        const route = path as Array<{ x: number; y: number }>;
        expect(route[0]).toEqual({ x: zone.spawn.x, y: zone.spawn.y });
        expect(route[route.length - 1]).toEqual({ x: marker.x, y: marker.y });
        for (const cell of route) {
          expect(map.walkable.has(tileKey(cell.x, cell.y)), `${zone.id}: ${cell.x},${cell.y}`).toBe(true);
        }
      }
    }
  });

  it("bfsPath возвращает null для недостижимой цели, а nextStep даёт первый шаг", () => {
    const blocked = parseMap(["..#.."]);
    expect(bfsPath(blocked, { x: 0, y: 0 }, { x: 4, y: 0 })).toBeNull();
    expect(bfsPath(blocked, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();

    const open = parseMap(["....."]);
    expect(nextStep(open, { x: 0, y: 0 }, { x: 3, y: 0 })).toEqual({ x: 1, y: 0 });
    expect(nextStep(open, { x: 0, y: 0 }, { x: 0, y: 0 })).toBeNull();
    expect(nextStep(blocked, { x: 0, y: 0 }, { x: 4, y: 0 })).toBeNull();
  });
});
