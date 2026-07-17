import { useState } from 'react';
import { useEffects } from '../../context/EffectsContext';
import { EFFECT_DEFINITIONS, ALL_EFFECT_IDS } from '../../constants/effectDefinitions';
import { EffectModal } from '../EffectModal/EffectModal';
import { BurningModal } from '../BurningModal/BurningModal';
import type { EffectId } from '../../types/effects';
import styles from './EffectsBar.module.css';

interface EffectsBarProps {
  creatureId: string;
}

export function EffectsBar({ creatureId }: EffectsBarProps) {
  const { getActiveEffects, activateEffect, deactivateEffect, getBurningParts } = useEffects();
  const [selectedEffect, setSelectedEffect] = useState<EffectId | null>(null);

  const activeEffects = getActiveEffects(creatureId);

  const isBurningActive = Object.values(getBurningParts(creatureId)).some(Boolean);

  const isEffectActive = (id: EffectId) => {
    if (id === 'burning') return isBurningActive;
    return activeEffects.some((ae) => ae.effectId === id);
  };

  const handleClick = (id: EffectId) => {
    if (id === 'burning') {
      setSelectedEffect('burning');
      return;
    }
    const active = activeEffects.some((ae) => ae.effectId === id);
    if (active) {
      setSelectedEffect(id);
    } else {
      activateEffect(creatureId, id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, id: EffectId) => {
    e.preventDefault();
    deactivateEffect(creatureId, id);
  };

  return (
    <div className={styles.bar}>
      {ALL_EFFECT_IDS.map((id) => {
        const def = EFFECT_DEFINITIONS[id];
        const active = isEffectActive(id);
        return (
          <button
            key={id}
            type="button"
            className={`${styles.btn} ${active ? styles.active : styles.inactive}`}
            onClick={() => handleClick(id)}
            onContextMenu={(e) => handleContextMenu(e, id)}
            title={active ? `${def.name} (ПКМ для снятия)` : def.name}
          >
            <span className={styles.icon}>{def.icon}</span>
            <span className={styles.label}>{def.name}</span>
          </button>
        );
      })}

      {selectedEffect && selectedEffect !== 'burning' && (
        <EffectModal
          effectId={selectedEffect}
          creatureId={creatureId}
          onClose={() => setSelectedEffect(null)}
        />
      )}

      {selectedEffect === 'burning' && (
        <BurningModal
          creatureId={creatureId}
          onClose={() => setSelectedEffect(null)}
        />
      )}
    </div>
  );
}
