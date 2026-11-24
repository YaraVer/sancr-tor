/**
 * Настольные броски без привязки к движку.
 * Модуль не импортирует "godot" и используется и в тестах, и в рантайме.
 */

export type Rng = () => number;

/** Детерминированный ЛКГ (константы Numerical Recipes). */
export function makeRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export interface CheckInput {
  label: string;
  mod: number;
  dc: number;
  adv?: boolean;
  dis?: boolean;
}

export interface CheckResult {
  label: string;
  rolls: number[];
  mod: number;
  dc: number;
  total: number;
  success: boolean;
  crit: boolean;
}

function roll(rng: Rng, sides: number): number {
  return 1 + Math.floor(rng() * sides);
}

export function rollD20(rng: Rng = Math.random): number {
  return roll(rng, 20);
}

export function d20Check(input: CheckInput, rng: Rng = Math.random): CheckResult {
  const rolls: number[] = [rollD20(rng)];
  if (input.adv || input.dis) rolls.push(rollD20(rng));

  // При одновременно заданных adv/dis преимущество имеет приоритет (как в прототипе).
  const natural = input.adv ? Math.max(...rolls) : input.dis ? Math.min(...rolls) : rolls[0];
  const total = natural + input.mod;

  return {
    label: input.label,
    rolls,
    mod: input.mod,
    dc: input.dc,
    total,
    success: total >= input.dc,
    crit: natural === 20 || natural === 1,
  };
}

export function rollPercent(rng: Rng = Math.random): number {
  return roll(rng, 100);
}

export function pickEvent(table: Array<{ min: number; max: number; event: string }>, roll: number): string | null {
  for (const row of table) {
    if (roll >= row.min && roll <= row.max) return row.event;
  }
  return null;
}
