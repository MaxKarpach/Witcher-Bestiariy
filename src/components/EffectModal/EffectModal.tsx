import { Modal } from '../Modal/Modal';
import { EFFECT_DEFINITIONS } from '../../constants/effectDefinitions';
import { PARAM_FULL_NAMES } from '../../constants/skillParamMap';
import { useEffects } from '../../context/EffectsContext';
import type { EffectId } from '../../types/effects';
import styles from './EffectModal.module.css';

interface EffectModalProps {
  effectId: EffectId;
  creatureId: string;
  onClose: () => void;
}

export function EffectModal({ effectId, creatureId, onClose }: EffectModalProps) {
  const { deactivateEffect } = useEffects();
  const def = EFFECT_DEFINITIONS[effectId];

  const handleRemove = () => {
    deactivateEffect(creatureId, effectId);
    onClose();
  };

  const paramModEntries = Object.entries(def.parameterModifiers);
  const skillModEntries = Object.entries(def.skillModifiers);
  const hasModifiers =
    def.attackModifier !== 0 ||
    def.defenseModifier !== 0 ||
    def.damagePerRound > 0 ||
    paramModEntries.length > 0 ||
    skillModEntries.length > 0;

  return (
    <Modal isOpen onClose={onClose}>
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.icon}>{def.icon}</span>
          <h2 className={styles.name}>{def.name}</h2>
        </div>

        <p className={styles.description}>{def.description}</p>

        {hasModifiers && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Модификаторы</h3>
            <ul className={styles.list}>
              {def.attackModifier !== 0 && (
                <li>{def.attackModifier > 0 ? '+' : ''}{def.attackModifier} к атаке</li>
              )}
              {def.defenseModifier !== 0 && (
                <li>{def.defenseModifier > 0 ? '+' : ''}{def.defenseModifier} к защите</li>
              )}
              {def.damagePerRound > 0 && (
                <li>{def.damagePerRound} урона ПЗ каждый раунд</li>
              )}
              {paramModEntries.map(([param, mod]) => (
                <li key={param}>
                  {(mod ?? 0) > 0 ? '+' : ''}{mod} к {PARAM_FULL_NAMES[param] ?? param} и навыкам этого параметра
                </li>
              ))}
              {skillModEntries.map(([skill, mod]) => (
                <li key={skill}>
                  {(mod ?? 0) > 0 ? '+' : ''}{mod} к проверкам {skill}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Условия снятия</h3>
          <ul className={styles.list}>
            {def.removalConditions.map((cond) => (
              <li key={cond}>{cond}</li>
            ))}
          </ul>
        </div>

        <button type="button" className={styles.removeBtn} onClick={handleRemove}>
          Снять эффект
        </button>
      </div>
    </Modal>
  );
}
