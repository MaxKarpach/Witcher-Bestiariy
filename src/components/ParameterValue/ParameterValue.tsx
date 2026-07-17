import { useModal } from '../../context/ModalContext';
import { useRollHistory } from '../../context/RollHistoryContext';
import { rollStamina } from '../../utils/rollUtils';
import styles from './ParameterValue.module.css';
import type { ParamGroupKey } from '../../constants/paramGroups';

interface ParameterValueProps {
  paramName: string;
  value: number;
  creatureId: string;
  group: ParamGroupKey;
}

export function ParameterValue({
  paramName,
  value,
  creatureId,
  group,
}: ParameterValueProps) {
  const { openParameterRoll, openValueInput } = useModal();
  const { addRecord } = useRollHistory();

  const handleClick = () => {
    if (paramName === 'ПЗ' || paramName === 'Вын') {
      openValueInput(creatureId, paramName, group, value);
    } else if (paramName === 'Уст') {
      addRecord(rollStamina(value));
    } else {
      openParameterRoll(paramName, value, creatureId);
    }
  };

  const title =
    paramName === 'ПЗ' || paramName === 'Вын'
      ? 'Нажмите для изменения значения'
      : paramName === 'Уст'
      ? 'Нажмите для броска устойчивости (d10)'
      : 'Нажмите для броска';

  return (
    <button
      type="button"
      className={styles.param}
      onClick={handleClick}
      title={title}
    >
      <span className={styles.name}>{paramName}:</span>
      <span className={styles.value}>{value}</span>
    </button>
  );
}
