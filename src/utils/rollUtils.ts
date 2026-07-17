import type { RollRecord, RollResultType } from '../types';

/**
 * Определяет критическую травму по разнице между атакой и защитой.
 * @param difference Разница между броском атаки и защитой/сложностью.
 * @returns Строка с описанием критической травмы или null, если крита нет.
 */
export function getCriticalWound(difference: number): string | null {
  if (difference >= 7 && difference < 10) {
    return 'Лёгкая критическая травма, Доп. урон: 3';
  }
  if (difference >= 10 && difference < 13) {
    return 'Средняя критическая травма, Доп. урон: 5';
  }
  if (difference >= 13 && difference < 15) {
    return 'Тяжёлая критическая травма, Доп. урон: 8';
  }
  if (difference >= 15) {
    return 'Смертельная критическая травма, Доп. урон: 10';
  }
  return null;
}

/**
 * Вычисляет результат броска по базовым значениям и модификаторам.
 * Модификатор (параметр существа) добавляется к атаке или защите в зависимости от выбора стороны.
 */
export function calculateRollResult(
  baseAttack: number,
  baseDefense: number,
  attackModifier: number,
  defenseModifier: number
): Omit<RollRecord, 'id'> {
  const attackTotal = baseAttack + attackModifier;
  const defenseTotal = baseDefense + defenseModifier;
  const difference = attackTotal - defenseTotal;
  const result: RollResultType = difference > 0 ? 'Попадание' : 'Промах';
  const stepByStep = `Атака: ${baseAttack} + ${attackModifier} = ${attackTotal}, Защита: ${baseDefense} + ${defenseModifier} = ${defenseTotal}`;

  const record: Omit<RollRecord, 'id'> = {
    stepByStep,
    difference,
    result,
  };

  if (result === 'Попадание') {
    const critical = getCriticalWound(difference);
    if (critical) {
      record.critical = critical;
    }
  }

  return record;
}

/** Бросок устойчивости: d10, успех если результат строго ниже paramValue */
export function rollStamina(paramValue: number): Omit<RollRecord, 'id'> {
  const roll = Math.floor(Math.random() * 10) + 1;
  const success = roll < paramValue;
  return {
    stepByStep: `Устойчивость: бросок ${roll}, порог ${paramValue}`,
    difference: paramValue - roll,
    result: success ? 'Успех' : 'Провал',
  };
}

/** Генерирует уникальный id для записи в истории */
export function generateRollId(): string {
  return `roll-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Парсит число из строки, возвращает 0 при невалидном вводе */
export function parseNumberInput(value: string): number {
  const n = parseInt(value.trim(), 10);
  return Number.isNaN(n) ? 0 : n;
}
