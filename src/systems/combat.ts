/**
 * Тактический бой на сетке. Чистая логика: никаких импортов "godot".
 */

import type { Rng } from "./dice";

export interface UnitDef {
  hp: number;
  atk: number;
  mv: number;
  rng: number;
  def: number;
  kind: string;
}

export interface UnitState {
  id: string;
  kind: string;
  team: "party" | "enemy";
  hp: number;
  maxHp: number;
  atk: number;
  mv: number;
  rng: number;
  def: number;
  x: number;
  y: number;
  acted: boolean;
  moved: boolean;
  guard: boolean;
}

export interface BattleDef {
  id: string;
  name: string;
  grid: { w: number; h: number };
  objective: "defeat" | "capture";
  party: Array<{ kind: string; x: number; y: number }>;
  enemies: Array<{ kind: string; x: number; y: number }>;
  onVictory: { effects: Record<string, number>; flags: string[] };
  onDefeat: { effects: Record<string, number>; flags: string[] };
}

export interface BattleState {
  def: BattleDef;
  units: UnitState[];
  turn: "party" | "enemy";
  round: number;
}

interface Point {
  x: number;
  y: number;
}

const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const isAlive = (unit: UnitState): boolean => unit.hp > 0;
const distance = (a: Point, b: Point): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const key = (x: number, y: number): string => `${x},${y}`;
const rollDie = (sides: number, rng: Rng): number => 1 + Math.floor(rng() * sides);

export function createBattle(def: BattleDef, unitDefs: Record<string, UnitDef>): BattleState {
  const units: UnitState[] = [];
  const usedIds = new Set<string>();

  const add = (entry: { kind: string; x: number; y: number }, team: "party" | "enemy"): void => {
    const template = unitDefs[entry.kind];
    if (!template) throw new Error(`Unknown unit kind: ${entry.kind}`);

    let id = entry.kind;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${entry.kind}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);

    units.push({
      id,
      kind: template.kind,
      team,
      hp: template.hp,
      maxHp: template.hp,
      atk: template.atk,
      mv: template.mv,
      rng: template.rng,
      def: template.def,
      x: entry.x,
      y: entry.y,
      acted: false,
      moved: false,
      guard: false,
    });
  };

  for (const member of def.party) add(member, "party");
  for (const member of def.enemies) add(member, "enemy");

  return { def, units, turn: "party", round: 1 };
}

export function inBounds(state: BattleState, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < state.def.grid.w && y < state.def.grid.h;
}

export function unitAt(state: BattleState, x: number, y: number): UnitState | undefined {
  return state.units.find((unit) => isAlive(unit) && unit.x === x && unit.y === y);
}

/** Клетки в пределах mv, включая текущую; занятые другими юнитами клетки не входят. */
export function reachable(state: BattleState, id: string): Array<{ x: number; y: number }> {
  const unit = state.units.find((candidate) => candidate.id === id && isAlive(candidate));
  if (!unit) return [];

  const occupied = new Set(
    state.units.filter((other) => other !== unit && isAlive(other)).map((other) => key(other.x, other.y)),
  );
  const start = { x: unit.x, y: unit.y, d: 0 };
  const seen = new Set<string>([key(start.x, start.y)]);
  const result: Array<{ x: number; y: number }> = [{ x: unit.x, y: unit.y }];
  let frontier = [start];

  while (frontier.length > 0) {
    const next: Array<{ x: number; y: number; d: number }> = [];
    for (const current of frontier) {
      if (current.d >= unit.mv) continue;
      for (const [dx, dy] of DIRECTIONS) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        if (!inBounds(state, nx, ny)) continue;
        const cellKey = key(nx, ny);
        if (seen.has(cellKey) || occupied.has(cellKey)) continue;
        seen.add(cellKey);
        result.push({ x: nx, y: ny });
        next.push({ x: nx, y: ny, d: current.d + 1 });
      }
    }
    frontier = next;
  }

  return result;
}

export function moveUnit(state: BattleState, id: string, to: { x: number; y: number }): boolean {
  const unit = state.units.find((candidate) => candidate.id === id && isAlive(candidate));
  if (!unit || unit.moved || !inBounds(state, to.x, to.y)) return false;
  if (unitAt(state, to.x, to.y)) return false;
  if (!reachable(state, id).some((cell) => cell.x === to.x && cell.y === to.y)) return false;

  unit.x = to.x;
  unit.y = to.y;
  unit.moved = true;
  return true;
}

