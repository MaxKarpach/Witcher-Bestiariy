/** Параметры существа по группам */
export interface CreatureParameters {
  /** Основные: Инт, Реа, Лвк, Тел, Скор, Эмп, Рем, Воля */
  main: Record<string, number>;
  /** Дополнительные: Уст, Бег, Прж, Вын, Вес, Отдых, ПЗ */
  additional: Record<string, number>;
  /** Основы навыков — названия задаёт пользователь */
  skillBases: Record<string, number>;
  /** Защита: Уклонение, Блокирование, Смена позиции */
  defense: Record<string, number>;
}

export type { ParamGroupKey } from '../constants/paramGroups';


import type { BodyPartKey } from '../constants/bodyParts';
export type { BodyPartKey };

/** Броня по зонам тела (текущие пункты, редактируемые; клик по зоне снимает 1) */
export type ArmorByPart = Record<BodyPartKey, number>;

/** Строка таблицы атак */
export interface Attack {
  id: string;
  name: string;
  base: number;
  type: string;
  damage: string;
  h: string;
  d: string;
  effect: string;
  ca: string;
}

/** Пять слотов способностей — крупные текстовые поля */
export type AbilitiesSlots = [string, string, string, string, string];

/** Существо в бестиарии */
export interface Creature {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  parameters: CreatureParameters;
  armor?: ArmorByPart;
  /** Таблица атак (добавление/удаление строк, редактирование ячеек; клик по «Основа» — бросок) */
  attacks?: Attack[];
  /** Пять способностей — крупные текстовые поля */
  abilities?: AbilitiesSlots;
}

/** Сторона при броске: атака или защита */
export type RollSide = 'attack' | 'defense';

/** Результат броска */
export type RollResultType = 'Попадание' | 'Промах' | 'Успех' | 'Провал';

/** Одна запись в истории бросков (только данные для отображения) */
export interface RollRecord {
  id: string;
  /** Пошаговый расчёт, например: "Атака: 14 + 12 = 26, Защита: 18" */
  stepByStep: string;
  /** Итоговая разница (атака − защита) */
  difference: number;
  /** "Попадание" | "Промах" */
  result: RollResultType;
  /** Описание критического попадания, если есть */
  critical?: string;
}

/** Состояние модального потока: выбор стороны → ввод значений */
export type ModalStep = 'side' | 'values' | null;

/** Контекст открытого параметра для броска */
export interface ParameterRollContext {
  /** Название параметра (например "Скорость") */
  paramName: string;
  /** Значение параметра (например 12) */
  paramValue: number;
  /** Выбранная сторона: куда применить параметр */
  side: RollSide | null;
}
