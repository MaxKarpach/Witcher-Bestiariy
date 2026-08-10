import { useMemo, useState } from "react";
import { alchemyIngredients, alchemyRecipes, craftEntries, mutagens } from "./data/alchemyCatalog";
import { armorCatalogNotes, describeLootItem } from "./data/lootCatalog";
import { getSkillDependency } from "./data/skillDependencies";
import { unofficialCreatures } from "./data/unofficialCreatures";
import { vesemirCreatures } from "./data/vesemirCreatures";
import { vesemirSupplementCreatures } from "./data/vesemirSupplementCreatures";
import { worldEntries } from "./data/worldCatalog";
import styles from "./App.module.css";

type BodyPart = "head" | "torso" | "rightArm" | "leftArm" | "rightLeg" | "leftLeg";

export type Creature = {
  id: string;
  name: string;
  category: string;
  danger: "Низкая" | "Средняя" | "Высокая";
  habitat: string;
  vulnerability: string;
  tactic: string;
  description: string;
  stats: Record<string, number>;
  skills: Record<string, number>;
  armor: Record<BodyPart, number>;
  attacks: Array<{
    id: string;
    name: string;
    base: number;
    damage: string;
    range: string;
    effect: string;
  }>;
  abilities: string[];
};

type RollEntry = {
  id: string;
  label: string;
  formula: string;
  total: number;
  note: string;
};

type AppPage = "monsters" | "combat" | "social" | "alchemy" | "craft" | "world";
type RecipeFilter = "Все" | "Алхимические составы" | "Слабые эликсиры" | "Ведьмачьи эликсиры" | "Масла для мечей" | "Отвары";
type EffectId =
  | "burning"
  | "disorientation"
  | "poisoning"
  | "bleeding"
  | "frozen"
  | "stunned"
  | "intoxication"
  | "hallucination"
  | "nausea"
  | "suffocation"
  | "blindness";

type ActiveCombatEffect = {
  id: string;
  effectId: EffectId;
  source: string;
  burningParts?: BodyPart[];
  roundsLeft?: number;
  roundsElapsed?: number;
};

type CreatureEffects = Record<string, ActiveCombatEffect[]>;
type CreatureLoot = {
  coins: string[];
  mutagens: string[];
  alchemicalIngredients: string[];
  weapons: string[];
  armor: string[];
};

const combatEffects: Record<
  EffectId,
  {
    name: string;
    shortName: string;
    icon: string;
    damagePerRound: number;
    attackModifier: number;
    defenseModifier: number;
    description: string;
  }
> = {
  burning: {
    name: "Горение",
    shortName: "Огонь",
    icon: "🔥",
    damagePerRound: 5,
    attackModifier: 0,
    defenseModifier: 0,
    description: "5 урона каждый ход по каждой горящей части тела; броня теряет 1 ПБ.",
  },
  disorientation: {
    name: "Дезориентация",
    shortName: "Дезор.",
    icon: "💫",
    damagePerRound: 0,
    attackModifier: 0,
    defenseModifier: 0,
    description: "Нельзя действовать; чтобы попасть по цели, достаточно СЛ 10. Попадание снимает эффект.",
  },
  bleeding: {
    name: "Кровотечение",
    shortName: "Кровь",
    icon: "🩸",
    damagePerRound: 2,
    attackModifier: 0,
    defenseModifier: 0,
    description: "2 урона каждый ход, броней не снижается.",
  },
  poisoning: {
    name: "Отравление",
    shortName: "Яд",
    icon: "☠️",
    damagePerRound: 3,
    attackModifier: 0,
    defenseModifier: 0,
    description: "3 урона каждый ход, броней не снижается; Стойкость СЛ 15 для снятия.",
  },
  frozen: {
    name: "Замораживание",
    shortName: "Лед",
    icon: "❄️",
    damagePerRound: 0,
    attackModifier: -1,
    defenseModifier: -1,
    description: "-3 Скор и -1 Реа; в бою учтен штраф -1 к атаке и защите.",
  },
  stunned: {
    name: "Ошеломление",
    shortName: "Ошеломлен",
    icon: "✦",
    damagePerRound: 0,
    attackModifier: -2,
    defenseModifier: -2,
    description: "-2 к атаке и защите до начала следующего хода.",
  },
  intoxication: {
    name: "Опьянение",
    shortName: "Опьянение",
    icon: "🍷",
    damagePerRound: 0,
    attackModifier: -2,
    defenseModifier: -2,
    description: "-2 к Реа, Лвк и Инт; в бою учтен штраф -2 к атаке и защите.",
  },
  hallucination: {
    name: "Галлюцинации",
    shortName: "Галлюц.",
    icon: "◇",
    damagePerRound: 0,
    attackModifier: 0,
    defenseModifier: 0,
    description: "Ложные ощущения; Дедукция СЛ 15, чтобы отличить иллюзию от реальности.",
  },
  nausea: {
    name: "Тошнота",
    shortName: "Тошнота",
    icon: "!",
    damagePerRound: 0,
    attackModifier: 0,
    defenseModifier: 0,
    description: "Каждые 3 раунда бросок d10 ниже Тел; провал мешает действовать 1 раунд.",
  },
  suffocation: {
    name: "Удушье",
    shortName: "Удушье",
    icon: "◍",
    damagePerRound: 3,
    attackModifier: 0,
    defenseModifier: 0,
    description: "3 урона каждый раунд, броней не снижается.",
  },
  blindness: {
    name: "Слепота",
    shortName: "Слепота",
    icon: "◉",
    damagePerRound: 0,
    attackModifier: -3,
    defenseModifier: -3,
    description: "-3 ко всем атакам и защите, -5 к зрительным проверкам Внимания.",
  },
};

const recipeGroups: RecipeFilter[] = [
  "Все",
  "Алхимические составы",
  "Слабые эликсиры",
  "Ведьмачьи эликсиры",
  "Масла для мечей",
  "Отвары",
];

type CreatureForm = {
  name: string;
  category: string;
  danger: Creature["danger"];
  habitat: string;
  vulnerability: string;
  tactic: string;
  description: string;
  stats: Record<string, number>;
  armorValue: number;
  skillsText: string;
  attacksText: string;
  abilitiesText: string;
};

type PickerOption = {
  value: string;
  label: string;
  detail?: string;
  meta?: string;
  icon?: string;
};

type PickerConfig = {
  id: string;
  label: string;
  value: string;
  options: PickerOption[];
  onChange: (value: string) => void;
  searchPlaceholder?: string;
};

type CombatStageId =
  | "root"
  | "attackType"
  | "attackMethod"
  | "meleeAttack"
  | "unarmedAttack"
  | "rangedAttack"
  | "magicAttack"
  | "specialAttack"
  | "fullTurn"
  | "defenseMethod"
  | "blockMethod"
  | "parryMethod";

type CombatActionOption = {
  id: string;
  label: string;
  icon: string;
  detail: string;
  next?: CombatStageId;
  actionId?: string;
};

type CombatActionSpec = {
  title: string;
  group: string;
  stat?: string;
  skills?: string[];
  usesAccuracy?: boolean;
  usesDistance?: boolean;
  modifier?: number;
  result: string;
  note: string;
};

type SocialStageId = "root" | "socialAttack" | "socialDefense" | "pressureKind" | "empathicPressure" | "antagonisticPressure";

type SocialActionOption = {
  id: string;
  label: string;
  icon: string;
  detail: string;
  next?: SocialStageId;
  actionId?: string;
};

type SocialActionSpec = {
  title: string;
  group: string;
  stat?: string;
  skills?: string[];
  modifier?: number;
  damage: string;
  effect: string;
  note: string;
  noRoll?: boolean;
};

const bodyPartLabels: Record<BodyPart, string> = {
  head: "Голова",
  torso: "Корпус",
  rightArm: "Правая рука",
  leftArm: "Левая рука",
  rightLeg: "Правая нога",
  leftLeg: "Левая нога",
};

const combatActionTree: Record<CombatStageId, CombatActionOption[]> = {
  root: [
    { id: "attack", label: "Атака", icon: "⚔", detail: "Удар, выстрел, магия или другое атакующее действие.", next: "attackType" },
    { id: "defense", label: "Защита", icon: "◆", detail: "Блокирование, парирование, смена позиции или уклонение.", next: "defenseMethod" },
  ],
  attackType: [
    { id: "attack-action", label: "Действие атаки", icon: "✦", detail: "Основная атака в эти 3 секунды.", next: "attackMethod" },
    { id: "full-turn", label: "Действие полного хода", icon: "◉", detail: "Бег, активное уклонение, прицеливание или отдых.", next: "fullTurn" },
  ],
  attackMethod: [
    { id: "melee", label: "Ближний бой", icon: "◇", detail: "Реа + владение оружием/ближний бой + точность.", next: "meleeAttack" },
    { id: "unarmed", label: "Рукопашная", icon: "✋", detail: "Удары рукой/ногой, захват, бросок, разоружение.", next: "unarmedAttack" as CombatStageId },
    { id: "ranged", label: "Дальний бой", icon: "△", detail: "Лвк + стрельба/атлетика + точность + расстояние.", next: "rangedAttack" },
    { id: "magic", label: "Магия", icon: "✧", detail: "Воля + заклинания, порча или ритуалы.", next: "magicAttack" },
    { id: "special", label: "Особая атака", icon: "★", detail: "Финт, подсечка, удар эфесом, удар щитом.", next: "specialAttack" as CombatStageId },
  ],
  meleeAttack: [
    { id: "melee-quick", label: "Быстрый удар", icon: "Ⅰ", detail: "2 удара без штрафа, урон x1.", actionId: "meleeQuick" },
    { id: "melee-heavy", label: "Сильный удар", icon: "Ⅱ", detail: "1 удар, штраф -3, урон x2.", actionId: "meleeHeavy" },
  ],
  rangedAttack: [
    { id: "ranged-quick", label: "Быстрый выстрел", icon: "Ⅰ", detail: "1 выстрел без штрафа, урон x1.", actionId: "rangedQuick" },
    { id: "ranged-heavy", label: "Сильный выстрел", icon: "Ⅱ", detail: "1 выстрел, штраф -3, урон x2; для арбалета отсутствует.", actionId: "rangedHeavy" },
  ],
  unarmedAttack: [
    { id: "punch", label: "Удар рукой", icon: "✋", detail: "Несмертельный урон = Удар рукой; быстрый или сильный.", actionId: "punch" },
    { id: "kick", label: "Удар ногой", icon: "🦶", detail: "Несмертельный урон = Удар ногой; быстрый или сильный.", actionId: "kick" },
    { id: "push-kick", label: "Толчок ногой", icon: "↗", detail: "Сильный удар ногой, отталкивает на Тел/3 метров, половина урона.", actionId: "pushKick" },
    { id: "charge-unarmed", label: "Атака с разбега", icon: "↟", detail: "Весь раунд: движение на Бег и сильный удар рукой/ногой с -3.", actionId: "chargeUnarmed" },
    { id: "disarm-grapple", label: "Разоружение", icon: "⌁", detail: "Борьба против Уклонения/Изворотливости; оружие улетает на 1d6 м.", actionId: "disarmGrapple" },
    { id: "grapple", label: "Захват", icon: "⛓", detail: "Борьба против Уклонения/Изворотливости; цель в захвате и получает -2.", actionId: "grapple" },
    { id: "pin", label: "Обездвиживание", icon: "▣", detail: "Нужен захват; цель не двигается и не действует до освобождения.", actionId: "pin" },
    { id: "choke", label: "Душение", icon: "◍", detail: "Нужен захват; цель задыхается до освобождения.", actionId: "choke" },
    { id: "throw", label: "Бросок", icon: "↘", detail: "Нужен захват; цель сбита с ног, урон Удар рукой/2, Устойчивость -1.", actionId: "throw" },
    { id: "trip", label: "Подсечка", icon: "⌞", detail: "Прицельный удар по ногам, при успехе цель сбита с ног.", actionId: "trip" },
  ],
  specialAttack: [
    { id: "pommel", label: "Удар эфесом", icon: "◇", detail: "Несмертельный урон, сниженный вдвое.", actionId: "pommelStrike" },
    { id: "weapon-disarm", label: "Разоружение оружием", icon: "⌁", detail: "Прицельный удар оружием выбивает оружие на 1d6 м.", actionId: "weaponDisarm" },
    { id: "feint", label: "Финт", icon: "◌", detail: "Обман против Внимания; второй быстрый удар получает +3.", actionId: "feint" },
    { id: "shield-bash", label: "Удар щитом", icon: "▣", detail: "Ближний бой; дробящий смертельный урон Удар рукой/2, щиты дают бонус.", actionId: "shieldBash" },
    { id: "weapon-trip", label: "Подсечка оружием", icon: "⌞", detail: "Прицельный удар по ногам, чтобы сбить цель с ног.", actionId: "weaponTrip" },
    { id: "charge-weapon", label: "Атака с разбега", icon: "↟", detail: "Весь раунд: движение на Бег и сильный удар оружием с -3.", actionId: "chargeWeapon" },
  ],
  magicAttack: [
    { id: "spell", label: "Заклинание", icon: "✧", detail: "Воля + сотворение заклинаний.", actionId: "spellCast" },
    { id: "curse", label: "Порча", icon: "◍", detail: "Воля + наведение порчи.", actionId: "curseCast" },
    { id: "ritual", label: "Ритуал", icon: "□", detail: "Воля + проведение ритуалов.", actionId: "ritualCast" },
  ],
  fullTurn: [
    { id: "run", label: "Бег", icon: "↗", detail: "Перемещение на значение Бег.", actionId: "run" },
    { id: "active-dodge", label: "Активное уклонение", icon: "◆", detail: "+2 к защитным действиям в этом раунде.", actionId: "activeDodge" },
    { id: "aim", label: "Прицеливание", icon: "◎", detail: "Бонус +1 к дистанционной атаке, максимум +3.", actionId: "aim" },
    { id: "rest", label: "Отдых", icon: "◌", detail: "Восстановление Вын на значение Отдых.", actionId: "rest" },
    { id: "extra-action", label: "Доп. действие", icon: "+", detail: "Потратить 3 Вын: еще одно действие со штрафом -3.", actionId: "extraAction" },
  ],
  defenseMethod: [
    { id: "block", label: "Блокирование", icon: "▣", detail: "Принять удар оружием, щитом или частью тела.", next: "blockMethod" },
    { id: "reposition", label: "Смена позиции", icon: "↔", detail: "Лвк + Атлетика; перемещение на Скор/2 метров.", actionId: "reposition" },
    { id: "parry", label: "Парирование", icon: "◇", detail: "Штраф -3, нет урона оружию, противник ошеломлен.", next: "parryMethod" },
    { id: "dodge", label: "Уклонение", icon: "◒", detail: "Реа + Уклонение/Изворотливость.", actionId: "dodge" },
  ],
  blockMethod: [
    { id: "block-weapon", label: "Оружием", icon: "→", detail: "Реа + владение оружием + точность.", actionId: "blockWeapon" },
    { id: "block-shield", label: "Щитом", icon: "▣", detail: "Реа + ближний бой.", actionId: "blockShield" },
    { id: "block-body", label: "Частью тела", icon: "✋", detail: "Реа + борьба.", actionId: "blockBody" },
  ],
  parryMethod: [
    { id: "parry-weapon", label: "Оружием", icon: "→", detail: "Реа + владение оружием + точность -3.", actionId: "parryWeapon" },
    { id: "parry-melee", label: "Ближним боем", icon: "◇", detail: "Реа + ближний бой -3.", actionId: "parryMelee" },
    { id: "parry-body", label: "Борьбой", icon: "✋", detail: "Реа + борьба -3.", actionId: "parryBody" },
  ],
};

