import { describe, expect, it } from "vitest";
import combatData from "../public/data/combat.json";
import {
  attack,
  battleOutcome,
  createBattle,
  endPartyTurn,
  enemyTurn,
  inBounds,
  moveUnit,
  reachable,
  setGuard,
  unitAt,
} from "../src/systems/combat";
import type { BattleDef, UnitDef, UnitState } from "../src/systems/combat";
import type { Rng } from "../src/systems/dice";

const units = combatData.units as Record<string, UnitDef>;
const battle = (id: string): BattleDef => combatData.battles.find((entry) => entry.id === id) as BattleDef;

function seq(values: number[]): Rng {
  let index = 0;
  return () => values[index++ % values.length];
}

function smallBattle(pawn: { x: number; y: number }, foe: { x: number; y: number }): BattleDef {
  return {
    id: "small",
    name: "small",
    grid: { w: 6, h: 6 },
    objective: "defeat",
    party: [{ kind: "celestina", x: pawn.x, y: pawn.y }],
    enemies: [{ kind: "pale-guard", x: foe.x, y: foe.y }],
    onVictory: { effects: {}, flags: [] },
    onDefeat: { effects: {}, flags: [] },
  };
}

describe("combat", () => {
  it("createBattle создаёт юнитов из данных", () => {
    const state = createBattle(battle("battle-cauldron"), units);
    expect(state.units).toHaveLength(7);
    expect(state.units.filter((unit) => unit.team === "party")).toHaveLength(4);
    expect(state.units.filter((unit) => unit.team === "enemy")).toHaveLength(3);
    expect(state.turn).toBe("party");
    expect(state.round).toBe(1);

    const celestina = state.units.find((unit) => unit.id === "celestina") as UnitState;
    expect(celestina.hp).toBe(units.celestina.hp);
    expect(celestina.maxHp).toBe(units.celestina.hp);
    expect(celestina.atk).toBe(units.celestina.atk);
    expect(celestina.acted).toBe(false);
    expect(celestina.moved).toBe(false);
    expect(celestina.guard).toBe(false);

    // Одинаковые типы получают разные id.
    expect(state.units.filter((unit) => unit.id.startsWith("pale-guard")).map((unit) => unit.id)).toEqual([
      "pale-guard",
      "pale-guard-2",
    ]);
  });

  it("босс из battle-reagent помечен kind 'boss', цель — capture", () => {
    const state = createBattle(battle("battle-reagent"), units);
    expect(state.def.objective).toBe("capture");
    expect(state.units.find((unit) => unit.id === "zereks")?.kind).toBe("boss");
  });

  it("inBounds и unitAt работают по сетке", () => {
    const state = createBattle(battle("battle-cauldron"), units);
    expect(inBounds(state, 0, 0)).toBe(true);
    expect(inBounds(state, 19, 9)).toBe(true);
    expect(inBounds(state, -1, 0)).toBe(false);
    expect(inBounds(state, 20, 0)).toBe(false);
    expect(inBounds(state, 0, 10)).toBe(false);

    const first = state.units[0];
    expect(unitAt(state, first.x, first.y)?.id).toBe(first.id);
    expect(unitAt(state, 0, 0)).toBeUndefined();
  });

  it("reachable ограничивается mv и не проходит сквозь юнитов", () => {
    const state = createBattle(smallBattle({ x: 1, y: 1 }, { x: 2, y: 1 }), units);
    const cells = reachable(state, "celestina");

    expect(cells.some((cell) => cell.x === 1 && cell.y === 1)).toBe(true);
    expect(cells.some((cell) => cell.x === 2 && cell.y === 1)).toBe(false);
    expect(cells.every((cell) => Math.abs(cell.x - 1) + Math.abs(cell.y - 1) <= units.celestina.mv)).toBe(true);
    expect(reachable(state, "неизвестный")).toEqual([]);
  });

  it("moveUnit двигает юнита и запрещает второй ход", () => {
    const state = createBattle(smallBattle({ x: 1, y: 1 }, { x: 2, y: 1 }), units);
    expect(moveUnit(state, "celestina", { x: 1, y: 2 })).toBe(true);

    const hero = state.units.find((unit) => unit.id === "celestina") as UnitState;
    expect(hero.x).toBe(1);
    expect(hero.y).toBe(2);
    expect(hero.moved).toBe(true);
    expect(moveUnit(state, "celestina", { x: 1, y: 3 })).toBe(false);
    expect(moveUnit(state, "pale-guard", { x: 1, y: 2 })).toBe(false);
  });

  it("attack считает урон max(1, atk + d3 - def - guard)", () => {
    const state = createBattle(smallBattle({ x: 1, y: 1 }, { x: 2, y: 1 }), units);
    const result = attack(state, "celestina", "pale-guard", seq([0]));

    expect(result).toEqual({ damage: 5, targetHp: 15, killed: false });
    expect(state.units.find((unit) => unit.id === "celestina")?.acted).toBe(true);
  });

  it("защита снижает урон, а нулевое HP означает killed", () => {
    const guarding = createBattle(smallBattle({ x: 1, y: 1 }, { x: 2, y: 1 }), units);
    setGuard(guarding, "pale-guard");
    expect(guarding.units.find((unit) => unit.id === "pale-guard")?.acted).toBe(true);
    expect(attack(guarding, "celestina", "pale-guard", seq([0]))?.damage).toBe(3);

    const weak = { ...units, "pale-guard": { ...units["pale-guard"], hp: 2 } };
    const state = createBattle(smallBattle({ x: 1, y: 1 }, { x: 2, y: 1 }), weak);
    expect(attack(state, "celestina", "pale-guard", seq([0]))).toEqual({ damage: 5, targetHp: 0, killed: true });
  });

  it("attack отклоняет цели вне дистанции и союзников", () => {
    const state = createBattle(smallBattle({ x: 1, y: 1 }, { x: 4, y: 1 }), units);
    expect(attack(state, "celestina", "pale-guard", seq([0]))).toBeNull();
    expect(attack(state, "celestina", "celestina", seq([0]))).toBeNull();
    expect(attack(state, "нет", "pale-guard", seq([0]))).toBeNull();
  });

  it("battleOutcome различает ongoing, victory и defeat", () => {
    const state = createBattle(smallBattle({ x: 1, y: 1 }, { x: 2, y: 1 }), units);
    expect(battleOutcome(state)).toBe("ongoing");

    state.units.filter((unit) => unit.team === "enemy").forEach((unit) => (unit.hp = 0));
    expect(battleOutcome(state)).toBe("victory");

    const lost = createBattle(smallBattle({ x: 1, y: 1 }, { x: 2, y: 1 }), units);
    lost.units.filter((unit) => unit.team === "party").forEach((unit) => (unit.hp = 0));
    expect(battleOutcome(lost)).toBe("defeat");
  });

  it("capture даёт победу при соседстве с боссом", () => {
    const state = createBattle(battle("battle-reagent"), units);
    const boss = state.units.find((unit) => unit.kind === "boss") as UnitState;
    const hero = state.units.find((unit) => unit.team === "party") as UnitState;
    hero.x = boss.x;
    hero.y = boss.y - 1;
    expect(battleOutcome(state)).toBe("victory");
  });

  it("enemyTurn сближается, атакует и завершает раунд", () => {
    const state = createBattle(smallBattle({ x: 1, y: 1 }, { x: 2, y: 1 }), units);
    endPartyTurn(state);
    expect(state.turn).toBe("enemy");

    const log = enemyTurn(state, seq([0]));
    expect(log).toEqual([{ attacker: "pale-guard", target: "celestina", damage: 3 }]);
    expect(state.units.find((unit) => unit.id === "celestina")?.hp).toBe(25);
    expect(state.turn).toBe("party");
    expect(state.round).toBe(2);
  });
});
