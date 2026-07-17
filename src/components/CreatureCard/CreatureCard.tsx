import { useCallback, useState } from "react";
import type { Creature } from "../../types";
import { useCreatures } from "../../context/CreaturesContext";
import { ParameterValue } from "../ParameterValue/ParameterValue";
import { parseNumberInput } from "../../utils/rollUtils";
import {
  MAIN_PARAMS,
  ADDITIONAL_PARAMS,
  DEFENSE_PARAMS,
  type ParamGroupKey,
} from "../../constants/paramGroups";
import { BodyDiagram } from "../BodyDiagram/BodyDiagram";
import { AttacksTable } from "../AttacksTable/AttacksTable";
import { AbilitiesSection } from "../AbilitiesSection/AbilitiesSection";
import { EffectsBar } from "../EffectsBar/EffectsBar";
import { InjuriesSection } from "../InjuriesSection/InjuriesSection";
import styles from "./CreatureCard.module.css";

interface CreatureCardProps {
  creature: Creature;
}

/** Строка параметра с фиксированным названием (основные, доп., защита) */
function FixedParamRow({
  paramName,
  value,
  creatureId,
  group,
  setParameter,
}: {
  paramName: string;
  value: number;
  creatureId: string;
  group: ParamGroupKey;
  setParameter: (
    id: string,
    g: ParamGroupKey,
    name: string,
    val: number,
  ) => void;
}) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setParameter(
        creatureId,
        group,
        paramName,
        parseNumberInput(e.target.value),
      );
    },
    [creatureId, group, paramName, setParameter],
  );

  return (
    <div className={styles.paramRow}>
      <span className={styles.paramLabel}>{paramName}</span>
      <input
        type="text"
        inputMode="numeric"
        className={styles.paramValueInput}
        value={value}
        onChange={handleChange}
        aria-label={paramName}
      />
      <ParameterValue
        paramName={paramName}
        value={value}
        creatureId={creatureId}
        group={group}
      />
    </div>
  );
}

export function CreatureCard({ creature }: CreatureCardProps) {
  const { updateCreature, setParameter, removeParameter } = useCreatures();
  const [newSkillName, setNewSkillName] = useState("");

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateCreature(creature.id, { name: e.target.value });
    },
    [creature.id, updateCreature],
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateCreature(creature.id, { description: e.target.value });
    },
    [creature.id, updateCreature],
  );

  const handleSkillNameBlur = useCallback(
    (oldName: string, newName: string, value: number) => {
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName) return;
      removeParameter(creature.id, "skillBases", oldName);
      setParameter(creature.id, "skillBases", trimmed, value);
    },
    [creature.id, setParameter, removeParameter],
  );

  const handleSkillValueChange = useCallback(
    (paramName: string, inputValue: string) => {
      setParameter(
        creature.id,
        "skillBases",
        paramName,
        parseNumberInput(inputValue),
      );
    },
    [creature.id, setParameter],
  );

  const handleAddSkill = useCallback(() => {
    const trimmed = newSkillName.trim();
    if (!trimmed) return;
    setParameter(creature.id, "skillBases", trimmed, 0);
    setNewSkillName("");
  }, [creature.id, newSkillName, setParameter]);

  const { main, additional, skillBases, defense } = creature.parameters;
  const skillEntries = Object.entries(skillBases);

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <div className={styles.bodyColumn}>
          <BodyDiagram creatureId={creature.id} armor={creature.armor} />
        </div>
        <div className={styles.fields}>
          <label className={styles.label}>
            Имя
            <input
              type="text"
              className={styles.input}
              value={creature.name}
              onChange={handleNameChange}
              placeholder="Название существа"
              onClick={(e) => e.stopPropagation()}
            />
          </label>
          <label className={styles.label}>
            Описание
            <textarea
              className={styles.textarea}
              value={creature.description}
              onChange={handleDescriptionChange}
              placeholder="Описание"
              onClick={(e) => e.stopPropagation()}
            />
          </label>
        </div>
      </div>

      <EffectsBar creatureId={creature.id} />
      <InjuriesSection creatureId={creature.id} />

      <div>
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Основные параметры</h3>
          <div className={styles.paramsList}>
            {MAIN_PARAMS.map((key) => (
              <FixedParamRow
                key={key}
                paramName={key}
                value={main[key] ?? 0}
                creatureId={creature.id}
                group="main"
                setParameter={setParameter}
              />
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Дополнительные параметры</h3>
          <div className={styles.paramsList}>
            {ADDITIONAL_PARAMS.map((key) => (
              <FixedParamRow
                key={key}
                paramName={key}
                value={additional[key] ?? 0}
                creatureId={creature.id}
                group="additional"
                setParameter={setParameter}
              />
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Основы навыков</h3>
          <div className={styles.paramsList}>
            {skillEntries.map(([paramName, value]) => (
              <div key={paramName} className={styles.paramRow}>
                <input
                  type="text"
                  className={styles.paramNameInput}
                  defaultValue={paramName}
                  onBlur={(e) =>
                    handleSkillNameBlur(paramName, e.target.value, value)
                  }
                  placeholder="Навык"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.paramValueInput}
                  value={value}
                  onChange={(e) =>
                    handleSkillValueChange(paramName, e.target.value)
                  }
                  aria-label={paramName}
                />
                <ParameterValue
                  paramName={paramName}
                  value={value}
                  creatureId={creature.id}
                  group="skillBases"
                />
                <button
                  type="button"
                  className={styles.removeParam}
                  onClick={() =>
                    removeParameter(creature.id, "skillBases", paramName)
                  }
                  title="Удалить"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className={styles.paramRow}>
            <input
              type="text"
              className={styles.paramNameInput}
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="Название навыка"
              onKeyDown={(e) => e.key === "Enter" && handleAddSkill()}
            />
            <button
              type="button"
              className={styles.addParam}
              onClick={handleAddSkill}
            >
              + Добавить
            </button>
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Защита</h3>
          <div className={styles.paramsList}>
            {DEFENSE_PARAMS.map((key) => (
              <FixedParamRow
                key={key}
                paramName={key}
                value={defense[key] ?? 0}
                creatureId={creature.id}
                group="defense"
                setParameter={setParameter}
              />
            ))}
          </div>
        </section>

        <AttacksTable
          creatureId={creature.id}
          attacks={creature.attacks ?? []}
        />
        <AbilitiesSection
          creatureId={creature.id}
          abilities={creature.abilities}
        />
      </div>
    </article>
  );
}
