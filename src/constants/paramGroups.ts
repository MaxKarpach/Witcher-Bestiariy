/** Основные параметры (Инт, Реа, Лвк, Тел, Скор, Эмп, Рем, Воля) */
export const MAIN_PARAMS = [
  'Инт',
  'Реа',
  'Лвк',
  'Тел',
  'Скор',
  'Эмп',
  'Рем',
  'Воля',
] as const;

/** Дополнительные параметры (Уст, Бег, Прж, Вын, Вес, Отдых, ПЗ) */
export const ADDITIONAL_PARAMS = [
  'Уст',
  'Бег',
  'Прж',
  'Вын',
  'Вес',
  'Отдых',
  'ПЗ',
] as const;

/** Защита: Уклонение, Блокирование, Смена позиции */
export const DEFENSE_PARAMS = [
  'Уклонение',
  'Блокирование',
  'Смена позиции',
] as const;

export type MainParamName = (typeof MAIN_PARAMS)[number];
export type AdditionalParamName = (typeof ADDITIONAL_PARAMS)[number];
export type DefenseParamName = (typeof DEFENSE_PARAMS)[number];

/** Ключ группы параметров */
export type ParamGroupKey = 'main' | 'additional' | 'skillBases' | 'defense';