const combatActionSpecs: Record<string, CombatActionSpec> = {
  meleeQuick: { title: "Быстрый удар", group: "Ближний бой", stat: "Реа", skills: ["Владение мечом", "Владение оружием", "Ближний бой"], usesAccuracy: true, result: "2 удара, без штрафа, урон x1.", note: "Основа: Реа + владение оружием + точность." },
  meleeHeavy: { title: "Сильный удар", group: "Ближний бой", stat: "Реа", skills: ["Владение мечом", "Владение оружием", "Ближний бой"], usesAccuracy: true, modifier: -3, result: "1 удар, штраф -3, урон x2.", note: "Основа: Реа + владение оружием + точность -3." },
  punch: { title: "Удар рукой", group: "Рукопашная", stat: "Реа", skills: ["Ближний бой"], result: "Несмертельный урон равен значению Удар рукой. Может быть быстрым или сильным.", note: "Основа: Реа + Ближний бой." },
  kick: { title: "Удар ногой", group: "Рукопашная", stat: "Реа", skills: ["Ближний бой"], result: "Несмертельный урон равен значению Удар ногой. Может быть быстрым или сильным.", note: "Основа: Реа + Ближний бой." },
  pushKick: { title: "Толчок ногой", group: "Рукопашная", stat: "Реа", skills: ["Ближний бой"], modifier: -3, result: "Сильный удар ногой: цель отталкивается на Тел/3 метров, получает половину урона, попадание всегда в туловище.", note: "Основа: Реа + Ближний бой -3." },
  chargeUnarmed: { title: "Атака с разбега рукой/ногой", group: "Рукопашная", stat: "Реа", skills: ["Ближний бой"], modifier: -3, result: "Весь раунд: перемещение на Бег и сильный удар рукой/ногой. Если заблокировано, встречная проверка Силы может сбить цель с ног.", note: "Основа: Реа + Ближний бой -3." },
  disarmGrapple: { title: "Разоружение борьбой", group: "Рукопашная", stat: "Реа", skills: ["Борьба"], result: "Встречная проверка Борьбы против Уклонения/Изворотливости; оружие выбито на 1d6 метров. Свободной рукой можно отобрать оружие с -3.", note: "Основа: Реа + Борьба." },
  grapple: { title: "Захват", group: "Рукопашная", stat: "Реа", skills: ["Борьба"], result: "Встречная проверка Борьбы против Уклонения/Изворотливости. Цель в захвате, не может отойти и получает -2 ко всем действиям.", note: "Основа: Реа + Борьба." },
  pin: { title: "Обездвиживание", group: "Рукопашная", stat: "Реа", skills: ["Борьба"], result: "Нужен захват. Встречная проверка Борьбы против Уклонения/Изворотливости; цель не может двигаться и действовать, пока не освободится.", note: "Основа: Реа + Борьба." },
  choke: { title: "Душение", group: "Рукопашная", stat: "Реа", skills: ["Борьба"], result: "Нужен захват. Встречная проверка Борьбы против Уклонения/Изворотливости; цель задыхается, пока не освободится.", note: "Основа: Реа + Борьба." },
  throw: { title: "Бросок", group: "Рукопашная", stat: "Реа", skills: ["Борьба"], result: "Нужен захват. Цель сбита с ног, получает Удар рукой/2 и должна пройти Устойчивость с -1.", note: "Основа: Реа + Борьба." },
  trip: { title: "Подсечка", group: "Рукопашная", stat: "Реа", skills: ["Ближний бой"], result: "Прицельный удар по ногам. При успехе противник сбит с ног.", note: "Основа: Реа + Ближний бой с модификатором прицельного удара по ногам." },
  rangedQuick: { title: "Быстрый выстрел", group: "Дальний бой", stat: "Лвк", skills: ["Стрельба из лука", "Стрельба из арбалета", "Атлетика"], usesAccuracy: true, usesDistance: true, result: "1 выстрел, без штрафа, урон x1.", note: "Основа: Лвк + стрельба/атлетика + точность + модификатор расстояния." },
  rangedHeavy: { title: "Сильный выстрел", group: "Дальний бой", stat: "Лвк", skills: ["Стрельба из лука", "Стрельба из арбалета", "Атлетика"], usesAccuracy: true, usesDistance: true, modifier: -3, result: "1 выстрел, штраф -3, урон x2; для арбалета отсутствует.", note: "Основа: Лвк + стрельба/атлетика + точность + расстояние -3." },
  spellCast: { title: "Заклинание", group: "Магия", stat: "Воля", skills: ["Сотворение заклинаний"], result: "Одно заклинание, инвокация или знак.", note: "Сильная атака для магии отсутствует." },
  curseCast: { title: "Наведение порчи", group: "Магия", stat: "Воля", skills: ["Наведение порчи"], result: "Попытка навести порчу.", note: "Основа: Воля + Наведение порчи." },
  ritualCast: { title: "Проведение ритуала", group: "Магия", stat: "Воля", skills: ["Проведение ритуалов"], result: "Проверка ритуала.", note: "Основа: Воля + Проведение ритуалов." },
  run: { title: "Бег", group: "Полный ход", stat: "Бег", result: "Перемещение на значение Бег.", note: "Действие полного хода без атакующего броска." },
  activeDodge: { title: "Активное уклонение", group: "Полный ход", modifier: 2, result: "+2 к защитным действиям в этом раунде.", note: "Позволяет защищаться в этом раунде без затрат Вын." },
  aim: { title: "Прицеливание", group: "Полный ход", modifier: 1, result: "+1 к дистанционной атаке, максимум +3.", note: "Бонус копится действиями прицеливания." },
  rest: { title: "Отдых", group: "Полный ход", stat: "Отдых", result: "Восстановление Вын на значение Отдых.", note: "Если отдельного параметра Отдых нет, можно вписать итог вручную." },
  extraAction: { title: "Дополнительное действие", group: "Дополнительное действие", modifier: -3, result: "Потрать 3 Вын, чтобы выполнить еще одно действие атаки, магии или навыка.", note: "Это действие получает штраф -3 на попадание или проверку." },
  blockWeapon: { title: "Блокирование оружием", group: "Защита", stat: "Реа", skills: ["Владение мечом", "Владение оружием", "Ближний бой"], usesAccuracy: true, result: "Оружие получает 1 урон; стрелы блокировать нельзя.", note: "Основа: Реа + владение оружием + точность." },
  blockShield: { title: "Блокирование щитом", group: "Защита", stat: "Реа", skills: ["Ближний бой"], result: "Щит получает урон, применимый к ПБ.", note: "Основа: Реа + Ближний бой." },
  blockBody: { title: "Блокирование частью тела", group: "Защита", stat: "Реа", skills: ["Борьба"], result: "Часть тела получает урон, применимый к ПБ.", note: "Основа: Реа + Борьба." },
  reposition: { title: "Смена позиции", group: "Защита", stat: "Лвк", skills: ["Атлетика"], result: "Перемещение на Скор/2 метров в любом направлении.", note: "Основа: Лвк + Атлетика." },
  parryWeapon: { title: "Парирование оружием", group: "Защита", stat: "Реа", skills: ["Владение мечом", "Владение оружием", "Ближний бой"], usesAccuracy: true, modifier: -3, result: "Нет урона оружию, противник ошеломлен.", note: "Стрелы парировать нельзя; метательные снаряды парируются с -5." },
  parryMelee: { title: "Парирование ближним боем", group: "Защита", stat: "Реа", skills: ["Ближний бой"], modifier: -3, result: "Нет урона оружию, противник ошеломлен.", note: "Основа: Реа + Ближний бой -3." },
  parryBody: { title: "Парирование борьбой", group: "Защита", stat: "Реа", skills: ["Борьба"], modifier: -3, result: "Нет урона оружию, противник ошеломлен.", note: "Основа: Реа + Борьба -3." },
  dodge: { title: "Уклонение", group: "Защита", stat: "Реа", skills: ["Уклонение/Изворотливость", "Уклонение"], result: "Полный уход от атаки при успешном броске.", note: "Основа: Реа + Уклонение/Изворотливость." },
  pommelStrike: { title: "Удар эфесом", group: "Особая атака", stat: "Реа", skills: ["Владение мечом", "Владение оружием", "Ближний бой"], usesAccuracy: true, result: "Несмертельный урон оружием, сниженный вдвое.", note: "Основа: Реа + владение оружием + точность." },
  weaponDisarm: { title: "Разоружение оружием", group: "Особая атака", stat: "Реа", skills: ["Владение мечом", "Владение оружием", "Ближний бой"], usesAccuracy: true, result: "Прицельный удар оружием выбивает оружие из рук цели на 1d6 метров.", note: "Основа: Реа + владение оружием + точность + модификатор прицельного удара." },
  feint: { title: "Финт", group: "Особая атака", stat: "Эмп", skills: ["Обман"], result: "Успешная встречная проверка Обмана против Внимания: второй быстрый удар наносится с бонусом +3.", note: "Основа: Эмп + Обман против Инт + Внимание цели." },
  shieldBash: { title: "Удар щитом", group: "Особая атака", stat: "Реа", skills: ["Ближний бой"], result: "Дробящий смертельный урон: Удар рукой/2. Средний щит +2, тяжелый щит +4 к Удар рукой/2.", note: "Основа: Реа + Ближний бой." },
  weaponTrip: { title: "Подсечка оружием", group: "Особая атака", stat: "Реа", skills: ["Владение мечом", "Владение оружием", "Ближний бой"], usesAccuracy: true, result: "Прицельный удар оружием по ногам. При успехе цель сбита с ног.", note: "Основа: Реа + владение оружием + точность + модификатор прицельного удара." },
  chargeWeapon: { title: "Атака с разбега оружием", group: "Особая атака", stat: "Реа", skills: ["Владение мечом", "Владение оружием", "Ближний бой"], usesAccuracy: true, modifier: -3, result: "Весь раунд: перемещение на Бег и сильный удар оружием со штрафом -3. Если заблокировано, встречная проверка Силы может сбить цель с ног.", note: "Основа: Реа + владение оружием + точность -3." },
};

const socialActionTree: Record<SocialStageId, SocialActionOption[]> = {
  root: [
    { id: "social-attack", label: "Атака", icon: "✦", detail: "Попытка продавить позицию в споре.", next: "socialAttack" },
    { id: "social-defense", label: "Защита", icon: "◆", detail: "Ответ на чужую словесную атаку.", next: "socialDefense" },
    { id: "pressure", label: "Рычаг давления", icon: "◉", detail: "Полный ход: бонус или штраф на дальнейшую дуэль.", next: "pressureKind" },
  ],
  socialAttack: [
    { id: "persuade", label: "Убеждение", icon: "◇", detail: "Эмп + Убеждение; мягко склонить к своей позиции.", actionId: "persuade" },
    { id: "deceive", label: "Обман", icon: "◌", detail: "Эмп + Обман; подменить смысл или скрыть правду.", actionId: "deceive" },
    { id: "intimidate", label: "Запугивание", icon: "▲", detail: "Воля + Запугивание; задавить страхом или угрозой.", actionId: "intimidate" },
    { id: "seduce", label: "Соблазнение", icon: "♡", detail: "Эмп + Соблазнение; сыграть на влечении.", actionId: "seduce" },
    { id: "lead", label: "Лидерство", icon: "↟", detail: "Эмп + Лидерство; взять инициативу речью.", actionId: "lead" },
    { id: "perform", label: "Выступление", icon: "◎", detail: "Эмп + Выступление; впечатлить публику или цель.", actionId: "perform" },
  ],
  socialDefense: [
    { id: "ignore", label: "Игнорировать", icon: "◒", detail: "Эмп + Харизма; урон 1d10 + Эмп.", actionId: "ignore" },
    { id: "change-topic", label: "Смена темы", icon: "↔", detail: "Эмп + Убеждение; урон 1d6 + Инт.", actionId: "changeTopic" },
    { id: "stop", label: "Прекращение", icon: "■", detail: "Бросок не требуется; завершение спора.", actionId: "stopDuel" },
    { id: "counterargument", label: "Контраргумент", icon: "◇", detail: "Вместо защиты совершить атаку, отменяя первую.", actionId: "counterargument" },
  ],
  pressureKind: [
    { id: "empathic", label: "Эмпатический", icon: "♡", detail: "Любовь или изучение уязвимых мест.", next: "empathicPressure" },
    { id: "antagonistic", label: "Антагонистический", icon: "▲", detail: "Намек, подкуп и давление через слабости.", next: "antagonisticPressure" },
  ],
  empathicPressure: [
    { id: "love", label: "Любовь", icon: "♡", detail: "Эмп + Харизма; противник получает -3 против вас.", actionId: "love" },
    { id: "study", label: "Изучение", icon: "◎", detail: "Эмп + Лидерство; найти уязвимые места.", actionId: "study" },
  ],
  antagonisticPressure: [
    { id: "hint", label: "Намек", icon: "◌", detail: "Инт + Этикет; противник получает -4 к защите.", actionId: "hint" },
    { id: "bribe", label: "Подкуп", icon: "◆", detail: "Воля + Запугивание; деньги дают бонус к эмпатии.", actionId: "bribe" },
  ],
};

