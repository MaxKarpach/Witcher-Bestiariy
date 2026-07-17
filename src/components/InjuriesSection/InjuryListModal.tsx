import { Modal } from '../Modal/Modal';
import {
  INJURY_DEFINITIONS,
  INJURIES_BY_SEVERITY,
  SEVERITY_LABELS,
} from '../../constants/injuryDefinitions';
import type { InjurySeverity } from '../../types/injuries';
import styles from './InjuryListModal.module.css';

interface InjuryListModalProps {
  severity: InjurySeverity;
  onSelect: (injuryId: string) => void;
  onBack: () => void;
  onClose: () => void;
}

export function InjuryListModal({ severity, onSelect, onBack, onClose }: InjuryListModalProps) {
  const ids = INJURIES_BY_SEVERITY[severity];

  return (
    <Modal isOpen onClose={onClose}>
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          ←
        </button>
        <p className={styles.title}>{SEVERITY_LABELS[severity]} травма</p>
      </div>

      {ids.length === 0 ? (
        <p className={styles.empty}>Список травм этой степени ещё не добавлен.</p>
      ) : (
        <ul className={styles.list}>
          {ids.map((id) => {
            const def = INJURY_DEFINITIONS[id];
            if (!def) return null;
            return (
              <li key={id}>
                <button
                  type="button"
                  className={styles.item}
                  onClick={() => onSelect(id)}
                >
                  <span className={styles.name}>{def.name}</span>
                  <span className={styles.effect}>{def.fullEffect.description}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
