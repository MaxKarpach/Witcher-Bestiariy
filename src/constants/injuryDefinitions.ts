import type { InjuryDefinition, InjurySeverity } from '../types/injuries';

export const SEVERITY_HP_DAMAGE: Record<InjurySeverity, number> = {
  light: 3,
  medium: 5,
  heavy: 8,
  lethal: 10,
};

export const SEVERITY_LABELS: Record<InjurySeverity, string> = {
  light: 'Лёгкая',
  medium: 'Средняя',
  heavy: 'Тяжёлая',
  lethal: 'Смертельная',
};

export const ALL_SEVERITIES: readonly InjurySeverity[] = ['light', 'medium', 'heavy', 'lethal'];

const VERBAL_DUEL_SKILLS: Record<string, number> = {
  'Харизма': 0,
  'Убеждение': 0,
  'Соблазнение': 0,
  'Лидерство': 0,
  'Обман': 0,
  'Этикет': 0,
  'Запугивание': 0,
};

export const INJURY_DEFINITIONS: Record<string, InjuryDefinition> = {
  cracked_jaw: {
    id: 'cracked_jaw',
    name: 'Треснувшая челюсть',
    severity: 'light',
    description: 'От удара челюсть персонажа треснула, из-за чего ему тяжело говорить.',
    fullEffect: {
      description: 'Штраф −2 к магическим навыкам и в Словесной дуэли (Харизма, Убеждение, Соблазнение, Лидерство, Обман, Этикет и Запугивание)',
      skillModifiers: Object.fromEntries(Object.keys(VERBAL_DUEL_SKILLS).map((k) => [k, -2])),
    },
    stabilizedEffect: {
      description: 'Штраф −1 к магическим навыкам и в Словесной дуэли',
      skillModifiers: Object.fromEntries(Object.keys(VERBAL_DUEL_SKILLS).map((k) => [k, -1])),
    },
    healedEffect: {
      description: 'Штраф −1 к магическим навыкам',
    },
  },

  disfiguring_scar: {
    id: 'disfiguring_scar',
    name: 'Уродующий шрам',
    severity: 'light',
    description: 'После ранения лицо персонажа изуродовано. Смотреть на него неприятно.',
    fullEffect: {
      description: 'Штраф −2 к эмпатической Словесной дуэли (Харизма, Убеждение, Соблазнение, Обман, Этикет и Лидерство)',
      skillModifiers: {
        'Харизма': -2,
        'Убеждение': -2,
        'Соблазнение': -2,
        'Обман': -2,
        'Этикет': -2,
        'Лидерство': -2,
      },
    },
    stabilizedEffect: {
      description: 'Штраф −1 к эмпатической Словесной дуэли',
      skillModifiers: {
        'Харизма': -1,
        'Убеждение': -1,
        'Соблазнение': -1,
        'Обман': -1,
        'Этикет': -1,
        'Лидерство': -1,
      },
    },
    healedEffect: {
      description: 'Штраф −1 к Соблазнению',
      skillModifiers: { 'Соблазнение': -1 },
    },
  },

  cracked_ribs: {
    id: 'cracked_ribs',
    name: 'Треснувшие рёбра',
    severity: 'light',
    description: 'От удара у персонажа треснули рёбра, отчего ему больно дышать и напрягаться. Не влияет на пункты здоровья.',
    fullEffect: {
      description: 'Штраф −2 к Тел',
      parameterModifiers: { 'Тел': -2 },
    },
    stabilizedEffect: {
      description: 'Штраф −1 к Тел',
      parameterModifiers: { 'Тел': -1 },
    },
    healedEffect: {
      description: 'Штраф −10 к Переносимому весу',
    },
  },

  foreign_object: {
    id: 'foreign_object',
    name: 'Инородный объект',
    severity: 'light',
    description: 'В ране застрял кусок одежды или брони, что вызвало заражение.',
    fullEffect: {
      description: 'Параметр Отдых и исцеление критических ранений снижены в четыре раза',
    },
    stabilizedEffect: {
      description: 'Отдых и исцеление критических ранений снижены в два раза',
    },
    healedEffect: {
      description: 'Штраф −2 к Отдыху и −1 к исцелению критических ранений',
    },
  },

  dislocated_arm: {
    id: 'dislocated_arm',
    name: 'Вывих руки',
    severity: 'light',
    description: 'После удара рука персонажа вывихнута и плохо слушается.',
    fullEffect: {
      description: 'Штраф −2 к действиям этой рукой',
    },
    stabilizedEffect: {
      description: 'Штраф −1 к действиям этой рукой',
    },
    healedEffect: {
      description: 'Штраф −1 к Силе',
      skillModifiers: { 'Сила': -1 },
    },
  },

  dislocated_leg: {
    id: 'dislocated_leg',
    name: 'Вывих ноги',
    severity: 'light',
    description: 'После удара нога персонажа вывихнута, она плохо слушается и на неё больно наступать.',
    fullEffect: {
      description: 'Штраф −2 к Скор, Уклонению/Изворотливости и Атлетике',
      parameterModifiers: { 'Скор': -2 },
      skillModifiers: { 'Уклонение/Изворотливость': -2, 'Атлетика': -2 },
    },
    stabilizedEffect: {
      description: 'Штраф −1 к Скор, Уклонению/Изворотливости и Атлетике',
      parameterModifiers: { 'Скор': -1 },
      skillModifiers: { 'Уклонение/Изворотливость': -1, 'Атлетика': -1 },
    },
    healedEffect: {
      description: 'Штраф −1 к Скор',
      parameterModifiers: { 'Скор': -1 },
    },
  },
  // ─── Средние травмы ───────────────────────────────────────────────────────

  minor_head_trauma: {
    id: 'minor_head_trauma',
    name: 'Небольшая травма головы',
    severity: 'medium',
    description: 'От удара у персонажа сотрясение мозга и небольшое внутреннее кровотечение, отчего он с трудом соображает.',
    fullEffect: {
      description: 'Штраф −1 к Инт, Воле и Уст',
      parameterModifiers: { 'Инт': -1, 'Воля': -1, 'Уст': -1 },
    },
    stabilizedEffect: {
      description: 'Штраф −1 к Инт и Воле',
      parameterModifiers: { 'Инт': -1, 'Воля': -1 },
    },
    healedEffect: {
      description: 'Штраф −1 к Воле',
      parameterModifiers: { 'Воля': -1 },
    },
  },

  knocked_out_teeth: {
    id: 'knocked_out_teeth',
    name: 'Выбитые зубы',
    severity: 'medium',
    description: 'Ударом персонажу выбили часть зубов. Совершите бросок 1d10, чтобы узнать количество выбитых зубов.',
    fullEffect: {
      description: 'Штраф −3 к магическим навыкам и в Словесной дуэли (Харизма, Убеждение, Соблазнение, Лидерство, Обман, Этикет и Запугивание)',
      skillModifiers: Object.fromEntries(Object.keys(VERBAL_DUEL_SKILLS).map((k) => [k, -3])),
    },
    stabilizedEffect: {
      description: 'Штраф −2 к магическим навыкам и в Словесной дуэли',
      skillModifiers: Object.fromEntries(Object.keys(VERBAL_DUEL_SKILLS).map((k) => [k, -2])),
    },
    healedEffect: {
      description: 'Штраф −1 к магическим навыкам и в Словесной дуэли',
      skillModifiers: Object.fromEntries(Object.keys(VERBAL_DUEL_SKILLS).map((k) => [k, -1])),
    },
  },

  ruptured_spleen: {
    id: 'ruptured_spleen',
    name: 'Разрыв селезёнки',
    severity: 'medium',
    description: 'У персонажа разрыв селезёнки с сильным кровотечением, из-за чего он чувствует слабость.',
    fullEffect: {
      description: 'Совершайте испытание Устойчивости каждые 5 раундов. Персонаж истекает кровью.',
    },
    stabilizedEffect: {
      description: 'Персонаж должен совершать испытание Устойчивости каждые 10 раундов.',
    },
    healedEffect: {
      description: 'Штраф −2 к Уст',
      parameterModifiers: { 'Уст': -2 },
    },
  },

  broken_ribs: {
    id: 'broken_ribs',
    name: 'Сломанные рёбра',
    severity: 'medium',
    description: 'От удара у персонажа сломаны рёбра, ему очень тяжело дышать, сгибаться и прилагать какие-либо усилия.',
    fullEffect: {
      description: 'Штраф −2 к Тел и −1 к Реа и Лвк',
      parameterModifiers: { 'Тел': -2, 'Реа': -1, 'Лвк': -1 },
    },
    stabilizedEffect: {
      description: 'Штраф −1 к Тел и Реа',
      parameterModifiers: { 'Тел': -1, 'Реа': -1 },
    },
    healedEffect: {
      description: 'Штраф −1 к Тел',
      parameterModifiers: { 'Тел': -1 },
    },
  },

  broken_arm: {
    id: 'broken_arm',
    name: 'Перелом руки',
    severity: 'medium',
    description: 'Персонаж получил перелом руки.',
    fullEffect: {
      description: 'Штраф −3 ко всем действиям этой рукой',
    },
    stabilizedEffect: {
      description: 'Штраф −2 ко всем действиям этой рукой',
    },
    healedEffect: {
      description: 'Штраф −1 ко всем действиям этой рукой',
    },
  },

  broken_leg: {
    id: 'broken_leg',
    name: 'Перелом ноги',
    severity: 'medium',
    description: 'Персонаж получил перелом ноги.',
    fullEffect: {
      description: 'Штраф −3 к Скор, Уклонению/Изворотливости и Атлетике',
      parameterModifiers: { 'Скор': -3 },
      skillModifiers: { 'Уклонение/Изворотливость': -3, 'Атлетика': -3 },
    },
    stabilizedEffect: {
      description: 'Штраф −2 к Скор, Уклонению/Изворотливости и Атлетике',
      parameterModifiers: { 'Скор': -2 },
      skillModifiers: { 'Уклонение/Изворотливость': -2, 'Атлетика': -2 },
    },
    healedEffect: {
      description: 'Штраф −1 к Скор, Уклонению/Изворотливости и Атлетике',
      parameterModifiers: { 'Скор': -1 },
      skillModifiers: { 'Уклонение/Изворотливость': -1, 'Атлетика': -1 },
    },
  },

  // ─── Тяжёлые травмы ──────────────────────────────────────────────────────

  shattered_skull: {
    id: 'shattered_skull',
    name: 'Проломленный череп',
    severity: 'heavy',
    description: 'От удара череп персонажа проломлен, что делает его голову уязвимее и вызывает кровотечение.',
    fullEffect: {
      description: 'Штраф −1 к Инт и Лвк. Последующие ранения в голову наносят в четыре раза больше урона. Персонаж истекает кровью.',
      parameterModifiers: { 'Инт': -1, 'Лвк': -1 },
    },
    stabilizedEffect: {
      description: 'Штраф −1 к Инт и Лвк. Ранения в голову наносят в четыре раза больше урона.',
      parameterModifiers: { 'Инт': -1, 'Лвк': -1 },
    },
    healedEffect: {
      description: 'Ранения в голову наносят в четыре раза больше урона.',
    },
  },

  concussion: {
    id: 'concussion',
    name: 'Контузия',
    severity: 'heavy',
    description: 'От удара персонаж получил лёгкую контузию.',
    fullEffect: {
      description: 'Совершайте испытание Устойчивости каждые 1d6 раундов. Штраф −2 к Инт, Реа и Лвк.',
      parameterModifiers: { 'Инт': -2, 'Реа': -2, 'Лвк': -2 },
    },
    stabilizedEffect: {
      description: 'Штраф −1 к Инт, Реа и Лвк.',
      parameterModifiers: { 'Инт': -1, 'Реа': -1, 'Лвк': -1 },
    },
    healedEffect: {
      description: 'Штраф −1 к Инт и Лвк.',
      parameterModifiers: { 'Инт': -1, 'Лвк': -1 },
    },
  },

  abdominal_wound: {
    id: 'abdominal_wound',
    name: 'Рана в живот',
    severity: 'heavy',
    description: 'От удара желудок персонажа порвался, и его содержимое выплеснулось в брюшную полость.',
    fullEffect: {
      description: 'Штраф −2 ко всем действиям. 4 пункта урона кислотой в раунд.',
      damagePerRound: 4,
    },
    stabilizedEffect: {
      description: 'Штраф −2 ко всем действиям.',
    },
    healedEffect: {
      description: 'Штраф −1 ко всем действиям.',
    },
  },

  sucking_chest_wound: {
    id: 'sucking_chest_wound',
    name: 'Сосущая рана грудной клетки',
    severity: 'heavy',
    description: 'Удар разорвал лёгкое персонажа, переполнив его грудь воздухом и сдавивая органы.',
    fullEffect: {
      description: 'Штраф −3 к Тел и Скор. Персонаж начинает задыхаться.',
      parameterModifiers: { 'Тел': -3, 'Скор': -3 },
    },
    stabilizedEffect: {
      description: 'Штраф −2 к Тел и Скор.',
      parameterModifiers: { 'Тел': -2, 'Скор': -2 },
    },
    healedEffect: {
      description: 'Штраф −1 к Тел и Скор.',
      parameterModifiers: { 'Тел': -1, 'Скор': -1 },
    },
  },

  compound_arm_fracture: {
    id: 'compound_arm_fracture',
    name: 'Открытый перелом руки',
    severity: 'heavy',
    description: 'От удара рука раздроблена. Из раны торчит кость. Персонаж истекает кровью.',
    fullEffect: {
      description: 'Рукой невозможно двигать. Персонаж истекает кровью.',
    },
    stabilizedEffect: {
      description: 'Рукой невозможно двигать.',
    },
    healedEffect: {
      description: 'Рука должна оставаться на перевязи, но ею можно держать предметы.',
    },
  },

  compound_leg_fracture: {
    id: 'compound_leg_fracture',
    name: 'Открытый перелом ноги',
    severity: 'heavy',
    description: 'От удара нога сломана и не может двигаться. Персонаж истекает кровью.',
    fullEffect: {
      description: 'Скор, Уклонение/Изворотливость и Атлетика снижены вчетверо. Персонаж истекает кровью.',
    },
    stabilizedEffect: {
      description: 'Скор, Уклонение/Изворотливость и Атлетика снижены вдвое.',
    },
    healedEffect: {
      description: 'Штраф −2 к Скор, Уклонению/Изворотливости и Атлетике.',
      parameterModifiers: { 'Скор': -2 },
      skillModifiers: { 'Уклонение/Изворотливость': -2, 'Атлетика': -2 },
    },
  },

  // ─── Смертельные травмы ───────────────────────────────────────────────────

  broken_neck: {
    id: 'broken_neck',
    name: 'Сломанная шея / отсечение головы',
    severity: 'lethal',
    description: 'Ударом персонажу сломали шею или же вовсе сняли голову с плеч.',
    fullEffect: {
      description: 'Персонаж немедленно умирает.',
    },
    stabilizedEffect: {
      description: 'Это ранение нельзя стабилизировать.',
    },
    healedEffect: {
      description: 'Это ранение нельзя вылечить.',
    },
  },

  eye_damage: {
    id: 'eye_damage',
    name: 'Повреждение глаза',
    severity: 'lethal',
    description: 'Глаз персонажа повреждён или выбит. Персонаж истекает кровью.',
    fullEffect: {
      description: 'Штраф −5 к связанным со зрением проверкам Внимания и −4 к Лвк. Персонаж истекает кровью.',
      parameterModifiers: { 'Лвк': -4 },
      skillModifiers: { 'Внимание': -5 },
    },
    stabilizedEffect: {
      description: 'Штраф −3 к связанным со зрением проверкам Внимания и −2 к Лвк.',
      parameterModifiers: { 'Лвк': -2 },
      skillModifiers: { 'Внимание': -3 },
    },
    healedEffect: {
      description: 'Постоянный штраф −1 к связанным со зрением проверкам Внимания и Лвк.',
      parameterModifiers: { 'Лвк': -1 },
      skillModifiers: { 'Внимание': -1 },
    },
  },

  heart_trauma: {
    id: 'heart_trauma',
    name: 'Травма сердца',
    severity: 'lethal',
    description: 'Урон повреждает сердце персонажа. Необходимо немедленно пройти испытание против смерти.',
    fullEffect: {
      description: 'Немедленно пройти испытание против смерти. Вын, Скор и Тел снижаются вчетверо. Рана кровоточит.',
    },
    stabilizedEffect: {
      description: 'Вын, Скор и Тел персонажа снижаются вдвое.',
    },
    healedEffect: {
      description: 'Постоянно +2 урона за раунд от кровотечения.',
      damagePerRound: 2,
    },
  },

  septic_shock: {
    id: 'septic_shock',
    name: 'Септический шок',
    severity: 'lethal',
    description: 'Удар повредил внутренние органы, и их содержимое попало в кровь. Персонаж отравлен.',
    fullEffect: {
      description: 'Вын снижается вчетверо. Штраф −3 к Инт, Воле, Реа и Лвк. Персонаж отравлен.',
      parameterModifiers: { 'Инт': -3, 'Воля': -3, 'Реа': -3, 'Лвк': -3 },
    },
    stabilizedEffect: {
      description: 'Вын снижается вдвое. Штраф −1 к Инт, Воле, Реа и Лвк.',
      parameterModifiers: { 'Инт': -1, 'Воля': -1, 'Реа': -1, 'Лвк': -1 },
    },
    healedEffect: {
      description: 'Постоянный штраф −5 к Вын.',
      parameterModifiers: { 'Вын': -5 },
    },
  },

  lost_arm: {
    id: 'lost_arm',
    name: 'Потеря руки',
    severity: 'lethal',
    description: 'Удар начисто отрубает руку или повреждает до такой степени, что вылечить её невозможно. Персонаж истекает кровью.',
    fullEffect: {
      description: 'Рукой нельзя пользоваться. Персонаж истекает кровью.',
    },
    stabilizedEffect: {
      description: 'Рукой нельзя пользоваться.',
    },
    healedEffect: {
      description: 'Руку можно заменить протезом.',
    },
  },

  lost_leg: {
    id: 'lost_leg',
    name: 'Потеря ноги',
    severity: 'lethal',
    description: 'Удар начисто отрубает ногу или повреждает до такой степени, что вылечить её невозможно. Персонаж истекает кровью.',
    fullEffect: {
      description: 'Скор, Уклонение/Изворотливость и Атлетика снижаются вчетверо. Персонаж истекает кровью.',
    },
    stabilizedEffect: {
      description: 'Скор, Уклонение/Изворотливость и Атлетика снижены вчетверо.',
    },
    healedEffect: {
      description: 'Ногу можно заменить протезом.',
    },
  },
};

export const INJURIES_BY_SEVERITY: Record<InjurySeverity, string[]> = {
  light: ['cracked_jaw', 'disfiguring_scar', 'cracked_ribs', 'foreign_object', 'dislocated_arm', 'dislocated_leg'],
  medium: ['minor_head_trauma', 'knocked_out_teeth', 'ruptured_spleen', 'broken_ribs', 'broken_arm', 'broken_leg'],
  heavy: ['shattered_skull', 'concussion', 'abdominal_wound', 'sucking_chest_wound', 'compound_arm_fracture', 'compound_leg_fracture'],
  lethal: ['broken_neck', 'eye_damage', 'heart_trauma', 'septic_shock', 'lost_arm', 'lost_leg'],
};