const socialActionSpecs: Record<string, SocialActionSpec> = {
  persuade: { title: "Убеждение", group: "Социальная атака", stat: "Эмп", skills: ["Убеждение"], damage: "По сцене", effect: "Склоняет цель принять позицию персонажа.", note: "Основа: Эмп + Убеждение." },
  deceive: { title: "Обман", group: "Социальная атака", stat: "Эмп", skills: ["Обман"], damage: "По сцене", effect: "Цель принимает ложную подачу или теряет уверенность.", note: "Основа: Эмп + Обман." },
  intimidate: { title: "Запугивание", group: "Социальная атака", stat: "Воля", skills: ["Запугивание"], damage: "По сцене", effect: "Давление страхом, авторитетом или прямой угрозой.", note: "Основа: Воля + Запугивание." },
  seduce: { title: "Соблазнение", group: "Социальная атака", stat: "Эмп", skills: ["Соблазнение"], damage: "По сцене", effect: "Цель смягчается, отвлекается или раскрывает больше, чем хотела.", note: "Основа: Эмп + Соблазнение." },
  lead: { title: "Лидерство", group: "Социальная атака", stat: "Эмп", skills: ["Лидерство"], damage: "По сцене", effect: "Перехватывает инициативу разговора и задает рамку спора.", note: "Основа: Эмп + Лидерство." },
  perform: { title: "Выступление", group: "Социальная атака", stat: "Эмп", skills: ["Выступление"], damage: "По сцене", effect: "Работает особенно хорошо при публике или свидетелях.", note: "Основа: Эмп + Выступление." },
  ignore: { title: "Игнорировать", group: "Защита", stat: "Эмп", skills: ["Харизма"], damage: "1d10 + Эмп", effect: "Эффекта нет.", note: "Основа защиты: Эмп + Харизма." },
  changeTopic: { title: "Смена темы", group: "Защита", stat: "Эмп", skills: ["Убеждение"], damage: "1d6 + Инт", effect: "Эффекта нет.", note: "Основа защиты: Эмп + Убеждение." },
  stopDuel: { title: "Прекращение", group: "Защита", damage: "Нет", effect: "Завершение спора.", note: "Бросок не требуется.", noRoll: true },
  counterargument: { title: "Контраргумент", group: "Защита", damage: "См. выбранную атаку", effect: "Можно совершить атаку вместо защиты. Если встречная проверка выше, чужая атака отменяется, а ваша наносит урон.", note: "Выбери подходящую социальную атаку и сравни результаты." },
  love: { title: "Любовь", group: "Эмпатический рычаг", stat: "Эмп", skills: ["Харизма"], damage: "Нет", effect: "Противник влюбляется и получает -3 против персонажа в словесной дуэли, пока тот поддерживает любовь и хорошо обращается с ним.", note: "Если роман заканчивается разрывом, защитник получает постоянный +3 против эмпатических атак атакующего." },
  study: { title: "Изучение", group: "Эмпатический рычаг", stat: "Эмп", skills: ["Лидерство"], damage: "Нет", effect: "Позволяет заглянуть в душу противника и найти уязвимые места.", note: "Проверка против Инт x3 противника. При успехе +2 к словесной дуэли на 1 раунд." },
  hint: { title: "Намек", group: "Антагонистический рычаг", stat: "Инт", skills: ["Этикет"], damage: "Нет", effect: "Наводит оппонента на мысль. При успехе противник получает -4 к защите.", note: "Намек можно использовать только один раз за словесную дуэль." },
  bribe: { title: "Подкуп", group: "Антагонистический рычаг", stat: "Воля", skills: ["Запугивание"], damage: "Нет", effect: "При успешной проверке Азартных игр за каждые 50 крон цель получает +1 к эмпатическим проверкам до конца дуэли.", note: "Формула действия на листе: Воля + Запугивание." },
};

const categoryAppearance: Record<string, string> = {
  Вампир:
    "Внешний вид: бледная гуманоидная фигура с хищной пластикой, слишком резкими чертами лица и взглядом, который кажется живее остального тела.",
  Гибрид:
    "Внешний вид: смешение звериных и чудовищных черт, где крылья, когти, клюв или чешуя выдают существо еще до первой атаки.",
  Гуманоид:
    "Внешний вид: узнаваемый силуэт разумного противника; одежда, снаряжение и осанка сразу показывают профессию, привычки и готовность к насилию.",
  Драконоид:
    "Внешний вид: вытянутое рептильное тело с плотной чешуей, мощной пастью и движениями, в которых чувствуется древняя ярость.",
  Дух:
    "Внешний вид: полупрозрачный силуэт с рваными краями, холодным свечением и чертами, будто застывшими в момент смерти.",
  Зверь:
    "Внешний вид: узнаваемая природная форма, но в сцене стоит подчеркнуть размер, следы грязи, старые шрамы и настороженные движения.",
  Инсектоид:
    "Внешний вид: хитиновое тело с резкими суставчатыми движениями, блестящими панцирными пластинами и неприятно точными охотничьими повадками.",
  Люди:
    "Внешний вид: человек с заметными бытовыми деталями, дорожной пылью, оружием или формой, по которым легко понять его роль в сцене.",
  Мутант:
    "Внешний вид: перекошенная гуманоидная фигура с грубой мускулатурой, шрамами, следами алхимии и неестественно тяжелыми движениями.",
  Огроид:
    "Внешний вид: крупное, грубое тело с тяжелыми конечностями, низкой посадкой головы и силой, заметной даже в спокойной позе.",
  Призрак:
    "Внешний вид: мерцающая мертвая фигура с провалами вместо живых красок, шепчущими контурами и холодом вокруг себя.",
  Проклятый:
    "Внешний вид: тело или облик, испорченные проклятием; в нем есть узнаваемая прежняя форма, но она нарушена болью, звериностью или гниением.",
  Реликт:
    "Внешний вид: древнее и почти сказочное существо, будто вышедшее из старого леса или забытого обряда, с деталями, которые не выглядят природными.",
  Трупоед:
    "Внешний вид: сутулая падальная тварь с серой кожей, вытянутой пастью, грязными когтями и голодной торопливостью в каждом движении.",
  Чудовище:
    "Внешний вид: опасная нечеловеческая форма, которую лучше описывать через силуэт, запах, следы на земле и то, как вокруг нее меняется сцена.",
};

const nameAppearanceRules: Array<[RegExp, string]> = [
  [/альп|брукс|катакан|вампир/i, "Внешний вид: на первый взгляд почти человек, но бледная кожа, слишком ровная неподвижность и хищные зубы быстро ломают это впечатление."],
  [/гул|альгул|гнилец|утоп|кладбищ/i, "Внешний вид: низкая жилистая тварь с мертвой кожей, запавшими глазами, грязными когтями и пастью, привыкшей рвать плоть."],
  [/леш|древ|дубов/i, "Внешний вид: высокий древесный силуэт с корой вместо кожи, ветвистыми наростами и темной лесной пустотой там, где должны быть глаза."],
  [/элементаль огня|огнен/i, "Внешний вид: каменная или угольная оболочка с раскаленными трещинами, жаром вокруг тела и светом, будто от открытой печи."],
  [/элементаль льда|ледян|лед/i, "Внешний вид: тяжелая фигура из мутного льда и мерзлой породы, покрытая инеем и сколами, которые звенят при движении."],
  [/элементаль земли|голем|гарг/i, "Внешний вид: массивная каменная фигура с грубо высеченными плечами, пылью в трещинах и походкой ожившей стены."],
  [/гарп|сирен|нереид|морск|водян/i, "Внешний вид: влажный или крылатый силуэт с резкими чертами, перепонками, перьями или плавниками, пахнущий водой, солью и добычей."],
  [/грифон|виверн|василиск|куролиск|дракон/i, "Внешний вид: чешуйчатая или пернатая хищная туша с мощной шеей, когтистыми лапами и взглядом существа, привыкшего владеть небом и землей."],
  [/эндриаг|главоглаз|жагниц|шарлей|хитин/i, "Внешний вид: членистое тело в хитиновом панцире, с жесткими лапами, резкими рывками и влажным блеском на острых частях."],
  [/тролл|циклоп|огр|наккер/i, "Внешний вид: тяжелая коренастая туша с грубой кожей, огромными руками и лицом, в котором сила заметнее мысли."],
  [/дикая охот|имлерих|нитраль|эредин|карантир/i, "Внешний вид: высокая потусторонняя фигура в темных доспехах, с холодным свечением, ледяным следом и силуэтом, похожим на дурной сон о войне."],
  [/солдат|охотник|убийц|бандит|профессор|жрец|жрица|фанатик/i, "Внешний вид: вооруженный человек или нелюдь в походной одежде, броне или знаках своей фракции; детали снаряжения сразу выдают опыт и угрозу."],
  [/акула|кит|рыба|крокодил|черепаха/i, "Внешний вид: водная тварь с мокрой кожей, тяжелым корпусом и движениями, которые на суше кажутся грубыми, а в воде становятся пугающе быстрыми."],
  [/гусь|страус|курица|павлин|сова|летучая мышь/i, "Внешний вид: обычная птица или крылатое животное, но для сцены важны резкие движения, настороженный взгляд и внезапная агрессия."],
  [/кролик|лисиц|коза|корова|олень|верблюд|тигр|слон/i, "Внешний вид: природное животное с узнаваемым силуэтом; подчеркни размер, шерсть, рога, следы дороги или охоты, чтобы быстро задать сцену."],
  [/ведьмак/i, "Внешний вид: вооруженный профессионал с двумя клинками, дорожной одеждой, следами зелий и спокойной собранностью человека, привыкшего входить в логово первым."],
];

function getAppearanceText(creature: Creature) {
  const matchedRule = nameAppearanceRules.find(([pattern]) => pattern.test(`${creature.name} ${creature.description}`));
  const baseAppearance = matchedRule?.[1] ?? categoryAppearance[creature.category] ?? categoryAppearance.Чудовище;
  const highestArmor = Math.max(...Object.values(creature.armor));
  const armorNote =
    highestArmor > 0 && !/брон|доспех|панцир|чешу/i.test(baseAppearance)
      ? ` На теле заметна защита примерно ПБ ${highestArmor}: броня, панцир, плотная шкура или зачарованная оболочка.`
      : "";

  return `${baseAppearance}${armorNote}`;
}

function addAppearanceToCreature(creature: Creature): Creature {
  if (/Внешний вид:/i.test(creature.description)) return creature;

  return {
    ...creature,
    description: `${creature.description.trim()} ${getAppearanceText(creature)}`,
  };
}

function addAppearanceDescriptions(creatures: Creature[]) {
  return creatures.map(addAppearanceToCreature);
}

