export type InjurySeverity = 'light' | 'medium' | 'heavy' | 'lethal';
export type InjuryState = 'full' | 'stabilized' | 'healed';

export interface InjuryStateEffect {
  description: string;
  parameterModifiers?: Record<string, number>;
  skillModifiers?: Record<string, number>;
  attackModifier?: number;
  defenseModifier?: number;
  damagePerRound?: number;
}

export interface InjuryDefinition {
  id: string;
  name: string;
  severity: InjurySeverity;
  description?: string;
  fullEffect: InjuryStateEffect;
  stabilizedEffect: InjuryStateEffect;
  healedEffect: InjuryStateEffect;
}

export interface ActiveInjury {
  instanceId: string;
  injuryId: string;
  state: InjuryState;
}

export type CreatureInjuries = Record<string, ActiveInjury[]>;
