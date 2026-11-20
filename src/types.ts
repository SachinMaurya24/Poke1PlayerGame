export enum Direction {
  South = 0,
  SouthEast = 1,
  East = 2,
  NorthEast = 3,
  North = 4,
  NorthWest = 5,
  West = 6,
  SouthWest = 7,
}

export type ActionState = 'idle' | 'walk' | 'attack' | 'shoot' | 'hurt' | 'faint' | 'dash';

export interface AnimMeta {
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  durations: number[]; // frame durations in game ticks / steps
  rushFrame?: number | null;
  hitFrame?: number | null;
  returnFrame?: number | null;
}

export type PokemonElement = 'fire' | 'water' | 'grass' | 'fighting' | 'steel' | 'dragon' | 'normal';

export interface PokemonStats {
  maxHp: number;
  hp: number;
  maxStamina: number;
  stamina: number;
  speed: number;
  attackPower: number;
  defense: number;
  name: string;
  dex: string;
  element: PokemonElement;
  secondaryElement?: PokemonElement;
}

export interface SkillInfo {
  id: string;
  name: string;
  type: 'projectile' | 'stream' | 'melee' | 'dash';
  element: PokemonElement;
  cooldown: number; // in seconds
  currentCooldown: number;
  staminaCost: number;
  keyHint: string;
  description: string;
  icon: string;
}

export interface Projectile {
  id: number;
  owner: 'player' | 'enemy';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  element: PokemonElement;
  lifetime: number; // in seconds
  maxLifetime: number;
  piercing: boolean;
  isFireBlast?: boolean;
  isSolarBeam?: boolean;
  hasExploded?: boolean;
  hasHitTarget?: boolean;
  scale?: number;
}

export interface MeleeHitbox {
  owner: 'player' | 'enemy';
  x: number;
  y: number;
  radius: number;
  damage: number;
  element: PokemonElement;
  lifetime: number;
  hasHit: boolean;
}

export interface DamageNumber {
  x: number;
  y: number;
  text: string;
  color: string;
  lifetime: number;
  maxLifetime: number;
  vy: number;
  scale: number;
}