const initialCreatures: Creature[] = addAppearanceDescriptions([
  {
    id: "scoiatael-archer",
    name: "Лучник скоятаэлей",
    category: "Гуманоид",
    danger: "Средняя",
    habitat: "Леса, засады на трактах, окраины поселений",
    vulnerability: "Яд повешенного",
    tactic:
      "Держит дистанцию, открывает бой из укрытия и отходит, пока союзники сковывают цель в ближнем бою.",
    description:
      "Эльфский партизан, воюющий за Старшие Народы. Для мастера это удобный противник для засад, ночных тревог и сцен, где переговоры могут сорваться в один выстрел.",
    stats: {
      Инт: 4,
      Реа: 6,
      Лвк: 7,
      Тел: 5,
      Скор: 7,
      Эмп: 3,
      Рем: 4,
      Воля: 6,
      Уст: 5,
      Бег: 21,
      Прж: 4,
      Вын: 25,
      ПЗ: 25,
    },
    skills: {
      "Стрельба из лука": 15,
      "Владение мечом": 12,
      Борьба: 10,
      "Уклонение/Изворотливость": 14,
      Атлетика: 14,
      Внимание: 13,
      Скрытность: 15,
      "Выживание в дикой природе": 14,
      Стойкость: 12,
      Храбрость: 12,
    },
    armor: {
      head: 5,
      torso: 5,
      rightArm: 5,
      leftArm: 5,
      rightLeg: 5,
      leftLeg: 5,
    },
    attacks: [
      {
        id: "longbow",
        name: "Длинный лук",
        base: 15,
        damage: "4d6",
        range: "200 м",
        effect: "Работает лучше из укрытия или с высоты.",
      },
      {
        id: "falchion",
        name: "Охотничий фальшион",
        base: 12,
        damage: "3d6",
        range: "Ближняя",
        effect: "Запасной вариант, когда дистанция потеряна.",
      },
      {
        id: "throwing-knives",
        name: "Метательные ножи",
        base: 14,
        damage: "1d6",
        range: "20 м",
        effect: "Подходит для добивания или отвлечения.",
      },
    ],
    abilities: [
      "Засадная дисциплина: группа может использовать лучший результат Скрытности как ориентир для всей сцены.",
      "Ночное зрение: действует в сумерках и темноте без обычных штрафов.",
      "Тактика бригад: сначала обстреливает, затем меняет позицию или прикрывает прорыв союзников.",
    ],
  },
  {
    id: "ghoul",
    name: "Гуль",
    category: "Трупоед",
    danger: "Средняя",
    habitat: "Кладбища, поля битв, заброшенные деревни",
    vulnerability: "Масло против трупоедов, огонь",
    tactic:
      "Сближается стаей, окружает раненую цель и становится опаснее, когда чувствует кровь.",
    description:
      "Прожорливый падальщик Континента. Хорош для быстрых боевых сцен, проверки ресурсов группы и угрозы, которая кажется простой только до первого окружения.",
    stats: {
      Инт: 1,
      Реа: 6,
      Лвк: 7,
      Тел: 6,
      Скор: 6,
      Эмп: 1,
      Рем: 1,
      Воля: 5,
      Уст: 5,
      Бег: 18,
      Прж: 3,
      Вын: 25,
      ПЗ: 25,
    },
    skills: {
      "Ближний бой": 12,
      Борьба: 12,
      "Уклонение/Изворотливость": 12,
      Атлетика: 14,
      Внимание: 13,
      Скрытность: 11,
      "Выживание в дикой природе": 12,
      "Сопротивление магии": 9,
      Стойкость: 12,
      Храбрость: 12,
    },
    armor: {
      head: 0,
      torso: 0,
      rightArm: 0,
      leftArm: 0,
      rightLeg: 0,
      leftLeg: 0,
    },
    attacks: [
      {
        id: "claws",
        name: "Когти",
        base: 12,
        damage: "3d6",
        range: "Ближняя",
        effect: "Надежная атака, когда цель уже окружена.",
      },
      {
        id: "bite",
        name: "Укус",
        base: 12,
        damage: "3d6+2",
        range: "Ближняя",
        effect: "Кровотечение 25%, точность -1.",
      },
    ],
    abilities: [
      "Наскок: может прыгнуть на цель с расстояния до 5 метров без разбега.",
      "Ярость: при низких ПЗ движется и атакует агрессивнее, восстанавливая 3 ПЗ за ход.",
      "Дикий нюх: для Внимания и Выживания использует инстинкты вместо слабого разума.",
      "Ночное зрение: игнорирует штрафы слабого освещения.",
    ],
  },
  {
    id: "elatrion-aen-seidhe-mage",
    name: "Элатрион",
    category: "Гуманоид",
    danger: "Высокая",
    habitat: "Старшие Народы, магические круги и городские сцены",
    vulnerability: "Серебро и антимагические меры по ситуации",
    tactic:
      "Держится за спинами союзников, давит магией и контролем, а в ближнем бою полагается на уклонение и древковое оружие.",
    description:
      "Aen Seidhe, маг. Карточка перенесена с листа персонажа Артура: высокий Интеллект, Воля и магические навыки делают Элатриона удобным противником, союзником или важным NPC для сцены.",
    stats: {
      Инт: 10,
      Реа: 8,
      Лвк: 2,
      Тел: 10,
      Скор: 4,
      Эмп: 9,
      Рем: 6,
      Воля: 10,
      Удача: 1,
      Уст: 10,
      Бег: 12,
      Прж: 2,
      Вын: 50,
      ПЗ: 50,
      Нагрузка: 100,
      Отдых: 10,
    },
    skills: {
      "Магические познания": 16,
      Внимание: 10,
      "Выживание в дикой природе": 13,
      Дедукция: 10,
      Монстрология: 10,
      Образование: 16,
      "Ориентирование в городе": 10,
      "Передача знаний": 14,
      Тактика: 10,
      Торговля: 10,
      Этикет: 13,
      "Язык: Всеобщий": 12,
      "Язык: Старшая Речь": 18,
      "Язык: Краснолюдов": 10,
      "Азартные игры": 9,
      "Внешний вид": 12,
      Выступление: 9,
      Искусство: 10,
      Лидерство: 9,
      Обман: 9,
      "Понимание людей": 14,
      Соблазнение: 10,
      Убеждение: 9,
      Харизма: 9,
      "Ближний бой": 8,
      Борьба: 8,
      "Верховая езда": 8,
      "Владение древковым оружием": 14,
      "Владение легкими клинками": 8,
      "Владение мечом": 8,
      Мореходство: 8,
      "Уклонение/Изворотливость": 13,
      Атлетика: 2,
      "Ловкость рук": 2,
      Скрытность: 2,
      "Стрельба из арбалета": 2,
      "Стрельба из лука": 4,
      Сила: 10,
      Стойкость: 10,
      Запугивание: 10,
      "Наведение порчи": 11,
      "Проведение ритуалов": 14,
      "Сопротивление магии": 14,
      "Сопротивление убеждению": 10,
      "Сотворение заклинаний": 16,
      Храбрость: 10,
      Алхимия: 11,
      "Взлом замков": 5,
      "Знание ловушек": 5,
      Изготовление: 5,
      Маскировка: 5,
      "Первая помощь": 5,
      Подделывание: 5,
    },
    armor: {
      head: 0,
      torso: 0,
      rightArm: 0,
      leftArm: 0,
      rightLeg: 0,
      leftLeg: 0,
    },
    attacks: [
      {
        id: "elatrion-spellcasting",
        name: "Заклинание",
        base: 16,
        damage: "По заклинанию",
        range: "По заклинанию",
        effect: "Магическая атака; на листе указан общий модификатор атаки -3.",
      },
      {
        id: "elatrion-polearm",
        name: "Древковое оружие",
        base: 14,
        damage: "По оружию",
        range: "Ближняя",
        effect: "Основной оружейный навык с листа.",
      },
      {
        id: "elatrion-punch",
        name: "Удар рукой",
        base: 8,
        damage: "1d6+4",
        range: "Ближняя",
        effect: "Безоружная атака.",
      },
      {
        id: "elatrion-kick",
        name: "Удар ногой",
        base: 8,
        damage: "1d6+8",
        range: "Ближняя",
        effect: "Безоружная атака.",
      },
    ],
    abilities: [
      "Раса: Aen Seidhe.",
      "Профессия: маг.",
      "Пол: мужской; возраст: 121.",
      "Боевые модификаторы с листа: атака -3, защита -1.",
      "Заметка с листа: осколки фейерверка извлечены.",
    ],
  },
  {
    id: "blanka-human-courtesan",
    name: "Бланка",
    category: "Гуманоид",
    danger: "Средняя",
    habitat: "Города, салоны, дворы и сцены переговоров",
    vulnerability: "Обычные уязвимости человека",
    tactic:
      "Избегает прямого боя, давит через Влияние, Обман, Харизму и социальные сцены; при угрозе старается уйти или спрятаться.",
    description:
      "Человек, куртизанка. Карточка перенесена с простого листа персонажа: Бланка полезна как социальный NPC, информатор или участник сцены, где важнее разговор, деньги и связи, чем оружие.",
    stats: {
      Инт: 9,
      Реа: 7,
      Лвк: 8,
      Тел: 8,
      Скор: 8,
      Эмп: 10,
      Рем: 3,
      Воля: 6,
      Удача: 1,
      Уст: 7,
      Бег: 24,
      Прж: 4,
      Вын: 35,
      ПЗ: 35,
      Нагрузка: 80,
      Отдых: 7,
    },
    skills: {
      Влияние: 16,
      Торговля: 11,
      Этикет: 15,
      "Знание улиц": 12,
      Харизма: 15,
      Обман: 16,
      "Уход и стиль": 15,
      Убеждение: 15,
      Соблазнение: 15,
      "Сопротивление убеждению": 8,
      "Светская львица": 13,
      "Знающая мир": 8,
      Внимание: 9,
      Дедукция: 9,
      Образование: 9,
      Монстрология: 9,
      Тактика: 9,
      "Передача знаний": 9,
      "Стрельба из лука": 8,
      Атлетика: 8,
      "Стрельба из арбалета": 8,
      "Ловкость рук": 8,
      Скрытность: 8,
      Борьба: 7,
      "Уклонение/Изворотливость": 7,
      "Ближний бой": 7,
      "Верховая езда": 7,
      Мореходство: 7,
      "Владение легкими клинками": 7,
      "Владение древковым оружием": 7,
      "Владение мечом": 7,
      Сила: 8,
      Стойкость: 8,
      Храбрость: 6,
      Запугивание: 6,
      Заклинания: 6,
      "Сопротивление магии": 6,
      Ритуалы: 6,
      Алхимия: 3,
      Изготовление: 3,
      Маскировка: 3,
      "Первая помощь": 3,
      Подделка: 3,
      "Взлом замков": 3,
      "Знание ловушек": 3,
    },
    armor: {
      head: 0,
      torso: 0,
      rightArm: 0,
      leftArm: 0,
      rightLeg: 0,
      leftLeg: 0,
    },
    attacks: [
      {
        id: "blanka-unarmed",
        name: "Безоружная атака",
        base: 7,
        damage: "1d6+4",
        range: "Ближняя",
        effect: "На листе оружие не заполнено; базовая атака для участия в бою.",
      },
      {
        id: "blanka-social-pressure",
        name: "Социальное давление",
        base: 16,
        damage: "Без урона",
        range: "Разговор",
        effect: "Проверка Влияния/Обмана против сопротивления цели.",
      },
    ],
    abilities: [
      "Раса: человек.",
      "Профессия: куртизанка.",
      "Определяющий навык: Влияние.",
      "Деньги: 1200 реданских крон.",
      "Снаряжение: духи, набор для макияжа, перо и бумага, доска для покера, ручное зеркало.",
      "Тренируемые навыки с листа: светская львица 4, знающая мир 2.",
    ],
  },
  {
    id: "valdemar-human-merchant",
    name: "Вальдемар",
    category: "Гуманоид",
    danger: "Средняя",
    habitat: "Торговые пути, рынки, караваны и портовые склады",
    vulnerability: "Обычные уязвимости человека",
    tactic:
      "Держит дистанцию, торгуется до последнего и использует знание дорог, культур и товаров, чтобы выйти из опасности до начала драки.",
    description:
      "Человек, торговец. Карточка перенесена из листа персонажа Миши: Вальдемар полезен как проводник, купец, владелец каравана или NPC, который знает цену почти всему.",
    stats: {
      Инт: 9,
      Реа: 5,
      Лвк: 6,
      Тел: 4,
      Скор: 4,
      Эмп: 9,
      Рем: 5,
      Воля: 6,
      Удача: 8,
      Уст: 5,
      Бег: 12,
      Прж: 2,
      Вын: 25,
      ПЗ: 25,
      Нагрузка: 80,
      Отдых: 5,
    },
    skills: {
      "Бывалый путешественник": 13,
      Торговля: 14,
      Внимание: 9,
      Дедукция: 9,
      Образование: 9,
      "Ориентирование в городе": 9,
      "Передача знаний": 9,
      Тактика: 9,
      Этикет: 14,
      "Выживание в дикой природе": 9,
      Обман: 9,
      "Понимание людей": 9,
      Убеждение: 9,
      Харизма: 9,
      Борьба: 5,
      "Уклонение/Изворотливость": 5,
      "Ближний бой": 5,
      "Стрельба из арбалета": 6,
      Атлетика: 6,
      Скрытность: 6,
      Стойкость: 4,
      Сила: 4,
      Храбрость: 6,
      Алхимия: 5,
      Изготовление: 5,
      "Первая помощь": 5,
    },
    armor: {
      head: 0,
      torso: 0,
      rightArm: 0,
      leftArm: 0,
      rightLeg: 0,
      leftLeg: 0,
    },
    attacks: [
      {
        id: "valdemar-crossbow",
        name: "Арбалет",
        base: 7,
        damage: "4d6+2",
        range: "100 м",
        effect: "Точность +1, медленная перезарядка.",
      },
      {
        id: "valdemar-punch",
        name: "Удар рукой",
        base: 5,
        damage: "1d6+2",
        range: "Ближняя",
        effect: "Запасной безоружный вариант.",
      },
    ],
    abilities: [
      "Игрок: Миша.",
      "Раса: человек.",
      "Профессия: торговец.",
      "Определяющий навык: Бывалый путешественник (Инт) 4.",
      "Бывалый путешественник: проверка позволяет вспомнить факт о предмете, культуре или области; СЛ задаёт ведущий.",
    ],
  },
  {
    id: "gedvin-witcher-griffin",
    name: "Гедвин",
    category: "Ведьмак",
    danger: "Высокая",
    habitat: "Дороги, контракты на чудовищ, ведьмачьи маршруты",
    vulnerability: "Серебро, перегрузка ресурсами, социальное давление",
    tactic:
      "Начинает бой подготовленным, выбирает правильный меч, держит защиту через уклонение и подкрепляет атаку знаками школы Грифона.",
    description:
      "Ведьмак, перенесённый из листа персонажа Миши. Гедвин подходит как союзник, соперник или опасный участник сцены охоты на чудовище.",
    stats: {
      Инт: 10,
      Реа: 9,
      Лвк: 8,
      Тел: 7,
      Скор: 7,
      Эмп: 1,
      Рем: 5,
      Воля: 9,
      Удача: 4,
      Уст: 8,
      Бег: 21,
      Прж: 4,
      Вын: 40,
      ПЗ: 40,
      Отдых: 8,
    },
    skills: {
      "Подготовка ведьмака": 10,
      Внимание: 15,
      "Выживание в дикой природе": 15,
      Дедукция: 15,
      Атлетика: 13,
      Скрытность: 12,
      "Верховая езда": 14,
      "Владение мечом": 15,
      "Уклонение/Изворотливость": 15,
      Алхимия: 10,
      "Сотворение заклинаний": 15,
      "Ближний бой": 9,
      Борьба: 9,
      "Стрельба из арбалета": 8,
      Стойкость: 7,
      Сила: 7,
      "Сопротивление магии": 9,
      Храбрость: 9,
    },
    armor: {
      head: 18,
      torso: 18,
      rightArm: 18,
      leftArm: 18,
      rightLeg: 18,
      leftLeg: 18,
    },
    attacks: [
      {
        id: "gedvin-steel-griffin-sword",
        name: "Стальной меч школы Грифона",
        base: 16,
        damage: "5d6+2",
        range: "Ближняя",
        effect: "Точность +1, пробивающее броню, метеоритное, фокусирующее (1).",
      },
      {
        id: "gedvin-silver-griffin-sword",
        name: "Серебряный меч школы Грифона",
        base: 16,
        damage: "2d6+2",
        range: "Ближняя",
        effect: "Серебряное (3d6), фокусирующее (1).",
      },
      {
        id: "gedvin-griffin-crossbow",
        name: "Арбалет школы Грифона",
        base: 9,
        damage: "2d6+2",
        range: "50 м",
        effect: "Точность +1, медленная перезарядка, улучшенное пробивание брони.",
      },
      {
        id: "gedvin-signs",
        name: "Ведьмачий знак",
        base: 15,
        damage: "По знаку",
        range: "По знаку",
        effect: "Игни, Аард, Квен, Ирден, Аксий.",
      },
    ],
    abilities: [
      "Игрок: Миша.",
      "Раса и профессия: ведьмак.",
      "Возраст: 45.",
      "Деньги: 350 реданских крон.",
      "Броня школы Грифона: после критического ранения ведьмачьим оружием можно сразу пройти Сотворение заклинаний, чтобы сотворить Знак.",
      "Рецепты: Кошка, Гром, Отвар из катакана, Яд повешенного, Масло против трупоедов.",
      "Знаки: Игни, Аард, Квен, Ирден, Аксий.",
    ],
  },
  ...vesemirSupplementCreatures,
  ...unofficialCreatures,
  ...vesemirCreatures,
]);

