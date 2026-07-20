export type MafiaRoleId = 'civilian' | 'mafia' | 'don' | 'detective' | 'doctor' | 'maniac';
export type MafiaTeam = 'city' | 'mafia' | 'solo';
export type MafiaPreset = 'classic' | 'noir' | 'chaos' | 'custom';

export interface MafiaRoleDefinition {
  id: MafiaRoleId;
  name: string;
  team: MafiaTeam;
  tagline: string;
  description: string;
  nightHint?: string;
}

export const MAFIA_ROLES: Record<MafiaRoleId, MafiaRoleDefinition> = {
  civilian: {
    id: 'civilian',
    name: 'Мирный житель',
    team: 'city',
    tagline: 'Слушайте. Сомневайтесь. Голосуйте.',
    description: 'Днём анализируйте речи и ищите противоречия. Ночью вы не совершаете действий.',
  },
  mafia: {
    id: 'mafia',
    name: 'Мафия',
    team: 'mafia',
    tagline: 'Город должен уснуть навсегда.',
    description: 'Ночью вместе с союзниками выберите одну цель. Днём не выдавайте команду.',
    nightHint: 'Выберите жертву вместе с командой.',
  },
  don: {
    id: 'don',
    name: 'Дон',
    team: 'mafia',
    tagline: 'Вы управляете тишиной.',
    description: 'Вы входите в команду мафии, решаете спор о цели и каждую ночь ищете Комиссара.',
    nightHint: 'Проверьте, является ли выбранный игрок Комиссаром.',
  },
  detective: {
    id: 'detective',
    name: 'Комиссар',
    team: 'city',
    tagline: 'Один вопрос. Один честный ответ.',
    description:
      'Каждую ночь проверьте одного живого игрока. Ведущий покажет, связан ли он с мафией.',
    nightHint: 'Выберите игрока для проверки.',
  },
  doctor: {
    id: 'doctor',
    name: 'Доктор',
    team: 'city',
    tagline: 'До рассвета ещё можно успеть.',
    description: 'Каждую ночь защитите одного живого игрока от всех ночных атак.',
    nightHint: 'Выберите игрока для защиты.',
  },
  maniac: {
    id: 'maniac',
    name: 'Маньяк',
    team: 'solo',
    tagline: 'В этом городе нет союзников.',
    description: 'Ночью атакуйте одного игрока. Победите, если останетесь единственным выжившим.',
    nightHint: 'Выберите собственную цель.',
  },
};

export const MAFIA_PRESETS: Record<
  MafiaPreset,
  { name: string; note: string; description: string }
> = {
  classic: {
    name: 'Классика',
    note: 'чистая дедукция',
    description: 'Мафия, комиссар и доктор без одиночных ролей.',
  },
  noir: {
    name: 'Нуар',
    note: 'дон ищет комиссара',
    description: 'Дон руководит синдикатом и получает личную ночную проверку на Комиссара.',
  },
  chaos: {
    name: 'Хаос',
    note: 'три стороны',
    description: 'Маньяк создаёт третью сторону и делает каждое голосование рискованнее.',
  },
  custom: {
    name: 'Свой набор',
    note: 'любые роли',
    description: 'Вы сами задаёте количество каждой роли. Сумма ролей должна совпадать с числом игроков.',
  },
};

export const TEAM_LABELS: Record<MafiaTeam, string> = {
  city: 'Город',
  mafia: 'Синдикат',
  solo: 'Одиночка',
};
