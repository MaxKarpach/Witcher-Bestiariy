export type EffectId = 'bleeding' | 'poisoning' | 'stunned' | 'blindness' | 'intoxication' | 'frozen' | 'burning';

export interface EffectDefinition {
  id: EffectId;
  name: string;
  icon: string;
  description: string;
  attackModifier: number;
  defenseModifier: number;
  parameterModifiers: Partial<Record<string, number>>;
  skillModifiers: Partial<Record<string, number>>;
  damagePerRound: number;
  durationRounds: number | null;
  removalConditions: string[];
}

export interface ActiveEffect {
  effectId: EffectId;
  appliedOnRound: number;
  expiresOnRound: number | null;
  burningParts?: Partial<Record<string, boolean>>;
}

export type CreatureEffects = Record<string, ActiveEffect[]>;