export function attack(
  state: BattleState,
  attackerId: string,
  targetId: string,
  rng: Rng = Math.random,
): { damage: number; targetHp: number; killed: boolean } | null {
  const attacker = state.units.find((unit) => unit.id === attackerId && isAlive(unit));
  const target = state.units.find((unit) => unit.id === targetId && isAlive(unit));
  if (!attacker || !target || attacker.team === target.team) return null;
  if (distance(attacker, target) > attacker.rng) return null;

  const damage = Math.max(1, attacker.atk + rollDie(3, rng) - target.def - (target.guard ? 2 : 0));
  target.hp = Math.max(0, target.hp - damage);
  attacker.acted = true;

  return { damage, targetHp: target.hp, killed: target.hp === 0 };
}

export function setGuard(state: BattleState, id: string): void {
  const unit = state.units.find((candidate) => candidate.id === id && isAlive(candidate));
  if (!unit) return;
  unit.guard = true;
  unit.acted = true;
}

function closest(origin: Point, candidates: UnitState[]): UnitState | undefined {
  return candidates.reduce<UnitState | undefined>((best, candidate) => {
    if (!best) return candidate;
    const candidateDistance = distance(origin, candidate);
    const bestDistance = distance(origin, best);
    return candidateDistance < bestDistance || (candidateDistance === bestDistance && candidate.hp < best.hp)
      ? candidate
      : best;
  }, undefined);
}

/** Простой ИИ: сближение с ближайшим противником в пределах mv и атака, если в зоне поражения. */
export function enemyTurn(state: BattleState, rng: Rng = Math.random): Array<{ attacker: string; target: string; damage: number }> {
  for (const unit of state.units) {
    if (unit.team === "enemy" && isAlive(unit)) {
      unit.acted = false;
      unit.moved = false;
      unit.guard = false;
    }
  }

  const log: Array<{ attacker: string; target: string; damage: number }> = [];

  for (const enemy of state.units.filter((unit) => unit.team === "enemy" && isAlive(unit))) {
    let foes = state.units.filter((unit) => unit.team === "party" && isAlive(unit));
    if (foes.length === 0) break;

    let target = closest(enemy, foes) as UnitState;

    if (distance(enemy, target) > enemy.rng && !enemy.moved) {
      const candidates = reachable(state, enemy.id)
        .filter((cell) => !(cell.x === enemy.x && cell.y === enemy.y))
        .sort((a, b) => distance(a, target) - distance(b, target) || distance(a, enemy) - distance(b, enemy));
      const step = candidates[0];
      if (step && distance(step, target) < distance(enemy, target)) {
        enemy.x = step.x;
        enemy.y = step.y;
        enemy.moved = true;
      }
    }

    foes = state.units.filter((unit) => unit.team === "party" && isAlive(unit));
    if (foes.length === 0) break;
    target = closest(enemy, foes) as UnitState;

    if (distance(enemy, target) <= enemy.rng) {
      const result = attack(state, enemy.id, target.id, rng);
      if (result) log.push({ attacker: enemy.id, target: target.id, damage: result.damage });
    }
  }

  state.turn = "party";
  state.round += 1;
  for (const unit of state.units) {
    if (unit.team === "party") {
      unit.acted = false;
      unit.moved = false;
      unit.guard = false;
    }
  }

  return log;
}

export function endPartyTurn(state: BattleState): void {
  state.turn = "enemy";
}

export function battleOutcome(state: BattleState): "ongoing" | "victory" | "defeat" {
  const party = state.units.filter((unit) => unit.team === "party" && isAlive(unit));
  const enemies = state.units.filter((unit) => unit.team === "enemy" && isAlive(unit));

  if (party.length === 0) return "defeat";
  if (enemies.length === 0) return "victory";

  if (state.def.objective === "capture") {
    const boss = enemies.find((unit) => unit.kind === "boss");
    if (boss && party.some((unit) => distance(unit, boss) === 1)) return "victory";
  }

  return "ongoing";
}
