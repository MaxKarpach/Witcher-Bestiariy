import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import type { ActiveInjury, CreatureInjuries, InjuryState } from '../types/injuries';
import {
  INJURY_DEFINITIONS,
  SEVERITY_HP_DAMAGE,
} from '../constants/injuryDefinitions';
import { SKILL_PARAM_MAP } from '../constants/skillParamMap';
import { useCreatures } from './CreaturesContext';

let instanceCounter = 0;
function generateInstanceId(): string {
  return `injury-${Date.now()}-${++instanceCounter}`;
}

interface InjuriesContextValue {
  applyInjury: (creatureId: string, injuryId: string) => void;
  setInjuryState: (creatureId: string, instanceId: string, state: InjuryState) => void;
  removeInjury: (creatureId: string, instanceId: string) => void;
  getActiveInjuries: (creatureId: string) => ActiveInjury[];
  getInjuryParamModifier: (creatureId: string, paramName: string) => number;
  getInjuryAttackModifier: (creatureId: string) => number;
  getInjuryDefenseModifier: (creatureId: string) => number;
  advanceRound: () => void;
}

const InjuriesContext = createContext<InjuriesContextValue | null>(null);

export function InjuriesProvider({ children }: { children: ReactNode }) {
  const { creatures, setParameter } = useCreatures();
  const [creatureInjuries, setCreatureInjuries] = useState<CreatureInjuries>({});

  const applyInjury = useCallback(
    (creatureId: string, injuryId: string) => {
      const def = INJURY_DEFINITIONS[injuryId];
      if (!def) return;

      const hpDamage = SEVERITY_HP_DAMAGE[def.severity];
      const creature = creatures.find((c) => c.id === creatureId);
      if (creature) {
        const currentPZ = creature.parameters.additional['ПЗ'] ?? 0;
        setParameter(creatureId, 'additional', 'ПЗ', currentPZ - hpDamage);
      }

      const newInjury: ActiveInjury = {
        instanceId: generateInstanceId(),
        injuryId,
        state: 'full',
      };

      setCreatureInjuries((prev) => ({
        ...prev,
        [creatureId]: [...(prev[creatureId] ?? []), newInjury],
      }));
    },
    [creatures, setParameter]
  );

  const setInjuryState = useCallback(
    (creatureId: string, instanceId: string, state: InjuryState) => {
      setCreatureInjuries((prev) => {
        const existing = prev[creatureId] ?? [];
        return {
          ...prev,
          [creatureId]: existing.map((inj) =>
            inj.instanceId === instanceId ? { ...inj, state } : inj
          ),
        };
      });
    },
    []
  );

  const removeInjury = useCallback(
    (creatureId: string, instanceId: string) => {
      setCreatureInjuries((prev) => {
        const existing = prev[creatureId] ?? [];
        const filtered = existing.filter((inj) => inj.instanceId !== instanceId);
        if (filtered.length === 0) {
          const { [creatureId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [creatureId]: filtered };
      });
    },
    []
  );

  const getActiveInjuries = useCallback(
    (creatureId: string): ActiveInjury[] => creatureInjuries[creatureId] ?? [],
    [creatureInjuries]
  );

  const getInjuryParamModifier = useCallback(
    (creatureId: string, paramName: string): number => {
      const actives = creatureInjuries[creatureId] ?? [];
      let total = 0;
      for (const { injuryId, state } of actives) {
        const def = INJURY_DEFINITIONS[injuryId];
        if (!def) continue;
        const effect =
          state === 'full'
            ? def.fullEffect
            : state === 'stabilized'
              ? def.stabilizedEffect
              : def.healedEffect;

        const directParam = effect.parameterModifiers?.[paramName];
        if (directParam !== undefined) total += directParam;

        const directSkill = effect.skillModifiers?.[paramName];
        if (directSkill !== undefined) total += directSkill;

        const parentParam = SKILL_PARAM_MAP[paramName];
        if (parentParam !== undefined) {
          const fromParent = effect.parameterModifiers?.[parentParam];
          if (fromParent !== undefined) total += fromParent;
        }
      }
      return total;
    },
    [creatureInjuries]
  );

  const getInjuryAttackModifier = useCallback(
    (creatureId: string): number => {
      const actives = creatureInjuries[creatureId] ?? [];
      return actives.reduce((sum, { injuryId, state }) => {
        const def = INJURY_DEFINITIONS[injuryId];
        if (!def) return sum;
        const effect =
          state === 'full'
            ? def.fullEffect
            : state === 'stabilized'
              ? def.stabilizedEffect
              : def.healedEffect;
        return sum + (effect.attackModifier ?? 0);
      }, 0);
    },
    [creatureInjuries]
  );

  const getInjuryDefenseModifier = useCallback(
    (creatureId: string): number => {
      const actives = creatureInjuries[creatureId] ?? [];
      return actives.reduce((sum, { injuryId, state }) => {
        const def = INJURY_DEFINITIONS[injuryId];
        if (!def) return sum;
        const effect =
          state === 'full'
            ? def.fullEffect
            : state === 'stabilized'
              ? def.stabilizedEffect
              : def.healedEffect;
        return sum + (effect.defenseModifier ?? 0);
      }, 0);
    },
    [creatureInjuries]
  );

  const advanceRound = useCallback(() => {
    const pzDeltas: Record<string, number> = {};

    for (const [creatureId, actives] of Object.entries(creatureInjuries)) {
      for (const { injuryId, state } of actives) {
        const def = INJURY_DEFINITIONS[injuryId];
        if (!def) continue;
        const effect =
          state === 'full'
            ? def.fullEffect
            : state === 'stabilized'
              ? def.stabilizedEffect
              : def.healedEffect;
        const dmg = effect.damagePerRound ?? 0;
        if (dmg > 0) {
          pzDeltas[creatureId] = (pzDeltas[creatureId] ?? 0) - dmg;
        }
      }
    }

    for (const [creatureId, delta] of Object.entries(pzDeltas)) {
      if (delta === 0) continue;
      const creature = creatures.find((c) => c.id === creatureId);
      const currentPZ = creature?.parameters.additional['ПЗ'] ?? 0;
      setParameter(creatureId, 'additional', 'ПЗ', currentPZ + delta);
    }
  }, [creatureInjuries, creatures, setParameter]);

  const value: InjuriesContextValue = {
    applyInjury,
    setInjuryState,
    removeInjury,
    getActiveInjuries,
    getInjuryParamModifier,
    getInjuryAttackModifier,
    getInjuryDefenseModifier,
    advanceRound,
  };

  return (
    <InjuriesContext.Provider value={value}>{children}</InjuriesContext.Provider>
  );
}

export function useInjuries(): InjuriesContextValue {
  const ctx = useContext(InjuriesContext);
  if (!ctx) throw new Error('useInjuries must be used within InjuriesProvider');
  return ctx;
}
