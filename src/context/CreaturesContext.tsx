import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { Creature } from '../types';
import type { Attack, BodyPartKey } from '../types';
import type { ParamGroupKey } from '../constants/paramGroups';
import { createEmptyCreature, DEFAULT_ARMOR, generateAttackId, generateCreatureId, getCloneName } from '../utils/creatureUtils';

import { initialCreatures } from '../constants/creatures';

interface CreaturesContextValue {
  creatures: Creature[];
  addCreature: () => string;
  updateCreature: (id: string, patch: Partial<Omit<Creature, 'id'>>) => void;
  setParameter: (creatureId: string, group: ParamGroupKey, paramName: string, value: number) => void;
  removeParameter: (creatureId: string, group: ParamGroupKey, paramName: string) => void;
  setArmor: (creatureId: string, part: BodyPartKey, value: number) => void;
  decrementArmor: (creatureId: string, part: BodyPartKey) => void;
  /** Добавить строку в таблицу атак */
  addAttack: (creatureId: string) => void;
  /** Удалить строку атаки */
  removeAttack: (creatureId: string, attackId: string) => void;
  /** Обновить поле строки атаки */
  updateAttack: (creatureId: string, attackId: string, patch: Partial<Omit<Attack, 'id'>>) => void;
  /** Установить текст способности по индексу (0–4) */
  setAbility: (creatureId: string, index: number, value: string) => void;
  /** Дублировать существо, возвращает ID копии */
  duplicateCreature: (id: string) => string;
}

const CreaturesContext = createContext<CreaturesContextValue | null>(null);

export function CreaturesProvider({ children }: { children: ReactNode }) {
  const [creatures, setCreatures] = useState<Creature[]>(initialCreatures);

  const addCreature = useCallback(() => {
    const newCreature = createEmptyCreature();
    setCreatures((prev) => [...prev, newCreature]);
    return newCreature.id;
  }, []);

  const updateCreature = useCallback(
    (id: string, patch: Partial<Omit<Creature, 'id'>>) => {
      setCreatures((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
      );
    },
    []
  );

  const setParameter = useCallback(
    (creatureId: string, group: ParamGroupKey, paramName: string, value: number) => {
      setCreatures((prev) =>
        prev.map((c) => {
          if (c.id !== creatureId) return c;
          const trimmed = paramName.trim();
          if (!trimmed) return c;
          return {
            ...c,
            parameters: {
              ...c.parameters,
              [group]: { ...c.parameters[group], [trimmed]: value },
            },
          };
        })
      );
    },
    []
  );

  const removeParameter = useCallback(
    (creatureId: string, group: ParamGroupKey, paramName: string) => {
      setCreatures((prev) =>
        prev.map((c) => {
          if (c.id !== creatureId) return c;
          const { [paramName]: _, ...rest } = c.parameters[group];
          return {
            ...c,
            parameters: { ...c.parameters, [group]: rest },
          };
        })
      );
    },
    []
  );

  const setArmor = useCallback(
    (creatureId: string, part: BodyPartKey, value: number) => {
      setCreatures((prev) =>
        prev.map((c) => {
          if (c.id !== creatureId) return c;
          const num = Math.max(0, Math.floor(value));
          const base = c.armor ?? DEFAULT_ARMOR;
          return {
            ...c,
            armor: { ...base, [part]: num },
          };
        })
      );
    },
    []
  );

  const decrementArmor = useCallback((creatureId: string, part: BodyPartKey) => {
    setCreatures((prev) =>
      prev.map((c) => {
        if (c.id !== creatureId) return c;
        const base = c.armor ?? DEFAULT_ARMOR;
        const current = base[part] ?? 0;
        return {
          ...c,
          armor: { ...base, [part]: Math.max(0, current - 1) },
        };
      })
    );
  }, []);

  const addAttack = useCallback((creatureId: string) => {
    setCreatures((prev) =>
      prev.map((c) => {
        if (c.id !== creatureId) return c;
        const list = c.attacks ?? [];
        const newRow: Attack = {
          id: generateAttackId(),
          name: '',
          base: 0,
          type: '',
          damage: '',
          h: '',
          d: '',
          effect: '',
          ca: '',
        };
        return { ...c, attacks: [...list, newRow] };
      })
    );
  }, []);

  const removeAttack = useCallback((creatureId: string, attackId: string) => {
    setCreatures((prev) =>
      prev.map((c) => {
        if (c.id !== creatureId) return c;
        const list = (c.attacks ?? []).filter((a) => a.id !== attackId);
        return { ...c, attacks: list };
      })
    );
  }, []);

  const updateAttack = useCallback(
    (creatureId: string, attackId: string, patch: Partial<Omit<Attack, 'id'>>) => {
      setCreatures((prev) =>
        prev.map((c) => {
          if (c.id !== creatureId) return c;
          const list = (c.attacks ?? []).map((a) =>
            a.id === attackId ? { ...a, ...patch } : a
          );
          return { ...c, attacks: list };
        })
      );
    },
    []
  );

  const setAbility = useCallback((creatureId: string, index: number, value: string) => {
    setCreatures((prev) =>
      prev.map((c) => {
        if (c.id !== creatureId) return c;
        const ab: [string, string, string, string, string] = c.abilities ?? [
          '', '', '', '', '',
        ];
        const next: [string, string, string, string, string] = [...ab];
        if (index >= 0 && index < 5) next[index] = value;
        return { ...c, abilities: next };
      })
    );
  }, []);

  const duplicateCreature = useCallback((id: string): string => {
    let cloneId = '';
    setCreatures((prev) => {
      const original = prev.find((c) => c.id === id);
      if (!original) return prev;
      const clone: Creature = JSON.parse(JSON.stringify(original));
      clone.id = generateCreatureId();
      if (clone.attacks) {
        clone.attacks = clone.attacks.map((a) => ({ ...a, id: generateAttackId() }));
      }
      clone.name = getCloneName(original.name, prev.map((c) => c.name));
      cloneId = clone.id;
      return [...prev, clone];
    });
    return cloneId;
  }, []);

  const value: CreaturesContextValue = {
    creatures,
    addCreature,
    updateCreature,
    setParameter,
    removeParameter,
    setArmor,
    decrementArmor,
    addAttack,
    removeAttack,
    updateAttack,
    setAbility,
    duplicateCreature,
  };

  return (
    <CreaturesContext.Provider value={value}>
      {children}
    </CreaturesContext.Provider>
  );
}

export function useCreatures(): CreaturesContextValue {
  const ctx = useContext(CreaturesContext);
  if (!ctx) throw new Error('useCreatures must be used within CreaturesProvider');
  return ctx;
}
