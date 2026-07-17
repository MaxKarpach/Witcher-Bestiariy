import type { RollRecord } from '../../types';
import styles from './RollHistory.module.css';

interface RollHistoryProps {
  records: RollRecord[];
}

/**
 * Отображает историю бросков. Не содержит логики расчётов — только UI.
 */
export function RollHistory({ records }: RollHistoryProps) {
  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>История бросков</h2>
      <ul className={styles.list}>
        {records.length === 0 ? (
          <li className={styles.empty}>Пока нет записей</li>
        ) : (
          records.map((r) => (
            <li key={r.id} className={styles.item}>
              <div className={styles.step}>{r.stepByStep}</div>
              {(r.result === 'Попадание' || r.result === 'Промах') && (
                <div className={styles.difference}>
                  Разница: {r.difference > 0 ? '+' : ''}{r.difference}
                </div>
              )}
              <div
                className={
                  r.result === 'Попадание' ? styles.resultHit
                  : r.result === 'Промах' ? styles.resultMiss
                  : r.result === 'Успех' ? styles.resultSuccess
                  : styles.resultFail
                }
              >
                {r.result}
                {r.result === 'Попадание' && r.critical && (
                  <span className={styles.critical}>, {r.critical}</span>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
