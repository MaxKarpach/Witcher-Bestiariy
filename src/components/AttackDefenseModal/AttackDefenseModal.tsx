import { useCallback, useState, useEffect } from 'react';
import { Modal } from '../Modal/Modal';
import { useModal } from '../../context/ModalContext';
import { useRollHistory } from '../../context/RollHistoryContext';
import { useEffects } from '../../context/EffectsContext';
import { useInjuries } from '../../context/InjuriesContext';
import { calculateRollResult, parseNumberInput } from '../../utils/rollUtils';
import styles from './AttackDefenseModal.module.css';

export function AttackDefenseModal() {
  const { modalState, closeModal } = useModal();
  const { addRecord } = useRollHistory();
  const { getEffectModifiers, getParamModifier } = useEffects();
  const { getInjuryAttackModifier, getInjuryDefenseModifier, getInjuryParamModifier } = useInjuries();
  const [attackInput, setAttackInput] = useState('');
  const [defenseInput, setDefenseInput] = useState('');

  const isOpen = modalState.type === 'parameterRoll' && modalState.step === 'values';

  useEffect(() => {
    if (!isOpen) {
      setAttackInput('');
      setDefenseInput('');
    }
  }, [isOpen]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (modalState.type !== 'parameterRoll') return;

      const { paramValue, paramName, side, creatureId } = modalState;
      const { attackMod, defenseMod } = getEffectModifiers(creatureId);
      const paramBonus = getParamModifier(creatureId, paramName) + getInjuryParamModifier(creatureId, paramName);
      const injuryAttackMod = getInjuryAttackModifier(creatureId);
      const injuryDefenseMod = getInjuryDefenseModifier(creatureId);
      const baseAttack = parseNumberInput(attackInput);
      const baseDefense = parseNumberInput(defenseInput);
      const attackModifier = side === 'attack' ? paramValue + paramBonus + attackMod + injuryAttackMod : 0;
      const defenseModifier = side === 'defense' ? paramValue + paramBonus + defenseMod + injuryDefenseMod : 0;

      const record = calculateRollResult(
        baseAttack,
        baseDefense,
        attackModifier,
        defenseModifier
      );
      addRecord(record);
      closeModal();
    },
    [modalState, attackInput, defenseInput, addRecord, closeModal, getEffectModifiers, getParamModifier, getInjuryAttackModifier, getInjuryDefenseModifier, getInjuryParamModifier]
  );

  if (!isOpen || modalState.type !== 'parameterRoll') {
    return null;
  }

  const { paramValue, paramName, side, creatureId } = modalState;
  const { attackMod, defenseMod } = getEffectModifiers(creatureId);
  const paramBonus = getParamModifier(creatureId, paramName) + getInjuryParamModifier(creatureId, paramName);
  const injuryAttackMod = getInjuryAttackModifier(creatureId);
  const injuryDefenseMod = getInjuryDefenseModifier(creatureId);
  const totalAttackMod = side === 'attack' ? paramValue + paramBonus + attackMod + injuryAttackMod : 0;
  const totalDefenseMod = side === 'defense' ? paramValue + paramBonus + defenseMod + injuryDefenseMod : 0;

  return (
    <Modal isOpen={isOpen} onClose={closeModal}>
      <form onSubmit={handleSubmit}>
        <p className={styles.title}>Введите значения</p>
        <div className={styles.field}>
          <span className={styles.label}>Атака</span>
          {totalAttackMod !== 0 && (
            <span className={styles.modifier}>
              {totalAttackMod > 0 ? '+' : ''}{totalAttackMod}
            </span>
          )}
          <input
            type="text"
            inputMode="numeric"
            className={styles.input}
            value={attackInput}
            onChange={(e) => setAttackInput(e.target.value)}
            placeholder="0"
            aria-label="Атака"
            autoFocus
          />
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Защита</span>
          {totalDefenseMod !== 0 && (
            <span className={styles.modifier}>
              {totalDefenseMod > 0 ? '+' : ''}{totalDefenseMod}
            </span>
          )}
          <input
            type="text"
            inputMode="numeric"
            className={styles.input}
            value={defenseInput}
            onChange={(e) => setDefenseInput(e.target.value)}
            placeholder="0"
            aria-label="Защита"
          />
        </div>
        <button type="submit" className={styles.submit}>
          Ввод
        </button>
      </form>
    </Modal>
  );
}
