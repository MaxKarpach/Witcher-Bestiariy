import { useCallback } from 'react';
import type { AbilitiesSlots } from '../../types';
import { useCreatures } from '../../context/CreaturesContext';
import styles from './AbilitiesSection.module.css';

const ABILITY_COUNT = 5;

interface AbilitiesSectionProps {
  creatureId: string;
  abilities?: AbilitiesSlots;
}

export function AbilitiesSection({ creatureId, abilities }: AbilitiesSectionProps) {
  const { setAbility } = useCreatures();
  const list = abilities ?? (['', '', '', '', ''] as AbilitiesSlots);

  const handleChange = useCallback(
    (index: number, value: string) => {
      setAbility(creatureId, index, value);
    },
    [creatureId, setAbility]
  );

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Способности</h3>
      <div className={styles.grid}>
        {Array.from({ length: ABILITY_COUNT }, (_, i) => (
          <div
            key={i}
            className={`${styles.abilityBlock} ${i === 4 ? styles.gridFull : ''}`}
          >
            <label className={styles.abilityLabel} htmlFor={`ability-${creatureId}-${i}`}>
              Способность {i + 1}
            </label>
            <textarea
              id={`ability-${creatureId}-${i}`}
              className={styles.abilityTextarea}
              value={list[i] ?? ''}
              onChange={(e) => handleChange(i, e.target.value)}
              placeholder="Описание способности"
              rows={4}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
