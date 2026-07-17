import type { Creature, ArmorByPart, AbilitiesSlots } from '../types';
import { BODY_PART_KEYS } from '../constants/bodyParts';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Вычисляет имя для клона: убирает trailing-число из originalName, ищет свободный номер */
export function getCloneName(originalName: string, existingNames: string[]): string {
  const baseName = (originalName.replace(/ \d+$/, '').trim()) || 'Существо';
  const pattern = new RegExp(`^${escapeRegex(baseName)} (\\d+)$`);
  let max = 0;
  for (const name of existingNames) {
    const match = name.match(pattern);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `${baseName} ${max + 1}`;
}

/** Генерирует уникальный id для существа */
export function generateCreatureId(): string {
  return `creature-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Броня по умолчанию (все зоны 0), для новых существ и fallback */
export const DEFAULT_ARMOR: ArmorByPart = Object.fromEntries(
  BODY_PART_KEYS.map((key) => [key, 0])
) as ArmorByPart;

/** Генерирует id для строки атаки */
export function generateAttackId(): string {
  return `attack-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_ABILITIES: AbilitiesSlots = ['', '', '', '', ''];

/** Создаёт новое пустое существо с пустыми группами параметров, бронёй, атаками и способностями */
export function createEmptyCreature(): Creature {
  return {
    id: generateCreatureId(),
    name: '',
    description: '',
    imageUrl: '',
    parameters: {
      main: {},
      additional: {},
      skillBases: {},
      defense: {},
    },
    armor: { ...DEFAULT_ARMOR },
    attacks: [],
    abilities: [...DEFAULT_ABILITIES] as AbilitiesSlots,
  };
}
