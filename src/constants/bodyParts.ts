/** Ключи зон тела для брони */
export const BODY_PART_KEYS = [
  'head',
  'torso',
  'armRight',
  'armLeft',
  'legRight',
  'legLeft',
] as const;

export type BodyPartKey = (typeof BODY_PART_KEYS)[number];

/** Подписи зон для UI */
export const BODY_PART_LABELS: Record<BodyPartKey, string> = {
  head: 'Голова',
  torso: 'Торс',
  armRight: 'Рука правая',
  armLeft: 'Рука левая',
  legRight: 'Нога правая',
  legLeft: 'Нога левая',
};

/** Множители урона по зонам тела */
export const DAMAGE_MULTIPLIERS: Record<BodyPartKey, number> = {
  head: 3,
  torso: 1,
  armRight: 0.5,
  armLeft: 0.5,
  legRight: 0.5,
  legLeft: 0.5,
};
