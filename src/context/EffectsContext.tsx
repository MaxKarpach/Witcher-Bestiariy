import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import type { ActiveEffect, CreatureEffects, EffectId } from '../types/effects';
import { EFFECT_DEFINITIONS } from '../constants/effectDefinitions';
import { SKILL_PARAM_MAP } from '../constants/skillParamMap';
import { DAMAGE_MULTIPLIERS, type BodyPartKey } from '../constants/bodyParts';
import { useCreatures } from './CreaturesContext';

const BURNING_BASE_DAMAGE = 5;

interface EffectsContextValue {
  round: number;
  combatActive: boolean;
  startCombat: () => void;
  stopCombat: () => void;
  advanceRound: () => void;
  activateEffect: (creatureId: string, effectId: EffectId) => void;
  deactivateEffect: (creatureId: string, effectId: EffectId) => void;
  getActiveEffects: (creatureId: string) => ActiveEffect[];
  getEffectModifiers: (creatureId: string) => { attackMod: number; defenseMod: number };
  getParamModifier: (creatureId: string, paramName: string) => number;
  setBurningParts: (creatureId: string, parts: Partial<Record<string, boolean>>) => void;
  getBurningParts: (creatureId: string) => Partial<Record<string, boolean>>;
  extinguishBodyPart: (creatureId: string, part: string) => void;
}

const EffectsContext = createContext<EffectsContextValue | null>(null);

