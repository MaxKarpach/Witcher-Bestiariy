import { useCallback, useState, useEffect } from 'react';
import { Modal } from '../Modal/Modal';
import { useModal } from '../../context/ModalContext';
import { useCreatures } from '../../context/CreaturesContext';
import {
  BODY_PART_KEYS,
  BODY_PART_LABELS,
  DAMAGE_MULTIPLIERS,
  type BodyPartKey,
} from '../../constants/bodyParts';
import styles from './ValueInputModal.module.css';

type Mode = 'damage' | 'heal';

function calcPartDamage(
  rawDamage: number,
  armor: number,
  multiplier: number,
  resistance: boolean,
): { hpDamage: number; penetrated: boolean; decrementArmor: boolean } {
  const resFactor = resistance ? 0.5 : 1;
  if (armor > 0) {
    const remaining = rawDamage - armor;
    if (remaining > 0) {
      return {
        hpDamage: Math.max(1, Math.floor(remaining * multiplier * resFactor)),
        penetrated: true,
        decrementArmor: true,
      };
    }
    return { hpDamage: 0, penetrated: false, decrementArmor: false };
  }
  return {
    hpDamage: Math.max(1, Math.floor(rawDamage * multiplier * resFactor)),
    penetrated: true,
    decrementArmor: false,
  };
}

