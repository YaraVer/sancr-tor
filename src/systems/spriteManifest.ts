import charactersJson from '../data/characters.json';

export type Direction =
  | 'south'
  | 'south-east'
  | 'east'
  | 'north-east'
  | 'north'
  | 'north-west'
  | 'west'
  | 'south-west';

export interface CharacterSpriteState {
  [direction: string]: string;
}

export interface CharacterManifestEntry {
  id: string;
  name: string;
  role: string;
  sprite: {
    basePath: string;
    size: [number, number];
    states: Record<string, CharacterSpriteState>;
  };
  notes?: string;
}

export interface CharacterManifest {
  version: number;
  spriteSize: number;
  directions: Direction[];
  characters: CharacterManifestEntry[];
}

/**
 * Sprite manifest is imported at build time (src/data/characters.json).
 * That keeps loading deterministic: no dependency on JSON cache timing,
 * and it works the same in the browser build, tests and Electron.
 */
export const characterManifest = charactersJson as unknown as CharacterManifest;

export function textureKey(characterId: string, state: string, direction: string): string {
  return `char:${characterId}:${state}:${direction}`;
}
