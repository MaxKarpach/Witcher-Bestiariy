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

type CombatantRole = "attacker" | "defender";
type CombatMode = "closed" | "attack" | "defense";
type AppPage = "monsters" | "alchemy" | "craft" | "world";
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

const effectOrder = Object.keys(combatEffects) as EffectId[];

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

const bodyPartLabels: Record<BodyPart, string> = {
  head: "Голова",
  torso: "Корпус",
  rightArm: "Правая рука",
  leftArm: "Левая рука",
  rightLeg: "Правая нога",
  leftLeg: "Левая нога",
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

function rollDamageFormula(formula: string) {
  const normalized = formula.trim().toLowerCase().replace(/\s+/g, "");
  const match = normalized.match(/^(\d*)d(\d+)([+-]\d+)?$/);

  if (!match) {
    const fixed = Number.parseInt(normalized, 10);
    return {
      total: Number.isNaN(fixed) ? 0 : fixed,
      detail: Number.isNaN(fixed) ? "0" : String(fixed),
    };
  }

  const diceCount = Number(match[1] || 1);
  const sides = Number(match[2]);
  const modifier = Number(match[3] || 0);
  const rolls = Array.from({ length: diceCount }, () => Math.floor(Math.random() * sides) + 1);
  const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;
  const modifierText = modifier === 0 ? "" : modifier > 0 ? `+${modifier}` : String(modifier);

  return {
    total,
    detail: `${rolls.join("+")}${modifierText}`,
  };
}

function getAverageArmor(creature: Creature) {
  const values = Object.values(creature.armor);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function getDefenseBase(creature: Creature) {
  return creature.skills["Уклонение/Изворотливость"] ?? creature.skills["Уклонение"] ?? creature.skills.Борьба ?? creature.stats.Реа ?? 0;
}

function getDefenseOptions(creature: Creature) {
  const options = [
    ["Уклонение/Изворотливость", creature.skills["Уклонение/Изворотливость"]],
    ["Уклонение", creature.skills["Уклонение"]],
    ["Борьба", creature.skills.Борьба],
    ["Блокирование", creature.skills.Блокирование],
    ["Стойкость", creature.skills.Стойкость],
    ["Реакция", creature.stats.Реа],
  ] as Array<[string, number | undefined]>;

  return options.filter(([, value]) => typeof value === "number").map(([name, value]) => ({ name, value: value ?? 0 }));
}

function getDefenseValue(creature: Creature, defenseName: string) {
  return getDefenseOptions(creature).find((option) => option.name === defenseName)?.value ?? getDefenseBase(creature);
}

function findEffectChance(text: string, words: RegExp) {
  const match = text.match(new RegExp(`(${words.source})[^0-9]{0,24}(\\d{1,3})\\s*%`, "i"));
  if (!match) return 100;
  return Math.min(100, Math.max(0, Number(match[2])));
}

function detectEffectTriggers(effectText: string): Array<{ effectId: EffectId; chance: number }> {
  const text = effectText.toLowerCase();
  const patterns: Array<[EffectId, RegExp]> = [
    ["burning", /горен|огонь|подж|burn|fire/],
    ["disorientation", /дезориент|disorient/],
    ["poisoning", /яд|отрав|poison|toxic/],
    ["bleeding", /кров|bleed/],
    ["frozen", /замор|замер|лед|л[её]д|froz|freeze/],
    ["stunned", /ошелом|оглуш|stun/],
    ["intoxication", /опьян|intox/],
    ["hallucination", /галлюц|halluc/],
    ["nausea", /тошнот|nausea/],
    ["suffocation", /удуш|задых|suffocat/],
    ["blindness", /слеп|blind/],
  ];

  return patterns
    .filter(([, pattern]) => pattern.test(text))
    .map(([effectId, pattern]) => ({
      effectId,
      chance: findEffectChance(text, pattern),
    }));
}

function getEffectModifier(effects: ActiveCombatEffect[], kind: "attackModifier" | "defenseModifier") {
  return effects.reduce((sum, effect) => sum + combatEffects[effect.effectId][kind], 0);
}

function getRoundEffectDamage(effects: ActiveCombatEffect[]) {
  return effects.reduce((sum, effect) => sum + combatEffects[effect.effectId].damagePerRound, 0);
}

function getEffectRoundDamageForCreature(creature: Creature, effect: ActiveCombatEffect) {
  if (effect.effectId !== "burning") return combatEffects[effect.effectId].damagePerRound;
  const burningParts = effect.burningParts?.length ? effect.burningParts : ([...Object.keys(bodyPartLabels)] as BodyPart[]);

  return burningParts.reduce((sum, part) => sum + Math.max(0, combatEffects.burning.damagePerRound - (creature.armor[part] ?? 0)), 0);
}

function hasEffect(effects: ActiveCombatEffect[], effectId: EffectId) {
  return effects.some((effect) => effect.effectId === effectId);
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

function getTriggeredEffects(effectText: string) {
  return detectEffectTriggers(effectText).map((trigger) => ({
    ...trigger,
    roll: Math.floor(Math.random() * 100) + 1,
  }));
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
  const [recipeFilter, setRecipeFilter] = useState<"Все" | "Составы" | "Эликсир" | "Масло" | "Отвар">("Все");
  const [craftQuery, setCraftQuery] = useState("");
  const [worldQuery, setWorldQuery] = useState("");
  const [worldTypeFilter, setWorldTypeFilter] = useState<"Все" | "Страна" | "Город" | "Регион" | "Острова">("Все");
  const [categoryFilter, setCategoryFilter] = useState("Все");
  const [dangerFilter, setDangerFilter] = useState<Creature["danger"] | "Все">("Все");
  const [rolls, setRolls] = useState<RollEntry[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [creatureForm, setCreatureForm] = useState<CreatureForm>(emptyCreatureForm);
  const [healthInput, setHealthInput] = useState<string | null>(null);
  const [staminaInput, setStaminaInput] = useState<string | null>(null);
  const [attackerId, setAttackerId] = useState(initialCreatures[0].id);
  const [defenderId, setDefenderId] = useState(initialCreatures[1]?.id ?? initialCreatures[0].id);
  const [selectedAttackId, setSelectedAttackId] = useState(initialCreatures[0].attacks[0]?.id ?? "");
  const [combatMode, setCombatMode] = useState<CombatMode>("closed");
  const [selectedDefenseName, setSelectedDefenseName] = useState("Уклонение/Изворотливость");
  const [creatureEffects, setCreatureEffects] = useState<CreatureEffects>({});
  const [manualEffectCreatureId, setManualEffectCreatureId] = useState(initialCreatures[0].id);
  const [manualEffectId, setManualEffectId] = useState<EffectId>("burning");
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");

  const activeCreature = creatures.find((creature) => creature.id === activeId) ?? creatures[0];
  const activeCreatureLoot = getCreatureLoot(activeCreature);
  const displayedHealth = healthInput ?? String(activeCreature.stats.ПЗ ?? 0);
  const displayedStamina = staminaInput ?? String(activeCreature.stats.Вын ?? 0);
  const activeCreatureEffects = creatureEffects[activeCreature.id] ?? [];
  const attacker = creatures.find((creature) => creature.id === attackerId) ?? creatures[0];
  const defender = creatures.find((creature) => creature.id === defenderId) ?? creatures[1] ?? creatures[0];
  const selectedAttack = attacker.attacks.find((attack) => attack.id === selectedAttackId) ?? attacker.attacks[0];
  const attackerEffects = creatureEffects[attacker.id] ?? [];
  const defenderEffects = creatureEffects[defender.id] ?? [];
  const combatPair = Array.from(new Map([attacker, defender].map((creature) => [creature.id, creature])).values());
  const defenderDefenseOptions = getDefenseOptions(defender);
  const activeDefenseOption = defenderDefenseOptions.find((option) => option.name === selectedDefenseName) ?? defenderDefenseOptions[0];
  const activeDefenseName = activeDefenseOption?.name ?? selectedDefenseName;
  const selectedDefenseValue = activeDefenseOption?.value ?? getDefenseValue(defender, selectedDefenseName);
  const activeEffectEntries = Object.entries(creatureEffects).filter(([, effects]) => effects.length > 0);
  const nextRoundEffectDamage = activeEffectEntries.reduce((total, [creatureId, effects]) => {
    const creature = creatures.find((item) => item.id === creatureId);
    if (!creature) return total;
    return total + effects.reduce((sum, effect) => sum + getEffectRoundDamageForCreature(creature, effect), 0);
  }, 0);
  const creaturePickerOptions = creatures.map((creature) => ({
    value: creature.id,
    label: creature.name,
    detail: `${creature.category} · ${creature.danger}`,
    meta: `ПЗ ${creature.stats.ПЗ ?? 0} · Вын ${creature.stats.Вын ?? 0}`,
  }));
  const combatPairOptions = combatPair.map((creature) => ({
    value: creature.id,
    label: creature.name,
    detail: creature.category,
    meta: `ПЗ ${creature.stats.ПЗ ?? 0}`,
  }));
  const attackPickerOptions = attacker.attacks.map((attack) => ({
    value: attack.id,
    label: attack.name,
    detail: attack.effect,
    meta: `${attack.base} · ${attack.damage}`,
  }));
  const defensePickerOptions = defenderDefenseOptions.map((option) => ({
    value: option.name,
    label: option.name,
    meta: String(option.value),
  }));
  const effectPickerOptions = effectOrder.map((effectId) => ({
    value: effectId,
    label: combatEffects[effectId].name,
    detail: combatEffects[effectId].description,
    meta: combatEffects[effectId].damagePerRound > 0 ? `-${combatEffects[effectId].damagePerRound}/раунд` : "без урона",
    icon: combatEffects[effectId].icon,
  }));
  const categoryOptions = useMemo(() => ["Все", ...Array.from(new Set(creatures.map((creature) => creature.category))).sort()], [creatures]);
  const pageMeta: Record<AppPage, { title: string; text: string }> = {
    monsters: {
      title: "Бестиарий мастера",
      text: "Быстрая шпаргалка по существам, тактике, уязвимостям и броскам во время сцены.",
    },
    alchemy: {
      title: "Алхимия",
      text: "Травы, мутагены, ведьмачьи эликсиры, масла и отвары с компонентами для быстрой подготовки.",
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
      [mutagen.name, mutagen.creatureType, mutagen.source, mutagen.use].join(" ").toLowerCase().includes(normalized),
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

  const setCreatureHealth = (creatureId: string, health: number) => {
    setCreatures((current) =>
      current.map((creature) =>
        creature.id === creatureId
          ? {
              ...creature,
              stats: {
                ...creature.stats,
                ПЗ: Math.max(0, health),
              },
            }
          : creature,
      ),
    );
  };

  const addEffectsToCreature = (creatureId: string, effectIds: EffectId[], source: string) => {
    const uniqueEffectIds = [...new Set(effectIds)];
    if (uniqueEffectIds.length === 0) return;

    setCreatureEffects((current) => {
      const existing = current[creatureId] ?? [];
      const existingIds = new Set(existing.map((effect) => effect.effectId));
      const nextEffects = uniqueEffectIds
        .filter((effectId) => !existingIds.has(effectId))
        .map((effectId) => ({
          id: `${creatureId}-${effectId}-${Date.now()}`,
          effectId,
          source,
          burningParts: effectId === "burning" ? ([...Object.keys(bodyPartLabels)] as BodyPart[]) : undefined,
          roundsLeft: effectId === "stunned" ? 1 : undefined,
          roundsElapsed: effectId === "nausea" ? 0 : undefined,
        }));

      if (nextEffects.length === 0) return current;
      return {
        ...current,
        [creatureId]: [...existing, ...nextEffects],
      };
    });
  };

  const removeEffect = (creatureId: string, effectId: EffectId) => {
    setCreatureEffects((current) => ({
      ...current,
      [creatureId]: (current[creatureId] ?? []).filter((effect) => effect.effectId !== effectId),
    }));
  };

  const applyManualEffect = () => {
    addEffectsToCreature(manualEffectCreatureId, [manualEffectId], "Ручное наложение");
    const creature = creatures.find((item) => item.id === manualEffectCreatureId);
    setRolls((current) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        label: "Эффект наложен",
        formula: `${creature?.name ?? "Цель"}: ${combatEffects[manualEffectId].name}`,
        total: combatEffects[manualEffectId].damagePerRound,
        note: combatEffects[manualEffectId].description,
      },
      ...current.slice(0, 7),
    ]);
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

  const changeCombatant = (role: CombatantRole, creatureId: string) => {
    const creature = creatures.find((item) => item.id === creatureId);
    if (!creature) return;

    if (role === "attacker") {
      setAttackerId(creatureId);
      setSelectedAttackId(creature.attacks[0]?.id ?? "");
      return;
    }

    setDefenderId(creatureId);
  };

  const pickActor = (role: CombatantRole, creatureId: string) => {
    const otherId = creatureId === attackerId ? defenderId : attackerId;

    if (role === "attacker") {
      const creature = creatures.find((item) => item.id === creatureId);
      setAttackerId(creatureId);
      setDefenderId(otherId);
      setSelectedAttackId(creature?.attacks[0]?.id ?? "");
      return;
    }

    setDefenderId(creatureId);
    setAttackerId(otherId);
  };

  const performAttack = () => {
    if (!selectedAttack) return;

    if (hasEffect(attackerEffects, "disorientation")) {
      setRolls((current) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          label: `${attacker.name} не может атаковать`,
          formula: "Дезориентация",
          total: 0,
          note: "По книге дезориентированный персонаж не может совершать действия.",
        },
        ...current.slice(0, 7),
      ]);
      return;
    }

    const attackDie = rollD10();
    const defenseDie = rollD10();
    const attackModifier = getEffectModifier(attackerEffects, "attackModifier");
    const defenseModifier = getEffectModifier(defenderEffects, "defenseModifier");
    const attackTotal = selectedAttack.base + attackModifier + attackDie;
    const defenseBase = selectedDefenseValue;
    const adjustedDefenseBase = defenseBase + defenseModifier;
    const defenderDisoriented = hasEffect(defenderEffects, "disorientation");
    const defenseTotal = defenderDisoriented ? 10 : adjustedDefenseBase + defenseDie;
    const difference = attackTotal - defenseTotal;

    if (difference <= 0) {
      setRolls((current) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          label: `${attacker.name} атакует ${defender.name}`,
          formula: `${selectedAttack.name}: ${selectedAttack.base}${attackModifier >= 0 ? "+" : ""}${attackModifier}+${attackDie} против ${
            defenderDisoriented ? "СЛ 10" : `${defenseBase}${defenseModifier >= 0 ? "+" : ""}${defenseModifier}+${defenseDie}`
          }`,
          total: difference,
          note: "Промах, ПЗ не изменились.",
        },
        ...current.slice(0, 7),
      ]);
      return;
    }

    const damage = rollDamageFormula(selectedAttack.damage);
    const armor = getAverageArmor(defender);
    const finalDamage = Math.max(0, damage.total - armor);
    const currentHealth = defender.stats.ПЗ ?? 0;
    const effectRolls = getTriggeredEffects(selectedAttack.effect);
    const appliedEffects = effectRolls.filter((effect) => effect.roll <= effect.chance).map((effect) => effect.effectId);
    setCreatureHealth(defender.id, currentHealth - finalDamage);
    addEffectsToCreature(defender.id, appliedEffects, selectedAttack.name);
    if (defenderDisoriented) removeEffect(defender.id, "disorientation");

    setRolls((current) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        label: `${attacker.name} попадает по ${defender.name}`,
        formula: `${selectedAttack.name}: ${attackTotal} против ${defenderDisoriented ? "СЛ 10" : defenseTotal}; урон ${
          selectedAttack.damage
        } (${damage.detail}) - броня ${armor}`,
        total: finalDamage,
        note: `Списано ${finalDamage} ПЗ. Осталось ${Math.max(0, currentHealth - finalDamage)} ПЗ.${
          effectRolls.length > 0
            ? ` Эффекты: ${effectRolls
                .map((effect) => `${combatEffects[effect.effectId].name} ${effect.roll}/${effect.chance}${effect.roll <= effect.chance ? "" : " не сработал"}`)
                .join(", ")}.`
            : ""
        }`,
      },
      ...current.slice(0, 7),
    ]);
  };

  const rollSelectedDefense = () => {
    const effects = creatureEffects[defender.id] ?? [];
    const defenseModifier = getEffectModifier(effects, "defenseModifier");
    const base = selectedDefenseValue;
    const die = rollD10();
    const total = base + defenseModifier + die;

    setRolls((current) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        label: `${defender.name}: ${activeDefenseName}`,
        formula: `${base}${defenseModifier >= 0 ? "+" : ""}${defenseModifier}+d10(${die})`,
        total,
        note: "Бросок выбранной защиты.",
      },
      ...current.slice(0, 7),
    ]);
  };

  const applyRoundEffects = () => {
    const entries = Object.entries(creatureEffects).filter(([, effects]) => effects.length > 0);
    if (entries.length === 0) return;

    const notes: string[] = [];
    const nextEffects: CreatureEffects = {};

    const nextCreatures = creatures.map((creature) => {
        const effects = creatureEffects[creature.id] ?? [];
        if (effects.length === 0) return creature;

        let healthDamage = 0;
        let nextArmor = { ...creature.armor };
        const keptEffects: ActiveCombatEffect[] = [];

        effects.forEach((effect) => {
          if (effect.effectId === "burning") {
            const burningParts = effect.burningParts?.length ? effect.burningParts : ([...Object.keys(bodyPartLabels)] as BodyPart[]);
            let burningDamage = 0;

            burningParts.forEach((part) => {
              const armorValue = nextArmor[part] ?? 0;
              burningDamage += Math.max(0, combatEffects.burning.damagePerRound - armorValue);
              nextArmor[part] = Math.max(0, armorValue - 1);
            });

            healthDamage += burningDamage;
            keptEffects.push(effect);
            notes.push(`${creature.name}: горение ${burningDamage} ПЗ, броня -1 на ${burningParts.length} зонах`);
            return;
          }

          if (effect.effectId === "nausea") {
            const roundsElapsed = (effect.roundsElapsed ?? 0) + 1;
            if (roundsElapsed >= 3) {
              const nauseaRoll = rollD10();
              notes.push(`${creature.name}: тошнота d10=${nauseaRoll} против Тел ${creature.stats.Тел ?? 0}`);
              keptEffects.push({ ...effect, roundsElapsed: 0 });
            } else {
              keptEffects.push({ ...effect, roundsElapsed });
            }
            return;
          }

          const effectDamage = getRoundEffectDamage([effect]);
          if (effectDamage > 0) {
            healthDamage += effectDamage;
            notes.push(`${creature.name}: ${combatEffects[effect.effectId].name} -${effectDamage} ПЗ`);
          }

          if (effect.roundsLeft !== undefined) {
            const roundsLeft = effect.roundsLeft - 1;
            if (roundsLeft > 0) keptEffects.push({ ...effect, roundsLeft });
            return;
          }

          keptEffects.push(effect);
        });

        if (keptEffects.length > 0) nextEffects[creature.id] = keptEffects;

        return {
          ...creature,
          armor: nextArmor,
          stats: {
            ...creature.stats,
            ПЗ: Math.max(0, (creature.stats.ПЗ ?? 0) - healthDamage),
          },
        };
      });

    setCreatures(nextCreatures);
    setCreatureEffects(nextEffects);

    setRolls((current) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        label: "Раунд эффектов",
        formula: notes.length > 0 ? notes.join("; ") : "Нет периодического урона",
        total: notes.length,
        note: "Активные состояния обработаны.",
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
                    placeholder="Трава, мутаген, рецепт или компонент"
                  />
                </label>
                <small className={styles.filterCount}>
                  Найдено: {filteredIngredients.length + filteredMutagens.length + filteredRecipes.length}
                </small>
              </div>
              <div className={styles.filterGroup}>
                <span>Рецепты</span>
                <div className={styles.filterChips}>
                  {(["Все", "Составы", "Эликсир", "Масло", "Отвар"] as const).map((group) => (
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

        <aside className={styles.sidePanel}>
          <section className={styles.combatPanel}>
            <div className={styles.sectionHeader}>
              <h2>Бой</h2>
              <p>Выбери двух участников.</p>
            </div>

            {renderPicker({
              id: "combat-attacker",
              label: "Участник 1",
              value: attacker.id,
              options: creaturePickerOptions,
              onChange: (value) => changeCombatant("attacker", value),
              searchPlaceholder: "Найти монстра по имени",
            })}

            {renderPicker({
              id: "combat-defender",
              label: "Участник 2",
              value: defender.id,
              options: creaturePickerOptions,
              onChange: (value) => changeCombatant("defender", value),
              searchPlaceholder: "Найти монстра по имени",
            })}

            <button className={styles.primaryAction} type="button" onClick={() => setCombatMode(combatMode === "closed" ? "attack" : "closed")}>
              Бой
            </button>

            {combatMode !== "closed" && (
              <div className={styles.combatDrawer}>
                <div className={styles.modeTabs}>
                  <button className={combatMode === "attack" ? styles.modeTabActive : ""} type="button" onClick={() => setCombatMode("attack")}>
                    Атака
                  </button>
                  <button className={combatMode === "defense" ? styles.modeTabActive : ""} type="button" onClick={() => setCombatMode("defense")}>
                    Защита
                  </button>
                </div>

                {combatMode === "attack" ? (
                  <>
                    {renderPicker({
                      id: "attack-actor",
                      label: "Кто атакует",
                      value: attacker.id,
                      options: combatPairOptions,
                      onChange: (value) => pickActor("attacker", value),
                      searchPlaceholder: "Найти участника",
                    })}

                    {renderPicker({
                      id: "attack-method",
                      label: "Как атакует",
                      value: selectedAttack?.id ?? "",
                      options: attackPickerOptions,
                      onChange: setSelectedAttackId,
                      searchPlaceholder: "Найти атаку",
                    })}
                  </>
                ) : (
                  <>
                    {renderPicker({
                      id: "defense-actor",
                      label: "Кто защищается",
                      value: defender.id,
                      options: combatPairOptions,
                      onChange: (value) => pickActor("defender", value),
                      searchPlaceholder: "Найти участника",
                    })}

                    {renderPicker({
                      id: "defense-method",
                      label: "Как защищается",
                      value: defenderDefenseOptions.some((option) => option.name === selectedDefenseName)
                        ? selectedDefenseName
                        : defenderDefenseOptions[0]?.name ?? "",
                      options: defensePickerOptions,
                      onChange: setSelectedDefenseName,
                      searchPlaceholder: "Найти защиту",
                    })}
                  </>
                )}

                <div className={styles.combatStats}>
                  <span>
                    Атака
                    <strong>{selectedAttack ? selectedAttack.base + getEffectModifier(attackerEffects, "attackModifier") : 0}</strong>
                  </span>
                  <span>
                    Защита
                    <strong>{hasEffect(defenderEffects, "disorientation") ? 10 : selectedDefenseValue + getEffectModifier(defenderEffects, "defenseModifier")}</strong>
                  </span>
                  <span>
                    ПЗ
                    <strong>{defender.stats.ПЗ ?? 0}</strong>
                  </span>
                </div>

                {combatMode === "attack" ? (
                  <button className={styles.primaryAction} type="button" onClick={performAttack}>
                    Провести атаку
                  </button>
                ) : (
                  <button className={styles.primaryAction} type="button" onClick={rollSelectedDefense}>
                    Бросить защиту
                  </button>
                )}
              </div>
            )}
          </section>

          <section className={styles.effectsPanel}>
            <div className={styles.sectionHeader}>
              <h2>Эффекты</h2>
              <p>Урон считается каждый раунд.</p>
            </div>

            <div className={styles.effectControls}>
              {renderPicker({
                id: "effect-target",
                label: "Цель",
                value: manualEffectCreatureId,
                options: creaturePickerOptions,
                onChange: setManualEffectCreatureId,
                searchPlaceholder: "Найти монстра по имени",
              })}
              {renderPicker({
                id: "effect-kind",
                label: "Эффект",
                value: manualEffectId,
                options: effectPickerOptions,
                onChange: (value) => setManualEffectId(value as EffectId),
                searchPlaceholder: "Найти эффект",
              })}
              <button className={styles.secondaryAction} type="button" onClick={applyManualEffect}>
                Наложить
              </button>
            </div>

            <div className={styles.effectSummary}>
              <span>Урон за следующий раунд</span>
              <strong>{nextRoundEffectDamage}</strong>
            </div>

            <div className={styles.effectsList}>
              {activeEffectEntries.length === 0 ? (
                <p className={styles.emptyLog}>Активных эффектов нет.</p>
              ) : (
                activeEffectEntries
                  .map(([creatureId, effects]) => {
                    const creature = creatures.find((item) => item.id === creatureId);
                    if (!creature) return null;
                    const creatureRoundDamage = effects.reduce((sum, effect) => sum + getEffectRoundDamageForCreature(creature, effect), 0);

                    return (
                      <article className={styles.effectCard} key={creatureId}>
                        <header>
                          <strong>{creature.name}</strong>
                          <span>ПЗ {creature.stats.ПЗ ?? 0} · -{creatureRoundDamage}/раунд</span>
                        </header>
                        <div className={styles.effectRows}>
                          {effects.map((effect) => {
                            const definition = combatEffects[effect.effectId];
                            const roundDamage = getEffectRoundDamageForCreature(creature, effect);

                            return (
                              <div className={styles.effectRow} key={effect.id}>
                                <div>
                                  <strong>{definition.name}</strong>
                                  <p>{definition.description}</p>
                                  {effect.effectId === "burning" && (
                                    <small>Горящие зоны: {effect.burningParts?.map((part) => bodyPartLabels[part]).join(", ")}</small>
                                  )}
                                </div>
                                <span>{roundDamage > 0 ? `-${roundDamage}/раунд` : "без урона"}</span>
                                <button type="button" onClick={() => removeEffect(creatureId, effect.effectId)}>
                                  Снять
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    );
                  })
              )}
            </div>

            <button className={styles.secondaryAction} type="button" onClick={applyRoundEffects}>
              Раунд эффектов
            </button>
          </section>

          <section className={styles.logPanel}>
          <div className={styles.sectionHeader}>
            <h2>Журнал</h2>
            <p>Последние броски.</p>
          </div>
          {rolls.length === 0 ? (
            <p className={styles.emptyLog}>Бросков пока нет.</p>
          ) : (
            <ol className={styles.rollList}>
              {rolls.map((roll) => (
                <li key={roll.id}>
                  <strong>{roll.label}: {roll.total}</strong>
                  <span>{roll.formula}</span>
                  <small>{roll.note}</small>
                </li>
              ))}
            </ol>
          )}
          </section>
        </aside>
      </div>
      )}

      {activePage === "alchemy" && (
        <div className={styles.catalogPage}>
          {recipeFilter === "Все" && (
            <>
              <section className={styles.catalogBand}>
                <div className={styles.sectionHeader}>
                  <h2>Травы и реагенты</h2>
                  <p>Субстанции из каталога алхимии.</p>
                </div>
                <div className={styles.catalogGrid}>
                  {filteredIngredients.map((ingredient) => (
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

              <section className={styles.catalogBand}>
                <div className={styles.sectionHeader}>
                  <h2>Мутагены</h2>
                  <p>Откуда брать и для чего использовать.</p>
                </div>
                <div className={styles.catalogGrid}>
                  {filteredMutagens.map((mutagen) => (
                    <article className={styles.catalogCard} key={mutagen.name}>
                      <header>
                        <span>{mutagen.creatureType}</span>
                        <strong>{mutagen.name}</strong>
                      </header>
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
              <p>Зелья, масла и отвары.</p>
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
