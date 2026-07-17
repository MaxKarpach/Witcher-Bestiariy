import { INJURY_DEFINITIONS, SEVERITY_LABELS } from '../../constants/injuryDefinitions';
import { useInjuries } from '../../context/InjuriesContext';
import type { ActiveInjury, InjuryState } from '../../types/injuries';
import styles from './ActiveInjuryItem.module.css';

const STATE_LABELS: Record<InjuryState, string> = {
  full: 'Полный',
  stabilized: 'Стабил.',
  healed: 'Вылечен',
};

const STATES: InjuryState[] = ['full', 'stabilized', 'healed'];

interface ActiveInjuryItemProps {
  creatureId: string;
  injury: ActiveInjury;
}

export function ActiveInjuryItem({ creatureId, injury }: ActiveInjuryItemProps) {
  const { setInjuryState, removeInjury } = useInjuries();
  const def = INJURY_DEFINITIONS[injury.injuryId];
  if (!def) return null;

  const currentEffect =
    injury.state === 'full'
      ? def.fullEffect
      : injury.state === 'stabilized'
        ? def.stabilizedEffect
        : def.healedEffect;

  return (
    <div className={styles.row}>
      <div className={styles.info}>
        <span className={styles.name}>{def.name}</span>
        <span className={`${styles.severity} ${styles[def.severity]}`}>
          {SEVERITY_LABELS[def.severity]}
        </span>
        <span className={styles.effectDesc}>{currentEffect.description}</span>
      </div>
      <div className={styles.controls}>
        <div className={styles.stateBtns}>
          {STATES.map((state) => (
            <button
              key={state}
              type="button"
              className={`${styles.stateBtn} ${injury.state === state ? styles.stateBtnActive : ''}`}
              onClick={() => setInjuryState(creatureId, injury.instanceId, state)}
            >
              {STATE_LABELS[state]}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.removeBtn}
          onClick={() => removeInjury(creatureId, injury.instanceId)}
          title="Убрать травму"
        >
          ×
        </button>
      </div>
    </div>
  );
}