const statOrder = ["Инт", "Реа", "Лвк", "Тел", "Скор", "Эмп", "Рем", "Воля", "Уст", "Бег", "Прж", "Вын", "ПЗ"];
const defaultStats = Object.fromEntries(statOrder.map((stat) => [stat, 0]));

const emptyCreatureForm: CreatureForm = {
  name: "",
  category: "Чудовище",
  danger: "Средняя",
  habitat: "",
  vulnerability: "",
  tactic: "",
  description: "",
  stats: defaultStats,
  armorValue: 0,
  skillsText: "Ближний бой: 10\nВнимание: 10\nСтойкость: 10",
  attacksText: "Основная атака | 10 | 3d6 | Ближняя | Нет",
  abilitiesText: "",
};

function rollD10() {
  return Math.floor(Math.random() * 10) + 1;
}

const naturalWeapons = new Set([
  "безоружная атака",
  "зубы",
  "когти",
  "копыта",
  "клюв",
  "клыки",
  "кулаки",
  "ноги",
  "основная атака",
  "пинок копытом",
  "рога",
  "социальное давление",
  "таран",
  "удар",
  "удар ногой",
  "удар рукой",
  "укус",
  "хвост",
  "хобот",
  "шипастый язык",
]);

const ingredientByCategory: Record<string, string[]> = {
  Вампир: ["Слюна вампира", "Эссенция вампира", "Кровь чудовища"],
  Гибрид: ["Перья", "Кости животных", "Сырое мясо"],
  Драконоид: ["Чешуя драконоида", "Зуб драконида", "Сырое мясо"],
  Дух: ["Эссенция призрака", "Дымная пыль"],
  Зверь: ["Кости животных", "Сырое мясо"],
  Инсектоид: ["Хитин", "Яд чудовища", "Лимфа чудовища"],
  Мутант: ["Мутагенная ткань", "Алхимические остатки"],
  Огроид: ["Кости чудовища", "Сырое мясо"],
  Призрак: ["Эссенция призрака", "Пыль призрака"],
  Проклятый: ["Эссенция проклятого", "Кости чудовища"],
  Реликт: ["Эссенция реликта", "Странные предметы"],
  Трупоед: ["Костный мозг", "Когти трупоеда", "Экстракт яда"],
  Чудовище: ["Части чудовища", "Алхимические реагенты по сцене"],
};

const mutagenCategories = new Set([
  "Вампир",
  "Гибрид",
  "Драконоид",
  "Дух",
  "Инсектоид",
  "Мутант",
  "Огроид",
  "Призрак",
  "Проклятый",
  "Реликт",
  "Трупоед",
  "Чудовище",
]);

function uniqueList(values: string[]) {
  const seen = new Set<string>();

  return values
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function extractLootFragments(text: string) {
  const patterns = [
    /(?:Кроны|Реданские кроны|Темерские орены|Нильфгардские флорены|Дукаты|Бизанты|Лизанты|Обычные предметы|Странные предметы)[^.;,\n]*/gi,
    /(?:Кости|Сырое мясо|Перья|Мех|Шкура|Чешуя|Зуб|Зубы|Глаз|Глаза|Сердце|Слюна|Лимфа|Когти|Кровь|Яд|Эссенция|Экстракт|Кислота|Хитин|Костный мозг|Пыль)[^.;,\n]*/gi,
  ];

  return patterns.flatMap((pattern) => text.match(pattern) ?? []);
}

function getCreatureLoot(creature: Creature): CreatureLoot {
  const combinedText = [
    creature.description,
    creature.vulnerability,
    creature.tactic,
    ...creature.abilities,
    ...creature.attacks.flatMap((attack) => [attack.name, attack.effect]),
  ].join("\n");
  const fragments = extractLootFragments(combinedText);
  const coinsFromText = fragments.filter((item) => /крон|орен|флорен|дукат|бизант|лизант|обычные предметы|странные предметы/i.test(item));
  const ingredientsFromText = fragments.filter((item) => !coinsFromText.includes(item));
  const weapons = creature.attacks
    .map((attack) => attack.name)
    .filter((name) => !naturalWeapons.has(name.toLowerCase()))
    .filter((name) => !/заклин|магич|первобыт|водная магия|природная магия/i.test(name));
  const catalogArmor = Object.keys(armorCatalogNotes).filter((name) => combinedText.toLowerCase().includes(name.toLowerCase()));
  const armorValues = Object.values(creature.armor);
  const highestArmor = Math.max(...armorValues);
  const armorSummary =
    highestArmor > 0
      ? [`Броня ПБ ${highestArmor}`]
      : ["Нет брони"];

  return {
    coins: uniqueList(
      coinsFromText.length > 0
        ? coinsFromText
        : ["Люди", "Гуманоид", "Ведьмак"].includes(creature.category)
          ? ["Монеты и ценности по сцене"]
          : ["Нет"],
    ),
    mutagens: mutagenCategories.has(creature.category) ? [`Мутаген: ${creature.category.toLowerCase()}`] : ["Нет"],
    alchemicalIngredients: uniqueList(ingredientsFromText.length > 0 ? ingredientsFromText : ingredientByCategory[creature.category] ?? ["Нет данных"]),
    weapons: uniqueList(weapons.length > 0 ? weapons : ["Нет оружия"]),
    armor: uniqueList(catalogArmor.length > 0 ? catalogArmor : armorSummary),
  };
}

function cloneCreature(creature: Creature, existingNames: string[]): Creature {
  let suffix = 2;
  let name = `${creature.name} ${suffix}`;

  while (existingNames.includes(name)) {
    suffix += 1;
    name = `${creature.name} ${suffix}`;
  }

  return {
    ...structuredClone(creature),
    id: `${creature.id}-${Date.now()}`,
    name,
  };
}

function makeCreatureId(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-|-$/g, "");

  return `custom-${slug || "monster"}-${Date.now()}`;
}

function parseKeyValueLines(text: string): Record<string, number> {
  return Object.fromEntries(
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, value = "0"] = line.split(/[:=|-]/);
        return [name.trim(), Number(value.trim()) || 0];
      })
      .filter(([name]) => name),
  );
}

function parseAttacks(text: string, creatureId: string): Creature["attacks"] {
  const attacks = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [name = "Атака", base = "0", damage = "", range = "", effect = ""] = line
        .split("|")
        .map((part) => part.trim());

      return {
        id: `${creatureId}-attack-${index}`,
        name,
        base: Number(base) || 0,
        damage,
        range,
        effect,
      };
    });

  return attacks.length > 0
    ? attacks
    : [
        {
          id: `${creatureId}-attack-0`,
          name: "Основная атака",
          base: 0,
          damage: "",
          range: "",
          effect: "",
        },
      ];
}

function createCreatureFromForm(form: CreatureForm): Creature {
  const id = makeCreatureId(form.name);
  const armor = Object.fromEntries((Object.keys(bodyPartLabels) as BodyPart[]).map((part) => [part, form.armorValue])) as Record<
    BodyPart,
    number
  >;

  return addAppearanceToCreature({
    id,
    name: form.name.trim() || "Новый монстр",
    category: form.category.trim() || "Чудовище",
    danger: form.danger,
    habitat: form.habitat.trim() || "Не указано",
    vulnerability: form.vulnerability.trim() || "Не указано",
    tactic: form.tactic.trim() || "Не указано",
    description: form.description.trim() || "Описание можно добавить позже.",
    stats: form.stats,
    skills: parseKeyValueLines(form.skillsText),
    armor,
    attacks: parseAttacks(form.attacksText, id),
    abilities: form.abilitiesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  });
}

