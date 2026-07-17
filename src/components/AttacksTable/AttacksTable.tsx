import { useCallback } from 'react';
import type { Attack } from '../../types';
import { useCreatures } from '../../context/CreaturesContext';
import { useModal } from '../../context/ModalContext';
import { parseNumberInput } from '../../utils/rollUtils';
import styles from './AttacksTable.module.css';

const COLUMNS: { key: keyof Omit<Attack, 'id'>; label: string; className: string }[] = [
  { key: 'name', label: 'Название', className: styles.colName },
  { key: 'base', label: 'Основа', className: styles.colBase },
  { key: 'type', label: 'Тип', className: styles.colType },
  { key: 'damage', label: 'Урон', className: styles.colDamage },
  { key: 'h', label: 'H', className: styles.colH },
  { key: 'd', label: 'Д', className: styles.colD },
  { key: 'effect', label: 'Эффект', className: styles.colEffect },
  { key: 'ca', label: 'CA', className: styles.colCA },
];

interface AttacksTableProps {
  creatureId: string;
  attacks: Attack[];
}

export function AttacksTable({ creatureId, attacks }: AttacksTableProps) {
  const { addAttack, removeAttack, updateAttack } = useCreatures();
  const { openParameterRoll } = useModal();

  const handleCellChange = useCallback(
    (attackId: string, field: keyof Omit<Attack, 'id'>, value: string | number) => {
      updateAttack(creatureId, attackId, { [field]: value });
    },
    [creatureId, updateAttack]
  );

  const handleBaseRoll = useCallback(
    (row: Attack) => {
      const paramName = row.name.trim() ? `${row.name} (Основа)` : 'Основа';
      openParameterRoll(paramName, row.base, creatureId);
    },
    [openParameterRoll, creatureId]
  );

  const list = attacks ?? [];

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Атаки</h3>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {COLUMNS.map(({ key, label, className }) => (
                <th key={key} className={`${styles.th} ${className}`}>
                  {label}
                </th>
              ))}
              <th className={styles.colRemove} />
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                {COLUMNS.map(({ key, className }) => {
                  const isBase = key === 'base';
                  const value = row[key];
                  return (
                    <td key={key} className={`${styles.td} ${className}`}>
                      {isBase ? (
                        <div className={styles.baseCell}>
                          <input
                            type="text"
                            inputMode="numeric"
                            className={`${styles.cellInput} ${styles.baseInput}`}
                            value={(value as number) ?? 0}
                            onChange={(e) =>
                              handleCellChange(row.id, 'base', parseNumberInput(e.target.value))
                            }
                            aria-label="Основа"
                          />
                          <button
                            type="button"
                            className={styles.rollBtn}
                            onClick={() => handleBaseRoll(row)}
                            title="Бросок: выбор стороны и ввод значений"
                          >
                            Бросок
                          </button>
                        </div>
                      ) : (
                        <input
                          type="text"
                          className={styles.cellInput}
                          value={(value as string) ?? ''}
                          onChange={(e) =>
                            handleCellChange(row.id, key as keyof Omit<Attack, 'id'>, e.target.value)
                          }
                          aria-label={key}
                        />
                      )}
                    </td>
                  );
                })}
                <td className={styles.td}>
                  <button
                    type="button"
                    className={styles.removeRow}
                    onClick={() => removeAttack(creatureId, row.id)}
                    title="Удалить строку"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className={styles.addRow}
        onClick={() => addAttack(creatureId)}
      >
        + Добавить атаку
      </button>
    </section>
  );
}