export function ValueInputModal() {
  const { modalState, closeModal } = useModal();
  const { creatures, setParameter, decrementArmor } = useCreatures();

  const [mode, setMode] = useState<Mode>('damage');
  const [selectedParts, setSelectedParts] = useState<Set<BodyPartKey>>(new Set());
  const [rawDamage, setRawDamage] = useState('');
  const [healAmount, setHealAmount] = useState('');
  const [resistance, setResistance] = useState(false);
  const [vynDelta, setVynDelta] = useState('');

  const isOpen = modalState.type === 'valueInput';
  const creatureId = isOpen ? modalState.creatureId : '';
  const currentValue = isOpen ? modalState.currentValue : 0;
  const paramName = isOpen ? modalState.paramName : '';
  const paramGroup = isOpen ? modalState.paramGroup : 'additional' as const;
  const isVyn = paramName === 'Вын';

  useEffect(() => {
    if (!isOpen) {
      setMode('damage');
      setSelectedParts(new Set());
      setRawDamage('');
      setHealAmount('');
      setResistance(false);
      setVynDelta('');
    }
  }, [isOpen]);

  const creature = creatures.find((c) => c.id === creatureId);
  const armor = creature?.armor;

  const rawDmg = parseInt(rawDamage, 10);
  const damageValid = !isNaN(rawDmg) && rawDmg > 0;

  const partResults = BODY_PART_KEYS.map((part) => {
    const armorVal = armor?.[part] ?? 0;
    const multiplier = DAMAGE_MULTIPLIERS[part];
    const result = damageValid ? calcPartDamage(rawDmg, armorVal, multiplier, resistance) : null;
    return { part, armorVal, multiplier, result };
  });

  const totalDamage = partResults
    .filter(({ part }) => selectedParts.has(part))
    .reduce((sum, { result }) => sum + (result?.hpDamage ?? 0), 0);

  const togglePart = useCallback((part: BodyPartKey) => {
    setSelectedParts((prev) => {
      const next = new Set(prev);
      if (next.has(part)) next.delete(part);
      else next.add(part);
      return next;
    });
  }, []);

  const handleApplyDamage = useCallback(() => {
    if (!damageValid || selectedParts.size === 0) return;
    let hpReduction = 0;
    const toDecrement: BodyPartKey[] = [];
    for (const { part, result } of partResults) {
      if (!selectedParts.has(part) || !result) continue;
      hpReduction += result.hpDamage;
      if (result.decrementArmor) toDecrement.push(part);
    }
    setParameter(creatureId, 'additional', 'ПЗ', currentValue - hpReduction);
    for (const part of toDecrement) {
      decrementArmor(creatureId, part);
    }
    closeModal();
  }, [damageValid, selectedParts, partResults, creatureId, currentValue, setParameter, decrementArmor, closeModal]);

  const handleApplyHeal = useCallback(() => {
    const healVal = parseInt(healAmount, 10);
    if (isNaN(healVal) || healVal <= 0) return;
    setParameter(creatureId, 'additional', 'ПЗ', currentValue + healVal);
    closeModal();
  }, [healAmount, creatureId, currentValue, setParameter, closeModal]);

  const handleQuickVyn = useCallback((delta: number) => {
    setParameter(creatureId, paramGroup, 'Вын', currentValue + delta);
    closeModal();
  }, [creatureId, paramGroup, currentValue, setParameter, closeModal]);

  const handleApplyVyn = useCallback(() => {
    const delta = parseInt(vynDelta, 10);
    if (isNaN(delta)) return;
    setParameter(creatureId, paramGroup, 'Вын', currentValue + delta);
    closeModal();
  }, [vynDelta, creatureId, paramGroup, currentValue, setParameter, closeModal]);

  if (!isOpen) return null;

  const canApplyDamage = damageValid && selectedParts.size > 0;

  return (
    <Modal isOpen={isOpen} onClose={closeModal}>
      <p className={styles.title}>{paramName}: {currentValue}</p>

      {isVyn && (
        <div className={styles.vynSection}>
          <div className={styles.quickBtns}>
            <button type="button" className={styles.quickBtn} onClick={() => handleQuickVyn(-3)}>
              −3 Вын
            </button>
            <button type="button" className={styles.quickBtn} onClick={() => handleQuickVyn(-1)}>
              −1 Вын
            </button>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Значение</span>
            <input
              type="text"
              inputMode="numeric"
              className={styles.input}
              value={vynDelta}
              onChange={(e) => setVynDelta(e.target.value)}
              placeholder="−1, +2, ..."
              autoFocus
            />
          </div>
          <button
            type="button"
            className={styles.submitBtn}
            onClick={handleApplyVyn}
            disabled={isNaN(parseInt(vynDelta, 10))}
          >
            Применить
          </button>
        </div>
      )}

      {!isVyn && (
        <>
          <div className={styles.modeBar}>
            <button
              type="button"
              className={`${styles.modeBtn} ${mode === 'damage' ? styles.modeBtnActive : ''}`}
              onClick={() => setMode('damage')}
            >
              Урон
            </button>
            <button
              type="button"
              className={`${styles.modeBtn} ${mode === 'heal' ? styles.modeBtnActive : ''}`}
              onClick={() => setMode('heal')}
            >
              Восстановление
            </button>
          </div>

          {mode === 'damage' && (
            <div className={styles.damageSection}>
              <div className={styles.partsGrid}>
                {partResults.map(({ part, armorVal }) => (
                  <button
                    key={part}
                    type="button"
                    className={`${styles.partBtn} ${selectedParts.has(part) ? styles.partBtnSelected : ''}`}
                    onClick={() => togglePart(part)}
                  >
                    <span className={styles.partName}>{BODY_PART_LABELS[part]}</span>
                    <span className={styles.partArmor}>ПБ: {armorVal}</span>
                  </button>
                ))}
              </div>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>Урон</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.input}
                  value={rawDamage}
                  onChange={(e) => setRawDamage(e.target.value)}
                  placeholder="0"
                  autoFocus
                />
              </div>

              <label className={styles.resistanceLabel}>
                <input
                  type="checkbox"
                  checked={resistance}
                  onChange={(e) => setResistance(e.target.checked)}
                  className={styles.resistanceCheckbox}
                />
                Есть сопротивление урону
              </label>

              {selectedParts.size > 0 && damageValid && (
                <div className={styles.preview}>
                  {partResults
                    .filter(({ part }) => selectedParts.has(part))
                    .map(({ part, armorVal, multiplier, result }) => (
                      <div key={part} className={styles.previewRow}>
                        <span className={styles.previewPart}>{BODY_PART_LABELS[part]}</span>
                        {result!.penetrated ? (
                          <span className={styles.previewCalc}>
                            {armorVal > 0
                              ? `${rawDmg} − ${armorVal} = ${rawDmg - armorVal} × ${multiplier}${resistance ? ' ÷ 2' : ''} = `
                              : `${rawDmg} × ${multiplier}${resistance ? ' ÷ 2' : ''} = `}
                            <strong>{result!.hpDamage}</strong>
                            {result!.decrementArmor && (
                              <span className={styles.armorNote}> (ПБ −1)</span>
                            )}
                          </span>
                        ) : (
                          <span className={styles.previewAbsorb}>Броня поглощает</span>
                        )}
                      </div>
                    ))}
                  <div className={styles.previewTotal}>
                    Суммарный урон ПЗ: <strong>{totalDamage}</strong>
                  </div>
                </div>
              )}

              <button
                type="button"
                className={styles.submitBtn}
                onClick={handleApplyDamage}
                disabled={!canApplyDamage}
              >
                Применить урон
              </button>
            </div>
          )}

          {mode === 'heal' && (
            <div className={styles.healSection}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Количество</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.input}
                  value={healAmount}
                  onChange={(e) => setHealAmount(e.target.value)}
                  placeholder="0"
                  autoFocus
                />
              </div>
              <button
                type="button"
                className={`${styles.submitBtn} ${styles.submitBtnHeal}`}
                onClick={handleApplyHeal}
              >
                Восстановить
              </button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