export default function App() {
  const [activePage, setActivePage] = useState<AppPage>("monsters");
  const [creatures, setCreatures] = useState<Creature[]>(initialCreatures);
  const [activeId, setActiveId] = useState(initialCreatures[0].id);
  const [query, setQuery] = useState("");
  const [alchemyQuery, setAlchemyQuery] = useState("");
  const [recipeFilter, setRecipeFilter] = useState<RecipeFilter>("Все");
  const [craftQuery, setCraftQuery] = useState("");
  const [worldQuery, setWorldQuery] = useState("");
  const [worldTypeFilter, setWorldTypeFilter] = useState<"Все" | "Страна" | "Город" | "Регион" | "Острова">("Все");
  const [categoryFilter, setCategoryFilter] = useState("Все");
  const [dangerFilter, setDangerFilter] = useState<Creature["danger"] | "Все">("Все");
  const [, setRolls] = useState<RollEntry[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [creatureForm, setCreatureForm] = useState<CreatureForm>(emptyCreatureForm);
  const [healthInput, setHealthInput] = useState<string | null>(null);
  const [staminaInput, setStaminaInput] = useState<string | null>(null);
  const [creatureEffects] = useState<CreatureEffects>({});
  const [combatSheetId, setCombatSheetId] = useState(initialCreatures[0].id);
  const [combatStage, setCombatStage] = useState<CombatStageId>("root");
  const [combatStageHistory, setCombatStageHistory] = useState<CombatStageId[]>([]);
  const [selectedCombatActionId, setSelectedCombatActionId] = useState<string | null>(null);
  const [weaponAccuracyInput, setWeaponAccuracyInput] = useState("0");
  const [distanceModifierInput, setDistanceModifierInput] = useState("0");
  const [sideModifierInput, setSideModifierInput] = useState("0");
  const [combatSimulation, setCombatSimulation] = useState<{ die: number; total: number; actionTitle: string } | null>(null);
  const [socialSheetId, setSocialSheetId] = useState(initialCreatures[0].id);
  const [socialStage, setSocialStage] = useState<SocialStageId>("root");
  const [socialStageHistory, setSocialStageHistory] = useState<SocialStageId[]>([]);
  const [selectedSocialActionId, setSelectedSocialActionId] = useState<string | null>(null);
  const [socialModifierInput, setSocialModifierInput] = useState("0");
  const [socialSimulation, setSocialSimulation] = useState<{ die: number | null; total: number; actionTitle: string } | null>(null);
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");

  const activeCreature = creatures.find((creature) => creature.id === activeId) ?? creatures[0];
  const combatSheet = creatures.find((creature) => creature.id === combatSheetId) ?? creatures[0];
  const socialSheet = creatures.find((creature) => creature.id === socialSheetId) ?? creatures[0];
  const activeCreatureLoot = getCreatureLoot(activeCreature);
  const displayedHealth = healthInput ?? String(activeCreature.stats.ПЗ ?? 0);
  const displayedStamina = staminaInput ?? String(activeCreature.stats.Вын ?? 0);
  const activeCreatureEffects = creatureEffects[activeCreature.id] ?? [];
  const creaturePickerOptions = creatures.map((creature) => ({
    value: creature.id,
    label: creature.name,
    detail: `${creature.category} · ${creature.danger}`,
    meta: `ПЗ ${creature.stats.ПЗ ?? 0} · Вын ${creature.stats.Вын ?? 0}`,
  }));
  const categoryOptions = useMemo(() => ["Все", ...Array.from(new Set(creatures.map((creature) => creature.category))).sort()], [creatures]);
  const pageMeta: Record<AppPage, { title: string; text: string }> = {
    monsters: {
      title: "Бестиарий мастера",
      text: "Быстрая шпаргалка по существам, тактике, уязвимостям и броскам во время сцены.",
    },
    alchemy: {
      title: "Алхимия",
      text: "Ингредиенты, очищенные субстанции, слабые и ведьмачьи эликсиры, масла и отвары с компонентами.",
    },
    combat: {
      title: "Действия в бою",
      text: "Один лист для расчета основ, дерево действий и симуляция хода на 3 секунды.",
    },
    social: {
      title: "Словесная дуэль",
      text: "Один лист для расчета социальной основы, дерево давления и быстрый раунд спора.",
    },
    craft: {
      title: "Ремесло",
      text: "Броня, усиления, глифы и ведьмачье снаряжение для наград, трофеев и мастерских сцен.",
    },
    world: {
      title: "Страны и города",
      text: "Политика, религия, торговля и быстрые зацепки для сцен на Континенте.",
    },
  };

  const filteredCreatures = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return creatures.filter((creature) => {
      const matchesName = !normalized || creature.name.toLowerCase().includes(normalized);
      const matchesCategory = categoryFilter === "Все" || creature.category === categoryFilter;
      const matchesDanger = dangerFilter === "Все" || creature.danger === dangerFilter;

      return matchesName && matchesCategory && matchesDanger;
    });
  }, [categoryFilter, creatures, dangerFilter, query]);

  const filteredIngredients = useMemo(() => {
    const normalized = alchemyQuery.trim().toLowerCase();
    if (!normalized) return alchemyIngredients;

    return alchemyIngredients.filter((ingredient) =>
      [ingredient.name, ingredient.substance, ingredient.kind, ingredient.source, ingredient.note].join(" ").toLowerCase().includes(normalized),
    );
  }, [alchemyQuery]);

  const filteredMutagens = useMemo(() => {
    const normalized = alchemyQuery.trim().toLowerCase();
    if (!normalized) return mutagens;

    return mutagens.filter((mutagen) =>
      [mutagen.name, mutagen.substance, mutagen.creatureType, mutagen.source, mutagen.use].join(" ").toLowerCase().includes(normalized),
    );
  }, [alchemyQuery]);

  const filteredRecipes = useMemo(() => {
    const normalized = alchemyQuery.trim().toLowerCase();

    return alchemyRecipes.filter((recipe) => {
      const matchesGroup = recipeFilter === "Все" || recipe.group === recipeFilter;
      const matchesQuery =
        !normalized ||
        [recipe.name, recipe.group, recipe.components.join(" "), recipe.effect, recipe.toxicity, recipe.duration]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return matchesGroup && matchesQuery;
    });
  }, [alchemyQuery, recipeFilter]);
  const ingredientSections = [
    {
      title: "Алхимические ингредиенты",
      text: "Травы, минералы и базовые компоненты с указанием субстанции.",
      items: filteredIngredients.filter((ingredient) => ingredient.kind === "Алхимический ингредиент"),
    },
    {
      title: "Трофейные ингредиенты",
      text: "Части монстров и редкие трофеи, из которых вытягиваются алхимические субстанции.",
      items: filteredIngredients.filter((ingredient) => ingredient.kind === "Трофейный ингредиент"),
    },
    {
      title: "Очищенные субстанции",
      text: "Готовые субстанции для формул: Аер, Ребис, Купорос и другие основы.",
      items: filteredIngredients.filter((ingredient) => ingredient.kind === "Очищенная субстанция"),
    },
  ];

  const filteredCraftEntries = useMemo(() => {
    const normalized = craftQuery.trim().toLowerCase();
    if (!normalized) return craftEntries;

    return craftEntries.filter((entry) =>
      [entry.name, entry.group, entry.components.join(" "), entry.effect].join(" ").toLowerCase().includes(normalized),
    );
  }, [craftQuery]);

  const filteredWorldEntries = useMemo(() => {
    const normalized = worldQuery.trim().toLowerCase();

    return worldEntries.filter((entry) => {
      const matchesType = worldTypeFilter === "Все" || entry.type === worldTypeFilter;
      const matchesQuery = !normalized || entry.name.toLowerCase().includes(normalized);

      return matchesType && matchesQuery;
    });
  }, [worldQuery, worldTypeFilter]);

  const parseCombatModifier = (value: string) => {
    const normalized = value.trim().replace(",", ".");
    if (normalized === "" || normalized === "-" || normalized === "+") return 0;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const getCombatStat = (name?: string) => (name ? combatSheet.stats[name] ?? 0 : 0);
  const getCombatSkill = (skills?: string[]) => {
    if (!skills || skills.length === 0) return { name: "", value: 0 };
    const found = skills.find((skill) => combatSheet.skills[skill] !== undefined);
    const skillName = found ?? skills[0];
    return { name: skillName, value: combatSheet.skills[skillName] ?? 0 };
  };
  const currentCombatOptions = combatActionTree[combatStage];
  const selectedCombatSpec = selectedCombatActionId ? combatActionSpecs[selectedCombatActionId] : null;
  const selectedSkill = getCombatSkill(selectedCombatSpec?.skills);
  const accuracyModifier = selectedCombatSpec?.usesAccuracy ? parseCombatModifier(weaponAccuracyInput) : 0;
  const distanceModifier = selectedCombatSpec?.usesDistance ? parseCombatModifier(distanceModifierInput) : 0;
  const sideModifier = parseCombatModifier(sideModifierInput);
  const actionModifier = selectedCombatSpec?.modifier ?? 0;
  const combatBase =
    getCombatStat(selectedCombatSpec?.stat) +
    selectedSkill.value +
    accuracyModifier +
    distanceModifier +
    sideModifier +
    actionModifier;
  const combatFormulaParts = selectedCombatSpec
    ? [
        selectedCombatSpec.stat ? `${selectedCombatSpec.stat} ${getCombatStat(selectedCombatSpec.stat)}` : null,
        selectedSkill.name ? `${selectedSkill.name} ${selectedSkill.value}` : null,
        selectedCombatSpec.usesAccuracy ? `Точ. ${accuracyModifier}` : null,
        selectedCombatSpec.usesDistance ? `Расст. ${distanceModifier}` : null,
        sideModifier !== 0 ? `Проч. ${sideModifier}` : null,
        actionModifier !== 0 ? `Мод. ${actionModifier}` : null,
      ].filter(Boolean)
    : [];
  const getSocialStat = (name?: string) => (name ? socialSheet.stats[name] ?? 0 : 0);
  const getSocialSkill = (skills?: string[]) => {
    if (!skills || skills.length === 0) return { name: "", value: 0 };
    const found = skills.find((skill) => socialSheet.skills[skill] !== undefined);
    const skillName = found ?? skills[0];
    return { name: skillName, value: socialSheet.skills[skillName] ?? 0 };
  };
  const currentSocialOptions = socialActionTree[socialStage];
  const selectedSocialSpec = selectedSocialActionId ? socialActionSpecs[selectedSocialActionId] : null;
  const selectedSocialSkill = getSocialSkill(selectedSocialSpec?.skills);
  const socialModifier = parseCombatModifier(socialModifierInput);
  const socialActionModifier = selectedSocialSpec?.modifier ?? 0;
  const socialBase = selectedSocialSpec?.noRoll
    ? 0
    : getSocialStat(selectedSocialSpec?.stat) + selectedSocialSkill.value + socialModifier + socialActionModifier;
  const socialFormulaParts = selectedSocialSpec
    ? [
        selectedSocialSpec.noRoll ? "Бросок не требуется" : null,
        selectedSocialSpec.stat ? `${selectedSocialSpec.stat} ${getSocialStat(selectedSocialSpec.stat)}` : null,
        selectedSocialSkill.name ? `${selectedSocialSkill.name} ${selectedSocialSkill.value}` : null,
        socialModifier !== 0 ? `Проч. ${socialModifier}` : null,
        socialActionModifier !== 0 ? `Мод. ${socialActionModifier}` : null,
      ].filter(Boolean)
    : [];

  const renderPicker = ({ id, label, value, options, onChange, searchPlaceholder = "Поиск" }: PickerConfig) => {
    const selectedOption = options.find((option) => option.value === value) ?? options[0];
    const isOpen = openPickerId === id;
    const normalizedQuery = pickerQuery.trim().toLowerCase();
    const filteredOptions = normalizedQuery
      ? options.filter((option) =>
          [option.label, option.detail, option.meta].filter(Boolean).join(" ").toLowerCase().includes(normalizedQuery),
        )
      : options;

    return (
      <div className={styles.customPicker}>
        <span className={styles.pickerLabel}>{label}</span>
        <button
          className={styles.pickerTrigger}
          type="button"
          onClick={() => {
            setOpenPickerId(isOpen ? null : id);
            setPickerQuery("");
          }}
        >
          <span>
            {selectedOption?.icon && <b aria-hidden="true">{selectedOption.icon}</b>}
            <strong>{selectedOption?.label ?? "Не выбрано"}</strong>
            {selectedOption?.detail && <small>{selectedOption.detail}</small>}
          </span>
          {selectedOption?.meta && <em>{selectedOption.meta}</em>}
        </button>

        {isOpen && (
          <div className={styles.pickerPopover}>
            <input
              autoFocus
              value={pickerQuery}
              onChange={(event) => setPickerQuery(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
            />
            <div className={styles.pickerOptions}>
              {filteredOptions.length === 0 ? (
                <p>Ничего не найдено.</p>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    className={option.value === value ? styles.pickerOptionActive : ""}
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpenPickerId(null);
                      setPickerQuery("");
                    }}
                  >
                    <span>
                      {option.icon && <b aria-hidden="true">{option.icon}</b>}
                      <strong>{option.label}</strong>
                      {option.detail && <small>{option.detail}</small>}
                    </span>
                    {option.meta && <em>{option.meta}</em>}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const patchCreature = (patch: Partial<Creature>) => {
    setCreatures((current) =>
      current.map((creature) => (creature.id === activeCreature.id ? { ...creature, ...patch } : creature)),
    );
  };

  const setStat = (name: string, value: number) => {
    patchCreature({ stats: { ...activeCreature.stats, [name]: value } });
  };

  const setArmor = (part: BodyPart, value: number) => {
    patchCreature({ armor: { ...activeCreature.armor, [part]: Math.max(0, value) } });
  };

  const setHealth = (value: string) => {
    if (!/^\d*$/.test(value)) return;
    setHealthInput(value);
    if (value !== "") setStat("ПЗ", Number(value));
  };

  const setStamina = (value: string) => {
    if (!/^\d*$/.test(value)) return;
    setStaminaInput(value);
    if (value !== "") setStat("Вын", Number(value));
  };

  const rollCheck = (label: string, base: number) => {
    const die = rollD10();
    const total = base + die;
    const note = die === 10 ? "Возможный взрывной бросок" : die === 1 ? "Проверь осложнение" : "Обычная проверка";

    setRolls((current) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        label,
        formula: `${base} + d10(${die})`,
        total,
        note,
      },
      ...current.slice(0, 7),
    ]);
  };

  const selectCreature = (creatureId: string) => {
    setActiveId(creatureId);
    setHealthInput(null);
    setStaminaInput(null);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const duplicateCreature = () => {
    const creature = cloneCreature(activeCreature, creatures.map((item) => item.name));
    setCreatures((current) => [...current, creature]);
    setActiveId(creature.id);
  };

  const selectCombatOption = (option: CombatActionOption) => {
    setCombatSimulation(null);
    if (option.next) {
      setCombatStageHistory((current) => [...current, combatStage]);
      setCombatStage(option.next);
      setSelectedCombatActionId(null);
      return;
    }

    if (option.actionId) setSelectedCombatActionId(option.actionId);
  };

  const goBackCombatStage = () => {
    setCombatSimulation(null);
    setSelectedCombatActionId(null);
    setCombatStageHistory((current) => {
      const nextHistory = [...current];
      const previous = nextHistory.pop();
      setCombatStage(previous ?? "root");
      return nextHistory;
    });
  };

  const resetCombatTree = () => {
    setCombatStage("root");
    setCombatStageHistory([]);
    setSelectedCombatActionId(null);
    setCombatSimulation(null);
  };

  const simulateCombatAction = () => {
    if (!selectedCombatSpec) return;
    const die = rollD10();
    const total = combatBase + die;
    setCombatSimulation({ die, total, actionTitle: selectedCombatSpec.title });
    setRolls((current) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        label: `${combatSheet.name}: ${selectedCombatSpec.title}`,
        formula: `${combatFormulaParts.join(" + ")} + d10(${die})`,
        total,
        note: `Симуляция хода 3 секунды. ${selectedCombatSpec.result}`,
      },
      ...current.slice(0, 7),
    ]);
  };

  const selectSocialOption = (option: SocialActionOption) => {
    setSocialSimulation(null);
    if (option.next) {
      setSocialStageHistory((current) => [...current, socialStage]);
      setSocialStage(option.next);
      setSelectedSocialActionId(null);
      return;
    }

    if (option.actionId) setSelectedSocialActionId(option.actionId);
  };

  const goBackSocialStage = () => {
    setSocialSimulation(null);
    setSelectedSocialActionId(null);
    setSocialStageHistory((current) => {
      const nextHistory = [...current];
      const previous = nextHistory.pop();
      setSocialStage(previous ?? "root");
      return nextHistory;
    });
  };

  const resetSocialTree = () => {
    setSocialStage("root");
    setSocialStageHistory([]);
    setSelectedSocialActionId(null);
    setSocialSimulation(null);
  };

  const simulateSocialAction = () => {
    if (!selectedSocialSpec) return;
    const die = selectedSocialSpec.noRoll ? null : rollD10();
    const total = selectedSocialSpec.noRoll ? 0 : socialBase + (die ?? 0);
    setSocialSimulation({ die, total, actionTitle: selectedSocialSpec.title });
    setRolls((current) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        label: `${socialSheet.name}: ${selectedSocialSpec.title}`,
        formula: selectedSocialSpec.noRoll ? "Без броска" : `${socialFormulaParts.join(" + ")} + d10(${die})`,
        total,
        note: `Раунд словесной дуэли. ${selectedSocialSpec.effect}`,
      },
      ...current.slice(0, 7),
    ]);
  };

  const setFormField = <Key extends keyof CreatureForm>(key: Key, value: CreatureForm[Key]) => {
    setCreatureForm((current) => ({ ...current, [key]: value }));
  };

  const setFormStat = (name: string, value: number) => {
    setCreatureForm((current) => ({
      ...current,
      stats: {
        ...current.stats,
        [name]: value,
      },
    }));
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
  };

  const saveNewCreature = () => {
    const creature = createCreatureFromForm(creatureForm);
    setCreatures((current) => [...current, creature]);
    setActiveId(creature.id);
    setQuery("");
    setCreatureForm(emptyCreatureForm);
    setIsAddModalOpen(false);
  };

  return (
    <main className={styles.shell}>
      <section className={styles.hero} aria-label="Навигация по справочнику">
        <nav className={styles.pageNav} aria-label="Разделы справочника">
          {[
            ["monsters", "Монстры"],
            ["combat", "Бой"],
            ["social", "Дуэль"],
            ["alchemy", "Алхимия"],
            ["craft", "Ремесло"],
            ["world", "Мир"],
          ].map(([page, label]) => (
            <a
              className={activePage === page ? styles.pageNavActive : ""}
              href={`#${page}`}
              key={page}
              onClick={(event) => {
                event.preventDefault();
                setActivePage(page as AppPage);
                window.requestAnimationFrame(() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                });
              }}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className={styles.heroIntro}>
          <div className={styles.heroMark} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <p className={styles.eyebrow}>The Witcher TTRPG</p>
            <h1>{pageMeta[activePage].title}</h1>
            <p className={styles.heroText}>{pageMeta[activePage].text}</p>
          </div>
        </div>
        <div className={styles.heroControls}>
          {activePage === "monsters" && (
            <div className={styles.searchPanel}>
            <div className={styles.searchRow}>
              <label className={styles.topSearchLabel}>
                Поиск
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Имя монстра"
                />
              </label>
              <button className={styles.iconAction} type="button" onClick={() => setIsAddModalOpen(true)} title="Добавить монстра">
                +
              </button>
              <button className={styles.secondaryAction} type="button" onClick={duplicateCreature}>
                Дублировать
              </button>
            </div>

            <div className={styles.filterRow}>
              <div className={styles.filterGroup}>
                <span>Категория</span>
                <div className={`${styles.filterChips} ${styles.categoryChips}`}>
                  {categoryOptions.map((category) => (
                    <button
                      className={categoryFilter === category ? styles.filterChipActive : ""}
                      key={category}
                      type="button"
                      onClick={() => setCategoryFilter(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`${styles.filterGroup} ${styles.dangerFilterGroup}`}>
                <span>Опасность</span>
                <div className={styles.filterChips}>
                  {(["Все", "Низкая", "Средняя", "Высокая"] as Array<Creature["danger"] | "Все">).map((danger) => (
                    <button
                      className={dangerFilter === danger ? styles.filterChipActive : ""}
                      key={danger}
                      type="button"
                      onClick={() => setDangerFilter(danger)}
                    >
                      {danger}
                    </button>
                  ))}
                </div>
              </div>

              <small className={styles.filterCount}>Найдено: {filteredCreatures.length}</small>
            </div>
          </div>
          )}
          {activePage === "alchemy" && (
            <div className={styles.searchPanel}>
              <div className={styles.alchemySearchRow}>
                <label className={styles.topSearchLabel}>
                  Поиск
                  <input
                    value={alchemyQuery}
                    onChange={(event) => setAlchemyQuery(event.target.value)}
                    placeholder="Название ингредиента, мутагена, рецепта или компонента"
                  />
                </label>
                <small className={styles.filterCount}>
                  Найдено: {filteredIngredients.length + filteredMutagens.length + filteredRecipes.length}
                </small>
              </div>
              <div className={styles.filterGroup}>
                <span>Рецепты</span>
                <div className={styles.filterChips}>
                  {recipeGroups.map((group) => (
                    <button
                      className={recipeFilter === group ? styles.filterChipActive : ""}
                      key={group}
                      type="button"
                      onClick={() => setRecipeFilter(group)}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {activePage === "craft" && (
            <div className={styles.searchPanel}>
              <div className={styles.alchemySearchRow}>
                <label className={styles.topSearchLabel}>
                  Поиск
                  <input
                    value={craftQuery}
                    onChange={(event) => setCraftQuery(event.target.value)}
                    placeholder="Броня, усиление, глиф или компонент"
                  />
                </label>
                <small className={styles.filterCount}>Найдено: {filteredCraftEntries.length}</small>
              </div>
            </div>
          )}
          {activePage === "world" && (
            <div className={styles.searchPanel}>
              <div className={styles.alchemySearchRow}>
                <label className={styles.topSearchLabel}>
                  Поиск
                  <input
                    value={worldQuery}
                    onChange={(event) => setWorldQuery(event.target.value)}
                    placeholder="Название страны, города или региона"
                  />
                </label>
                <small className={styles.filterCount}>Найдено: {filteredWorldEntries.length}</small>
              </div>
              <div className={styles.filterGroup}>
                <span>Тип</span>
                <div className={styles.filterChips}>
                  {(["Все", "Страна", "Город", "Регион", "Острова"] as const).map((type) => (
                    <button
                      className={worldTypeFilter === type ? styles.filterChipActive : ""}
                      key={type}
                      type="button"
                      onClick={() => setWorldTypeFilter(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {activePage === "monsters" && (
      <div className={styles.workspace}>
        <aside className={styles.sidebar}>
          <div className={styles.creatureList}>
            {filteredCreatures.map((creature) => (
              <button
                className={`${styles.creatureButton} ${creature.id === activeCreature.id ? styles.activeCreature : ""}`}
                key={creature.id}
                type="button"
                onClick={() => selectCreature(creature.id)}
              >
                <span>{creature.name}</span>
                <small>{creature.category} · {creature.danger}</small>
              </button>
            ))}
          </div>
        </aside>

        <article className={styles.sheet}>
          <header className={styles.sheetHeader}>
            <div>
              <input
                className={styles.titleInput}
                value={activeCreature.name}
                onChange={(event) => patchCreature({ name: event.target.value })}
                aria-label="Название существа"
              />
              <div className={styles.tags}>
                <span>{activeCreature.category}</span>
                <span>Опасность: {activeCreature.danger}</span>
                <span>{activeCreature.habitat}</span>
              </div>
            </div>
            <div className={styles.healthBadge} aria-label="Пункты здоровья и выносливость">
              <span className={styles.vitalStat}>
                <span className={styles.healthTopLine}>
                  <small>ПЗ</small>
                  {activeCreatureEffects.length > 0 && (
                    <span className={styles.healthEffects} aria-label="Активные эффекты">
                      {activeCreatureEffects.map((effect) => {
                        const definition = combatEffects[effect.effectId];

                        return (
                          <span key={effect.id} title={`${definition.name}: ${definition.description}`}>
                            {definition.icon}
                          </span>
                        );
                      })}
                    </span>
                  )}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={displayedHealth}
                  onChange={(event) => setHealth(event.target.value)}
                  onBlur={() => setHealthInput(null)}
                  onFocus={(event) => {
                    setHealthInput(String(activeCreature.stats.ПЗ ?? 0));
                    event.target.select();
                  }}
                  aria-label="Пункты здоровья"
                />
              </span>
              <span className={styles.vitalStat}>
                <small>Вын</small>
                <input
                  type="text"
                  inputMode="numeric"
                  value={displayedStamina}
                  onChange={(event) => setStamina(event.target.value)}
                  onBlur={() => setStaminaInput(null)}
                  onFocus={(event) => {
                    setStaminaInput(String(activeCreature.stats.Вын ?? 0));
                    event.target.select();
                  }}
                  aria-label="Выносливость"
                />
              </span>
            </div>
          </header>

          <div className={styles.summaryGrid}>
            <label>
              Описание
              <textarea
                value={activeCreature.description}
                onChange={(event) => patchCreature({ description: event.target.value })}
              />
            </label>
            <div className={styles.tacticalNotes}>
              <div>
                <span>Уязвимость</span>
                <p>{activeCreature.vulnerability}</p>
              </div>
              <div>
                <span>Поведение в бою</span>
                <p>{activeCreature.tactic}</p>
              </div>
            </div>
          </div>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Параметры</h2>
              <p>Нажми на значение, чтобы бросить d10.</p>
            </div>
            <div className={styles.statGrid}>
              {statOrder.map((name) => (
                <label className={styles.statCell} key={name}>
                  <span>{name}</span>
                  <input
                    type="number"
                    value={activeCreature.stats[name] ?? 0}
                    onChange={(event) => setStat(name, Number(event.target.value))}
                  />
                  <button type="button" onClick={() => rollCheck(name, activeCreature.stats[name] ?? 0)}>
                    d10
                  </button>
                </label>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Навыки</h2>
              <p>Базы для атак, защиты и проверок сцены.</p>
            </div>
            <div className={styles.skillGrid}>
              {Object.entries(activeCreature.skills).map(([name, value]) => (
                <button className={styles.skillButton} key={name} type="button" onClick={() => rollCheck(name, value)}>
                  <span>
                    {name}
                    <small className={styles.skillMeta}>({getSkillDependency(name)})</small>
                  </span>
                  <strong>{value}</strong>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Броня по зонам</h2>
              <p>Клик по зоне снимает 1 пункт брони.</p>
            </div>
            <div className={styles.armorGrid}>
              {(Object.keys(bodyPartLabels) as BodyPart[]).map((part) => (
                <button
                  key={part}
                  className={styles.armorPart}
                  type="button"
                  onClick={() => setArmor(part, activeCreature.armor[part] - 1)}
                >
                  <span>{bodyPartLabels[part]}</span>
                  <strong>{activeCreature.armor[part]}</strong>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Атаки</h2>
              <p>Бросок атаки использует базу строки.</p>
            </div>
            <div className={styles.attackList}>
              {activeCreature.attacks.map((attack) => (
                <button className={styles.attackRow} key={attack.id} type="button" onClick={() => rollCheck(attack.name, attack.base)}>
                  <span>
                    <strong>{attack.name}</strong>
                    <small>{attack.range} · {attack.effect}</small>
                  </span>
                  <span>{attack.damage}</span>
                  <b>{attack.base}</b>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Добыча</h2>
              <p>Монеты, мутагены, реагенты, оружие и броня.</p>
            </div>
            <div className={styles.lootGrid}>
              {[
                ["Монеты", activeCreatureLoot.coins],
                ["Мутагены", activeCreatureLoot.mutagens],
                ["Алхимические реагенты", activeCreatureLoot.alchemicalIngredients],
                ["Оружие", activeCreatureLoot.weapons],
                ["Броня", activeCreatureLoot.armor],
              ].map(([label, items]) => (
                <div className={styles.lootCard} key={label as string}>
                  <span>{label as string}</span>
                  <ul>
                    {(items as string[]).map((item) => {
                      const note = describeLootItem(item);

                      return (
                        <li key={item}>
                          <strong>{item}</strong>
                          {note && <small>{note}</small>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Особенности</h2>
              <p>Короткие подсказки для ведения сцены.</p>
            </div>
            <ul className={styles.abilityList}>
              {activeCreature.abilities.map((ability) => (
                <li key={ability}>{ability}</li>
              ))}
            </ul>
          </section>
        </article>

      </div>
      )}

      {activePage === "combat" && (
        <div className={styles.combatFlowPage}>
          <section className={styles.combatSheetPanel}>
            <div className={styles.sectionHeader}>
              <h2>Лист для расчета</h2>
              <p>Выбирается только набор характеристик и навыков.</p>
            </div>
            {renderPicker({
              id: "combat-sheet",
              label: "Лист",
              value: combatSheet.id,
              options: creaturePickerOptions,
              onChange: (value) => {
                setCombatSheetId(value);
                setCombatSimulation(null);
              },
              searchPlaceholder: "Найти лист по имени",
            })}
            <div className={styles.combatSheetStats}>
              {["Реа", "Лвк", "Воля", "Эмп", "Тел", "Бег", "Скор", "Вын"].map((stat) => (
                <span key={stat}>
                  {stat}
                  <strong>{combatSheet.stats[stat] ?? 0}</strong>
                </span>
              ))}
            </div>
          </section>

          <section className={styles.combatTreePanel}>
            <div className={styles.combatTreeHeader}>
              <div>
                <span>Ход: 3 секунды</span>
                <h2>{combatStage === "root" ? "Выбери действие" : "Выбери следующий шаг"}</h2>
              </div>
              <div className={styles.combatTreeTools}>
                <button type="button" onClick={goBackCombatStage} disabled={combatStageHistory.length === 0}>
                  Назад
                </button>
                <button type="button" onClick={resetCombatTree}>
                  Сначала
                </button>
              </div>
            </div>

            <div className={styles.combatOptionGraph}>
              {currentCombatOptions.map((option) => (
                <button
                  className={selectedCombatActionId === option.actionId ? styles.combatOptionActive : ""}
                  key={option.id}
                  type="button"
                  onClick={() => selectCombatOption(option)}
                >
                  <b>{option.icon}</b>
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.detail}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.combatCalcPanel}>
            <div className={styles.sectionHeader}>
              <h2>Основа действия</h2>
              <p>Параметр + навык + точность + модификаторы.</p>
            </div>

            {selectedCombatSpec ? (
              <>
                <article className={styles.combatResultCard}>
                  <header>
                    <span>{selectedCombatSpec.group}</span>
                    <strong>{selectedCombatSpec.title}</strong>
                  </header>
                  <div className={styles.combatFormula}>
                    {combatFormulaParts.length > 0 ? combatFormulaParts.map((part) => <b key={part}>{part}</b>) : <b>Без броска основы</b>}
                  </div>
                  <div className={styles.combatBaseTotal}>
                    <span>Основа</span>
                    <strong>{combatBase}</strong>
                  </div>
                  <p>{selectedCombatSpec.result}</p>
                  <small>{selectedCombatSpec.note}</small>
                </article>

                <div className={styles.combatModifierGrid}>
                  <label>
                    Точность
                    <input value={weaponAccuracyInput} onChange={(event) => setWeaponAccuracyInput(event.target.value)} inputMode="numeric" />
                  </label>
                  <label>
                    Расстояние
                    <input value={distanceModifierInput} onChange={(event) => setDistanceModifierInput(event.target.value)} inputMode="numeric" />
                  </label>
                  <label>
                    Прочее
                    <input value={sideModifierInput} onChange={(event) => setSideModifierInput(event.target.value)} inputMode="numeric" />
                  </label>
                </div>

                <button className={styles.combatSimButton} type="button" onClick={simulateCombatAction}>
                  Симулировать 3 секунды
                </button>

                {combatSimulation && (
                  <div className={styles.combatSimulation}>
                    <span>d10: {combatSimulation.die}</span>
                    <strong>{combatSimulation.total}</strong>
                    <small>{combatSimulation.actionTitle}</small>
                  </div>
                )}
              </>
            ) : (
              <p className={styles.emptyLog}>Выбери конечное действие в дереве.</p>
            )}
          </section>

          <section className={styles.combatFlowPanel}>
            <div className={styles.sectionHeader}>
              <h2>Порядок проверки</h2>
              <p>Короткая схема после броска.</p>
            </div>
            <ol className={styles.combatFlowList}>
              <li>Брось атаку или защиту: основа + d10.</li>
              <li>1 на d10: критический промах; 10: переброс.</li>
              <li>Примени способности и модификаторы.</li>
              <li>Если атака больше защиты — проверь разницу.</li>
              <li>7+/10+/13+/15+ дают бонус урона и крит.</li>
              <li>Определи зону, вычти ПБ, примени множитель зоны.</li>
              <li>Если урон выше 0 — снизь ПЗ и ПБ на 1.</li>
            </ol>
          </section>
        </div>
      )}

      {activePage === "social" && (
        <div className={styles.combatFlowPage}>
          <section className={styles.combatSheetPanel}>
            <div className={styles.sectionHeader}>
              <h2>Лист для дуэли</h2>
              <p>Характеристики и навыки для словесной основы.</p>
            </div>
            {renderPicker({
              id: "social-sheet",
              label: "Лист",
              value: socialSheet.id,
              options: creaturePickerOptions,
              onChange: (value) => {
                setSocialSheetId(value);
                setSocialSimulation(null);
              },
              searchPlaceholder: "Найти лист по имени",
            })}
            <div className={styles.combatSheetStats}>
              {["Эмп", "Инт", "Воля", "Реа", "Харизма", "Убеждение", "Обман", "Этикет"].map((stat) => (
                <span key={stat}>
                  {stat}
                  <strong>{socialSheet.stats[stat] ?? socialSheet.skills[stat] ?? 0}</strong>
                </span>
              ))}
            </div>
          </section>

          <section className={styles.combatTreePanel}>
            <div className={styles.combatTreeHeader}>
              <div>
                <span>Раунд спора</span>
                <h2>{socialStage === "root" ? "Выбери ход" : "Выбери прием"}</h2>
              </div>
              <div className={styles.combatTreeTools}>
                <button type="button" onClick={goBackSocialStage} disabled={socialStageHistory.length === 0}>
                  Назад
                </button>
                <button type="button" onClick={resetSocialTree}>
                  Сначала
                </button>
              </div>
            </div>

            <div className={styles.combatOptionGraph}>
              {currentSocialOptions.map((option) => (
                <button
                  className={selectedSocialActionId === option.actionId ? styles.combatOptionActive : ""}
                  key={option.id}
                  type="button"
                  onClick={() => selectSocialOption(option)}
                >
                  <b>{option.icon}</b>
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.detail}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.combatCalcPanel}>
            <div className={styles.sectionHeader}>
              <h2>Основа дуэли</h2>
              <p>Параметр + социальный навык + модификатор.</p>
            </div>

            {selectedSocialSpec ? (
              <>
                <article className={styles.combatResultCard}>
                  <header>
                    <span>{selectedSocialSpec.group}</span>
                    <strong>{selectedSocialSpec.title}</strong>
                  </header>
                  <div className={styles.combatFormula}>
                    {socialFormulaParts.length > 0 ? socialFormulaParts.map((part) => <b key={part}>{part}</b>) : <b>Без броска основы</b>}
                  </div>
                  <div className={styles.combatBaseTotal}>
                    <span>Основа</span>
                    <strong>{selectedSocialSpec.noRoll ? "—" : socialBase}</strong>
                  </div>
                  <p>{selectedSocialSpec.effect}</p>
                  <small>Урон: {selectedSocialSpec.damage}. {selectedSocialSpec.note}</small>
                </article>

                <div className={styles.combatModifierGrid}>
                  <label>
                    Прочий модификатор
                    <input value={socialModifierInput} onChange={(event) => setSocialModifierInput(event.target.value)} inputMode="numeric" />
                  </label>
                </div>

                <button className={styles.combatSimButton} type="button" onClick={simulateSocialAction}>
                  Симулировать раунд
                </button>

                {socialSimulation && (
                  <div className={styles.combatSimulation}>
                    <span>{socialSimulation.die === null ? "без d10" : `d10: ${socialSimulation.die}`}</span>
                    <strong>{socialSimulation.die === null ? "—" : socialSimulation.total}</strong>
                    <small>{socialSimulation.actionTitle}</small>
                  </div>
                )}
              </>
            ) : (
              <p className={styles.emptyLog}>Выбери конечное действие в дереве.</p>
            )}
          </section>

          <section className={styles.combatFlowPanel}>
            <div className={styles.sectionHeader}>
              <h2>Порядок дуэли</h2>
              <p>Короткая памятка для раунда.</p>
            </div>
            <ol className={styles.combatFlowList}>
              <li>Выбери атаку, защиту или рычаг давления.</li>
              <li>Собери основу: параметр + навык + модификаторы.</li>
              <li>Брось d10, если действие требует проверки.</li>
              <li>Сравни встречные проверки участников спора.</li>
              <li>Защита может игнорировать, сменить тему, прекратить спор или дать контраргумент.</li>
              <li>Рычаг давления занимает полный ход, но дает бонусы или штрафы дальше.</li>
              <li>Контраргумент отменяет первую атаку, если его результат выше.</li>
            </ol>
          </section>
        </div>
      )}

      {activePage === "alchemy" && (
        <div className={styles.catalogPage}>
          {recipeFilter === "Все" && (
            <>
              {ingredientSections.map((section) => (
                section.items.length > 0 && (
                  <section className={styles.catalogBand} key={section.title}>
                    <div className={styles.sectionHeader}>
                      <h2>{section.title}</h2>
                      <p>{section.text}</p>
                    </div>
                    <div className={styles.catalogGrid}>
                      {section.items.map((ingredient) => (
                        <article className={styles.catalogCard} key={`${ingredient.name}-${ingredient.substance}`}>
                          <header>
                            <span>{ingredient.kind}</span>
                            <strong>{ingredient.name}</strong>
                          </header>
                          <div className={styles.pillRow}>
                            <b>{ingredient.substance}</b>
                            <em>{ingredient.source}</em>
                          </div>
                          <p>{ingredient.note}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                )
              ))}

              <section className={styles.catalogBand}>
                <div className={styles.sectionHeader}>
                  <h2>Мутагены</h2>
                  <p>Отдельная алхимическая основа для отваров из конкретных типов монстров.</p>
                </div>
                <div className={styles.catalogGrid}>
                  {filteredMutagens.map((mutagen) => (
                    <article className={styles.catalogCard} key={mutagen.name}>
                      <header>
                        <span>{mutagen.substance}</span>
                        <strong>{mutagen.name}</strong>
                      </header>
                      <div className={styles.pillRow}>
                        <b>{mutagen.substance}</b>
                        <em>{mutagen.creatureType}</em>
                      </div>
                      <p>{mutagen.source}</p>
                      <small>{mutagen.use}</small>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}

          <section className={styles.catalogBand}>
            <div className={styles.sectionHeader}>
              <h2>Рецепты</h2>
              <p>Алхимические составы, слабые и ведьмачьи эликсиры, масла для мечей и отвары.</p>
            </div>
            <div className={styles.recipeGrid}>
              {filteredRecipes.map((recipe) => (
                <article className={styles.recipeCard} key={`${recipe.group}-${recipe.name}`}>
                  <header>
                    <span>{recipe.group}</span>
                    <strong>{recipe.name}</strong>
                  </header>
                  <div className={styles.recipeStats}>
                    <span>
                      СЛ
                      <b>{recipe.difficulty}</b>
                    </span>
                    <span>
                      Время
                      <b>{recipe.time}</b>
                    </span>
                    <span>
                      Токс.
                      <b>{recipe.toxicity}</b>
                    </span>
                    <span>
                      Длит.
                      <b>{recipe.duration}</b>
                    </span>
                    {recipe.price && (
                      <span>
                        Цена
                        <b>{recipe.price}</b>
                      </span>
                    )}
                  </div>
                  <div className={styles.componentsBlock}>
                    <span>Компоненты</span>
                    <div className={styles.pillRow}>
                      {recipe.components.map((component) => (
                        <b key={component}>{component}</b>
                      ))}
                    </div>
                  </div>
                  <p>{recipe.effect}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {activePage === "craft" && (
        <div className={styles.catalogPage}>
          <section className={styles.catalogBand}>
            <div className={styles.sectionHeader}>
              <h2>Ремесло</h2>
              <p>Броня, усиления, глифы и ведьмачьи предметы.</p>
            </div>
            <div className={styles.recipeGrid}>
              {filteredCraftEntries.map((entry) => (
                <article className={styles.recipeCard} key={`${entry.group}-${entry.name}`}>
                  <header>
                    <span>{entry.group}</span>
                    <strong>{entry.name}</strong>
                  </header>
                  <div className={styles.componentsBlock}>
                    <span>Материалы</span>
                    <div className={styles.pillRow}>
                      {entry.components.map((component) => (
                        <b key={component}>{component}</b>
                      ))}
                    </div>
                  </div>
                  <p>{entry.effect}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {activePage === "world" && (
        <div className={styles.catalogPage}>
          <section className={styles.catalogBand}>
            <div className={styles.sectionHeader}>
              <h2>Страны и города</h2>
              <p>Политика, культы, торговля и зацепки.</p>
            </div>
            <div className={styles.worldGrid}>
              {filteredWorldEntries.map((entry) => (
                <article className={styles.worldCard} key={entry.name}>
                  <header>
                    <span>{entry.type}</span>
                    <strong>{entry.name}</strong>
                  </header>
                  <p>{entry.description}</p>
                  <div className={styles.worldFacts}>
                    <div>
                      <span>Расположение</span>
                      <p>{entry.location}</p>
                    </div>
                    <div>
                      <span>Политика</span>
                      <p>{entry.politics}</p>
                    </div>
                    <div>
                      <span>Религия и культы</span>
                      <p>{entry.religion}</p>
                    </div>
                    <div>
                      <span>Торговля</span>
                      <p>{entry.trade}</p>
                    </div>
                  </div>
                  <div className={styles.componentsBlock}>
                    <span>Зацепки</span>
                    <div className={styles.pillRow}>
                      {entry.hooks.map((hook) => (
                        <em key={hook}>{hook}</em>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {isAddModalOpen && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={closeAddModal}>
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-creature-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Новая запись</p>
                <h2 id="add-creature-title">Добавить монстра</h2>
              </div>
              <button className={styles.closeButton} type="button" onClick={closeAddModal} aria-label="Закрыть">
                x
              </button>
            </header>

            <div className={styles.modalBody}>
              <section className={styles.formSection}>
                <h3>Основное</h3>
                <div className={styles.formGrid}>
                  <label>
                    Имя
                    <input value={creatureForm.name} onChange={(event) => setFormField("name", event.target.value)} />
                  </label>
                  <label>
                    Тип
                    <input value={creatureForm.category} onChange={(event) => setFormField("category", event.target.value)} />
                  </label>
                  <label>
                    Опасность
                    <select
                      value={creatureForm.danger}
                      onChange={(event) => setFormField("danger", event.target.value as Creature["danger"])}
                    >
                      <option>Низкая</option>
                      <option>Средняя</option>
                      <option>Высокая</option>
                    </select>
                  </label>
                  <label>
                    Броня
                    <input
                      type="number"
                      value={creatureForm.armorValue}
                      onChange={(event) => setFormField("armorValue", Number(event.target.value) || 0)}
                    />
                  </label>
                  <label>
                    Среда
                    <input value={creatureForm.habitat} onChange={(event) => setFormField("habitat", event.target.value)} />
                  </label>
                  <label>
                    Уязвимость
                    <input
                      value={creatureForm.vulnerability}
                      onChange={(event) => setFormField("vulnerability", event.target.value)}
                    />
                  </label>
                </div>
              </section>

              <section className={styles.formSection}>
                <h3>Параметры</h3>
                <div className={styles.formStatGrid}>
                  {statOrder.map((stat) => (
                    <label key={stat}>
                      <span>{stat}</span>
                      <input
                        type="number"
                        value={creatureForm.stats[stat] ?? 0}
                        onChange={(event) => setFormStat(stat, Number(event.target.value) || 0)}
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className={styles.formSection}>
                <h3>Текстовые блоки</h3>
                <div className={styles.formGrid}>
                  <label className={styles.wideField}>
                    Описание
                    <textarea
                      value={creatureForm.description}
                      onChange={(event) => setFormField("description", event.target.value)}
                    />
                  </label>
                  <label className={styles.wideField}>
                    Поведение в бою
                    <textarea value={creatureForm.tactic} onChange={(event) => setFormField("tactic", event.target.value)} />
                  </label>
                </div>
              </section>

              <section className={styles.formSection}>
                <h3>Навыки, атаки и особенности</h3>
                <div className={styles.formGrid}>
                  <label className={styles.wideField}>
                    Навыки
                    <textarea
                      value={creatureForm.skillsText}
                      onChange={(event) => setFormField("skillsText", event.target.value)}
                    />
                    <small>Формат: `Навык: значение`, каждая запись с новой строки.</small>
                  </label>
                  <label className={styles.wideField}>
                    Атаки
                    <textarea
                      value={creatureForm.attacksText}
                      onChange={(event) => setFormField("attacksText", event.target.value)}
                    />
                    <small>Формат: `Название | база | урон | дистанция | эффект`.</small>
                  </label>
                  <label className={styles.wideField}>
                    Особенности
                    <textarea
                      value={creatureForm.abilitiesText}
                      onChange={(event) => setFormField("abilitiesText", event.target.value)}
                    />
                    <small>Каждая особенность с новой строки.</small>
                  </label>
                </div>
              </section>
            </div>

            <footer className={styles.modalActions}>
              <button className={styles.secondaryAction} type="button" onClick={closeAddModal}>
                Отмена
              </button>
              <button className={styles.primaryAction} type="button" onClick={saveNewCreature}>
                Добавить в бестиарий
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
