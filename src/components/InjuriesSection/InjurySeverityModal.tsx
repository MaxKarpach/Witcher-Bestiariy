import { Modal } from '../Modal/Modal';
import {
  ALL_SEVERITIES,
  SEVERITY_LABELS,
  SEVERITY_HP_DAMAGE,
} from '../../constants/injuryDefinitions';
import type { InjurySeverity } from '../../types/injuries';
import styles from './InjurySeverityModal.module.css';

interface InjurySeverityModalProps {
  onSelect: (severity: InjurySeverity) => void;
  onClose: () => void;
}

export function InjurySeverityModal({ onSelect, onClose }: InjurySeverityModalProps) {
  return (
    <Modal isOpen onClose={onClose}>
      <p className={styles.title}>Выберите степень тяжести травмы</p>
      <div className={styles.grid}>
        {ALL_SEVERITIES.map((severity) => (
          <button
            key={severity}
            type="button"
            className={`${styles.btn} ${styles[severity]}`}
            onClick={() => onSelect(severity)}
          >
            <span className={styles.label}>{SEVERITY_LABELS[severity]}</span>
            <span className={styles.damage}>−{SEVERITY_HP_DAMAGE[severity]} ПЗ</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
