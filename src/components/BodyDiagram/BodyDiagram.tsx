import { useCallback } from 'react';
import type { ArmorByPart } from '../../types';
import type { BodyPartKey } from '../../types';
import { BODY_PART_KEYS, BODY_PART_LABELS } from '../../constants/bodyParts';
import { useCreatures } from '../../context/CreaturesContext';
import { parseNumberInput } from '../../utils/rollUtils';
import { DEFAULT_ARMOR } from '../../utils/creatureUtils';
import styles from './BodyDiagram.module.css';

/** Координаты зон в viewBox (0 0 120 200): схематичное тело */
const PART_GEOMETRY: Record<
  BodyPartKey,
  { path: string; textX: number; textY: number }
> = {
  head: { path: 'M 60 25 m -18 0 a 18 18 0 1 1 36 0 a 18 18 0 1 1 -36 0', textX: 60, textY: 25 },
  torso: { path: 'M 40 44 h 40 v 68 h -40 z', textX: 60, textY: 78 },
  armRight: { path: 'M 80 50 h 34 v 36 h -34 z', textX: 97, textY: 68 },
  armLeft: { path: 'M 6 50 h 34 v 36 h -34 z', textX: 23, textY: 68 },
  legRight: { path: 'M 56 112 h 24 v 76 h -24 z', textX: 68, textY: 150 },
  legLeft: { path: 'M 40 112 h 24 v 76 h -24 z', textX: 52, textY: 150 },
};

interface BodyDiagramProps {
  creatureId: string;
  /** Текущая броня по зонам (если нет — используется 0 по умолчанию) */
  armor?: ArmorByPart;
}

export function BodyDiagram({ creatureId, armor: armorProp }: BodyDiagramProps) {
  const { setArmor, decrementArmor } = useCreatures();
  const armor = armorProp ?? DEFAULT_ARMOR;

  const handlePartClick = useCallback(
    (part: BodyPartKey) => {
      const value = armor[part] ?? 0;
      if (value > 0) decrementArmor(creatureId, part);
    },
    [creatureId, armor, decrementArmor]
  );

  const handleArmorInputChange = useCallback(
    (part: BodyPartKey, inputValue: string) => {
      setArmor(creatureId, part, parseNumberInput(inputValue));
    },
    [creatureId, setArmor]
  );

  return (
    <div className={styles.wrap}>
      <h3 className={styles.sectionTitle}>Броня</h3>
      <svg
        className={styles.diagram}
        viewBox="0 0 120 200"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Схема тела, клик по зоне снимает 1 пункт брони"
      >
        <g fill="#3d3228" stroke="#6b5a47" strokeWidth="2">
          {BODY_PART_KEYS.map((part) => {
            const value = armor[part] ?? 0;
            const { path, textX, textY } = PART_GEOMETRY[part];
            return (
              <g key={part}>
                <path
                  className={styles.part}
                  d={path}
                  data-value={value}
                  onClick={() => handlePartClick(part)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${BODY_PART_LABELS[part]}, броня ${value}, нажмите снять 1`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handlePartClick(part);
                    }
                  }}
                />
                <text
                  x={textX}
                  y={textY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={styles.partText}
                >
                  {value}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className={styles.armorInputs}>
        {BODY_PART_KEYS.map((part) => (
          <div key={part} className={styles.armorRow}>
            <span className={styles.armorLabel} title={BODY_PART_LABELS[part]}>
              {BODY_PART_LABELS[part]}
            </span>
            <input
              type="text"
              inputMode="numeric"
              className={styles.armorInput}
              value={armor[part] ?? 0}
              onChange={(e) => handleArmorInputChange(part, e.target.value)}
              aria-label={`${BODY_PART_LABELS[part]} броня`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
