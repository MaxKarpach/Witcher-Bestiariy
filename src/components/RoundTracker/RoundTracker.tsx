import { useEffects } from '../../context/EffectsContext';
import { useInjuries } from '../../context/InjuriesContext';
import styles from './RoundTracker.module.css';

export function RoundTracker() {
  const { round, combatActive, startCombat, stopCombat, advanceRound } = useEffects();
  const { advanceRound: advanceInjuryRound } = useInjuries();

  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>Раунд боя</h2>
      {combatActive ? (
        <>
          <div className={styles.roundNumber}>{round}</div>
          <button
            type="button"
            className={styles.btn}
            onClick={() => { advanceRound(); advanceInjuryRound(); }}
          >
            Следующий раунд
          </button>
          <button
            type="button"
            className={styles.btnStop}
            onClick={stopCombat}
          >
            Завершить бой
          </button>
        </>
      ) : (
        <button
          type="button"
          className={styles.btn}
          onClick={startCombat}
        >
          Начать бой
        </button>
      )}
    </div>
  );
}
