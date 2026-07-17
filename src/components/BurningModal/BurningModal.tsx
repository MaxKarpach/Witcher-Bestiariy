import { useState } from 'react';
import { Modal } from '../Modal/Modal';
import { useEffects } from '../../context/EffectsContext';
import { useCreatures } from '../../context/CreaturesContext';
import { BODY_PART_KEYS, BODY_PART_LABELS, DAMAGE_MULTIPLIERS, type BodyPartKey } from '../../constants/bodyParts';
import styles from './BurningModal.module.css';

const BURNING_BASE = 5;

function getPartDamage(part: BodyPartKey): number {
  return Math.floor(BURNING_BASE * DAMAGE_MULTIPLIERS[part]);
}

interface BurningModalProps {
  creatureId: string;
  onClose: () => void;
}

export function BurningModal({ creatureId, onClose }: BurningModalProps) {
  const { getBurningParts, setBurningParts, extinguishBodyPart, deactivateEffect } = useEffects();
  const { creatures } = useCreatures();

  const creature = creatures.find((c) => c.id === creatureId);
  const initialParts = getBurningParts(creatureId);
  const [localParts, setLocalParts] = useState<Partial<Record<string, boolean>>>(initialParts);

  const toggle = (part: BodyPartKey) => {
    setLocalParts((prev) => {
      const current = prev[part] ?? false;
      if (current) {
        const { [part]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [part]: true };
    });
  };

  const handleExtinguish = (part: BodyPartKey) => {
    extinguishBodyPart(creatureId, part);
    setLocalParts((prev) => {
      const { [part]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleApply = () => {
    setBurningParts(creatureId, localParts);
    onClose();
  };

  const handleExtinguishAll = () => {
    deactivateEffect(creatureId, 'burning');
    onClose();
  };

  const isBurningActive = Object.values(getBurningParts(creatureId)).some(Boolean);

  return (
    <Modal isOpen onClose={onClose}>
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.icon}>🔥</span>
          <h2 className={styles.name}>Горение</h2>
        </div>

        <p className={styles.hint}>
          Отметьте охваченные огнём части тела. ЛКМ по строке — переключить. «Погасить» снимает часть немедленно.
        </p>

        <div className={styles.partsTable}>
          <div className={styles.tableHeader}>
            <span>Часть тела</span>
            <span className={styles.colCenter}>Огонь</span>
            <span className={styles.colCenter}>Броня</span>
            <span className={styles.colCenter}>Урон ПЗ</span>
            <span className={styles.colCenter}>Горит</span>
            <span />
          </div>

          {BODY_PART_KEYS.map((part) => {
            const partDamage = getPartDamage(part);
            const armor = creature?.armor?.[part] ?? 0;
            const hpDamage = Math.max(0, partDamage - armor);
            const isBurning = localParts[part] ?? false;
            const wasAlreadyBurning = initialParts[part] ?? false;

            return (
              <div
                key={part}
                className={`${styles.partRow} ${isBurning ? styles.partBurning : ''}`}
                onClick={() => toggle(part)}
              >
                <span className={styles.partName}>{BODY_PART_LABELS[part]}</span>
                <span className={styles.colCenter}>{partDamage}</span>
                <span className={styles.colCenter}>{armor}</span>
                <span className={`${styles.colCenter} ${hpDamage > 0 ? styles.noBlocks : styles.blocks}`}>
                  {hpDamage > 0 ? `−${hpDamage}` : '0'}
                </span>
                <span className={styles.colCenter}>
                  <input
                    type="checkbox"
                    checked={isBurning}
                    onChange={() => toggle(part)}
                    onClick={(e) => e.stopPropagation()}
                    className={styles.checkbox}
                  />
                </span>
                <span>
                  {wasAlreadyBurning && (
                    <button
                      type="button"
                      className={styles.extinguishBtn}
                      onClick={(e) => { e.stopPropagation(); handleExtinguish(part); }}
                      title="Погасить эту часть тела"
                    >
                      Погасить
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.applyBtn} onClick={handleApply}>
            Применить
          </button>
          {isBurningActive && (
            <button type="button" className={styles.extinguishAllBtn} onClick={handleExtinguishAll}>
              Потушить всё
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