export function EffectsProvider({ children }: { children: ReactNode }) {
  const { creatures, setParameter, decrementArmor } = useCreatures();
  const [round, setRound] = useState(0);
  const [combatActive, setCombatActive] = useState(false);
  const [creatureEffects, setCreatureEffects] = useState<CreatureEffects>({});

  const startCombat = useCallback(() => {
    setCombatActive(true);
    setRound(1);
  }, []);

  const stopCombat = useCallback(() => {
    setCombatActive(false);
    setRound(0);
  }, []);

  const advanceRound = useCallback(() => {
    const newRound = round + 1;

    // Compute all changes from current state (read outside updaters — called from event handler)
    const pzDeltas: Record<string, number> = {};
    const armorToDecrement: Array<{ creatureId: string; part: BodyPartKey }> = [];

    for (const [creatureId, activeEffects] of Object.entries(creatureEffects)) {
      const creature = creatures.find((c) => c.id === creatureId);
      if (!creature) continue;

      for (const ae of activeEffects) {
        const def = EFFECT_DEFINITIONS[ae.effectId];

        if (def.damagePerRound > 0) {
          pzDeltas[creatureId] = (pzDeltas[creatureId] ?? 0) - def.damagePerRound;
        }

        if (ae.effectId === 'burning') {
          const burning = ae.burningParts ?? {};
          for (const [part, isOn] of Object.entries(burning)) {
            if (!isOn) continue;
            const partDamage = Math.floor(BURNING_BASE_DAMAGE * DAMAGE_MULTIPLIERS[part as BodyPartKey]);
            const armor = creature.armor?.[part as BodyPartKey] ?? 0;
            pzDeltas[creatureId] = (pzDeltas[creatureId] ?? 0) - Math.max(0, partDamage - armor);
            if (armor > 0) {
              armorToDecrement.push({ creatureId, part: part as BodyPartKey });
            }
          }
        }
      }
    }

    // Apply ПЗ changes
    for (const [creatureId, delta] of Object.entries(pzDeltas)) {
      if (delta === 0) continue;
      const creature = creatures.find((c) => c.id === creatureId);
      const currentPZ = creature?.parameters.additional['ПЗ'] ?? 0;
      setParameter(creatureId, 'additional', 'ПЗ', currentPZ + delta);
    }

    // Apply armor decrements (each uses functional setCreatures update — safe to call sequentially)
    for (const { creatureId, part } of armorToDecrement) {
      decrementArmor(creatureId, part);
    }

    // Remove expired effects (pure computation — no side effects inside updater)
    setCreatureEffects((effects) => {
      const next: CreatureEffects = {};
      for (const [creatureId, activeEffects] of Object.entries(effects)) {
        const surviving = activeEffects.filter(
          (ae) => ae.expiresOnRound === null || ae.expiresOnRound > newRound
        );
        if (surviving.length > 0) {
          next[creatureId] = surviving;
        }
      }
      return next;
    });

    setRound(newRound);
  }, [round, creatureEffects, creatures, setParameter, decrementArmor]);

  const activateEffect = useCallback(
    (creatureId: string, effectId: EffectId) => {
      setCreatureEffects((prev) => {
        const existing = prev[creatureId] ?? [];
        if (existing.some((ae) => ae.effectId === effectId)) return prev;

        const def = EFFECT_DEFINITIONS[effectId];
        const newEffect: ActiveEffect = {
          effectId,
          appliedOnRound: round,
          expiresOnRound: def.durationRounds !== null ? round + def.durationRounds : null,
        };

        return { ...prev, [creatureId]: [...existing, newEffect] };
      });
    },
    [round]
  );

  const deactivateEffect = useCallback(
    (creatureId: string, effectId: EffectId) => {
      setCreatureEffects((prev) => {
        const existing = prev[creatureId] ?? [];
        const filtered = existing.filter((ae) => ae.effectId !== effectId);
        if (filtered.length === existing.length) return prev;
        if (filtered.length === 0) {
          const { [creatureId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [creatureId]: filtered };
      });
    },
    []
  );

  const getActiveEffects = useCallback(
    (creatureId: string): ActiveEffect[] => creatureEffects[creatureId] ?? [],
    [creatureEffects]
  );

  const getEffectModifiers = useCallback(
    (creatureId: string) => {
      const actives = creatureEffects[creatureId] ?? [];
      return actives.reduce(
        (acc, { effectId }) => {
          const def = EFFECT_DEFINITIONS[effectId];
          return {
            attackMod: acc.attackMod + def.attackModifier,
            defenseMod: acc.defenseMod + def.defenseModifier,
          };
        },
        { attackMod: 0, defenseMod: 0 }
      );
    },
    [creatureEffects]
  );

  const getParamModifier = useCallback(
    (creatureId: string, paramName: string): number => {
      const actives = creatureEffects[creatureId] ?? [];
      let total = 0;
      for (const { effectId } of actives) {
        const def = EFFECT_DEFINITIONS[effectId];
        const direct = def.parameterModifiers[paramName];
        if (direct !== undefined) total += direct;
        const skillDirect = def.skillModifiers[paramName];
        if (skillDirect !== undefined) total += skillDirect;
        const parentParam = SKILL_PARAM_MAP[paramName];
        if (parentParam !== undefined) {
          const fromParent = def.parameterModifiers[parentParam];
          if (fromParent !== undefined) total += fromParent;
        }
      }
      return total;
    },
    [creatureEffects]
  );

  const setBurningParts = useCallback(
    (creatureId: string, parts: Partial<Record<string, boolean>>) => {
      const hasAnyBurning = Object.values(parts).some(Boolean);

      setCreatureEffects((prev) => {
        const existing = prev[creatureId] ?? [];
        const hasBurning = existing.some((ae) => ae.effectId === 'burning');

        if (!hasAnyBurning) {
          if (!hasBurning) return prev;
          const filtered = existing.filter((ae) => ae.effectId !== 'burning');
          if (filtered.length === 0) {
            const { [creatureId]: _, ...rest } = prev;
            return rest;
          }
          return { ...prev, [creatureId]: filtered };
        }

        if (hasBurning) {
          return {
            ...prev,
            [creatureId]: existing.map((ae) =>
              ae.effectId === 'burning' ? { ...ae, burningParts: parts } : ae
            ),
          };
        }

        const def = EFFECT_DEFINITIONS['burning'];
        const newEffect: ActiveEffect = {
          effectId: 'burning',
          appliedOnRound: round,
          expiresOnRound: def.durationRounds !== null ? round + def.durationRounds : null,
          burningParts: parts,
        };
        return { ...prev, [creatureId]: [...existing, newEffect] };
      });
    },
    [round]
  );

  const getBurningParts = useCallback(
    (creatureId: string): Partial<Record<string, boolean>> => {
      const ae = (creatureEffects[creatureId] ?? []).find(
        (e) => e.effectId === 'burning'
      );
      return ae?.burningParts ?? {};
    },
    [creatureEffects]
  );

  const extinguishBodyPart = useCallback(
    (creatureId: string, part: string) => {
      setCreatureEffects((prev) => {
        const existing = prev[creatureId] ?? [];
        const burningIdx = existing.findIndex((ae) => ae.effectId === 'burning');
        if (burningIdx === -1) return prev;

        const ae = existing[burningIdx];
        const { [part]: _, ...remainingParts } = ae.burningParts ?? {};
        const hasAnyLeft = Object.values(remainingParts).some(Boolean);

        if (!hasAnyLeft) {
          const filtered = existing.filter((e) => e.effectId !== 'burning');
          if (filtered.length === 0) {
            const { [creatureId]: __, ...rest } = prev;
            return rest;
          }
          return { ...prev, [creatureId]: filtered };
        }

        const updated = [...existing];
        updated[burningIdx] = { ...ae, burningParts: remainingParts };
        return { ...prev, [creatureId]: updated };
      });
    },
    []
  );

  const value: EffectsContextValue = {
    round,
    combatActive,
    startCombat,
    stopCombat,
    advanceRound,
    activateEffect,
    deactivateEffect,
    getActiveEffects,
    getEffectModifiers,
    getParamModifier,
    setBurningParts,
    getBurningParts,
    extinguishBodyPart,
  };

  return (
    <EffectsContext.Provider value={value}>{children}</EffectsContext.Provider>
  );
}

export function useEffects(): EffectsContextValue {
  const ctx = useContext(EffectsContext);
  if (!ctx) throw new Error('useEffects must be used within EffectsProvider');
  return ctx;
}
