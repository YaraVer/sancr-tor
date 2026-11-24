import { describe, expect, it } from "vitest";
import { d20Check, makeRng, pickEvent, rollD20, rollPercent } from "../src/systems/dice";
import type { Rng } from "../src/systems/dice";

function seq(values: number[]): Rng {
  let index = 0;
  return () => values[index++ % values.length];
}

describe("dice", () => {
  it("makeRng детерминирован для одинакового зерна", () => {
    const first = makeRng(1234);
    const second = makeRng(1234);
    const other = makeRng(4321);
    const take = (rng: Rng) => Array.from({ length: 8 }, () => rng());

    expect(take(first)).toEqual(take(second));
    expect(take(first)).not.toEqual(take(other));
    expect(take(makeRng(1))[0]).toBeGreaterThanOrEqual(0);
    expect(take(makeRng(1))[0]).toBeLessThan(1);
  });

  it("d20 и d100 лежат в границах 1..N", () => {
    const rng = makeRng(77);
    for (let i = 0; i < 500; i += 1) {
      const d20 = rollD20(rng);
      const d100 = rollPercent(rng);
      expect(d20).toBeGreaterThanOrEqual(1);
      expect(d20).toBeLessThanOrEqual(20);
      expect(d100).toBeGreaterThanOrEqual(1);
      expect(d100).toBeLessThanOrEqual(100);
    }
  });

  it("d20Check считает total, success и crit по естественному броску", () => {
    const high = d20Check({ label: "Сила", mod: 3, dc: 20 }, seq([0.999]));
    expect(high.rolls).toEqual([20]);
    expect(high.total).toBe(23);
    expect(high.success).toBe(true);
    expect(high.crit).toBe(true);

    const low = d20Check({ label: "Сила", mod: 5, dc: 5 }, seq([0]));
    expect(low.rolls).toEqual([1]);
    expect(low.total).toBe(6);
    expect(low.success).toBe(true);
    expect(low.crit).toBe(true);
  });

  it("преимущество берёт лучший бросок, помеха — худший", () => {
    const adv = d20Check({ label: "Проверка", mod: 0, dc: 15, adv: true }, seq([0.1, 0.9]));
    expect(adv.rolls).toEqual([3, 19]);
    expect(adv.total).toBe(19);
    expect(adv.success).toBe(true);

    const dis = d20Check({ label: "Проверка", mod: 0, dc: 15, dis: true }, seq([0.1, 0.9]));
    expect(dis.rolls).toEqual([3, 19]);
    expect(dis.total).toBe(3);
    expect(dis.success).toBe(false);
  });

  it("обычная проверка делает один бросок и учитывает модификатор", () => {
    const result = d20Check({ label: "Ловкость", mod: -2, dc: 10 }, seq([0.5]));
    expect(result.rolls).toHaveLength(1);
    expect(result.mod).toBe(-2);
    expect(result.total).toBe(result.rolls[0] - 2);
    expect(result.success).toBe(result.total >= result.dc);
  });

  it("pickEvent выбирает подходящий диапазон или возвращает null", () => {
    const table = [
      { min: 1, max: 60, event: "calm" },
      { min: 61, max: 85, event: "shelter" },
      { min: 86, max: 100, event: "poison" },
    ];
    expect(pickEvent(table, 60)).toBe("calm");
    expect(pickEvent(table, 61)).toBe("shelter");
    expect(pickEvent(table, 70)).toBe("shelter");
    expect(pickEvent(table, 100)).toBe("poison");
    expect(pickEvent(table, 0)).toBeNull();
    expect(pickEvent(table, 101)).toBeNull();
  });
});
