import { useState } from 'react';
import { useInjuries } from '../../context/InjuriesContext';
import type { InjurySeverity } from '../../types/injuries';
import { ActiveInjuryItem } from './ActiveInjuryItem';
import { InjurySeverityModal } from './InjurySeverityModal';
import { InjuryListModal } from './InjuryListModal';
import styles from './InjuriesSection.module.css';

type ModalStep = null | 'severity' | 'list';

interface InjuriesSectionProps {
  creatureId: string;
}

export function InjuriesSection({ creatureId }: InjuriesSectionProps) {
  const { getActiveInjuries, applyInjury } = useInjuries();
  const [step, setStep] = useState<ModalStep>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<InjurySeverity | null>(null);

  const activeInjuries = getActiveInjuries(creatureId);

  const handleSelectSeverity = (severity: InjurySeverity) => {
    setSelectedSeverity(severity);
    setStep('list');
  };

  const handleSelectInjury = (injuryId: string) => {
    applyInjury(creatureId, injuryId);
    setStep(null);
    setSelectedSeverity(null);
  };

  const handleClose = () => {
    setStep(null);
    setSelectedSeverity(null);
  };

  const handleBack = () => {
    setStep('severity');
    setSelectedSeverity(null);
  };

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <span className={styles.sectionTitle}>Критические травмы</span>
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => setStep('severity')}
        >
          + Нанести травму
        </button>
      </div>

      {activeInjuries.length > 0 && (
        <ul className={styles.list}>
          {activeInjuries.map((injury) => (
            <li key={injury.instanceId}>
              <ActiveInjuryItem creatureId={creatureId} injury={injury} />
            </li>
          ))}
        </ul>
      )}

      {step === 'severity' && (
        <InjurySeverityModal onSelect={handleSelectSeverity} onClose={handleClose} />
      )}

      {step === 'list' && selectedSeverity && (
        <InjuryListModal
          severity={selectedSeverity}
          onSelect={handleSelectInjury}
          onBack={handleBack}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
